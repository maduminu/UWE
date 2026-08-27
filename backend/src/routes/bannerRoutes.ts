import { Router } from 'express';
import { getActiveBanner, createBanner, updateBanner } from '../controllers/bannerController';
import { authenticate } from '../middlewares/authenticate';
import { requireAdmin } from '../middlewares/requireAdmin';
import { requireRole } from '../middlewares/requireRole';
import { validateBody, bannerSchema } from '../middlewares/validate';

const router = Router();

// Public active alert banner
router.get('/active', getActiveBanner);

// Admin banner management (SUPER_ADMIN & COMMANDER only)
router.post('/', authenticate, requireAdmin, requireRole(['SUPER_ADMIN', 'COMMANDER']), validateBody(bannerSchema), createBanner);
router.put('/:id', authenticate, requireAdmin, requireRole(['SUPER_ADMIN', 'COMMANDER']), updateBanner);

export default router;
