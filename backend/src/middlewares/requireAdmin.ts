import { Request, Response, NextFunction } from 'express';

/**
 * Middleware enforcing that the authenticated user is an Admin.
 * Must be used after `authenticate` middleware.
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  const requestId = (req.headers['x-request-id'] as string) || (res.getHeader('X-Request-Id') as string) || undefined;
  if (!req.user) {
    res.status(401).json({
      success: false,
      code: 'UNAUTHORIZED',
      message: 'Access Denied: Authentication required.',
      ...(requestId ? { requestId } : {}),
    });
    return;
  }

  if (req.user.type !== 'admin') {
    res.status(403).json({
      success: false,
      code: 'FORBIDDEN',
      message: 'Access Forbidden: Command HQ administrator privileges required.',
      ...(requestId ? { requestId } : {}),
    });
    return;
  }

  next();
};
