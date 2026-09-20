import { Router } from 'express';
import {
  validateCoupon,
  redeemCoupon,
  getAllCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
} from '../controllers/couponController';
import { authenticate } from '../middlewares/authenticate';
import { requireAdmin } from '../middlewares/requireAdmin';
import { requireRole } from '../middlewares/requireRole';
import { validateBody, couponSchema } from '../middlewares/validate';
import { publicSubmissionLimiter } from '../middlewares/abuseLimiter';

const router = Router();

// Public validation and redemption endpoints for student checkout (rate-limited against brute force)
router.post('/validate', publicSubmissionLimiter, validateCoupon);
router.post('/redeem', publicSubmissionLimiter, redeemCoupon);

// Admin-only coupon management (SUPER_ADMIN, COMMANDER, RECRUITER)
router.get('/', authenticate, requireAdmin, requireRole(['SUPER_ADMIN', 'COMMANDER', 'RECRUITER']), getAllCoupons);
router.post('/', authenticate, requireAdmin, requireRole(['SUPER_ADMIN', 'COMMANDER', 'RECRUITER']), validateBody(couponSchema), createCoupon);
router.put('/:id', authenticate, requireAdmin, requireRole(['SUPER_ADMIN', 'COMMANDER', 'RECRUITER']), updateCoupon);
router.delete('/:id', authenticate, requireAdmin, requireRole(['SUPER_ADMIN', 'COMMANDER', 'RECRUITER']), deleteCoupon);

export default router;
