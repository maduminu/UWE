import { Request, Response, NextFunction } from 'express';
import { cacheGet, cacheSet } from '../config/redis';
import { sendError, ErrorCode } from '../utils/apiResponse';
import { logger } from '../utils/logger';

export interface AbuseLimiterOptions {
  windowMs: number;
  max: number;
  message?: string;
  scope?: string;
  keyGenerator?: (req: Request) => string;
}

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

/**
 * Creates a distributed rate limiter middleware using Redis or high-performance memory store.
 * Returns standardized SEC-8 429 response envelopes with Retry-After headers.
 */
export function createDistributedLimiter(options: AbuseLimiterOptions) {
  const {
    windowMs,
    max,
    message = 'Too many requests. Please slow down and try again later.',
    scope = 'global',
    keyGenerator = (req: Request) => req.ip || req.headers['x-forwarded-for'] as string || 'unknown-client',
  } = options;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const clientIdentifier = keyGenerator(req);
    const redisKey = `ratelimit:${scope}:${clientIdentifier}`;
    const now = Date.now();
    const ttlSeconds = Math.ceil(windowMs / 1000);

    try {
      let record = await cacheGet<RateLimitRecord>(redisKey);

      if (!record || now > record.resetAt) {
        record = {
          count: 1,
          resetAt: now + windowMs,
        };
        await cacheSet(redisKey, record, ttlSeconds);
      } else {
        record.count += 1;
        await cacheSet(redisKey, record, Math.ceil((record.resetAt - now) / 1000));
      }

      const remaining = Math.max(0, max - record.count);
      const retryAfterSec = Math.max(1, Math.ceil((record.resetAt - now) / 1000));

      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', remaining);
      res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetAt / 1000));

      if (record.count > max) {
        logger.warn(`[RATE_LIMIT] Client ${clientIdentifier} exceeded limit on ${scope} (${record.count}/${max})`, 'RATE_LIMIT');
        res.setHeader('Retry-After', retryAfterSec);
        sendError(res, 429, ErrorCode.RATE_LIMITED, message, req);
        return;
      }

      next();
    } catch (err: any) {
      logger.warn(`[RATE_LIMIT] Distributed limiter fallback for ${redisKey}: ${err.message}`, 'RATE_LIMIT');
      next();
    }
  };
}

// ── Pre-configured Production Limiters ────────────────────────────────────────

// Public Mutation Submissions (Slips, Leads, Job Applications, Reviews)
export const publicSubmissionLimiter = createDistributedLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  scope: 'public_submissions',
  message: 'Too many submissions received from your network. Please wait a few minutes before submitting again.',
});

// Community Actions (Mastermind Questions & Upvotes)
export const communitySubmissionLimiter = createDistributedLimiter({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 30,
  scope: 'community',
  message: 'Community rate limit reached. Please wait before posting additional questions or answers.',
});

// Strict Upvoting Limiter
export const upvoteLimiter = createDistributedLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  scope: 'upvotes',
  message: 'You are upvoting too fast. Please slow down.',
});
