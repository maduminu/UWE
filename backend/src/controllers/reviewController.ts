import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { cacheGet, cacheSet, cacheDelPattern } from '../config/redis';

// @desc    Get all approved reviews for a course (cached)
// @route   GET /api/reviews/:courseSlug
export const getCourseReviews = async (req: Request, res: Response): Promise<void> => {
  try {
    const courseSlug = String(req.params.courseSlug || '');
    const slug = courseSlug.trim().toLowerCase();
    const cacheKey = `reviews:${slug}`;

    const cached = await cacheGet(cacheKey);
    if (cached) {
      res.status(200).json(cached);
      return;
    }

    const reviews = await prisma.courseReview.findMany({
      where: {
        ...(slug !== 'all' ? { courseSlug: slug } : {}),
        isApproved: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const averageRating = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 5.0;

    const responsePayload = {
      success: true,
      count: reviews.length,
      averageRating: parseFloat(averageRating.toFixed(1)),
      data: reviews,
      cached: false,
    };

    await cacheSet(cacheKey, responsePayload, 1800); // 30 mins TTL
    res.status(200).json(responsePayload);
  } catch (error: any) {
    console.error('[getCourseReviews]', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve course reviews.' });
  }
};

// @desc    Submit a new student review
// @route   POST /api/reviews
export const submitReview = async (req: Request, res: Response): Promise<void> => {
  try {
    const { courseSlug, studentName, studentRole, rating, title, comment, avatarUrl, userId } = req.body;

    if (!courseSlug || !studentName || !comment || !rating) {
      res.status(400).json({ success: false, message: 'Course, Name, Rating, and Review comment are required.' });
      return;
    }

    const cleanRating = Math.max(1, Math.min(5, parseInt(rating, 10) || 5));

    const newReview = await prisma.courseReview.create({
      data: {
        courseSlug: courseSlug.trim().toLowerCase(),
        studentName: studentName.trim(),
        studentRole: studentRole ? studentRole.trim() : 'Verified Operative',
        avatarUrl: avatarUrl || null,
        rating: cleanRating,
        title: title ? title.trim() : null,
        comment: comment.trim(),
        userId: userId || null,
        isVerified: true,
        isApproved: true, // Auto-approved or moderated
      },
    });

    await cacheDelPattern('reviews:');

    res.status(201).json({
      success: true,
      message: 'Thank you for your transmission! Your review has been recorded.',
      data: newReview,
    });
  } catch (error: any) {
    console.error('[submitReview]', error);
    res.status(500).json({ success: false, message: 'Failed to submit review.' });
  }
};

// @desc    Get all reviews including pending (Admin)
// @route   GET /api/reviews
export const getAllReviews = async (_req: Request, res: Response): Promise<void> => {
  try {
    const reviews = await prisma.courseReview.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.status(200).json({ success: true, count: reviews.length, data: reviews });
  } catch (error: any) {
    console.error('[getAllReviews]', error);
    res.status(500).json({ success: false, message: 'Failed to fetch reviews.' });
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

    res.status(200).json({ success: true, message: 'Review approval status updated.', data: updated });
  } catch (error: any) {
    console.error('[toggleReviewApproval]', error);
    res.status(500).json({ success: false, message: 'Failed to update review status.' });
  }
};

// @desc    Delete review (Admin)
// @route   DELETE /api/reviews/:id
export const deleteReview = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    await prisma.courseReview.delete({ where: { id } });

    await cacheDelPattern('reviews:');

    res.status(200).json({ success: true, message: 'Review deleted.' });
  } catch (error: any) {
    console.error('[deleteReview]', error);
    res.status(500).json({ success: false, message: 'Failed to delete review.' });
  }
};
