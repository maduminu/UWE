import { Router } from 'express';
import { getUserProgress, saveProgress } from '../controllers/videoProgressController';

const router = Router();

router.get('/:userId', getUserProgress);
router.post('/', saveProgress);

export default router;
