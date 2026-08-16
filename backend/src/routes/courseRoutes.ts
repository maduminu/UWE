import { Router } from 'express';
import { getAllCourses, getCourseBySlug, updateCourse, updateBatchSeats, createCourse } from '../controllers/courseController';

const router = Router();

router.get('/', getAllCourses);
router.post('/', createCourse);
router.get('/:slug', getCourseBySlug);
router.put('/:id', updateCourse);
router.put('/batches/:batchId/seats', updateBatchSeats);

export default router;
