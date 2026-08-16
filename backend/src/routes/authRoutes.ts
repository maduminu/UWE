import { Router } from 'express';
import { registerUser, loginUser, adminLogin } from '../controllers/authController';

const router = Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/admin-login', adminLogin);

export default router;
