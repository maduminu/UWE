import { Router } from 'express';
import {
  getAllJobs,
  createJob,
  updateJob,
  getAllApplications,
  createApplication,
  updateApplicationStatus,
} from '../controllers/jobController';

const router = Router();

router.get('/', getAllJobs);
router.post('/', createJob);
router.put('/:id', updateJob);

router.get('/applications', getAllApplications);
router.post('/applications', createApplication);
router.post('/apply', createApplication);      // alias for CareersPage public form
router.put('/applications/:id/status', updateApplicationStatus);

export default router;
