import { Router } from 'express';
import {
  registerUser,
  loginUser,
  adminLogin,
  refreshAuthToken,
  logoutUser,
  revokeAllSessions,
} from '../controllers/authController';
import { validateBody, registerSchema, loginSchema, adminLoginSchema, refreshTokenSchema } from '../middlewares/validate';
import { authenticate } from '../middlewares/authenticate';

const router = Router();

router.post('/register', validateBody(registerSchema), registerUser);
router.post('/login', validateBody(loginSchema), loginUser);
router.post('/admin-login', validateBody(adminLoginSchema), adminLogin);
router.post('/refresh', validateBody(refreshTokenSchema), refreshAuthToken);
router.post('/logout', logoutUser);
router.post('/revoke-all', authenticate, revokeAllSessions);

export default router;
