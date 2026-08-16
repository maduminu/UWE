import { Router } from 'express';
import { getActiveBanner, createBanner, updateBanner } from '../controllers/bannerController';

const router = Router();

router.get('/active', getActiveBanner);
router.post('/', createBanner);
router.put('/:id', updateBanner);

export default router;
