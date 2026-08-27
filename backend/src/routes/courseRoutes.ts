import { Router } from 'express';
import {
  getAllCourses,
  getCourseBySlug,
  updateCourse,
  updateBatch,
  updateBatchSeats,
  createCourse,
} from '../controllers/courseController';
import { authenticate } from '../middlewares/authenticate';
import { requireAdmin } from '../middlewares/requireAdmin';
import { requireRole } from '../middlewares/requireRole';
import { validate, batchUpdateSchema } from '../middlewares/validate';

const router = Router();

// Public course catalog
router.get('/', getAllCourses);
router.get('/:slug', getCourseBySlug);

// Admin-only management endpoints (SUPER_ADMIN & COMMANDER only)
router.post('/', authenticate, requireAdmin, requireRole(['SUPER_ADMIN', 'COMMANDER']), createCourse);
router.put('/:id', authenticate, requireAdmin, requireRole(['SUPER_ADMIN', 'COMMANDER']), updateCourse);
router.put('/batches/:batchId', authenticate, requireAdmin, requireRole(['SUPER_ADMIN', 'COMMANDER']), validate(batchUpdateSchema), updateBatch);
router.put('/batches/:batchId/seats', authenticate, requireAdmin, requireRole(['SUPER_ADMIN', 'COMMANDER']), updateBatchSeats);

export default router;
