import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { getErrorMessage } from '../utils/typeHelpers';

// @desc    Get active announcement banner
// @route   GET /api/banners/active
export const getActiveBanner = async (_req: Request, res: Response): Promise<void> => {
  try {
    const banner = await prisma.announcementBanner.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({ success: true, data: banner || null });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

// @desc    Create new announcement banner
// @route   POST /api/banners
export const createBanner = async (req: Request, res: Response): Promise<void> => {
  try {
    const { message, badgeText, linkUrl, bannerType, isActive } = req.body;

    if (!message) {
      res.status(400).json({ success: false, message: 'Message text is required for announcement banner' });
      return;
    }

    // If making this banner active, deactivate all previous banners
    if (isActive) {
      await prisma.announcementBanner.updateMany({
        data: { isActive: false },
      });
    }

    const newBanner = await prisma.announcementBanner.create({
      data: {
        message,
        badgeText: badgeText || 'ALERT',
        linkUrl,
        bannerType: bannerType || 'URGENT',
        isActive: typeof isActive === 'boolean' ? isActive : true,
      },
    });

    res.status(201).json({ success: true, data: newBanner });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

// @desc    Update announcement banner message or status
// @route   PUT /api/banners/:id
export const updateBanner = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { message, badgeText, linkUrl, bannerType, isActive } = req.body;

    // Check if banner exists
    const existing = await prisma.announcementBanner.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Announcement banner record not found' });
      return;
    }

    // If activating this banner, deactivate all others to maintain single-banner view
    if (isActive === true) {
      await prisma.announcementBanner.updateMany({
        where: { id: { not: id } },
        data: { isActive: false },
      });
    }

    const updated = await prisma.announcementBanner.update({
      where: { id },
      data: {
        ...(typeof message === 'string' && { message }),
        ...(typeof badgeText === 'string' && { badgeText }),
        ...(typeof linkUrl === 'string' && { linkUrl }),
        ...(bannerType && { bannerType }),
        ...(typeof isActive === 'boolean' && { isActive }),
      },
    });

    res.status(200).json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
