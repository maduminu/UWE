import { Router } from 'express';
import { getAllLeads, createLead, updateLeadStatus, recordAbandonedReminder, deleteLead } from '../controllers/leadController';
import { authenticate } from '../middlewares/authenticate';
import { requireAdmin } from '../middlewares/requireAdmin';
import { requireRole } from '../middlewares/requireRole';
import { validateBody, leadSchema } from '../middlewares/validate';
import { idempotency } from '../middlewares/idempotency';
import { verifyCaptcha } from '../middlewares/captcha';

const router = Router();

// Public lead submission (idempotency, CAPTCHA, and Zod validation)
router.post('/', idempotency({ scope: 'leads' }), verifyCaptcha(), validateBody(leadSchema), createLead);

// Admin-only CRM leads viewing, status updates, and management (SUPER_ADMIN, COMMANDER, RECRUITER)
router.get('/', authenticate, requireAdmin, requireRole(['SUPER_ADMIN', 'COMMANDER', 'RECRUITER']), getAllLeads);
router.put('/:id/status', authenticate, requireAdmin, requireRole(['SUPER_ADMIN', 'COMMANDER', 'RECRUITER']), updateLeadStatus);
router.post('/:id/abandoned-reminder', authenticate, requireAdmin, requireRole(['SUPER_ADMIN', 'COMMANDER', 'RECRUITER']), recordAbandonedReminder);
router.delete('/:id', authenticate, requireAdmin, requireRole(['SUPER_ADMIN', 'COMMANDER']), deleteLead);

export default router;

