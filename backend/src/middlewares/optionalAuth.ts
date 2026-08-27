import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthUserPayload, getJwtSecret } from './authenticate';

/**
 * Optional authentication middleware:
 * If a valid Bearer token is provided, populates `req.user`.
 * If missing or invalid, proceeds without blocking.
 */
export const optionalAuth = (req: Request, _res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const secret = getJwtSecret();
      const decoded = jwt.verify(token, secret) as AuthUserPayload;
      req.user = decoded;
    } catch {
      // Ignore token errors for optional auth
    }
  }

  next();
};
