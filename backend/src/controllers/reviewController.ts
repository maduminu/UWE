import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { cacheGetOrSWR, cacheDelPattern, buildCanonicalCacheKey } from '../config/redis';
import { sendError, ErrorCode } from '../utils/apiResponse';
import { logger } from '../utils/logger';
import { broadcastRealtimeEvent } from '../utils/realtimeEmitter';
import { createNotificationHelper } from './notificationController';

// @desc    Get all approved reviews for a course (SWR Cached with query param isolation)
// @route   GET /api/reviews/:courseSlug
export const getCourseReviews = async (req: Request, res: Response): Promise<void> => {
  try {
    const rawCourseSlug = req.params.courseSlug || req.query.directive || req.query.courseSlug || 'all';
    const slug = String(rawCourseSlug).trim().toLowerCase();

    const ratingParam = req.query.rating ? parseInt(String(req.query.rating), 10) : undefined;
    const pageParam = req.query.page ? parseInt(String(req.query.page), 10) : undefined;
    const limitParam = req.query.limit ? parseInt(String(req.query.limit), 10) : undefined;

    const queryParams: Record<string, any> = {};
    if (ratingParam && !isNaN(ratingParam)) queryParams.rating = ratingParam;
    if (pageParam && !isNaN(pageParam)) queryParams.page = pageParam;
    if (limitParam && !isNaN(limitParam)) queryParams.limit = limitParam;

    const page = Math.max(1, pageParam && !isNaN(pageParam) ? pageParam : 1);
    const limit = Math.min(50, Math.max(1, limitParam && !isNaN(limitParam) ? limitParam : 20));
    const skip = (page - 1) * limit;

    const cacheKey = buildCanonicalCacheKey('reviews', slug, {
      ...(ratingParam && !isNaN(ratingParam) ? { rating: ratingParam } : {}),
      page,
      limit,
    });

    const result = await cacheGetOrSWR(
      cacheKey,
      async () => {
        const whereClause: any = {
          ...(slug !== 'all' ? { courseSlug: slug } : {}),
          isApproved: true,
        };
        if (ratingParam && !isNaN(ratingParam)) {
          whereClause.rating = ratingParam;
        }

        const [reviews, totalCount, allApproved] = await Promise.all([
          prisma.courseReview.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: skip,
          }),
          prisma.courseReview.count({
            where: whereClause,
          }),
          prisma.courseReview.findMany({
            where: {
              ...(slug !== 'all' ? { courseSlug: slug } : {}),
              isApproved: true,
            },
            select: { rating: true },
          }),
        ]);

        // Compute rating distribution across all approved reviews for this course
        const ratingDistribution: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        allApproved.forEach((r) => {
          const star = Math.min(5, Math.max(1, Math.round(r.rating || 5)));
          ratingDistribution[star] = (ratingDistribution[star] || 0) + 1;
        });

        // Compute mathematical average across all approved reviews for this course
        const averageRating = allApproved.length > 0
          ? allApproved.reduce((sum, r) => sum + r.rating, 0) / allApproved.length
          : 5.0;

        return {
          success: true,
          count: reviews.length,
          totalCount: totalCount,
          averageRating: parseFloat(averageRating.toFixed(1)),
          ratingDistribution,
          pagination: {
            page,
            limit,
            total: totalCount,
            totalPages: Math.ceil(totalCount / limit) || 1,
            hasMore: skip + reviews.length < totalCount,
          },
          data: reviews,
        };
      },
      { freshTtlSeconds: 60, staleTtlSeconds: 1800 }
    );

    res.setHeader('X-Cache', result.cached ? (result.stale ? 'STALE' : 'HIT') : 'MISS');
    res.status(200).json({
      ...result.data,
      cached: result.cached,
      stale: result.stale,
    });
  } catch (error: any) {
    logger.error(`[getCourseReviews] ${error.message}`, 'REVIEWS');
    sendError(res, 500, ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to retrieve course reviews.', req);
  }
};

