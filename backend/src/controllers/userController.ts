import { Request, Response } from 'express';
import { prisma } from '../config/db';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { recordAdminAudit } from '../utils/auditLogger';
import { revokeUserSessions } from '../services/tokenService';
import { logger } from '../utils/logger';
import { sendError, ErrorCode } from '../utils/apiResponse';

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
export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      select: SAFE_USER_SELECT,
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (error: any) {
    logger.error(`[getAllUsers] ${error.message}`, 'USERS');
    sendError(res, 500, ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to retrieve operatives directory.', req);
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
      sendError(res, 404, ErrorCode.NOT_FOUND, 'User not found', req);
      return;
    }
    res.status(200).json({ success: true, data: user });
  } catch (error: any) {
    logger.error(`[getUserById] ${error.message}`, 'USERS');
    sendError(res, 500, ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to retrieve user profile.', req);
  }
};

// @desc    Create new registered student user/operative (Admin CMS)
// @route   POST /api/users
export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, phone, password, enrolledCourseSlugs, isEnrolled } = req.body;

    if (!name || !email) {
      sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'Name and Email are required', req);
      return;
    }

    const existing = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (existing) {
      sendError(res, 400, ErrorCode.CONFLICT, 'User with this email already exists', req);
      return;
    }

    const rawPassword = password && password.trim() ? password.trim() : crypto.randomBytes(6).toString('hex');
    const passwordHash = await bcrypt.hash(rawPassword, 12);

    const isEnrollmentExplicit = typeof isEnrolled === 'boolean';
    const normalizedCourseSlugs = typeof enrolledCourseSlugs === 'string' ? enrolledCourseSlugs.trim() : '';

    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone ? phone.trim() : null,
        passwordHash,
        isEnrolled: isEnrollmentExplicit ? isEnrolled : false,
        enrolledCourseSlugs: normalizedCourseSlugs,
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
    logger.error(`[createUser] ${error.message}`, 'USERS');
    sendError(res, 500, ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to create user operative.', req);
  }
};

// @desc    Update user operative details / enrollment
// @route   PUT /api/users/:id
export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const isAdmin = req.user?.type === 'admin';
    const { name, email, phone, password, enrolledCourseSlugs, isEnrolled } = req.body;

    const dataToUpdate: any = {};
    if (typeof name === 'string') {
      const trimmedName = name.trim();
      if (trimmedName.length < 2 || trimmedName.length > 100) {
        sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'Name must be between 2 and 100 characters.', req);
        return;
      }
      dataToUpdate.name = trimmedName;
    }

    if (typeof phone === 'string') {
      const trimmedPhone = phone.trim();
      if (trimmedPhone.length > 30) {
        sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'Phone number must be under 30 characters.', req);
        return;
      }
      dataToUpdate.phone = trimmedPhone;
    }

    // Privileged fields can only be modified by admins
    if (isAdmin) {
      if (typeof email === 'string') dataToUpdate.email = email.trim().toLowerCase();
      if (typeof enrolledCourseSlugs === 'string') dataToUpdate.enrolledCourseSlugs = enrolledCourseSlugs;
      if (typeof isEnrolled === 'boolean') dataToUpdate.isEnrolled = isEnrolled;
      if (typeof password === 'string' && password.trim().length >= 6) {
        dataToUpdate.passwordHash = await bcrypt.hash(password.trim(), 12);
        dataToUpdate.tokenVersion = { increment: 1 };
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: dataToUpdate,
      select: SAFE_USER_SELECT,
    });

    if (isAdmin && isEnrolled === false) {
      await revokeUserSessions(id, 'student');
    }

    if (isAdmin) {
      await recordAdminAudit({
        adminId: req.user?.id,
        adminEmail: req.user?.email,
        action: 'USER_UPDATED',
        targetEntity: 'User',
        targetId: updated.id,
        details: dataToUpdate,
        ipAddress: req.ip,
      });
    }

    res.status(200).json({ success: true, data: updated });
  } catch (error: any) {
    logger.error(`[updateUser] ${error.message}`, 'USERS');
    sendError(res, 500, ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to update operative account.', req);
  }
};

// @desc    Get all available coaches from database (Instructors, Admin Coaches, Staff)
// @route   GET /api/users/coaches
export const getAvailableCoaches = async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Fetch instructors
    const instructors = await prisma.instructor.findMany({
      where: { isActive: true },
      select: { id: true, name: true, title: true },
      orderBy: { createdAt: 'asc' },
    });

    // 2. Fetch admin coaches / commanders
    const adminCoaches = await prisma.adminUser.findMany({
      where: { role: { in: ['COACH', 'COMMANDER', 'SUPER_ADMIN'] } },
      select: { id: true, name: true, role: true },
      orderBy: { name: 'asc' },
    });

    // 3. Fetch active staff members
    const staffMembers = await prisma.staffMember.findMany({
      where: { isActive: true },
      select: { id: true, name: true, role: true, department: true },
      orderBy: { name: 'asc' },
    });

    // Normalize and consolidate into a unified coach list
    const coachList: Array<{ id: string; name: string; type: string; title: string }> = [
      ...instructors.map((ins) => ({
        id: ins.id,
        name: ins.name,
        type: 'INSTRUCTOR',
        title: ins.title,
      })),
      ...adminCoaches.map((adm) => ({
        id: adm.id,
        name: adm.name,
        type: 'ADMIN_COACH',
        title: `${adm.role.replace('_', ' ')} (HQ)`,
      })),
      ...staffMembers.map((st) => ({
        id: st.id,
        name: st.name,
        type: 'STAFF',
        title: `${st.role} • ${st.department}`,
      })),
    ];

    // Deduplicate by name just in case
    const uniqueCoaches = Array.from(new Map(coachList.map((c) => [c.name, c])).values());

    res.status(200).json({
      success: true,
      count: uniqueCoaches.length,
      data: uniqueCoaches,
    });
  } catch (error: any) {
    logger.error(`[getAvailableCoaches] ${error.message}`, 'USERS');
    sendError(res, 500, ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to fetch available coaches directory.', req);
  }
};

// @desc    Assign a Tactical Coach to a student operative
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
    logger.error(`[assignCoach] ${error.message}`, 'USERS');
    sendError(res, 500, ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to assign coach to student.', req);
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
    logger.error(`[deleteUser] ${error.message}`, 'USERS');
    sendError(res, 500, ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to delete user account.', req);
  }
};
