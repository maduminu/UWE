import { Request, Response } from 'express';
import { prisma } from '../config/db';

// @desc    Get questions for a specific course mastermind (supports incremental polling with ?since=)
// @route   GET /api/mastermind/questions?courseSlug=bmb&since=ISO_DATE
export const getMastermindQuestions = async (req: Request, res: Response): Promise<void> => {
  try {
    const courseSlug = String(req.query.courseSlug || 'bmb').trim().toLowerCase();
    const since = req.query.since ? new Date(String(req.query.since)) : null;

    const whereClause: any = { courseSlug };
    if (since && !isNaN(since.getTime())) {
      whereClause.updatedAt = { gt: since };
    }

    const questions = await prisma.mastermindQuestion.findMany({
      where: whereClause,
      orderBy: [
        { isPinned: 'desc' },
        { upvotes: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    res.status(200).json({
      success: true,
      count: questions.length,
      serverTime: new Date().toISOString(),
      data: questions,
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
    const { id } = req.params;
    const userId = req.user?.id || req.user?.email || req.ip || 'guest-operative';

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
    const { id } = req.params;
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
    const { id } = req.params;

    await prisma.mastermindQuestion.delete({
      where: { id },
    });

    res.status(200).json({ success: true, message: 'Question deleted.' });
  } catch (error: any) {
    console.error('[deleteMastermindQuestion]', error);
    res.status(500).json({ success: false, message: 'Failed to delete question.' });
  }
};
