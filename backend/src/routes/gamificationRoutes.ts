import { Router } from 'express';
import { getLeaderboard, getUserGamificationProfile, awardXp } from '../controllers/gamificationController';
import { authenticate } from '../middlewares/authenticate';

const router = Router();

// Public / cached leaderboard
router.get('/leaderboard', getLeaderboard);

// User profile & XP progress
router.get('/profile/:userId', getUserGamificationProfile);

// Award XP (Authenticated student or coach)
router.post('/award-xp', authenticate, awardXp);

export default router;
