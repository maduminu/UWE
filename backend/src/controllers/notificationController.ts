import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { broadcastRealtimeEvent } from '../utils/realtimeEmitter';
import { logger } from '../utils/logger';

/**
 * Helper to create a notification record and broadcast it across the realtime bus.
 */
export async function createNotificationHelper(payload: {
  userId?: string | null;
  title: string;
  message: string;
  link?: string | null;
  type?: 'MASTERMIND_ANSWER' | 'REVIEW_APPROVED' | 'COHORT_SESSION' | string;
}) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId: payload.userId || null,
        title: payload.title.trim(),
        message: payload.message.trim(),
        link: payload.link ? payload.link.trim() : null,
        type: payload.type || 'GENERAL',
        isRead: false,
      },
    });

    // Broadcast across live SSE streams
    broadcastRealtimeEvent('notification:new', {
      notification,
      targetUserId: payload.userId || null,
    });

    logger.info(`[Notification] Created alert: "${payload.title}" (target: ${payload.userId || 'GLOBAL'})`, 'NOTIFICATION');
    return notification;
  } catch (err: any) {
    logger.error(`[NotificationHelper] Failed to create notification: ${err.message}`, 'NOTIFICATION');
    return null;
  }
}

// @desc    Get notifications for current user or global broadcasts
// @route   GET /api/notifications
export const getNotifications = async (req: Request, res: Response): Promise<void> => {
  try {
    const callerId = req.user?.id || (req.query.userId ? String(req.query.userId).trim() : null);

    const whereClause: any = callerId
      ? {
          OR: [
            { userId: callerId },
            { userId: null },
          ],
        }
      : { userId: null };

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
      prisma.notification.count({
        where: {
          ...whereClause,
          isRead: false,
        },
      }),
    ]);

    res.status(200).json({
      success: true,
      unreadCount,
      count: notifications.length,
      data: notifications,
    });
  } catch (error: any) {
    logger.error(`[getNotifications] ${error.message}`, 'NOTIFICATION');
    res.status(500).json({ success: false, message: 'Failed to retrieve notifications.' });
  }
};

// @desc    Mark a specific notification as read
// @route   PUT /api/notifications/:id/read
export const markNotificationAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);

    const existing = await prisma.notification.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Notification not found.' });
      return;
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    broadcastRealtimeEvent('notification:read', { id, userId: updated.userId });

    res.status(200).json({
      success: true,
      message: 'Notification marked as read.',
      data: updated,
    });
  } catch (error: any) {
    logger.error(`[markNotificationAsRead] ${error.message}`, 'NOTIFICATION');
    res.status(500).json({ success: false, message: 'Failed to update notification.' });
  }
};

// @desc    Mark all notifications for the caller as read
// @route   PUT /api/notifications/read-all
export const markAllNotificationsAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const callerId = req.user?.id || (req.body?.userId ? String(req.body.userId).trim() : null);

    const whereClause: any = {
      isRead: false,
      ...(callerId
        ? {
            OR: [
              { userId: callerId },
              { userId: null },
            ],
          }
        : { userId: null }),
    };

    const updateResult = await prisma.notification.updateMany({
      where: whereClause,
      data: { isRead: true },
    });

    broadcastRealtimeEvent('notification:read', { all: true, userId: callerId });

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read.',
      updatedCount: updateResult.count,
    });
  } catch (error: any) {
    logger.error(`[markAllNotificationsAsRead] ${error.message}`, 'NOTIFICATION');
    res.status(500).json({ success: false, message: 'Failed to mark all notifications as read.' });
  }
};
