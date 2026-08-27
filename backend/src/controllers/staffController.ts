import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { cacheGet, cacheSet, cacheDel } from '../config/redis';

const PHONE_REGEX = /^[+\d\s\-()]{7,20}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// @desc    Get all staff members (cached)
// @route   GET /api/staff
export const getAllStaff = async (_req: Request, res: Response): Promise<void> => {
  try {
    const cached = await cacheGet('staff:all');
    if (cached) {
      res.status(200).json(cached);
      return;
    }

    const staff = await prisma.staffMember.findMany({
      orderBy: [{ isActive: 'desc' }, { joinDate: 'asc' }],
    });
    const payload = { success: true, count: staff.length, data: staff };
    await cacheSet('staff:all', payload, 3600);
    res.status(200).json(payload);
  } catch (error: any) {
    console.error('[getAllStaff]', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve staff directory.' });
  }
};

// @desc    Create new staff member
// @route   POST /api/staff
export const createStaff = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, role, department, email, phone, photoUrl, bio, isActive } = req.body;

    if (!name || !role) {
      res.status(400).json({ success: false, message: 'Name and Role are required.' });
      return;
    }

    if (name.trim().length > 100) {
      res.status(400).json({ success: false, message: 'Name must be under 100 characters.' });
      return;
    }

    if (email && !EMAIL_REGEX.test(email.trim())) {
      res.status(400).json({ success: false, message: 'Invalid email address format.' });
      return;
    }

    if (phone && !PHONE_REGEX.test(phone.trim())) {
      res.status(400).json({ success: false, message: 'Invalid phone number format.' });
      return;
    }

    const newStaff = await prisma.staffMember.create({
      data: {
        name: name.trim(),
        role: role.trim(),
        department: (department || 'Operations').trim(),
        email: email ? email.trim().toLowerCase() : null,
        phone: phone ? phone.trim() : null,
        photoUrl: photoUrl ? photoUrl.trim() : null,
        bio: bio ? bio.trim() : null,
        isActive: typeof isActive === 'boolean' ? isActive : true,
      },
    });

    await cacheDel('staff:all');
    res.status(201).json({ success: true, data: newStaff });
  } catch (error: any) {
    console.error('[createStaff]', error);
    res.status(500).json({ success: false, message: 'Failed to create staff member.' });
  }
};

// @desc    Update staff member details or status
// @route   PUT /api/staff/:id
export const updateStaff = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { name, role, department, email, phone, photoUrl, bio, isActive } = req.body;

    if (email && !EMAIL_REGEX.test(email.trim())) {
      res.status(400).json({ success: false, message: 'Invalid email address format.' });
      return;
    }

    if (phone && !PHONE_REGEX.test(phone.trim())) {
      res.status(400).json({ success: false, message: 'Invalid phone number format.' });
      return;
    }

    const updated = await prisma.staffMember.update({
      where: { id },
      data: {
        ...(typeof name === 'string' && { name: name.trim() }),
        ...(typeof role === 'string' && { role: role.trim() }),
        ...(typeof department === 'string' && { department: department.trim() }),
        ...(email !== undefined && { email: email ? email.trim().toLowerCase() : null }),
        ...(phone !== undefined && { phone: phone ? phone.trim() : null }),
        ...(photoUrl !== undefined && { photoUrl: photoUrl ? photoUrl.trim() : null }),
        ...(bio !== undefined && { bio: bio ? bio.trim() : null }),
        ...(typeof isActive === 'boolean' && { isActive }),
      },
    });

    await cacheDel('staff:all');
    res.status(200).json({ success: true, data: updated });
  } catch (error: any) {
    console.error('[updateStaff]', error);
    res.status(500).json({ success: false, message: 'Failed to update staff member.' });
  }
};

// @desc    Delete a staff member
// @route   DELETE /api/staff/:id
export const deleteStaff = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    await prisma.staffMember.delete({ where: { id } });
    await cacheDel('staff:all');
    res.status(200).json({ success: true, message: 'Staff member removed from Empire roster' });
  } catch (error: any) {
    console.error('[deleteStaff]', error);
    res.status(500).json({ success: false, message: 'Failed to delete staff member.' });
  }
};
