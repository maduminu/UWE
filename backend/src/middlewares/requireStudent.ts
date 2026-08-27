import { Request, Response, NextFunction } from 'express';

/**
 * Middleware enforcing that the authenticated user is a Student (or Admin inspecting student data).
 * Must be used after `authenticate` middleware.
 */
export const requireStudent = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Access Denied: Student authentication required.',
    });
    return;
  }

  // Both students and admins can pass requireStudent
  if (req.user.type !== 'student' && req.user.type !== 'admin') {
    res.status(403).json({
      success: false,
      message: 'Access Forbidden: Invalid account type.',
    });
    return;
  }

  next();
};
