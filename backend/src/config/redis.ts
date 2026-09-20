import { Redis } from '@upstash/redis';
import { logger } from '../utils/logger';

export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export interface SWREntry<T> {
  value: T;
  freshUntil: number;
  staleUntil: number;
}

export interface SWRResult<T> {
  data: T;
  cached: boolean;
  stale: boolean;
}

// In-memory fallback cache (active if Upstash credentials are not set)
const memoryCache = new Map<string, CacheEntry<any>>();

// In-flight revalidation deduplication map (Singleflight mutex)
const inFlightRevalidations = new Map<string, Promise<any>>();

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
 * Builds a deterministic canonical cache key that incorporates query parameters
 * sorted alphabetically to eliminate cache collisions and data bleeding between filters.
 */
export function buildCanonicalCacheKey(
  prefix: string,
  identifier: string,
  queryParams?: Record<string, any>
): string {
  const cleanPrefix = prefix.trim().toLowerCase();
  const cleanId = String(identifier || 'all').trim().toLowerCase();

  if (!queryParams) {
    return `${cleanPrefix}:${cleanId}`;
  }

  const sortedPairs: string[] = [];
  const keys = Object.keys(queryParams).sort();
  for (const k of keys) {
    const val = queryParams[k];
    if (val !== undefined && val !== null && val !== '') {
      sortedPairs.push(`${encodeURIComponent(k.toLowerCase())}=${encodeURIComponent(String(val).trim())}`);
    }
  }

  return sortedPairs.length > 0
    ? `${cleanPrefix}:${cleanId}?${sortedPairs.join('&')}`
    : `${cleanPrefix}:${cleanId}`;
}

/**
 * Stale-While-Revalidate (SWR) cache read with background asynchronous revalidation.
 *
 * 1. If fresh (now < freshUntil) -> Instant Cache Hit (cached: true, stale: false).
 * 2. If stale (freshUntil <= now < staleUntil) -> Instant Stale Hit (cached: true, stale: true)
 *    AND triggers a non-blocking background fetcher execution to refresh the cache.
 * 3. If missing or expired (now >= staleUntil) -> Synchronous fetch, updates cache, returns fresh data.
 */
export async function cacheGetOrSWR<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: {
    freshTtlSeconds?: number;
    staleTtlSeconds?: number;
  } = {}
): Promise<SWRResult<T>> {
  const freshTtlSeconds = options.freshTtlSeconds ?? 30; // 30s fresh
  const staleTtlSeconds = options.staleTtlSeconds ?? 1800; // 30m stale

  try {
    let entry: SWREntry<T> | null = null;

    if (upstashRedis) {
      const raw = await upstashRedis.get<SWREntry<T>>(key);
      if (raw && typeof raw === 'object' && 'freshUntil' in raw && 'staleUntil' in raw && 'value' in raw) {
        entry = raw;
      }
    } else {
      const raw = memoryCache.get(key);
      if (raw && Date.now() <= raw.expiresAt) {
        const val = raw.value;
        if (val && typeof val === 'object' && 'freshUntil' in val && 'staleUntil' in val && 'value' in val) {
          entry = val as SWREntry<T>;
        }
      }
    }

    const now = Date.now();

    // 1. Fresh Cache Hit
    if (entry && now < entry.freshUntil) {
      return { data: entry.value, cached: true, stale: false };
    }

    // 2. Stale Cache Hit -> return stale data immediately, fire background revalidation
    if (entry && now < entry.staleUntil) {
      if (!inFlightRevalidations.has(key)) {
        const revalidationPromise = (async () => {
          try {
            const freshData = await fetcher();
            await cacheSetSWR(key, freshData, freshTtlSeconds, staleTtlSeconds);
          } catch (err: any) {
            logger.warn(`[cacheGetOrSWR] Background revalidation failed for ${key}: ${err.message}`, 'CACHE');
          } finally {
            inFlightRevalidations.delete(key);
          }
        })();
        inFlightRevalidations.set(key, revalidationPromise);
      }

      return { data: entry.value, cached: true, stale: true };
    }

    // 3. Cache Miss or Expired -> Synchronous fetch
    const freshData = await fetcher();
    await cacheSetSWR(key, freshData, freshTtlSeconds, staleTtlSeconds);
    return { data: freshData, cached: false, stale: false };
  } catch (err: any) {
    logger.warn(`[cacheGetOrSWR] Fallback to direct fetcher on error for ${key}: ${err.message}`, 'CACHE');
    const directData = await fetcher();
    return { data: directData, cached: false, stale: false };
  }
}

/**
 * Set an SWR cache entry with fresh and stale TTLs
 */
export async function cacheSetSWR<T>(
  key: string,
  value: T,
  freshTtlSeconds: number = 30,
  staleTtlSeconds: number = 1800
): Promise<void> {
  const now = Date.now();
  const entry: SWREntry<T> = {
    value,
    freshUntil: now + freshTtlSeconds * 1000,
    staleUntil: now + staleTtlSeconds * 1000,
  };

  try {
    if (upstashRedis) {
      await upstashRedis.set(key, entry, { ex: staleTtlSeconds });
      return;
    }

    memoryCache.set(key, {
      value: entry,
      expiresAt: entry.staleUntil,
    });
  } catch (err: any) {
    logger.warn(`[cacheSetSWR] Cache write error for ${key}: ${err.message}`, 'CACHE');
  }
}

/**
 * Get cached value by key (automatically unwraps SWR entries if present)
 */
export async function cacheGet<T = any>(key: string): Promise<T | null> {
  try {
    if (upstashRedis) {
      const val = await upstashRedis.get<any>(key);
      if (!val) return null;
      if (typeof val === 'object' && 'freshUntil' in val && 'value' in val) {
        return val.value as T;
      }
      return val as T;
    }

    const entry = memoryCache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      memoryCache.delete(key);
      return null;
    }

    const val = entry.value;
    if (val && typeof val === 'object' && 'freshUntil' in val && 'value' in val) {
      return val.value as T;
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
  inFlightRevalidations.delete(key);
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
  // Cancel any matching in-flight revalidations
  for (const k of inFlightRevalidations.keys()) {
    if (k.startsWith(prefix)) {
      inFlightRevalidations.delete(k);
    }
  }

  try {
    if (upstashRedis) {
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
  inFlightRevalidations.clear();
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
