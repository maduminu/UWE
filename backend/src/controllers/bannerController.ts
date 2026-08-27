import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { cacheGet, cacheSet, cacheDel } from '../config/redis';

// @desc    Get active announcement banner (cached)
// @route   GET /api/banners/active
export const getActiveBanner = async (_req: Request, res: Response): Promise<void> => {
  try {
    const cached = await cacheGet('banners:active');
    if (cached !== null) {
      res.status(200).json({ success: true, data: cached, cached: true });
      return;
    }

    const banner = await prisma.announcementBanner.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    await cacheSet('banners:active', banner || null, 3600);
    res.status(200).json({ success: true, data: banner || null });
  } catch (error: any) {
    console.error('[getActiveBanner]', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve active announcement.' });
  }
};

// @desc    Create new announcement banner
// @route   POST /api/banners
export const createBanner = async (req: Request, res: Response): Promise<void> => {
  try {
    const { message, badgeText, linkUrl, bannerType, isActive } = req.body;

    if (!message) {
      res.status(400).json({ success: false, message: 'Message text is required for announcement banner.' });
      return;
    }

    if (message.trim().length > 300) {
      res.status(400).json({ success: false, message: 'Message must be under 300 characters.' });
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
        message: message.trim(),
        badgeText: (badgeText || 'ALERT').trim(),
        linkUrl: linkUrl ? linkUrl.trim() : null,
        bannerType: bannerType || 'URGENT',
        isActive: typeof isActive === 'boolean' ? isActive : true,
      },
    });

    await cacheDel('banners:active');
    res.status(201).json({ success: true, data: newBanner });
  } catch (error: any) {
    console.error('[createBanner]', error);
    res.status(500).json({ success: false, message: 'Failed to create announcement banner.' });
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
      res.status(404).json({ success: false, message: 'Announcement banner record not found.' });
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
        ...(typeof message === 'string' && { message: message.trim() }),
        ...(typeof badgeText === 'string' && { badgeText: badgeText.trim() }),
        ...(typeof linkUrl === 'string' && { linkUrl: linkUrl.trim() }),
        ...(bannerType && { bannerType }),
        ...(typeof isActive === 'boolean' && { isActive }),
      },
    });

    await cacheDel('banners:active');
    res.status(200).json({ success: true, data: updated });
  } catch (error: any) {
    console.error('[updateBanner]', error);
    res.status(500).json({ success: false, message: 'Failed to update announcement banner.' });
  }
};
