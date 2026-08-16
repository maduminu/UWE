import { Router } from 'express';
import {
  getProgramVideos,
  createSeries,
  createModule,
  deleteModule,
} from '../controllers/programVideoController';

const router = Router();

router.get('/', getProgramVideos);
router.post('/series', createSeries);
router.post('/modules', createModule);
router.delete('/modules/:id', deleteModule);

export default router;
