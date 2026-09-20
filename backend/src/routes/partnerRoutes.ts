import { Router } from 'express';
import {
  getPartners,
  getPartnerById,
  createPartner,
  updatePartner,
  deletePartner,
} from '../controllers/partnerController';
import { authenticate } from '../middlewares/authenticate';
import { requireAdmin } from '../middlewares/requireAdmin';
import { requireRole } from '../middlewares/requireRole';

const router = Router();

// Public routes
router.get('/', getPartners);
router.get('/:id', getPartnerById);

// Admin-only management
router.post(
  '/',
  authenticate,
  requireAdmin,
  requireRole(['SUPER_ADMIN', 'COMMANDER', 'COACH']),
  createPartner
);
router.put(
  '/:id',
  authenticate,
  requireAdmin,
  requireRole(['SUPER_ADMIN', 'COMMANDER', 'COACH']),
  updatePartner
);
router.delete(
  '/:id',
  authenticate,
  requireAdmin,
  requireRole(['SUPER_ADMIN', 'COMMANDER']),
  deletePartner
);

export default router;