// @desc    Submit a new student review
// @route   POST /api/reviews
export const submitReview = async (req: Request, res: Response): Promise<void> => {
  try {
    const { courseSlug, studentName, studentRole, rating, title, comment, avatarUrl, userId } = req.body;

    if (!courseSlug || !studentName || !comment || rating === undefined || rating === null) {
      sendError(res, 400, ErrorCode.BAD_REQUEST, 'Course, Name, Rating, and Review comment are required.', req);
      return;
    }

    const parsedRating = parseInt(String(rating), 10);
    if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'Rating must be an integer between 1 and 5.', req);
      return;
    }

    const newReview = await prisma.courseReview.create({
      data: {
        courseSlug: String(courseSlug).trim().toLowerCase(),
        studentName: String(studentName).trim(),
        studentRole: studentRole ? String(studentRole).trim() : 'Verified Operative',
        avatarUrl: avatarUrl ? String(avatarUrl).trim() : null,
        rating: parsedRating,
        title: title ? String(title).trim() : null,
        comment: String(comment).trim(),
        userId: (req as any).user?.id || (userId ? String(userId).trim() : null),
        isVerified: true,
        isApproved: true, // Auto-approved or moderated
      },
    });

    await cacheDelPattern('reviews:');
    broadcastRealtimeEvent('review:updated', { courseSlug: newReview.courseSlug, reviewId: newReview.id });

    res.status(201).json({
      success: true,
      message: 'Thank you for your transmission! Your review has been recorded.',
      data: newReview,
    });
  } catch (error: any) {
    logger.error(`[submitReview] ${error.message}`, 'REVIEWS');
    sendError(res, 500, ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to submit review.', req);
  }
};

// @desc    Get all reviews including pending (Admin)
// @route   GET /api/reviews
export const getAllReviews = async (req: Request, res: Response): Promise<void> => {
  try {
    const reviews = await prisma.courseReview.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.status(200).json({ success: true, count: reviews.length, data: reviews });
  } catch (error: any) {
    logger.error(`[getAllReviews] ${error.message}`, 'REVIEWS');
    sendError(res, 500, ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to fetch reviews.', req);
  }
};

// @desc    Toggle review approval (Admin)
// @route   PUT /api/reviews/:id
export const toggleReviewApproval = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { isApproved } = req.body;

    const updated = await prisma.courseReview.update({
      where: { id },
      data: { isApproved: Boolean(isApproved) },
    });

    await cacheDelPattern('reviews:');
    broadcastRealtimeEvent('review:updated', { courseSlug: updated.courseSlug, reviewId: id, isApproved: updated.isApproved });

    if (updated.isApproved && updated.userId) {
      await createNotificationHelper({
        userId: updated.userId,
        title: 'Your review has been verified and published',
        message: `Your transmission for ${updated.courseSlug.toUpperCase()} has been approved and is now live on the directive archive.`,
        link: `/programs/${updated.courseSlug}?tab=reviews`,
        type: 'REVIEW_APPROVED',
      });
    }

    res.status(200).json({ success: true, message: 'Review approval status updated.', data: updated });
  } catch (error: any) {
    if (error.code === 'P2025') {
      sendError(res, 404, ErrorCode.NOT_FOUND, 'Review record not found.', req);
      return;
    }
    logger.error(`[toggleReviewApproval] ${error.message}`, 'REVIEWS');
    sendError(res, 500, ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to update review status.', req);
  }
};

// @desc    Delete review (Admin)
// @route   DELETE /api/reviews/:id
export const deleteReview = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.courseReview.findUnique({ where: { id }, select: { courseSlug: true } });
    await prisma.courseReview.delete({ where: { id } });

    await cacheDelPattern('reviews:');
    broadcastRealtimeEvent('review:updated', { courseSlug: existing?.courseSlug, reviewId: id, deleted: true });

    res.status(200).json({ success: true, message: 'Review deleted.' });
  } catch (error: any) {
    if (error.code === 'P2025') {
      sendError(res, 404, ErrorCode.NOT_FOUND, 'Review record not found.', req);
      return;
    }
    logger.error(`[deleteReview] ${error.message}`, 'REVIEWS');
    sendError(res, 500, ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to delete review.', req);
  }
};

// @desc    Get top 5-star testimonials across all courses (public, for homepage marquee)
// @route   GET /api/reviews/testimonials/top
export const getTopTestimonials = async (req: Request, res: Response): Promise<void> => {
  try {
    const cacheKey = 'reviews:testimonials:top';

    const result = await cacheGetOrSWR(
      cacheKey,
      async () => {
        const reviews = await prisma.courseReview.findMany({
          where: { rating: 5, isApproved: true },
          orderBy: { createdAt: 'desc' },
          take: 24,
        });
        return { success: true, count: reviews.length, data: reviews };
      },
      { freshTtlSeconds: 300, staleTtlSeconds: 1800 }
    );

    res.setHeader('X-Cache', result.cached ? (result.stale ? 'STALE' : 'HIT') : 'MISS');
    res.status(200).json({ ...result.data, cached: result.cached });
  } catch (error: any) {
    logger.error(`[getTopTestimonials] ${error.message}`, 'REVIEWS');
    sendError(res, 500, ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to retrieve testimonials.', req);
  }
};

