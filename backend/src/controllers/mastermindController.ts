import { Request, Response } from 'express';
import crypto from 'crypto';
import { prisma } from '../config/db';
import { cacheGetOrSWR, cacheDelPattern, buildCanonicalCacheKey } from '../config/redis';
import { broadcastRealtimeEvent } from '../utils/realtimeEmitter';
import { createNotificationHelper } from './notificationController';

// @desc    Get questions for a specific course mastermind (SWR cached with query param isolation)
// @route   GET /api/mastermind/questions?courseSlug=bmb&since=ISO_DATE&topic=TOPIC&page=1&limit=50
export const getMastermindQuestions = async (req: Request, res: Response): Promise<void> => {
  try {
    const rawCourseSlug = req.query.courseSlug || req.query.directive || 'all';
    const courseSlugParam = String(rawCourseSlug).trim().toLowerCase();
    const topicParam = req.query.topic ? String(req.query.topic).trim() : undefined;
    const sinceParam = req.query.since ? String(req.query.since).trim() : undefined;
    const pageParam = req.query.page ? parseInt(String(req.query.page), 10) : undefined;
    const limitParam = req.query.limit ? parseInt(String(req.query.limit), 10) : undefined;

    const sinceDate = sinceParam ? new Date(sinceParam) : null;
    const validSince = sinceDate && !isNaN(sinceDate.getTime()) ? sinceDate : null;

    const page = Math.max(1, pageParam && !isNaN(pageParam) ? pageParam : 1);
    const limit = Math.min(50, Math.max(1, limitParam && !isNaN(limitParam) ? limitParam : 25));
    const skip = (page - 1) * limit;

    const queryParams: Record<string, any> = {};
    if (topicParam && topicParam !== 'ALL') queryParams.topic = topicParam;
    if (sinceParam) queryParams.since = sinceParam;
    queryParams.page = page;
    queryParams.limit = limit;

    const cacheKey = buildCanonicalCacheKey('mastermind:questions', courseSlugParam, queryParams);

    // If "since" timestamp is provided, it is an incremental live poll -> shorter fresh TTL (5s)
    const freshTtlSeconds = validSince ? 5 : 15;
    const staleTtlSeconds = validSince ? 30 : 300;

    const result = await cacheGetOrSWR(
      cacheKey,
      async () => {
        const whereClause: any = {};
        if (courseSlugParam && courseSlugParam !== 'all') {
          whereClause.courseSlug = courseSlugParam;
        }
        if (topicParam && topicParam !== 'ALL') {
          whereClause.drillTopic = topicParam;
        }
        if (validSince) {
          whereClause.updatedAt = { gt: validSince };
        }

        const [questions, totalCount] = await Promise.all([
          prisma.mastermindQuestion.findMany({
            where: whereClause,
            orderBy: [
              { isPinned: 'desc' },
              { upvotes: 'desc' },
              { createdAt: 'desc' },
            ],
            take: limit,
            skip: skip,
            include: {
              replies: {
                orderBy: { createdAt: 'asc' },
              },
            },
          }),
          prisma.mastermindQuestion.count({
            where: whereClause,
          }),
        ]);

        return {
          success: true,
          count: questions.length,
          totalCount,
          pagination: {
            page,
            limit,
            total: totalCount,
            totalPages: Math.ceil(totalCount / limit) || 1,
            hasMore: skip + questions.length < totalCount,
          },
          serverTime: new Date().toISOString(),
          data: questions,
        };
      },
      { freshTtlSeconds, staleTtlSeconds }
    );

    res.setHeader('X-Cache', result.cached ? (result.stale ? 'STALE' : 'HIT') : 'MISS');
    res.status(200).json({
      ...result.data,
      cached: result.cached,
      stale: result.stale,
    });
  } catch (error: any) {
    console.error('[getMastermindQuestions]', error);
    res.status(500).json({ success: false, message: 'Failed to fetch mastermind questions.' });
  }
};

