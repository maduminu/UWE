import { Router } from 'express';
import {
  getProgramVideos,
  createSeries,
  updateSeries,
  deleteSeries,
  createModule,
  deleteModule,
} from '../controllers/programVideoController';
import { authenticate } from '../middlewares/authenticate';
import { requireAdmin } from '../middlewares/requireAdmin';
import { requireRole } from '../middlewares/requireRole';

const router = Router();

// Public video module series list (free previews vs gated content handled client/token side)
router.get('/', getProgramVideos);

// Admin-only curriculum creation & management (SUPER_ADMIN, COMMANDER, COACH)
router.post('/series', authenticate, requireAdmin, requireRole(['SUPER_ADMIN', 'COMMANDER', 'COACH']), createSeries);
router.put('/series/:id', authenticate, requireAdmin, requireRole(['SUPER_ADMIN', 'COMMANDER', 'COACH']), updateSeries);
router.delete('/series/:id', authenticate, requireAdmin, requireRole(['SUPER_ADMIN', 'COMMANDER', 'COACH']), deleteSeries);
router.post('/modules', authenticate, requireAdmin, requireRole(['SUPER_ADMIN', 'COMMANDER', 'COACH']), createModule);
router.delete('/modules/:id', authenticate, requireAdmin, requireRole(['SUPER_ADMIN', 'COMMANDER', 'COACH']), deleteModule);

export default router;
