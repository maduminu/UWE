import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { getErrorMessage } from '../utils/typeHelpers';

// @desc    Get all staff members
// @route   GET /api/staff
export const getAllStaff = async (_req: Request, res: Response): Promise<void> => {
  try {
    const staff = await prisma.staffMember.findMany({
      orderBy: [{ isActive: 'desc' }, { joinDate: 'asc' }],
    });
    res.status(200).json({ success: true, count: staff.length, data: staff });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

// @desc    Create new staff member
// @route   POST /api/staff
export const createStaff = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, role, department, email, phone, photoUrl, bio, isActive } = req.body;

    if (!name || !role) {
      res.status(400).json({ success: false, message: 'Name and Role are required' });
      return;
    }

    const newStaff = await prisma.staffMember.create({
      data: {
        name: name.trim(),
        role: role.trim(),
        department: department || 'Operations',
        email: email ? email.trim().toLowerCase() : null,
        phone: phone ? phone.trim() : null,
        photoUrl: photoUrl ? photoUrl.trim() : null,
        bio: bio ? bio.trim() : null,
        isActive: typeof isActive === 'boolean' ? isActive : true,
      },
    });

    res.status(201).json({ success: true, data: newStaff });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

// @desc    Update staff member details or status
// @route   PUT /api/staff/:id
export const updateStaff = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { name, role, department, email, phone, photoUrl, bio, isActive } = req.body;

    const updated = await prisma.staffMember.update({
      where: { id },
      data: {
        ...(typeof name === 'string' && { name }),
        ...(typeof role === 'string' && { role }),
        ...(typeof department === 'string' && { department }),
        ...(email !== undefined && { email: email ? email.trim().toLowerCase() : null }),
        ...(phone !== undefined && { phone: phone ? phone.trim() : null }),
        ...(photoUrl !== undefined && { photoUrl: photoUrl ? photoUrl.trim() : null }),
        ...(bio !== undefined && { bio: bio ? bio.trim() : null }),
        ...(typeof isActive === 'boolean' && { isActive }),
      },
    });

    res.status(200).json({ success: true, data: updated });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

// @desc    Delete a staff member
// @route   DELETE /api/staff/:id
export const deleteStaff = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    await prisma.staffMember.delete({ where: { id } });
    res.status(200).json({ success: true, message: 'Staff member removed from Empire roster' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
