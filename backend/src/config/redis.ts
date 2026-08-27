import { Redis } from '@upstash/redis';
import { logger } from '../utils/logger';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

// In-memory fallback cache (active if Upstash credentials are not set)
const memoryCache = new Map<string, CacheEntry<any>>();

let upstashRedis: Redis | null = null;

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  try {
    upstashRedis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
    logger.info('⚡ Upstash Edge Redis caching layer connected', 'CACHE');
  } catch (err: any) {
    logger.warn(`⚠️ Failed to initialize Upstash Redis, using memory cache fallback: ${err.message}`, 'CACHE');
    upstashRedis = null;
  }
} else {
  logger.info('⚡ Redis Cache running in high-performance memory fallback mode', 'CACHE');
}

/**
 * Get cached value by key
 */
export async function cacheGet<T = any>(key: string): Promise<T | null> {
  try {
    if (upstashRedis) {
      const val = await upstashRedis.get<T>(key);
      return val ?? null;
    }

    const entry = memoryCache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      memoryCache.delete(key);
      return null;
    }

    return entry.value as T;
  } catch (err: any) {
    logger.warn(`[cacheGet] Cache read error for ${key}: ${err.message}`, 'CACHE');
    return null;
  }
}

/**
 * Set cached value with expiration in seconds (default: 3600 = 1 hour)
 */
export async function cacheSet(key: string, value: any, ttlSeconds: number = 3600): Promise<void> {
  try {
    if (upstashRedis) {
      await upstashRedis.set(key, value, { ex: ttlSeconds });
      return;
    }

    memoryCache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  } catch (err: any) {
    logger.warn(`[cacheSet] Cache write error for ${key}: ${err.message}`, 'CACHE');
  }
}

/**
 * Delete one or more cached keys
 */
export async function cacheDel(key: string): Promise<void> {
  try {
    if (upstashRedis) {
      await upstashRedis.del(key);
      return;
    }

    memoryCache.delete(key);
  } catch (err: any) {
    logger.warn(`[cacheDel] Cache delete error for ${key}: ${err.message}`, 'CACHE');
  }
}

/**
 * Delete all keys matching a prefix/pattern
 */
export async function cacheDelPattern(prefix: string): Promise<void> {
  try {
    if (upstashRedis) {
      // Upstash scan / keys
      const keys = await upstashRedis.keys(`${prefix}*`);
      if (keys && keys.length > 0) {
        await upstashRedis.del(...keys);
      }
      return;
    }

    for (const k of memoryCache.keys()) {
      if (k.startsWith(prefix)) {
        memoryCache.delete(k);
      }
    }
  } catch (err: any) {
    logger.warn(`[cacheDelPattern] Cache delete pattern error for ${prefix}: ${err.message}`, 'CACHE');
  }
}

/**
 * Clear all cache
 */
export async function cacheFlush(): Promise<void> {
  try {
    if (upstashRedis) {
      await upstashRedis.flushdb();
      return;
    }
    memoryCache.clear();
  } catch (err: any) {
    logger.warn(`[cacheFlush] Cache flush error: ${err.message}`, 'CACHE');
  }
}
