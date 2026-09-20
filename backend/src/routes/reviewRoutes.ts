import { Router } from 'express';
import { getCourseReviews, submitReview, getAllReviews, toggleReviewApproval, deleteReview, getTopTestimonials } from '../controllers/reviewController';
import { authenticate } from '../middlewares/authenticate';
import { requireAdmin } from '../middlewares/requireAdmin';
import { requireRole } from '../middlewares/requireRole';
import { optionalAuth } from '../middlewares/optionalAuth';
import { validateBody, reviewSchema } from '../middlewares/validate';
import { idempotency } from '../middlewares/idempotency';
import { verifyCaptcha } from '../middlewares/captcha';

const router = Router();

// Public testimonials for homepage marquee (must come BEFORE /:courseSlug param)
router.get('/testimonials/top', getTopTestimonials);

// Public course reviews list and submission (with idempotency and CAPTCHA)
router.get('/:courseSlug', getCourseReviews);
router.post('/', idempotency({ scope: 'reviews' }), verifyCaptcha(), optionalAuth, validateBody(reviewSchema), submitReview);

// Admin-only moderation endpoints (SUPER_ADMIN, COMMANDER, COACH, RECRUITER)
router.get('/', authenticate, requireAdmin, requireRole(['SUPER_ADMIN', 'COMMANDER', 'COACH', 'RECRUITER']), getAllReviews);
router.put('/:id', authenticate, requireAdmin, requireRole(['SUPER_ADMIN', 'COMMANDER', 'COACH', 'RECRUITER']), toggleReviewApproval);
router.delete('/:id', authenticate, requireAdmin, requireRole(['SUPER_ADMIN', 'COMMANDER', 'COACH', 'RECRUITER']), deleteReview);

export default router;
