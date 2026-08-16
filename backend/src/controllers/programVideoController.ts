import { Request, Response } from 'express';
import { prisma } from '../config/db';

// @desc    Get category-wise program video series
// @route   GET /api/program-videos
export const getProgramVideos = async (req: Request, res: Response): Promise<void> => {
  try {
    const { courseSlug } = req.query;

    const seriesList = await prisma.programVideoSeries.findMany({
      where: courseSlug ? { courseSlug: String(courseSlug) } : {},
      include: {
        modules: {
          orderBy: { episodeNumber: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    res.status(200).json({ success: true, count: seriesList.length, data: seriesList });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create new program video series (CMS Admin)
// @route   POST /api/program-videos/series
export const createSeries = async (req: Request, res: Response): Promise<void> => {
  try {
    const { courseSlug, seriesTitle, category, description, thumbnailUrl } = req.body;

    if (!seriesTitle || !courseSlug) {
      res.status(400).json({ success: false, message: 'Series Title and Course Slug are required' });
      return;
    }

    const newSeries = await prisma.programVideoSeries.create({
      data: {
        courseSlug: courseSlug.toLowerCase(),
        seriesTitle: seriesTitle.trim(),
        category: category || 'Subconscious Mind Optimization',
        description: description || 'Comprehensive tactical video module series.',
        thumbnailUrl: thumbnailUrl || 'https://images.unsplash.com/photo-1507413245164-6160d8298b31?auto=format&fit=crop&w=800&q=80',
      },
      include: {
        modules: true,
      },
    });

    res.status(201).json({ success: true, data: newSeries });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create new video module episode inside a series (CMS Admin)
// @route   POST /api/program-videos/modules
export const createModule = async (req: Request, res: Response): Promise<void> => {
  try {
    const { seriesId, episodeNumber, title, duration, videoUrl, isFreePreview, description } = req.body;

    if (!seriesId || !title || !videoUrl) {
      res.status(400).json({ success: false, message: 'Series ID, Episode Title and Video URL are required' });
      return;
    }

    const newModule = await prisma.programVideoModule.create({
      data: {
        seriesId,
        episodeNumber: episodeNumber ? parseInt(episodeNumber, 10) : 1,
        title: title.trim(),
        duration: duration || '03:45',
        videoUrl: videoUrl.trim(),
        isFreePreview: typeof isFreePreview === 'boolean' ? isFreePreview : false,
        description: description ? description.trim() : null,
      },
    });

    res.status(201).json({ success: true, data: newModule });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete video module (CMS Admin)
// @route   DELETE /api/program-videos/modules/:id
export const deleteModule = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    await prisma.programVideoModule.delete({ where: { id } });
    res.status(200).json({ success: true, message: 'Video module deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
