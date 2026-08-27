import { Router } from 'express';
import {
  getAllPaymentSlips,
  createPaymentSlip,
  updateSlipStatus,
  deleteSlip,
  getSlipImageUrl,
  viewSlipImage,
} from '../controllers/paymentSlipController';
import { authenticate } from '../middlewares/authenticate';
import { requireAdmin } from '../middlewares/requireAdmin';
import { requireRole } from '../middlewares/requireRole';
import { validateBody, paymentSlipSchema } from '../middlewares/validate';

const router = Router();

// Public: student submits bank payment slip with server-side magic byte validation
router.post('/', validateBody(paymentSlipSchema), createPaymentSlip);

// ── Signed receipt viewer ───────────────────────────────────────────────────
// No auth middleware — the HMAC signed token IS the proof of access.
// Short-lived (15-min) and scoped to a single slip ID.
router.get('/:id/view', viewSlipImage);

// ── Admin-only endpoints ────────────────────────────────────────────────────
const adminGuard = [authenticate, requireAdmin, requireRole(['SUPER_ADMIN', 'COMMANDER', 'RECRUITER'])];

// List slips (slipUrl redacted — returns hasSlipImage boolean only)
router.get('/', ...adminGuard, getAllPaymentSlips);

// Get a short-lived signed URL for a specific slip's receipt image
router.get('/:id/image-url', ...adminGuard, getSlipImageUrl);

// Verify or reject a slip
router.put('/:id/status', ...adminGuard, updateSlipStatus);

// Delete a slip record
router.delete('/:id', ...adminGuard, deleteSlip);

export default router;
