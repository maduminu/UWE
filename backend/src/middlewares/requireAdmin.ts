import { Request, Response, NextFunction } from 'express';

/**
 * Middleware enforcing that the authenticated user is an Admin.
 * Must be used after `authenticate` middleware.
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
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

  next();
};
