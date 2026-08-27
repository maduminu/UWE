import { Router } from 'express';
import { getInstructors, createInstructor, updateInstructor, deleteInstructor } from '../controllers/instructorController';
import { authenticate } from '../middlewares/authenticate';
import { requireAdmin } from '../middlewares/requireAdmin';
import { requireRole } from '../middlewares/requireRole';
import { validate, instructorSchema } from '../middlewares/validate';

const router = Router();

// Public faculty directory
router.get('/', getInstructors);

// Admin-only faculty management (SUPER_ADMIN, COMMANDER, COACH)
router.post('/', authenticate, requireAdmin, requireRole(['SUPER_ADMIN', 'COMMANDER', 'COACH']), validate(instructorSchema), createInstructor);
router.put('/:id', authenticate, requireAdmin, requireRole(['SUPER_ADMIN', 'COMMANDER', 'COACH']), validate(instructorSchema.partial()), updateInstructor);
router.delete('/:id', authenticate, requireAdmin, requireRole(['SUPER_ADMIN', 'COMMANDER', 'COACH']), deleteInstructor);

export default router;
