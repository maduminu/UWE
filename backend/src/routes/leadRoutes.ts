import { Router } from 'express';
import { getAllLeads, createLead, updateLeadStatus } from '../controllers/leadController';

const router = Router();

router.get('/', getAllLeads);
router.post('/', createLead);
router.put('/:id/status', updateLeadStatus);

export default router;
