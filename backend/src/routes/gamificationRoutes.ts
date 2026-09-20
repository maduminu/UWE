import { Router } from 'express';
import { getLeaderboard, getUserGamificationProfile, awardXp } from '../controllers/gamificationController';
import { authenticate } from '../middlewares/authenticate';

const router = Router();

// Public / cached leaderboard
router.get('/leaderboard', getLeaderboard);

// User gamification profile — authenticated; non-admins may only read their own profile
router.get('/profile/:userId', authenticate, getUserGamificationProfile);

// Award XP (Authenticated student or coach/admin)
router.post('/award-xp', authenticate, awardXp);

export default router;
