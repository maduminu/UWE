import { Request, Response } from 'express';
import { prisma } from '../config/db';
import bcrypt from 'bcryptjs';
import { logger } from '../utils/logger';
import {
  generateTokenPair,
  rotateRefreshToken,
  revokeUserSessions,
  revokeSingleSession,
} from '../services/tokenService';

export { generateTokenPair };

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
        isEnrolled: true,
        enrolledCourseSlugs: 'bmb,leadership,ignit',
      },
    });

    const tokenVersion = user.tokenVersion || 1;
    const tokens = await generateTokenPair({
      id: user.id,
      email: user.email,
      type: 'student',
      tokenVersion,
    });

    logger.info(`Student operative registered: ${user.email}`, 'AUTH');

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        ...tokens,
        enrolledCourseSlugs: user.enrolledCourseSlugs.split(','),
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

    // Enforce cryptographic bcrypt verification
    const passwordMatch = user.passwordHash.startsWith('$2')
      ? await bcrypt.compare(password, user.passwordHash)
      : false;

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

    const tokenVersion = user.tokenVersion || 1;
    const tokens = await generateTokenPair({
      id: user.id,
      email: user.email,
      type: 'student',
      tokenVersion,
    });

    logger.info(`Student operative logged in: ${user.email}`, 'AUTH');

    res.status(200).json({
      success: true,
      message: 'Authentication successful',
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        ...tokens,
        enrolledCourseSlugs: user.enrolledCourseSlugs.split(','),
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
    const targetEmail = username === 'admin' ? 'admin@uwe.lk' : username.toLowerCase();

    const admin = await prisma.adminUser.findFirst({
      where: {
        OR: [{ email: targetEmail }, { name: { contains: username } }],
      },
    });

    if (!admin) {
      res.status(401).json({ success: false, message: 'Invalid Admin Credentials' });
      return;
    }

    // Enforce cryptographic bcrypt verification
    const passwordMatch = admin.passwordHash.startsWith('$2')
      ? await bcrypt.compare(password, admin.passwordHash)
      : false;

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

// @desc    Refresh expired Access Token using Refresh Token with Token Rotation & Replay Protection
// @route   POST /api/auth/refresh
export const refreshAuthToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({ success: false, message: 'Refresh token is required' });
      return;
    }

    const newTokens = await rotateRefreshToken(refreshToken);

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: newTokens,
    });
  } catch (error: any) {
    res.status(401).json({
      success: false,
      message: error.message || 'Invalid or revoked refresh token.',
    });
  }
};

// @desc    Log out current session and invalidate active refresh token
// @route   POST /api/auth/logout
export const logoutUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;
    const userId = req.user?.id;

    if (userId) {
      await revokeSingleSession(userId, req.user?.jti);
    }
    if (refreshToken && typeof refreshToken === 'string') {
      try {
        const { getJwtSecret } = await import('../middlewares/authenticate');
        const jwt = await import('jsonwebtoken');
        const decoded = jwt.default.decode(refreshToken) as any;
        if (decoded?.id && decoded?.jti) {
          await revokeSingleSession(decoded.id, decoded.jti);
        }
      } catch {
        /* ignore decode error on logout */
      }
    }

    res.status(200).json({ success: true, message: 'Logged out successfully.' });
  } catch (error: any) {
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

    res.status(200).json({
      success: true,
      message: 'All active sessions and tokens have been revoked successfully. Please sign in again.',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to revoke sessions.' });
  }
};