// @desc    Post a new mastermind question / drill submission
// @route   POST /api/mastermind/questions
export const postMastermindQuestion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { courseSlug, question, drillTopic } = req.body;
    const callerId = req.user?.id;
    const callerEmail = req.user?.email || 'operative@uwe.lk';

    if (!question || !question.trim()) {
      res.status(400).json({ success: false, message: 'Question content is required.' });
      return;
    }

    // Look up caller details
    let authorName = req.user?.email || 'Operative';
    let authorBadge = 'OPERATIVE';

    if (callerId) {
      if (req.user?.type === 'admin') {
        const admin = await prisma.adminUser.findUnique({ where: { id: callerId } });
        if (admin) {
          authorName = admin.name;
          authorBadge = `COMMAND ${admin.role}`;
        }
      } else {
        const user = await prisma.user.findUnique({ where: { id: callerId } });
        if (user) {
          authorName = user.name;
          authorBadge = user.rankTitle || 'OPERATIVE';
        }
      }
    }

    const newQuestion = await prisma.mastermindQuestion.create({
      data: {
        courseSlug: (courseSlug || 'bmb').trim().toLowerCase(),
        userId: callerId || null,
        authorName,
        authorBadge,
        question: String(question).trim(),
        drillTopic: drillTopic ? String(drillTopic).trim() : 'General Mastermind Q&A',
      },
    });

    // Invalidate mastermind cache across all queries and broadcast realtime event
    await cacheDelPattern('mastermind:');
    broadcastRealtimeEvent('mastermind:new_question', { id: newQuestion.id, courseSlug: newQuestion.courseSlug });

    res.status(201).json({ success: true, message: 'Question transmitted to Commander Council.', data: newQuestion });
  } catch (error: any) {
    console.error('[postMastermindQuestion]', error);
    res.status(500).json({ success: false, message: 'Failed to post question.' });
  }
};

// @desc    Toggle upvote for a mastermind question (enforces 1 upvote per user)
// @route   POST /api/mastermind/questions/:id/upvote
export const upvoteMastermindQuestion = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const clientFingerprint = (req.ip || '') + (req.headers['user-agent'] || '');
    const fallbackHash = crypto.createHash('sha256').update(clientFingerprint || 'anon').digest('hex').substring(0, 16);
    const userId = req.user?.id || req.user?.email || `guest_${fallbackHash}`;

    const question = await prisma.mastermindQuestion.findUnique({
      where: { id },
    });

    if (!question) {
      res.status(404).json({ success: false, message: 'Question not found' });
      return;
    }

    let upvotedIds: string[] = [];
    try {
      upvotedIds = JSON.parse(question.upvotedUserIds || '[]');
      if (!Array.isArray(upvotedIds)) upvotedIds = [];
    } catch {
      upvotedIds = [];
    }

    const alreadyUpvoted = upvotedIds.includes(userId);
    let newUpvotedIds: string[];
    let newCount: number;

    if (alreadyUpvoted) {
      // Toggle off / remove upvote
      newUpvotedIds = upvotedIds.filter((uid) => uid !== userId);
      newCount = Math.max(0, question.upvotes - 1);
    } else {
      // Add upvote (strictly 1 vote per user)
      newUpvotedIds = [...upvotedIds, userId];
      newCount = question.upvotes + 1;
    }

    const updated = await prisma.mastermindQuestion.update({
      where: { id },
      data: {
        upvotes: newCount,
        upvotedUserIds: JSON.stringify(newUpvotedIds),
      },
    });

    // Invalidate mastermind cache and broadcast realtime update
    await cacheDelPattern('mastermind:');
    broadcastRealtimeEvent('mastermind:upvoted', { id, upvotes: newCount });

    res.status(200).json({
      success: true,
      upvoted: !alreadyUpvoted,
      upvotes: newCount,
      data: updated,
    });
  } catch (error: any) {
    console.error('[upvoteMastermindQuestion]', error);
    res.status(500).json({ success: false, message: 'Failed to process upvote.' });
  }
};

