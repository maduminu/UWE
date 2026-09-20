import express from 'express';
import { authenticate } from '../middlewares/authenticate';
import { requireAdmin } from '../middlewares/requireAdmin';
import { requireRole } from '../middlewares/requireRole';
import {
  checkNumber,
  lockNumber,
  logCall,
  getCallHistory,
  getAllCallLogs,
  getCallStats,
  getDailySheet,
  deleteCallLog,
} from '../controllers/callLogController';

const router = express.Router();

// All routes require authentication + admin type
router.use(authenticate, requireAdmin);

// ── Number check + lock (before calling) ──────────────────────────────────
router.post('/check-number', requireRole(['SUPER_ADMIN', 'COMMANDER', 'RECRUITER']), checkNumber);
router.post('/lock/:leadId', requireRole(['SUPER_ADMIN', 'COMMANDER', 'RECRUITER']), lockNumber);

// ── Log a call result ─────────────────────────────────────────────────────
router.post('/log', requireRole(['SUPER_ADMIN', 'COMMANDER', 'RECRUITER']), logCall);

// ── Read endpoints ────────────────────────────────────────────────────────
router.get('/stats',          requireRole(['SUPER_ADMIN', 'COMMANDER', 'RECRUITER']), getCallStats);
router.get('/daily-sheet',    requireRole(['SUPER_ADMIN', 'COMMANDER', 'RECRUITER']), getDailySheet);
router.get('/lead/:leadId',   requireRole(['SUPER_ADMIN', 'COMMANDER', 'RECRUITER']), getCallHistory);
router.get('/',               requireRole(['SUPER_ADMIN', 'COMMANDER']),              getAllCallLogs);

// ── Delete (SUPER_ADMIN only) ─────────────────────────────────────────────
router.delete('/:id', requireRole(['SUPER_ADMIN']), deleteCallLog);

export default router;
