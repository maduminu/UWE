import { Request, Response } from 'express';

export const ErrorCode = {
  BAD_REQUEST: 'BAD_REQUEST',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;

export type ErrorCodeType = typeof ErrorCode[keyof typeof ErrorCode];

/**
 * Standardized API Error Response with stable error code and server-side request ID
 */
export function sendError(
  res: Response,
  statusCode: number,
  code: ErrorCodeType | string,
  message: string,
  req?: Request
): void {
  const requestId =
    (req?.headers?.['x-request-id'] as string) ||
    (res.getHeader('X-Request-Id') as string) ||
    (res.getHeader('x-request-id') as string) ||
    undefined;

  res.status(statusCode).json({
    success: false,
    code,
    message,
    ...(requestId ? { requestId } : {}),
  });
}
