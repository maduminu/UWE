import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export interface AuthUserPayload {
  id: string;
  email: string;
  role?: string;
  type: 'admin' | 'student';
  tokenVersion?: number;
  jti?: string;
}

/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace Express {
    interface Request {
      user?: AuthUserPayload;
    }
  }
}
/* eslint-enable @typescript-eslint/no-namespace */

let ephemeralTestSecret: string | null = null;

export const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'test') {
      if (!ephemeralTestSecret) {
        ephemeralTestSecret = crypto.randomBytes(32).toString('hex');
      }
      return ephemeralTestSecret;
    }
    throw new Error('FATAL: JWT_SECRET environment variable is missing. A secure secret of at least 32 characters is required.');
  }
  if (secret.length < 32) {
    throw new Error('FATAL: JWT_SECRET must be at least 32 characters long for cryptographic security.');
  }
  return secret;
};

/**
 * Middleware to authenticate requests using JWT Bearer token.
 * Returns 401 if token is missing or invalid.
 */
export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      message: 'Access Denied: Missing or invalid authorization token.',
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const secret = getJwtSecret();
    const decoded = jwt.verify(token, secret) as AuthUserPayload;
    req.user = decoded;
    next();
  } catch (error: any) {
    res.status(401).json({
      success: false,
      message: error.name === 'TokenExpiredError'
        ? 'Session Expired: Please log in again.'
        : 'Access Denied: Invalid authentication token.',
    });
  }
};