// @desc    Coach / Admin answers or pins a question
// @route   PUT /api/mastermind/questions/:id/answer
export const answerMastermindQuestion = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { answer, answeredBy, isPinned } = req.body;

    const updated = await prisma.mastermindQuestion.update({
      where: { id },
      data: {
        answer: answer !== undefined ? String(answer).trim() : undefined,
        answeredBy: answeredBy ? String(answeredBy).trim() : 'UWE Command Coach',
        isAnswered: Boolean(answer && answer.trim().length > 0),
        isPinned: isPinned !== undefined ? Boolean(isPinned) : undefined,
      },
    });

    // Invalidate mastermind cache and broadcast realtime answer event
    await cacheDelPattern('mastermind:');
    broadcastRealtimeEvent('mastermind:answered', { id, answeredBy: updated.answeredBy });

    // Trigger realtime notification for student
    if (updated.isAnswered) {
      await createNotificationHelper({
        userId: updated.userId || null,
        title: `Coach answered your question in [${updated.courseSlug.toUpperCase()} Directive]`,
        message: `${updated.answeredBy || 'Coach'} answered: "${updated.question.length > 80 ? updated.question.slice(0, 77) + '...' : updated.question}"`,
        link: `/programs/${updated.courseSlug}?tab=qa`,
        type: 'MASTERMIND_ANSWER',
      });
    }

    res.status(200).json({ success: true, message: 'Coach response recorded.', data: updated });
  } catch (error: any) {
    console.error('[answerMastermindQuestion]', error);
    res.status(500).json({ success: false, message: 'Failed to update answer.' });
  }
};

// @desc    Delete a mastermind question (Admin / Coach)
// @route   DELETE /api/mastermind/questions/:id
export const deleteMastermindQuestion = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    await prisma.mastermindQuestion.delete({
      where: { id },
    });

    // Invalidate mastermind cache and broadcast realtime deletion event
    await cacheDelPattern('mastermind:');
    broadcastRealtimeEvent('mastermind:deleted', { id });

    res.status(200).json({ success: true, message: 'Question deleted.' });
  } catch (error: any) {
    console.error('[deleteMastermindQuestion]', error);
    res.status(500).json({ success: false, message: 'Failed to delete question.' });
  }
};

// @desc    Post a threaded reply to a mastermind question
// @route   POST /api/mastermind/questions/:id/replies
export const postMastermindReply = async (req: Request, res: Response): Promise<void> => {
  try {
    const questionId = req.params.id as string;
    const { body, asCoach, authorName: bodyAuthorName, authorBadge: bodyAuthorBadge } = req.body;
    const callerId = req.user?.id;
    const callerType = req.user?.type;

    if (!body || !String(body).trim()) {
      res.status(400).json({ success: false, message: 'Reply body is required.' });
      return;
    }

    const question = await prisma.mastermindQuestion.findUnique({ where: { id: questionId } });
    if (!question) {
      res.status(404).json({ success: false, message: 'Question not found.' });
      return;
    }

    // Resolve coach status: strictly requires admin session AND asCoach === true
    const isCoach = callerType === 'admin' && asCoach === true;

    // Resolve author name & badge
    let authorName = bodyAuthorName || req.user?.email || 'Operative';
    let authorBadge = bodyAuthorBadge || 'OPERATIVE';

    if (callerId) {
      if (isCoach) {
        const admin = await prisma.adminUser.findUnique({ where: { id: callerId } });
        if (admin) {
          authorName = admin.name;
          authorBadge = `COMMAND ${admin.role}`;
        }
      } else {
        const user = await prisma.user.findUnique({ where: { id: callerId } });
        if (user) {
          authorName = user.name || bodyAuthorName || 'Operative';
          authorBadge = user.rankTitle || bodyAuthorBadge || 'OPERATIVE';
        }
      }
    }

    const reply = await prisma.mastermindReply.create({
      data: {
        questionId,
        userId: callerId || null,
        authorName,
        authorBadge,
        body: String(body).trim(),
        isCoach,
      },
    });

    if (isCoach) {
      // Coach reply marks question as answered and updates timestamp
      await prisma.mastermindQuestion.update({
        where: { id: questionId },
        data: {
          isAnswered: true,
          answeredBy: authorName,
          updatedAt: new Date(),
        },
      });

      // Notify question author about coach response
      if (question.userId && question.userId !== callerId) {
        const replyPreview = body.length > 80 ? body.slice(0, 77) + '...' : body;
        await createNotificationHelper({
          userId: question.userId,
          title: `Coach replied to your question in [${question.courseSlug.toUpperCase()} Directive]`,
          message: `${authorName} replied: "${replyPreview}"`,
          link: `/programs/${question.courseSlug}?tab=qa#qa-${questionId}`,
          type: 'MASTERMIND_ANSWER',
        }).catch(() => {});
      }
    } else {
      // Student reply / follow-up: reset isAnswered to false so it re-enters UNANSWERED queue in Admin HQ!
      await prisma.mastermindQuestion.update({
        where: { id: questionId },
        data: {
          isAnswered: false,
          updatedAt: new Date(),
        },
      });
    }

    await cacheDelPattern('mastermind:');
    broadcastRealtimeEvent('mastermind:reply', {
      questionId,
      reply,
      needsCoachAttention: !isCoach,
    });

    res.status(201).json({ success: true, message: 'Reply posted.', data: reply });
  } catch (error: any) {
    console.error('[postMastermindReply]', error);
    res.status(500).json({ success: false, message: 'Failed to post reply.' });
  }
};

