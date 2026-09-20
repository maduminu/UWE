import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { cacheGet, cacheSet, cacheDelPattern } from '../config/redis';
import { logger } from '../utils/logger';
import { sendError, ErrorCode } from '../utils/apiResponse';

// @desc    Get all demo video reels (cached)
// @route   GET /api/demos
export const getAllDemos = async (req: Request, res: Response): Promise<void> => {
  try {
    const { category } = req.query;
    const cacheKey = `demos:${category || 'all'}`;

    const cached = await cacheGet(cacheKey);
    if (cached) {
      res.status(200).json(cached);
      return;
    }

    const demos = await prisma.demoVideo.findMany({
      where: category ? { category: category as any } : {},
      orderBy: { sortOrder: 'asc' },
    });

    const payload = { success: true, count: demos.length, data: demos };
    await cacheSet(cacheKey, payload, 3600); // 1 hour TTL
    res.status(200).json(payload);
  } catch (error: any) {
    logger.error(`[getAllDemos] ${error.message}`, 'DEMOS');
    sendError(res, 500, ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to retrieve demo videos.', req);
  }
};

// @desc    Add new demo video (CMS Admin)
// @route   POST /api/demos
export const createDemo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, subtitle, duration, posterUrl, videoUrl, badge, category, description } = req.body;

    const newDemo = await prisma.demoVideo.create({
      data: {
        title,
        subtitle,
        duration,
        posterUrl,
        videoUrl,
        badge,
        category: category || 'BMB',
        description,
      },
    });

    await cacheDelPattern('demos:');
    res.status(201).json({ success: true, data: newDemo });
  } catch (error: any) {
    logger.error(`[createDemo] ${error.message}`, 'DEMOS');
    sendError(res, 500, ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to create demo video.', req);
  }
};

// @desc    Update demo video (CMS Admin)
// @route   PUT /api/demos/:id
export const updateDemo = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { title, subtitle, duration, posterUrl, videoUrl, badge, category, description } = req.body;

    const updated = await prisma.demoVideo.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(subtitle && { subtitle }),
        ...(duration && { duration }),
        ...(posterUrl && { posterUrl }),
        ...(videoUrl && { videoUrl }),
        ...(badge && { badge }),
        ...(category && { category }),
        ...(description && { description }),
      },
    });

    await cacheDelPattern('demos:');
    res.status(200).json({ success: true, data: updated });
  } catch (error: any) {
    logger.error(`[updateDemo] ${error.message}`, 'DEMOS');
    sendError(res, 500, ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to update demo video.', req);
  }
};

// @desc    Delete demo video (CMS Admin)
// @route   DELETE /api/demos/:id
export const deleteDemo = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    await prisma.demoVideo.delete({ where: { id } });

    await cacheDelPattern('demos:');
    res.status(200).json({ success: true, message: 'Demo video deleted successfully' });
  } catch (error: any) {
    logger.error(`[deleteDemo] ${error.message}`, 'DEMOS');
    sendError(res, 500, ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to delete demo video.', req);
  }
};
