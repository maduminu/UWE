import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db';
import { cacheGet, cacheSet, cacheDel, cacheDelPattern } from '../config/redis';
import { getJwtSecret, AuthUserPayload } from '../middlewares/authenticate';
import { logger } from '../utils/logger';

const ACCESS_TOKEN_EXPIRES = '15m';
const REFRESH_TOKEN_EXPIRES = '7d';
const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

export interface RefreshTokenRecord {
  userId: string;
  type: 'admin' | 'student';
  role?: string;
  tokenVersion: number;
  jti: string;
  createdAt: number;
}

/**
 * Generate Access Token & Refresh Token pair with unique JTI,
 * storing state in both durable PostgreSQL database and distributed Redis cache.
 */
export async function generateTokenPair(payload: AuthUserPayload): Promise<{
  accessToken: string;
  refreshToken: string;
  token: string;
}> {
  const secret = getJwtSecret();
  const jti = payload.jti || crypto.randomUUID();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);

  const accessPayload: AuthUserPayload = {
    id: payload.id,
    email: payload.email,
    role: payload.role,
    type: payload.type,
    tokenVersion: payload.tokenVersion || 1,
  };

  const refreshPayload = {
    ...accessPayload,
    jti,
    isRefreshToken: true,
  };

  const accessToken = jwt.sign(accessPayload, secret, { expiresIn: ACCESS_TOKEN_EXPIRES });
  const refreshToken = jwt.sign(refreshPayload, secret, { expiresIn: REFRESH_TOKEN_EXPIRES });

  // 1. Persist in durable database table
  try {
    await prisma.refreshToken.create({
      data: {
        jti,
        userId: payload.id,
        userType: payload.type,
        tokenVersion: payload.tokenVersion || 1,
        expiresAt,
        isRevoked: false,
      },
    });
  } catch (dbErr: any) {
    logger.warn(`[generateTokenPair] DB persist warning: ${dbErr.message}`, 'AUTH');
  }

  // 2. Cache in distributed Redis / memory layer for high-speed edge lookups
  const cacheKey = `rt:${payload.id}:${jti}`;
  await cacheSet(
    cacheKey,
    {
      userId: payload.id,
      type: payload.type,
      role: payload.role,
      tokenVersion: payload.tokenVersion || 1,
      jti,
      createdAt: Date.now(),
    },
    REFRESH_TOKEN_TTL_SECONDS
  );

  return { accessToken, refreshToken, token: accessToken };
}

/**
 * Rotate refresh token: verifies token against distributed cache and durable DB,
 * detects replay attacks across all serverless instances, invalidates old token,
 * and issues a new token pair.
 */
export async function rotateRefreshToken(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
  token: string;
}> {
  const secret = getJwtSecret();
  const decoded = jwt.verify(refreshToken, secret) as AuthUserPayload & {
    jti?: string;
    isRefreshToken?: boolean;
  };

  if (!decoded.isRefreshToken) {
    throw new Error('Invalid token type: Expected refresh token.');
  }

  const userId = decoded.id;
  const jti = decoded.jti;

  // ── Replay Attack & Multi-Deployment Durability Verification ──
  if (jti) {
    // 1. Check Redis cache
    let isCached = await cacheGet<RefreshTokenRecord>(`rt:${userId}:${jti}`);

    // 2. Check Database Record (source of truth across all serverless instances)
    let dbToken = null;
    try {
      dbToken = await prisma.refreshToken.findUnique({ where: { jti } });
    } catch {
      /* fallback to cached token if DB is temporarily unreachable */
    }

    if (dbToken) {
      if (dbToken.isRevoked || new Date() > new Date(dbToken.expiresAt)) {
        // Replay Attack Detected in DB: Token was previously consumed or revoked
        await revokeUserSessions(userId, decoded.type);
        logger.warn(
          `[SECURITY] Replay attack: Reused revoked refresh token JTI ${jti} for user: ${decoded.email}. All sessions revoked.`,
          'AUTH'
        );
        throw new Error('Session Revoked: Refresh token has already been consumed or revoked.');
      }
    } else if (!isCached) {
      // Neither DB nor Cache has active record for this JTI — replay attack or fabricated token
      await revokeUserSessions(userId, decoded.type);
      logger.warn(
        `[SECURITY] Replay attack: Unrecognized/already consumed refresh token JTI ${jti} for user: ${decoded.email}. All sessions revoked.`,
        'AUTH'
      );
      throw new Error('Session Revoked: Refresh token has already been consumed or revoked.');
    }

    // 3. Atomically consume / invalidate old token in DB and Cache
    try {
      await prisma.refreshToken.update({
        where: { jti },
        data: { isRevoked: true },
      });
    } catch {
      /* ignore if record already cleaned up */
    }
    await cacheDel(`rt:${userId}:${jti}`);
  }

  // ── Live Account & Role Verification ──
  let activeTokenVersion = 1;
  let liveRole = decoded.role;

  if (decoded.type === 'admin') {
    const admin = await prisma.adminUser.findUnique({ where: { id: userId } });
    if (!admin) {
      throw new Error('Revoked: Admin account no longer exists.');
    }
    activeTokenVersion = admin.tokenVersion || 1;
    liveRole = admin.role;
  } else {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error('Revoked: Operative account no longer exists.');
    }
    if (!user.isEnrolled) {
      throw new Error('Access Denied: Operative account is inactive.');
    }
    activeTokenVersion = user.tokenVersion || 1;
  }

  const decodedVersion = decoded.tokenVersion || 1;
  if (decodedVersion !== activeTokenVersion) {
    await cacheDelPattern(`rt:${userId}:`);
    throw new Error('Session Revoked: Please sign in again.');
  }

  // Issue new rotated token pair with brand-new JTI
  const newTokens = await generateTokenPair({
    id: userId,
    email: decoded.email,
    role: liveRole,
    type: decoded.type,
    tokenVersion: activeTokenVersion,
  });

  return newTokens;
}

/**
 * Revoke ALL active refresh tokens and sessions for a user/admin across ALL deployments.
 * Atomically increments DB tokenVersion, marks all DB refresh tokens revoked, and flushes cache.
 */
export async function revokeUserSessions(userId: string, type: 'admin' | 'student'): Promise<void> {
  try {
    if (type === 'admin') {
      await prisma.adminUser.update({
        where: { id: userId },
        data: { tokenVersion: { increment: 1 } },
      });
    } else {
      await prisma.user.update({
        where: { id: userId },
        data: { tokenVersion: { increment: 1 } },
      });
    }

    // Mark all tokens for this user as revoked in DB
    await prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });
  } catch (err: any) {
    logger.warn(`[revokeUserSessions] DB update warning for ${userId}: ${err.message}`, 'AUTH');
  }

  // Invalidate all cached refresh tokens for this user in Redis
  await cacheDelPattern(`rt:${userId}:`);
  logger.info(`All sessions revoked for user: ${userId} (${type})`, 'AUTH');
}

/**
 * Revoke a single refresh token session (e.g. on user logout)
 */
export async function revokeSingleSession(userId: string, jti?: string): Promise<void> {
  if (jti) {
    try {
      await prisma.refreshToken.updateMany({
        where: { jti },
        data: { isRevoked: true },
      });
    } catch {
      /* ignore */
    }
    await cacheDel(`rt:${userId}:${jti}`);
  }
}
