import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { ErrorCode } from '../utils/apiResponse';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const requestId =
    (req.headers['x-request-id'] as string) ||
    (res.getHeader('X-Request-Id') as string) ||
    `err_${Math.random().toString(36).substring(2, 9)}`;

  const statusCode = res.statusCode >= 400 ? res.statusCode : (err.status || err.statusCode || 500);

  // Log full error details server-side with request ID
  logger.error(`[${requestId}] ${req.method} ${req.originalUrl} - ${err.message}`, 'SERVER', {
    requestId,
    stack: err.stack,
    body: req.body,
    params: req.params,
  });

  // Map status to stable public error code
  let code: string = ErrorCode.INTERNAL_SERVER_ERROR;
  if (statusCode === 400) code = ErrorCode.BAD_REQUEST;
  else if (statusCode === 401) code = ErrorCode.UNAUTHORIZED;
  else if (statusCode === 403) code = ErrorCode.FORBIDDEN;
  else if (statusCode === 404) code = ErrorCode.NOT_FOUND;
  else if (statusCode === 409) code = ErrorCode.CONFLICT;
  else if (statusCode === 429) code = ErrorCode.RATE_LIMITED;
  else if (statusCode === 503) code = ErrorCode.SERVICE_UNAVAILABLE;

  // SEC-8: Sanitize messages to prevent raw internal/database leakage
  let clientMessage = 'An unexpected error occurred. Please contact Command HQ support.';
  if (statusCode < 500) {
    if (/prisma|syntax|column|table|relation|database|sql/i.test(err.message || '')) {
      clientMessage = 'Invalid request parameters.';
    } else {
      clientMessage = err.message || 'Request failed.';
    }
  }

  res.status(statusCode).json({
    success: false,
    code,
    message: clientMessage,
    requestId,
  });
};
