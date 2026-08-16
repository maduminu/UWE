import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { getErrorMessage, normalizeEnumValue } from '../utils/typeHelpers';

// @desc    Get all demo video reels
// @route   GET /api/demos
export const getAllDemos = async (req: Request, res: Response): Promise<void> => {
  try {
    const { category } = req.query;
    const normalizedCategory = normalizeEnumValue(category, ['BMB', 'LEADERSHIP', 'IGNIT', 'TESTIMONIAL']) as
      | 'BMB'
      | 'LEADERSHIP'
      | 'IGNIT'
      | 'TESTIMONIAL'
      | undefined;
    const demos = await prisma.demoVideo.findMany({
      where: normalizedCategory ? { category: normalizedCategory } : {},
      orderBy: { sortOrder: 'asc' },
    });
    res.status(200).json({ success: true, count: demos.length, data: demos });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
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

    res.status(201).json({ success: true, data: newDemo });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
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

    res.status(200).json({ success: true, data: updated });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

// @desc    Delete demo video (CMS Admin)
// @route   DELETE /api/demos/:id
export const deleteDemo = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    await prisma.demoVideo.delete({ where: { id } });
    res.status(200).json({ success: true, message: 'Demo video deleted successfully' });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

