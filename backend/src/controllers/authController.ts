import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db';
import { getErrorMessage } from '../utils/typeHelpers';

const JWT_SECRET = process.env.JWT_SECRET || 'uwe-dev-secret-key';

const signToken = (payload: object) =>
  jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

// @desc    Register new student operative user account
// @route   POST /api/auth/register
export const registerUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name, phone } = req.body;

    if (!email || !password || !name) {
      res.status(400).json({ success: false, message: 'Name, email, and password are required' });
      return;
    }

    const existingUser = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existingUser) {
      res.status(400).json({ success: false, message: 'User account with this email already exists' });
      return;
    }

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        name,
        phone,
        passwordHash: password,
        isEnrolled: true,
        enrolledCourseSlugs: 'bmb,leadership,ignit',
      },
    });

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        enrolledCourseSlugs: user.enrolledCourseSlugs.split(','),
      },
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
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

    if (!user || user.passwordHash !== password) {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }

    const token = signToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: 'USER',
    });

    res.status(200).json({
      success: true,
      message: 'Authentication successful',
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        enrolledCourseSlugs: user.enrolledCourseSlugs.split(','),
        token,
      },
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

// @desc    Authenticate Admin HQ Login (admin / admin1234)
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

    if (!admin || admin.passwordHash !== password) {
      res.status(401).json({ success: false, message: 'Invalid Admin Credentials' });
      return;
    }

    const token = signToken({
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
    });

    res.status(200).json({
      success: true,
      message: 'Command HQ Access Granted',
      data: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        token,
      },
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};
