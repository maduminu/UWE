import { Request, Response, NextFunction } from 'express';

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogPayload {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: string;
  meta?: Record<string, any>;
}

class Logger {
  private formatLog(level: LogLevel, message: string, context?: string, meta?: Record<string, any>): string {
    const payload: LogPayload = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      meta,
    };

    if (process.env.NODE_ENV === 'production') {
      return JSON.stringify(payload);
    }

    const colors = {
      info: '\x1b[36m', // Cyan
      warn: '\x1b[33m', // Yellow
      error: '\x1b[31m', // Red
      debug: '\x1b[90m', // Gray
      reset: '\x1b[0m',
      bold: '\x1b[1m',
    };

    const prefix = `${colors[level]}[${level.toUpperCase()}]${colors.reset}`;
    const ctx = context ? ` \x1b[35m[${context}]\x1b[0m` : '';
    const metaStr = meta && Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';

    return `${payload.timestamp} ${prefix}${ctx} ${message}${metaStr}`;
  }

  info(message: string, context?: string, meta?: Record<string, any>): void {
    console.log(this.formatLog('info', message, context, meta));
  }

  warn(message: string, context?: string, meta?: Record<string, any>): void {
    console.warn(this.formatLog('warn', message, context, meta));
  }

  error(message: string, context?: string, meta?: Record<string, any>): void {
    console.error(this.formatLog('error', message, context, meta));
  }

  debug(message: string, context?: string, meta?: Record<string, any>): void {
    if (process.env.NODE_ENV !== 'production' || process.env.DEBUG) {
      console.debug(this.formatLog('debug', message, context, meta));
    }
  }
}

export const logger = new Logger();

/**
 * Express middleware for structured HTTP request telemetry and latency logging.
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();
  const requestId = req.headers['x-request-id'] || `req_${Math.random().toString(36).substring(2, 9)}`;

  // Attach requestId to response header
  res.setHeader('X-Request-Id', requestId as string);

  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;
    const method = req.method;
    const url = req.originalUrl || req.url;
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    // Skip health check spam from logs in production unless error
    if (url === '/api/health' || url === '/health') {
      return;
    }

    const logMeta = {
      requestId,
      method,
      url,
      statusCode,
      durationMs: duration,
      ip,
    };

    if (statusCode >= 500) {
      logger.error(`${method} ${url} ${statusCode} - ${duration}ms`, 'HTTP', logMeta);
    } else if (statusCode >= 400) {
      logger.warn(`${method} ${url} ${statusCode} - ${duration}ms`, 'HTTP', logMeta);
    } else {
      logger.info(`${method} ${url} ${statusCode} - ${duration}ms`, 'HTTP', logMeta);
    }
  });

  next();
};
