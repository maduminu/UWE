import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { getErrorMessage } from '../utils/typeHelpers';

// @desc    Get user's video progress list
// @route   GET /api/progress/:userId
export const getUserProgress = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = String(req.params.userId);
    const progressList = await prisma.videoProgress.findMany({
      where: { userId },
    });
    res.status(200).json({ success: true, count: progressList.length, data: progressList });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

// @desc    Save or toggle module watch progress/completion
// @route   POST /api/progress
export const saveProgress = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, moduleId, seriesId, isCompleted, progressPercent } = req.body;

    if (!userId || !moduleId) {
      res.status(400).json({ success: false, message: 'userId and moduleId are required' });
      return;
    }

    const record = await prisma.videoProgress.upsert({
      where: {
        userId_moduleId: {
          userId,
          moduleId,
        },
      },
      update: {
        isCompleted: typeof isCompleted === 'boolean' ? isCompleted : true,
        progressPercent: typeof progressPercent === 'number' ? progressPercent : 100,
        lastWatchedAt: new Date(),
        ...(seriesId && { seriesId }),
      },
      create: {
        userId,
        moduleId,
        seriesId: seriesId || null,
        isCompleted: typeof isCompleted === 'boolean' ? isCompleted : true,
        progressPercent: typeof progressPercent === 'number' ? progressPercent : 100,
      },
    });

    res.status(200).json({ success: true, data: record });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
