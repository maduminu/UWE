import { Request, Response } from 'express';
import { prisma } from '../config/db';

// @desc    Get user's video progress list
// @route   GET /api/progress/:userId
export const getUserProgress = async (req: Request, res: Response): Promise<void> => {
  try {
    const callerId = req.user?.id;
    const isAdmin = req.user?.type === 'admin';
    const targetUserId = isAdmin ? String(req.params.userId) : callerId;

    if (!targetUserId) {
      res.status(400).json({ success: false, message: 'User ID is required' });
      return;
    }

    const progressList = await prisma.videoProgress.findMany({
      where: { userId: targetUserId },
    });
    res.status(200).json({ success: true, count: progressList.length, data: progressList });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Save or toggle module watch progress/completion
// @route   POST /api/progress
export const saveProgress = async (req: Request, res: Response): Promise<void> => {
  try {
    const { moduleId, seriesId, isCompleted, progressPercent } = req.body;
    const callerId = req.user?.id;
    const isAdmin = req.user?.type === 'admin';
    const targetUserId = isAdmin && req.body.userId ? String(req.body.userId) : callerId;

    if (!targetUserId || !moduleId) {
      res.status(400).json({ success: false, message: 'Authenticated user and moduleId are required' });
      return;
    }

    const record = await prisma.videoProgress.upsert({
      where: {
        userId_moduleId: {
          userId: targetUserId,
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
        userId: targetUserId,
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
