import { Router } from 'express';
import { getActiveBanner, createBanner, updateBanner, getAllBanners } from '../controllers/bannerController';
import { authenticate } from '../middlewares/authenticate';
import { requireAdmin } from '../middlewares/requireAdmin';
import { requireRole } from '../middlewares/requireRole';
import { validateBody, bannerSchema } from '../middlewares/validate';

const router = Router();

// Public active alert banner
router.get('/active', getActiveBanner);

// Admin banner management
router.get('/', authenticate, requireAdmin, requireRole(['SUPER_ADMIN', 'COMMANDER', 'COACH', 'RECRUITER']), getAllBanners);
router.post('/', authenticate, requireAdmin, requireRole(['SUPER_ADMIN', 'COMMANDER', 'COACH']), validateBody(bannerSchema), createBanner);
router.put('/:id', authenticate, requireAdmin, requireRole(['SUPER_ADMIN', 'COMMANDER', 'COACH']), updateBanner);

export default router;
