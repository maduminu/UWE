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

const router = Router();

// Public validation and redemption endpoints for student checkout
router.post('/validate', validateCoupon);
router.post('/redeem', redeemCoupon);

// Admin-only coupon management (SUPER_ADMIN, COMMANDER, RECRUITER)
router.get('/', authenticate, requireAdmin, requireRole(['SUPER_ADMIN', 'COMMANDER', 'RECRUITER']), getAllCoupons);
router.post('/', authenticate, requireAdmin, requireRole(['SUPER_ADMIN', 'COMMANDER', 'RECRUITER']), validateBody(couponSchema), createCoupon);
router.put('/:id', authenticate, requireAdmin, requireRole(['SUPER_ADMIN', 'COMMANDER', 'RECRUITER']), updateCoupon);
router.delete('/:id', authenticate, requireAdmin, requireRole(['SUPER_ADMIN', 'COMMANDER', 'RECRUITER']), deleteCoupon);

export default router;
