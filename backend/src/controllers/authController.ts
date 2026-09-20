import { Request, Response } from 'express';
import { prisma } from '../config/db';
import bcrypt from 'bcryptjs';
import { logger } from '../utils/logger';
import { recordAdminAudit } from '../utils/auditLogger';
import { sendError, ErrorCode } from '../utils/apiResponse';
import {
  generateTokenPair,
  rotateRefreshToken,
  revokeUserSessions,
  revokeSingleSession,
} from '../services/tokenService';

export { generateTokenPair };

/**
 * Set Refresh Token in HttpOnly, Secure, SameSite Cookie
 */
export const setRefreshTokenCookie = (res: Response, refreshToken: string): void => {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'strict' : 'lax',
    path: '/api/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

/**
 * Clear Refresh Token HttpOnly Cookie
 */
export const clearRefreshTokenCookie = (res: Response): void => {
  const isProd = process.env.NODE_ENV === 'production';
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'strict' : 'lax',
    path: '/api/auth',
  });
};

/**
 * Extract Refresh Token from HttpOnly cookie or request body (for API / backward compatibility)
 */
export const extractRefreshToken = (req: Request): string | undefined => {
  if (req.headers.cookie) {
    const cookies = req.headers.cookie.split(';').reduce((acc: Record<string, string>, c) => {
      const [k, ...v] = c.trim().split('=');
      if (k) acc[k] = decodeURIComponent(v.join('='));
      return acc;
    }, {});
    if (cookies.refreshToken) {
      return cookies.refreshToken;
    }
  }
  if (req.body && typeof req.body.refreshToken === 'string') {
    return req.body.refreshToken;
  }
  return undefined;
};

// @desc    Register new student operative user account
// @route   POST /api/auth/register
export const registerUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name, phone } = req.body;

    if (!email || !password || !name) {
      res.status(400).json({ success: false, message: 'Name, email, and password are required' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
      return;
    }

    const existingUser = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existingUser) {
      res.status(400).json({ success: false, message: 'User account with this email already exists' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        name,
        phone,
        passwordHash,
        isEnrolled: false,
        enrolledCourseSlugs: '',
      },
    });

    const enrolledCourseSlugs = (user.enrolledCourseSlugs || '')
      .split(',')
      .map((slug) => slug.trim().toLowerCase())
      .filter(Boolean);

    const tokenVersion = user.tokenVersion || 1;
    const tokens = await generateTokenPair({
      id: user.id,
      email: user.email,
      type: 'student',
      tokenVersion,
    });

    // Set HttpOnly refresh token cookie
    setRefreshTokenCookie(res, tokens.refreshToken);

    logger.info(`Student operative registered: ${user.email}`, 'AUTH');

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        ...tokens,
        enrolledCourseSlugs,
        isEnrolled: user.isEnrolled,
      },
    });
  } catch (error: any) {
    logger.error(`Registration error: ${error.message}`, 'AUTH', { error });
    res.status(500).json({ success: false, message: 'Registration failed. Please try again.' });
  }
};

// @desc    Authenticate student operative login
// @route   POST /api/auth/login
export const loginUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, message: 'Email and password are required' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

    if (!user) {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }

    // Strictly verify cryptographic bcrypt hash (rejects any non-bcrypt or legacy values)
    const passwordMatch = await bcrypt.compare(password, user.passwordHash).catch(() => false);

    if (!passwordMatch) {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }

    if (!user.isEnrolled) {
      res.status(403).json({
        success: false,
        message: 'Access Restricted: Your operative account is not currently active or enrolled in any directives. Please contact Command HQ.',
      });
      return;
    }

    const enrolledCourseSlugs = (user.enrolledCourseSlugs || '')
      .split(',')
      .map((slug) => slug.trim().toLowerCase())
      .filter(Boolean);

    const tokenVersion = user.tokenVersion || 1;
    const tokens = await generateTokenPair({
      id: user.id,
      email: user.email,
      type: 'student',
      tokenVersion,
    });

    // Set HttpOnly refresh token cookie
    setRefreshTokenCookie(res, tokens.refreshToken);

    logger.info(`Student operative logged in: ${user.email}`, 'AUTH');

    res.status(200).json({
      success: true,
      message: 'Authentication successful',
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        ...tokens,
        enrolledCourseSlugs,
        isEnrolled: user.isEnrolled,
      },
    });
  } catch (error: any) {
    logger.error(`Login error: ${error.message}`, 'AUTH', { error });
    res.status(500).json({ success: false, message: 'Login failed. Please try again.' });
  }
};

