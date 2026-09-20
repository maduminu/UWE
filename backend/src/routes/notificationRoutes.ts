import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../controllers/notificationController';
import { getJwtSecret, AuthUserPayload } from '../middlewares/authenticate';

const router = Router();

// Optional JWT extraction helper (populates req.user if token is present, but does not reject anonymous users)
const optionalAuth = (req: Request, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const secret = getJwtSecret();
      const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] }) as AuthUserPayload;
      req.user = decoded;
    } catch {
      // Ignore token decode failures for optional auth
    }
  }
  next();
};

// Notification Routes
router.get('/', optionalAuth, getNotifications);
router.put('/:id/read', optionalAuth, markNotificationAsRead);
router.put('/read-all', optionalAuth, markAllNotificationsAsRead);

export default router;
