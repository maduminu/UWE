import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { logger } from '../utils/logger';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const errorId = crypto.randomUUID();
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL;

  logger.error(`[${errorId}] ${req.method} ${req.originalUrl} - ${err.message}`, 'SERVER', {
    errorId,
    stack: err.stack,
    body: req.body,
    params: req.params,
  });

  let clientMessage = err.message || 'Internal Server Error';
  if (isProduction) {
    if (statusCode >= 500 || err.name?.includes('Prisma') || /prisma|database|sql/i.test(err.message || '')) {
      clientMessage = 'An unexpected server error occurred. Please contact Command HQ support with reference ID.';
    }
  }

  res.status(statusCode).json({
    success: false,
    message: clientMessage,
    errorId: isProduction ? errorId : undefined,
    stack: isProduction ? undefined : err.stack,
  });
};