// @desc    Authenticate Admin HQ Login
// @route   POST /api/auth/admin-login
export const adminLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ success: false, message: 'Username and password are required' });
      return;
    }

    // Support 'admin' or 'admin@uwe.lk'
    const trimmedUsername = username.trim();
    const targetEmail = trimmedUsername.toLowerCase() === 'admin' ? 'admin@uwe.lk' : trimmedUsername.toLowerCase();

    // SEC-CRIT-1 Fix: Enforce exact identity match instead of wildcard substring searching
    const admin = await prisma.adminUser.findFirst({
      where: {
        OR: [{ email: targetEmail }, { name: trimmedUsername }],
      },
    });

    if (!admin) {
      res.status(401).json({ success: false, message: 'Invalid Admin Credentials' });
      return;
    }

    // Strictly verify cryptographic bcrypt hash (rejects any non-bcrypt or legacy values)
    const passwordMatch = await bcrypt.compare(password, admin.passwordHash).catch(() => false);

    if (!passwordMatch) {
      res.status(401).json({ success: false, message: 'Invalid Admin Credentials' });
      return;
    }

    const tokenVersion = admin.tokenVersion || 1;
    const tokens = await generateTokenPair({
      id: admin.id,
      email: admin.email,
      role: admin.role,
      type: 'admin',
      tokenVersion,
    });

    // Set HttpOnly refresh token cookie
    setRefreshTokenCookie(res, tokens.refreshToken);

    logger.info(`Admin HQ authenticated: ${admin.email} (${admin.role})`, 'AUTH');

    res.status(200).json({
      success: true,
      message: 'Command HQ Access Granted',
      data: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        ...tokens,
      },
    });
  } catch (error: any) {
    logger.error(`Admin login error: ${error.message}`, 'AUTH', { error });
    res.status(500).json({ success: false, message: 'Authentication failed. Please try again.' });
  }
};

// @desc    Refresh expired Access Token using Refresh Token (reads HttpOnly cookie or request body)
// @route   POST /api/auth/refresh
export const refreshAuthToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const refreshToken = extractRefreshToken(req);

    if (!refreshToken) {
      res.status(400).json({ success: false, message: 'Refresh token is required' });
      return;
    }

    const newTokens = await rotateRefreshToken(refreshToken);

    // Set rotated refresh token in HttpOnly cookie
    setRefreshTokenCookie(res, newTokens.refreshToken);

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: newTokens,
    });
  } catch (error: any) {
    clearRefreshTokenCookie(res);
    logger.warn(`[refreshAuthToken] ${error.message}`, 'AUTH');
    sendError(res, 401, ErrorCode.UNAUTHORIZED, 'Invalid or Revoked refresh token.', req);
  }
};

// @desc    Log out current session and invalidate active refresh token
// @route   POST /api/auth/logout
export const logoutUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const refreshToken = extractRefreshToken(req);
    const userId = req.user?.id;

    if (userId) {
      await revokeSingleSession(userId, req.user?.jti);
    }
    if (refreshToken && typeof refreshToken === 'string') {
      try {
        const jwt = await import('jsonwebtoken');
        const decoded = jwt.default.decode(refreshToken) as any;
        if (decoded?.id && decoded?.jti) {
          await revokeSingleSession(decoded.id, decoded.jti);
        }
      } catch {
        /* ignore decode error on logout */
      }
    }

    // Clear HttpOnly cookie on logout
    clearRefreshTokenCookie(res);

    res.status(200).json({ success: true, message: 'Logged out successfully.' });
  } catch (error: any) {
    clearRefreshTokenCookie(res);
    res.status(500).json({ success: false, message: 'Logout failed.' });
  }
};

// @desc    Revoke all active sessions and refresh tokens across all devices
// @route   POST /api/auth/revoke-all
export const revokeAllSessions = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user?.id) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    await revokeUserSessions(user.id, user.type);
    clearRefreshTokenCookie(res);

    res.status(200).json({
      success: true,
      message: 'All active sessions and tokens have been revoked successfully. Please sign in again.',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to revoke sessions.' });
  }
};

// @desc    Update Admin User Role and immediately revoke all active sessions (Super Admin only)
// @route   PUT /api/auth/admins/:id/role
export const updateAdminRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { role } = req.body;

    const VALID_ROLES = ['SUPER_ADMIN', 'COMMANDER', 'COACH', 'RECRUITER'];
    if (!role || !VALID_ROLES.includes(role)) {
      res.status(400).json({
        success: false,
        message: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}`,
      });
      return;
    }

    const existingAdmin = await prisma.adminUser.findUnique({ where: { id } });
    if (!existingAdmin) {
      res.status(404).json({ success: false, message: 'Admin user not found.' });
      return;
    }

    const oldRole = existingAdmin.role;

    // 1. Update role in DB
    const updatedAdmin = await prisma.adminUser.update({
      where: { id },
      data: { role: role as any },
      select: { id: true, email: true, name: true, role: true, tokenVersion: true, updatedAt: true },
    });

    // 2. Explicitly revoke all active sessions for this admin (SEC-1)
    await revokeUserSessions(id, 'admin');

    logger.info(`[ADMIN_ROLE_CHANGED] Admin ${existingAdmin.email} role changed from ${oldRole} to ${role}. All sessions revoked.`, 'AUTH');

    // 3. Record immutable audit log
    await recordAdminAudit({
      adminId: req.user?.id,
      adminEmail: req.user?.email,
      action: 'ADMIN_ROLE_CHANGED',
      targetEntity: 'AdminUser',
      targetId: id,
      details: { adminEmail: existingAdmin.email, oldRole, newRole: role },
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: `Admin role updated to ${role}. All active sessions have been revoked.`,
      data: updatedAdmin,
    });
  } catch (error: any) {
    logger.error(`[updateAdminRole] ${error.message}`, 'AUTH');
    res.status(500).json({ success: false, message: 'Failed to update admin role.' });
  }
};
