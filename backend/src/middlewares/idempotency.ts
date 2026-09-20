import { Request, Response, NextFunction } from 'express';
import { cacheGet, cacheSet, cacheDel } from '../config/redis';
import { sendError, ErrorCode } from '../utils/apiResponse';
import { logger } from '../utils/logger';

export interface IdempotencyOptions {
  required?: boolean;
  ttlSeconds?: number;
  scope?: string;
}

interface IdempotentRecord {
  status: 'IN_PROGRESS' | 'COMPLETED';
  statusCode?: number;
  body?: any;
  headers?: Record<string, string>;
  createdAt: number;
}

/**
 * Express middleware providing distributed idempotency protection.
 * Prevents double inserts, duplicate charges, double lead creation, and race-replay attacks.
 */
export function idempotency(options: IdempotencyOptions = {}) {
  const { required = false, ttlSeconds = 300, scope = 'global' } = options;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Only apply idempotency to mutation methods
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      next();
      return;
    }

    const rawKey =
      (req.headers['idempotency-key'] as string) ||
      (req.headers['x-idempotency-key'] as string) ||
      (req.body?.idempotencyKey as string) ||
      undefined;

    if (!rawKey) {
      if (required) {
        sendError(
          res,
          400,
          ErrorCode.VALIDATION_ERROR,
          'Idempotency-Key header is required for this operation.',
          req
        );
        return;
      }
      next();
      return;
    }

    const sanitizedKey = rawKey.trim();
    if (sanitizedKey.length < 4 || sanitizedKey.length > 255) {
      sendError(
        res,
        400,
        ErrorCode.VALIDATION_ERROR,
        'Invalid Idempotency-Key format (must be between 4 and 255 characters).',
        req
      );
      return;
    }

    const redisKey = `idemp:${scope}:${sanitizedKey}`;

    try {
      const existing = await cacheGet<IdempotentRecord>(redisKey);

      if (existing) {
        if (existing.status === 'IN_PROGRESS') {
          // If in progress for less than 15 seconds, return 409 Conflict
          if (Date.now() - existing.createdAt < 15000) {
            sendError(
              res,
              409,
              ErrorCode.CONFLICT,
              'A request with this idempotency key is currently being processed. Please wait.',
              req
            );
            return;
          }
          // Stale in-progress lock, allow re-acquisition
        } else if (existing.status === 'COMPLETED') {
          // Replay cached response
          logger.info(`[IDEMPOTENCY] Replaying cached response for key: ${redisKey}`, 'IDEMPOTENCY');
          res.setHeader('X-Idempotency-Replay', 'true');
          res.setHeader('X-Cache-Lookup', 'HIT');

          if (existing.headers) {
            for (const [k, v] of Object.entries(existing.headers)) {
              if (!['content-length', 'transfer-encoding', 'connection'].includes(k.toLowerCase())) {
                res.setHeader(k, v);
              }
            }
          }

          res.status(existing.statusCode || 200).json(existing.body);
          return;
        }
      }

      // Mark request as IN_PROGRESS
      await cacheSet(
        redisKey,
        {
          status: 'IN_PROGRESS',
          createdAt: Date.now(),
        },
        ttlSeconds
      );

      // Hook into response completion to cache the response
      const originalJson = res.json.bind(res);
      const originalSend = res.send.bind(res);

      res.json = function (body: any) {
        const statusCode = res.statusCode;
        // Only cache successful mutations or validation errors (2xx, 4xx)
        if (statusCode >= 200 && statusCode < 500) {
          cacheSet(
            redisKey,
            {
              status: 'COMPLETED',
              statusCode,
              body,
              createdAt: Date.now(),
            },
            ttlSeconds
          ).catch((err) => logger.warn(`[IDEMPOTENCY] Failed to cache response: ${err.message}`, 'IDEMPOTENCY'));
        } else {
          // Release lock on 500 error to allow retry
          cacheDel(redisKey).catch(() => {});
        }
        return originalJson(body);
      };

      res.send = function (body: any) {
        const statusCode = res.statusCode;
        if (statusCode >= 500) {
          cacheDel(redisKey).catch(() => {});
        }
        return originalSend(body);
      };

      next();
    } catch (err: any) {
      logger.warn(`[IDEMPOTENCY] Error processing key ${redisKey}: ${err.message}`, 'IDEMPOTENCY');
      next();
    }
  };
}
