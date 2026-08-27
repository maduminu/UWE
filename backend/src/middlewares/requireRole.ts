import { Request, Response, NextFunction } from 'express';

export type AdminRole = 'SUPER_ADMIN' | 'COMMANDER' | 'COACH' | 'RECRUITER';

/**
 * Middleware enforcing that the authenticated admin user has one of the allowed roles.
 * Must be mounted AFTER `authenticate` and `requireAdmin`.
 */
export const requireRole = (allowedRoles: AdminRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Access Denied: Authentication required.',
      });
      return;
    }

    if (req.user.type !== 'admin') {
      res.status(403).json({
        success: false,
        message: 'Access Forbidden: Command HQ administrator privileges required.',
      });
      return;
    }

    const userRole = (req.user.role || 'COMMANDER') as AdminRole;

    // SUPER_ADMIN has access to everything
    if (userRole === 'SUPER_ADMIN' || allowedRoles.includes(userRole)) {
      next();
      return;
    }

    res.status(403).json({
      success: false,
      message: `Access Forbidden: Insufficient clearance. Requires one of [${allowedRoles.join(', ')}], current role: ${userRole}.`,
    });
  };
};
