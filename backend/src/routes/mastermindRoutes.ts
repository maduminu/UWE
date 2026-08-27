import { Router } from 'express';
import {
  getMastermindQuestions,
  postMastermindQuestion,
  upvoteMastermindQuestion,
  answerMastermindQuestion,
  deleteMastermindQuestion,
} from '../controllers/mastermindController';
import { authenticate } from '../middlewares/authenticate';
import { requireAdmin } from '../middlewares/requireAdmin';
import { requireRole } from '../middlewares/requireRole';

const router = Router();

// Public / Authenticated read
router.get('/questions', getMastermindQuestions);

// Student question creation & upvoting (requires authentication)
router.post('/questions', authenticate, postMastermindQuestion);
router.post('/questions/:id/upvote', authenticate, upvoteMastermindQuestion);

// Coach / Admin response & pin
router.put('/questions/:id/answer', authenticate, requireAdmin, requireRole(['SUPER_ADMIN', 'COMMANDER', 'COACH']), answerMastermindQuestion);
router.delete('/questions/:id', authenticate, requireAdmin, requireRole(['SUPER_ADMIN', 'COMMANDER']), deleteMastermindQuestion);

export default router;

