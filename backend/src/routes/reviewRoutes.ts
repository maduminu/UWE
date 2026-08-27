import { Router } from 'express';
import { getCourseReviews, submitReview, getAllReviews, toggleReviewApproval, deleteReview } from '../controllers/reviewController';
import { authenticate } from '../middlewares/authenticate';
import { requireAdmin } from '../middlewares/requireAdmin';
import { requireRole } from '../middlewares/requireRole';
import { optionalAuth } from '../middlewares/optionalAuth';
import { validateBody, reviewSchema } from '../middlewares/validate';

const router = Router();

// Public course reviews list and submission
router.get('/:courseSlug', getCourseReviews);
router.post('/', optionalAuth, validateBody(reviewSchema), submitReview);

// Admin-only moderation endpoints (SUPER_ADMIN, COMMANDER, COACH, RECRUITER)
router.get('/', authenticate, requireAdmin, requireRole(['SUPER_ADMIN', 'COMMANDER', 'COACH', 'RECRUITER']), getAllReviews);
router.put('/:id', authenticate, requireAdmin, requireRole(['SUPER_ADMIN', 'COMMANDER', 'COACH', 'RECRUITER']), toggleReviewApproval);
router.delete('/:id', authenticate, requireAdmin, requireRole(['SUPER_ADMIN', 'COMMANDER', 'COACH', 'RECRUITER']), deleteReview);

export default router;
