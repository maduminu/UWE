import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { logger } from '../utils/logger';
import { sendError, ErrorCode } from '../utils/apiResponse';

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
    logger.error(`[getProgramVideos] ${error.message}`, 'VIDEOS');
    sendError(res, 500, ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to retrieve program video series.', req);
  }
};

// @desc    Create new program video series (CMS Admin)
// @route   POST /api/program-videos/series
export const createSeries = async (req: Request, res: Response): Promise<void> => {
  try {
    const { courseSlug, seriesTitle, category, description, thumbnailUrl } = req.body;

    if (!seriesTitle || !courseSlug) {
      sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'Series Title and Course Slug are required', req);
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
    logger.error(`[createSeries] ${error.message}`, 'VIDEOS');
    sendError(res, 500, ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to create program video series.', req);
  }
};

// @desc    Update program video series (CMS Admin)
// @route   PUT /api/program-videos/series/:id
export const updateSeries = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { courseSlug, seriesTitle, category, description, thumbnailUrl } = req.body;

    const updatedSeries = await prisma.programVideoSeries.update({
      where: { id },
      data: {
        ...(courseSlug && { courseSlug: courseSlug.toLowerCase() }),
        ...(seriesTitle && { seriesTitle: seriesTitle.trim() }),
        ...(category && { category }),
        ...(description && { description }),
        ...(thumbnailUrl && { thumbnailUrl }),
      },
      include: {
        modules: {
          orderBy: { episodeNumber: 'asc' },
        },
      },
    });

    res.status(200).json({ success: true, data: updatedSeries });
  } catch (error: any) {
    logger.error(`[updateSeries] ${error.message}`, 'VIDEOS');
    sendError(res, 500, ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to update video series.', req);
  }
};

// @desc    Delete program video series (CMS Admin)
// @route   DELETE /api/program-videos/series/:id
export const deleteSeries = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    // Delete modules first
    await prisma.programVideoModule.deleteMany({ where: { seriesId: id } });
    await prisma.programVideoSeries.delete({ where: { id } });
    res.status(200).json({ success: true, message: 'Video series deleted successfully' });
  } catch (error: any) {
    logger.error(`[deleteSeries] ${error.message}`, 'VIDEOS');
    sendError(res, 500, ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to delete video series.', req);
  }
};

// @desc    Create new video module episode inside a series (CMS Admin)
// @route   POST /api/program-videos/modules
export const createModule = async (req: Request, res: Response): Promise<void> => {
  try {
    const { seriesId, episodeNumber, title, duration, videoUrl, isFreePreview, description } = req.body;

    if (!seriesId || !title || !videoUrl) {
      sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'Series ID, Episode Title and Video URL are required', req);
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
    logger.error(`[createModule] ${error.message}`, 'VIDEOS');
    sendError(res, 500, ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to create video module.', req);
  }
};

// @desc    Update video module episode (CMS Admin)
// @route   PUT /api/program-videos/modules/:id
export const updateModule = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { episodeNumber, title, duration, videoUrl, isFreePreview, description } = req.body;

    const updated = await prisma.programVideoModule.update({
      where: { id },
      data: {
        ...(episodeNumber !== undefined && { episodeNumber: parseInt(episodeNumber, 10) }),
        ...(title && { title: title.trim() }),
        ...(duration && { duration: duration.trim() }),
        ...(videoUrl && { videoUrl: videoUrl.trim() }),
        ...(typeof isFreePreview === 'boolean' && { isFreePreview }),
        ...(description !== undefined && { description: description ? description.trim() : null }),
      },
    });

    res.status(200).json({ success: true, data: updated });
  } catch (error: any) {
    logger.error(`[updateModule] ${error.message}`, 'VIDEOS');
    sendError(res, 500, ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to update video module.', req);
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
    logger.error(`[deleteModule] ${error.message}`, 'VIDEOS');
    sendError(res, 500, ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to delete video module.', req);
  }
};
