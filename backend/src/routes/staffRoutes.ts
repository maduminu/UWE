import { Router } from 'express';
import { getAllStaff, createStaff, updateStaff, deleteStaff } from '../controllers/staffController';
import { authenticate } from '../middlewares/authenticate';
import { requireAdmin } from '../middlewares/requireAdmin';
import { requireRole } from '../middlewares/requireRole';
import { validate, staffSchema } from '../middlewares/validate';

const router = Router();

// Public staff directory
router.get('/', getAllStaff);

// Admin-only staff mutations (SUPER_ADMIN & COMMANDER only)
router.post('/', authenticate, requireAdmin, requireRole(['SUPER_ADMIN', 'COMMANDER']), validate(staffSchema), createStaff);
router.put('/:id', authenticate, requireAdmin, requireRole(['SUPER_ADMIN', 'COMMANDER']), validate(staffSchema.partial()), updateStaff);
router.delete('/:id', authenticate, requireAdmin, requireRole(['SUPER_ADMIN', 'COMMANDER']), deleteStaff);

export default router;
