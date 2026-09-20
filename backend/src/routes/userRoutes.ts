import { Router } from 'express';
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  getAvailableCoaches,
  assignCoach,
  deleteUser,
} from '../controllers/userController';
import { getUserDashboard } from '../controllers/userDashboardController';
import { authenticate } from '../middlewares/authenticate';
import { requireAdmin } from '../middlewares/requireAdmin';
import { requireRole } from '../middlewares/requireRole';

const router = Router();

// All user routes require authentication
router.use(authenticate);

// Available Coaches Directory for Assignment Dropdowns
router.get('/coaches', requireAdmin, requireRole(['SUPER_ADMIN', 'COMMANDER', 'COACH']), getAvailableCoaches);

// Admin-only user directory and mutation (SUPER_ADMIN, COMMANDER, COACH)
router.get('/', requireAdmin, requireRole(['SUPER_ADMIN', 'COMMANDER', 'COACH']), getAllUsers);
router.post('/', requireAdmin, requireRole(['SUPER_ADMIN', 'COMMANDER']), createUser);
router.put('/:id/assign-coach', requireAdmin, requireRole(['SUPER_ADMIN', 'COMMANDER', 'COACH']), assignCoach);
router.put('/:id', (req, res, next) => {
  if (req.user?.type === 'admin') {
    if (['SUPER_ADMIN', 'COMMANDER', 'COACH'].includes(req.user?.role || '')) {
      return updateUser(req, res);
    }
    return res.status(403).json({ success: false, message: 'Forbidden: Insufficient admin permissions.' });
  }

  // Student can update their own profile
  if (req.user?.id === req.params.id) {
    return updateUser(req, res);
  }

  return res.status(403).json({ success: false, message: 'Forbidden: Cannot update another user account.' });
});
router.delete('/:id', requireAdmin, requireRole(['SUPER_ADMIN', 'COMMANDER']), deleteUser);

// Aggregated Student Dashboard: Student can fetch their own, Admin can fetch any
router.get('/:id/dashboard', (req, res) => {
  if (req.user?.type === 'admin' || req.user?.id === req.params.id) {
    return getUserDashboard(req, res);
  }
  res.status(403).json({ success: false, message: 'Access Forbidden: Cannot view another user dashboard.' });
});

// Single user profile access: Student can view own profile, Admin can view any profile
router.get('/:id', (req, res) => {
  if (req.user?.type === 'admin' || req.user?.id === req.params.id) {
    return getUserById(req, res);
  }
  res.status(403).json({ success: false, message: 'Access Forbidden: Cannot view another user profile.' });
});

export default router;
