import { Router } from 'express';
import {
  getAllJobs,
  createJob,
  updateJob,
  getAllApplications,
  createApplication,
  updateApplicationStatus,
} from '../controllers/jobController';
import { authenticate } from '../middlewares/authenticate';
import { requireAdmin } from '../middlewares/requireAdmin';
import { requireRole } from '../middlewares/requireRole';
import { validateBody, jobApplicationSchema } from '../middlewares/validate';

const router = Router();

// Public job vacancy catalog
router.get('/', getAllJobs);

// Public candidate application submissions
router.post('/apply', validateBody(jobApplicationSchema), createApplication);
router.post('/applications', validateBody(jobApplicationSchema), createApplication);

// Admin-only job vacancies and applicants management (SUPER_ADMIN, COMMANDER, RECRUITER)
router.post('/', authenticate, requireAdmin, requireRole(['SUPER_ADMIN', 'COMMANDER', 'RECRUITER']), createJob);
router.put('/:id', authenticate, requireAdmin, requireRole(['SUPER_ADMIN', 'COMMANDER', 'RECRUITER']), updateJob);
router.get('/applications', authenticate, requireAdmin, requireRole(['SUPER_ADMIN', 'COMMANDER', 'RECRUITER']), getAllApplications);
router.put('/applications/:id/status', authenticate, requireAdmin, requireRole(['SUPER_ADMIN', 'COMMANDER', 'RECRUITER']), updateApplicationStatus);

export default router;