// @desc    Mark a threaded reply as the accepted solution
// @route   PUT /api/mastermind/questions/:id/replies/:replyId/solution
export const markReplyAsSolution = async (req: Request, res: Response): Promise<void> => {
  try {
    const questionId = req.params.id as string;
    const replyId = req.params.replyId as string;
    const callerId = req.user?.id;
    const callerType = req.user?.type;

    const question = await prisma.mastermindQuestion.findUnique({ where: { id: questionId } });
    if (!question) {
      res.status(404).json({ success: false, message: 'Question not found.' });
      return;
    }

    // Only the question author or a coach/admin may mark a solution
    const isOwner = question.userId && question.userId === callerId;
    const isAdmin = callerType === 'admin';
    if (!isOwner && !isAdmin) {
      res.status(403).json({ success: false, message: 'Only the question author or a coach may mark a solution.' });
      return;
    }

    const reply = await prisma.mastermindReply.findUnique({ where: { id: replyId } });
    if (!reply || reply.questionId !== questionId) {
      res.status(404).json({ success: false, message: 'Reply not found for this question.' });
      return;
    }

    // Toggle: if already the solution, un-mark it
    const alreadySolution = reply.isSolution;

    // Clear all existing solution flags on this question's replies
    await prisma.mastermindReply.updateMany({
      where: { questionId },
      data: { isSolution: false },
    });

    if (!alreadySolution) {
      await prisma.mastermindReply.update({
        where: { id: replyId },
        data: { isSolution: true },
      });
      await prisma.mastermindQuestion.update({
        where: { id: questionId },
        data: { isSolved: true, solutionReplyId: replyId },
      });
    } else {
      await prisma.mastermindQuestion.update({
        where: { id: questionId },
        data: { isSolved: false, solutionReplyId: null },
      });
    }

    await cacheDelPattern('mastermind:');
    broadcastRealtimeEvent('mastermind:solved', {
      questionId,
      replyId,
      isSolved: !alreadySolution,
    });

    res.status(200).json({
      success: true,
      message: alreadySolution ? 'Solution badge removed.' : 'Reply marked as solution.',
      isSolved: !alreadySolution,
    });
  } catch (error: any) {
    console.error('[markReplyAsSolution]', error);
    res.status(500).json({ success: false, message: 'Failed to update solution status.' });
  }
};
