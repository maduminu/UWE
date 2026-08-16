import { Request, Response, NextFunction } from 'express';

export const errorHandler = (
  err: Error & { stack?: string },
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
};
