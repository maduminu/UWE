import { Router } from 'express';
import {
  getMastermindQuestions,
  postMastermindQuestion,
  upvoteMastermindQuestion,
  answerMastermindQuestion,
  deleteMastermindQuestion,
  postMastermindReply,
  markReplyAsSolution,
} from '../controllers/mastermindController';
import { authenticate } from '../middlewares/authenticate';
import { requireAdmin } from '../middlewares/requireAdmin';
import { requireRole } from '../middlewares/requireRole';
import { idempotency } from '../middlewares/idempotency';
import { communitySubmissionLimiter, upvoteLimiter } from '../middlewares/abuseLimiter';

const router = Router();

// Public / Authenticated read
router.get('/questions', getMastermindQuestions);

// Student question creation & upvoting (requires authentication, rate limited & idempotent)
router.post('/questions', authenticate, communitySubmissionLimiter, idempotency({ scope: 'mastermind_q' }), postMastermindQuestion);
router.post('/questions/:id/upvote', authenticate, upvoteLimiter, idempotency({ scope: 'mastermind_upvote' }), upvoteMastermindQuestion);

// Threaded replies (any authenticated user can reply)
router.post('/questions/:id/replies', authenticate, communitySubmissionLimiter, idempotency({ scope: 'mastermind_reply' }), postMastermindReply);

// Mark reply as solution (question author or coach/admin)
router.put('/questions/:id/replies/:replyId/solution', authenticate, markReplyAsSolution);

// Coach / Admin response & pin
router.put('/questions/:id/answer', authenticate, requireAdmin, requireRole(['SUPER_ADMIN', 'COMMANDER', 'COACH']), answerMastermindQuestion);
router.delete('/questions/:id', authenticate, requireAdmin, requireRole(['SUPER_ADMIN', 'COMMANDER']), deleteMastermindQuestion);

export default router;

