import { Request, Response } from 'express';
import { prisma } from '../config/db';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { recordAdminAudit } from '../utils/auditLogger';
import { revokeUserSessions } from '../services/tokenService';

export const SAFE_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  isEnrolled: true,
  enrolledCourseSlugs: true,
  xp: true,
  streakDays: true,
  lastActiveAt: true,
  rankTitle: true,
  badges: true,
  assignedCoachId: true,
  assignedCoachName: true,
  cohortTag: true,
  createdAt: true,
  updatedAt: true,
};

// @desc    Get all registered student users/operatives (CMS Admin HQ)
// @route   GET /api/users
export const getAllUsers = async (_req: Request, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      select: SAFE_USER_SELECT,
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single user by ID (used by client to fetch live access)
// @route   GET /api/users/:id
export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const user = await prisma.user.findUnique({
      where: { id },
      select: SAFE_USER_SELECT,
    });
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    res.status(200).json({ success: true, data: user });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
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

    const rawPassword = password && password.trim() ? password.trim() : crypto.randomBytes(6).toString('hex');
    const passwordHash = await bcrypt.hash(rawPassword, 12);

    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone ? phone.trim() : null,
        passwordHash,
        isEnrolled: typeof isEnrolled === 'boolean' ? isEnrolled : true,
        enrolledCourseSlugs: enrolledCourseSlugs || 'bmb,leadership,ignit',
      },
      select: SAFE_USER_SELECT,
    });

    await recordAdminAudit({
      adminId: req.user?.id,
      adminEmail: req.user?.email,
      action: 'USER_CREATED',
      targetEntity: 'User',
      targetId: newUser.id,
      details: { name: newUser.name, email: newUser.email, enrolledCourseSlugs: newUser.enrolledCourseSlugs },
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, data: newUser });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
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
      select: SAFE_USER_SELECT,
    });

    if (isEnrolled === false) {
      await revokeUserSessions(id, 'student');
    }

    res.status(200).json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all available coaches from database (Instructors, Admin Coaches, Staff)
// @route   GET /api/users/coaches
export const getAvailableCoaches = async (_req: Request, res: Response): Promise<void> => {
  try {
    // 1. Fetch instructors
    const instructors = await prisma.instructor.findMany({
      where: { isActive: true },
      select: { id: true, name: true, title: true },
    });

    // 2. Fetch admin coaches / commanders
    const adminCoaches = await prisma.adminUser.findMany({
      where: { role: { in: ['COACH', 'COMMANDER', 'SUPER_ADMIN'] } },
      select: { id: true, name: true, role: true },
    });

    // 3. Fetch staff members
    const staffCoaches = await prisma.staffMember.findMany({
      where: { isActive: true },
      select: { id: true, name: true, role: true },
    });

    // Combine and deduplicate by name
    const coachMap = new Map<string, { id: string; name: string; title: string }>();

    for (const inst of instructors) {
      coachMap.set(inst.name.toLowerCase(), {
        id: inst.id,
        name: inst.name,
        title: inst.title || 'Master Instructor',
      });
    }

    for (const admin of adminCoaches) {
      if (!coachMap.has(admin.name.toLowerCase())) {
        coachMap.set(admin.name.toLowerCase(), {
          id: admin.id,
          name: admin.name,
          title: `Command ${admin.role.replace('_', ' ')}`,
        });
      }
    }

    for (const staff of staffCoaches) {
      if (!coachMap.has(staff.name.toLowerCase())) {
        coachMap.set(staff.name.toLowerCase(), {
          id: staff.id,
          name: staff.name,
          title: staff.role || 'Staff Coach',
        });
      }
    }

    const coachesList = Array.from(coachMap.values());
    res.status(200).json({ success: true, count: coachesList.length, data: coachesList });
  } catch (error: any) {
    console.error('[getAvailableCoaches]', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve available coaches.' });
  }
};

// @desc    Assign dedicated coach and cohort tag to student user (Admin / Commander)
// @route   PUT /api/users/:id/assign-coach
export const assignCoach = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { assignedCoachId, assignedCoachName, cohortTag } = req.body;

    const updated = await prisma.user.update({
      where: { id },
      data: {
        assignedCoachId: assignedCoachId || null,
        assignedCoachName: assignedCoachName || null,
        ...(cohortTag !== undefined && { cohortTag: cohortTag ? String(cohortTag).trim() : null }),
      },
      select: SAFE_USER_SELECT,
    });

    await recordAdminAudit({
      adminId: req.user?.id,
      adminEmail: req.user?.email,
      action: 'COACH_ASSIGNED',
      targetEntity: 'User',
      targetId: updated.id,
      details: { assignedCoachName, cohortTag },
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: `Student successfully assigned to Coach ${assignedCoachName || 'None'}.`,
      data: updated,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete user account
// @route   DELETE /api/users/:id
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.user.findUnique({ where: { id }, select: SAFE_USER_SELECT });
    await prisma.user.delete({ where: { id } });

    await revokeUserSessions(id, 'student');

    await recordAdminAudit({
      adminId: req.user?.id,
      adminEmail: req.user?.email,
      action: 'USER_DELETED',
      targetEntity: 'User',
      targetId: id,
      details: { email: existing?.email, name: existing?.name },
      ipAddress: req.ip,
    });

    res.status(200).json({ success: true, message: 'User account deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

