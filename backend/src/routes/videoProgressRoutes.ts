import { Router } from 'express';
import { getUserProgress, saveProgress } from '../controllers/videoProgressController';
import { authenticate } from '../middlewares/authenticate';

const router = Router();

router.use(authenticate);

// Get progress (student own data or admin)
router.get('/:userId', (req, res, next) => {
  if (req.user?.type === 'admin' || req.user?.id === req.params.userId) {
    return getUserProgress(req, res);
  }
  res.status(403).json({ success: false, message: 'Access Forbidden: Cannot access progress of another user.' });
});

// Save progress (student own data or admin)
router.post('/', (req, res, next) => {
  if (req.user?.type === 'admin' || req.user?.id === req.body.userId) {
    return saveProgress(req, res);
  }
  res.status(403).json({ success: false, message: 'Access Forbidden: Cannot update progress for another user.' });
});

export default router;
