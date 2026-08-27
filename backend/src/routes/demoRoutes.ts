import { Router } from 'express';
import { getAllDemos, createDemo, updateDemo, deleteDemo } from '../controllers/demoController';
import { authenticate } from '../middlewares/authenticate';
import { requireAdmin } from '../middlewares/requireAdmin';
import { requireRole } from '../middlewares/requireRole';

const router = Router();

// Public media reels
router.get('/', getAllDemos);

// Admin demo video management (SUPER_ADMIN, COMMANDER, COACH)
router.post('/', authenticate, requireAdmin, requireRole(['SUPER_ADMIN', 'COMMANDER', 'COACH']), createDemo);
router.put('/:id', authenticate, requireAdmin, requireRole(['SUPER_ADMIN', 'COMMANDER', 'COACH']), updateDemo);
router.delete('/:id', authenticate, requireAdmin, requireRole(['SUPER_ADMIN', 'COMMANDER', 'COACH']), deleteDemo);

export default router;
