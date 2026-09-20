import { Router } from 'express';
import {
  registerUser,
  loginUser,
  adminLogin,
  refreshAuthToken,
  logoutUser,
  revokeAllSessions,
  updateAdminRole,
} from '../controllers/authController';
import { validateBody, registerSchema, loginSchema, adminLoginSchema, refreshTokenSchema } from '../middlewares/validate';
import { authenticate } from '../middlewares/authenticate';
import { requireAdmin } from '../middlewares/requireAdmin';
import { requireRole } from '../middlewares/requireRole';

const router = Router();

// Public auth endpoints (sets HttpOnly refresh token cookie on login/register)
router.post('/register', validateBody(registerSchema), registerUser);
router.post('/login', validateBody(loginSchema), loginUser);
router.post('/admin-login', validateBody(adminLoginSchema), adminLogin);

// Refresh endpoint (extracts from HttpOnly cookie or body, rotates token)
router.post('/refresh', validateBody(refreshTokenSchema), refreshAuthToken);

// Logout (clears HttpOnly cookie & revokes token)
router.post('/logout', logoutUser);

// Revoke all sessions across all devices for current user
router.post('/revoke-all', authenticate, revokeAllSessions);

// Super Admin: Update admin role and immediately invalidate all active sessions for that admin (SEC-1)
router.put('/admins/:id/role', authenticate, requireAdmin, requireRole(['SUPER_ADMIN']), updateAdminRole);

export default router;
