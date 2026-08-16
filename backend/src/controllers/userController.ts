import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { getErrorMessage } from '../utils/typeHelpers';

// @desc    Get all registered student users/operatives (CMS Admin HQ)
// @route   GET /api/users
export const getAllUsers = async (_req: Request, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

// @desc    Get single user by ID (used by client to fetch live access)
// @route   GET /api/users/:id
export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    res.status(200).json({ success: true, data: user });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

// @desc    Create new registered student user/operative (Admin CMS)
// @route   POST /api/users
export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, phone, password, enrolledCourseSlugs, isEnrolled } = req.body;

    if (!name || !email) {
      res.status(400).json({ success: false, message: 'Name and Email are required' });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (existing) {
      res.status(400).json({ success: false, message: 'User with this email already exists' });
      return;
    }

    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone ? phone.trim() : null,
        passwordHash: password || 'password123',
        isEnrolled: typeof isEnrolled === 'boolean' ? isEnrolled : true,
        enrolledCourseSlugs: enrolledCourseSlugs || 'bmb,leadership,ignit',
      },
    });

    res.status(201).json({ success: true, data: newUser });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

// @desc    Update user operative details / enrollment
// @route   PUT /api/users/:id
export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { name, email, phone, enrolledCourseSlugs, isEnrolled } = req.body;

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(typeof name === 'string' && { name: name.trim() }),
        ...(typeof email === 'string' && { email: email.trim().toLowerCase() }),
        ...(typeof phone === 'string' && { phone: phone.trim() }),
        ...(typeof enrolledCourseSlugs === 'string' && { enrolledCourseSlugs }),
        ...(typeof isEnrolled === 'boolean' && { isEnrolled }),
      },
    });

    res.status(200).json({ success: true, data: updated });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

// @desc    Delete user account
// @route   DELETE /api/users/:id
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    await prisma.user.delete({ where: { id } });
    res.status(200).json({ success: true, message: 'User account deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
