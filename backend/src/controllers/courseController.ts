import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { cacheGet, cacheSet, cacheDelPattern } from '../config/redis';
import { recordAdminAudit } from '../utils/auditLogger';
import { logger } from '../utils/logger';
import { sendError, ErrorCode } from '../utils/apiResponse';
import { toCents, toPrismaDecimal } from '../utils/money';
import { broadcastRealtimeEvent } from '../utils/realtimeEmitter';
import { createNotificationHelper } from './notificationController';

// @desc    Get all courses with batches (cached)
// @route   GET /api/courses
export const getAllCourses = async (req: Request, res: Response): Promise<void> => {
  try {
    const cached = await cacheGet<any[]>('courses:all');
    if (cached) {
      res.status(200).json({ success: true, count: cached.length, data: cached, cached: true });
      return;
    }

    const courses = await prisma.course.findMany({
      include: {
        batches: {
          orderBy: { batchNumber: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    await cacheSet('courses:all', courses, 3600); // 1 hour TTL
    res.status(200).json({ success: true, count: courses.length, data: courses });
  } catch (error: any) {
    logger.error(`[getAllCourses] ${error.message}`, 'COURSES');
    sendError(res, 500, ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to retrieve courses directory.', req);
  }
};

// @desc    Get single course by slug (cached)
// @route   GET /api/courses/:slug
export const getCourseBySlug = async (req: Request, res: Response): Promise<void> => {
  try {
    const slug = String(req.params.slug).toLowerCase();
    const cacheKey = `courses:slug:${slug}`;
    const cached = await cacheGet(cacheKey);
    if (cached) {
      res.status(200).json({ success: true, data: cached, cached: true });
      return;
    }

    const course = await prisma.course.findUnique({
      where: { slug },
      include: {
        batches: {
          orderBy: { batchNumber: 'asc' },
        },
      },
    });

    if (!course) {
      sendError(res, 404, ErrorCode.NOT_FOUND, 'Course division not found', req);
      return;
    }

    await cacheSet(cacheKey, course, 3600);
    res.status(200).json({ success: true, data: course });
  } catch (error: any) {
    logger.error(`[getCourseBySlug] ${error.message}`, 'COURSES');
    sendError(res, 500, ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to retrieve course details.', req);
  }
};

// @desc    Update course price / duration (CMS Admin)
// @route   PUT /api/courses/:id
export const updateCourse = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { price, duration, badge, category, subtitle, isFeatured } = req.body;

    const existingCourse = await prisma.course.findUnique({ where: { id } });
    if (!existingCourse) {
      sendError(res, 404, ErrorCode.NOT_FOUND, 'Course division not found', req);
      return;
    }

    const updated = await prisma.course.update({
      where: { id },
      data: {
        ...(price !== undefined && { price: toPrismaDecimal(toCents(price)) }),
        ...(duration && { duration }),
        ...(badge && { badge }),
        ...(category && { category: category as any }),
        ...(subtitle && { subtitle }),
        ...(typeof isFeatured === 'boolean' && { isFeatured }),
      },
    });

    // Invalidate course caches
    await cacheDelPattern('courses:');

    // Audit Logging
    await recordAdminAudit({
      adminId: req.user?.id,
      adminEmail: req.user?.email,
      action: 'COURSE_PRICE_CHANGED',
      targetEntity: 'Course',
      targetId: id,
      details: { oldPrice: existingCourse.price, newPrice: updated.price, slug: updated.slug },
      ipAddress: req.ip,
    });

    res.status(200).json({ success: true, data: updated });
  } catch (error: any) {
    logger.error(`[updateCourse] ${error.message}`, 'COURSES');
    sendError(res, 500, ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to update course directive.', req);
  }
};

// @desc    Update a specific Course Batch (Schedule, Seats, Zoom Link, Coach)
// @route   PUT /api/courses/batches/:batchId
export const updateBatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const batchId = String(req.params.batchId);
    const { scheduleText, startDate, totalSeats, availableSeats, zoomLink, status, assignedCoachId, assignedCoachName } = req.body;

    const updatedBatch = await prisma.$transaction(async (tx) => {
      const existingBatch = await tx.courseBatch.findUnique({ where: { id: batchId } });
      if (!existingBatch) {
        throw new Error('Course batch directive not found');
      }

      const cleanTotal = totalSeats !== undefined ? Math.max(1, parseInt(totalSeats, 10) || existingBatch.totalSeats) : existingBatch.totalSeats;
      let cleanAvailable = availableSeats !== undefined ? Math.max(0, parseInt(availableSeats, 10)) : existingBatch.availableSeats;
      if (cleanAvailable > cleanTotal) {
        cleanAvailable = cleanTotal;
      }

      return await tx.courseBatch.update({
        where: { id: batchId },
        data: {
          ...(scheduleText && { scheduleText }),
          ...(startDate && { startDate: new Date(startDate) }),
          ...(totalSeats !== undefined && { totalSeats: cleanTotal }),
          ...(availableSeats !== undefined && { availableSeats: cleanAvailable }),
          ...(zoomLink !== undefined && { zoomLink }),
          ...(status && { status: status as any }),
          ...(assignedCoachId !== undefined && { assignedCoachId: assignedCoachId || null }),
          ...(assignedCoachName !== undefined && { assignedCoachName: assignedCoachName || null }),
        },
      });
    });

    await cacheDelPattern('courses:');
    broadcastRealtimeEvent('course:updated', { batchId, availableSeats: updatedBatch.availableSeats });

    await recordAdminAudit({
      adminId: req.user?.id,
      adminEmail: req.user?.email,
      action: 'BATCH_UPDATED',
      targetEntity: 'CourseBatch',
      targetId: batchId,
      details: { availableSeats: updatedBatch.availableSeats, totalSeats: updatedBatch.totalSeats, status: updatedBatch.status },
      ipAddress: req.ip,
    });

    res.status(200).json({ success: true, data: updatedBatch });
  } catch (error: any) {
    const is404 = error.message?.includes('not found');
    logger.error(`[updateBatch] ${error.message}`, 'COURSES');
    sendError(
      res,
      is404 ? 404 : 500,
      is404 ? ErrorCode.NOT_FOUND : ErrorCode.INTERNAL_SERVER_ERROR,
      is404 ? 'Course batch not found' : 'Failed to update course batch schedule.',
      req
    );
  }
};

// @desc    Update seats available for a batch
// @route   PUT /api/courses/batches/:batchId/seats
export const updateBatchSeats = async (req: Request, res: Response): Promise<void> => {
  try {
    const batchId = String(req.params.batchId);
    const { availableSeats } = req.body;

    const updatedBatch = await prisma.$transaction(async (tx) => {
      const existingBatch = await tx.courseBatch.findUnique({ where: { id: batchId } });
      if (!existingBatch) {
        throw new Error('Course batch directive not found');
      }

      let cleanSeats = Math.max(0, parseInt(availableSeats, 10) || 0);
      if (cleanSeats > existingBatch.totalSeats) {
        cleanSeats = existingBatch.totalSeats;
      }

      return await tx.courseBatch.update({
        where: { id: batchId },
        data: { availableSeats: cleanSeats },
      });
    });

    await cacheDelPattern('courses:');
    broadcastRealtimeEvent('course:updated', { batchId, availableSeats: updatedBatch.availableSeats });

    await recordAdminAudit({
      adminId: req.user?.id,
      adminEmail: req.user?.email,
      action: 'BATCH_SEATS_UPDATED',
      targetEntity: 'CourseBatch',
      targetId: batchId,
      details: { availableSeats: updatedBatch.availableSeats },
      ipAddress: req.ip,
    });

    res.status(200).json({ success: true, data: updatedBatch });
  } catch (error: any) {
    const is404 = error.message?.includes('not found');
    logger.error(`[updateBatchSeats] ${error.message}`, 'COURSES');
    sendError(
      res,
      is404 ? 404 : 500,
      is404 ? ErrorCode.NOT_FOUND : ErrorCode.INTERNAL_SERVER_ERROR,
      is404 ? 'Course batch not found' : 'Failed to update batch seats.',
      req
    );
  }
};

// @desc    Create new course program (CMS Admin)
// @route   POST /api/courses
export const createCourse = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, slug, subtitle, badge, category, description, price, currency, duration, nextBatchDate, seats, zoomLink } = req.body;

    if (!title || price === undefined) {
      sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'Title and Price are required', req);
      return;
    }

    const generatedSlug = (slug || title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const newCourse = await prisma.course.create({
      data: {
        title,
        slug: generatedSlug,
        subtitle: subtitle || 'Tactical Mind & Command Protocol',
        badge: badge || 'MIND DIVISION',
        category: (category as any) || 'MIND',
        description: description || 'Comprehensive tactical empowerment program.',
        price: toPrismaDecimal(toCents(price)),
        currency: currency || 'RS.',
        duration: duration || '5 Days Intensive',
        isFeatured: true,
        batches: {
          create: {
            batchNumber: 1,
            startDate: new Date(),
            scheduleText: nextBatchDate || '2026-09-15 (Zoom Live)',
            totalSeats: seats ? parseInt(seats, 10) : 20,
            availableSeats: seats ? parseInt(seats, 10) : 20,
            zoomLink: zoomLink || null,
            status: 'UPCOMING',
          },
        },
      },
      include: {
        batches: true,
      },
    });

    await cacheDelPattern('courses:');
    broadcastRealtimeEvent('course:updated', { slug: newCourse.slug });

    await recordAdminAudit({
      adminId: req.user?.id,
      adminEmail: req.user?.email,
      action: 'COURSE_CREATED',
      targetEntity: 'Course',
      targetId: newCourse.id,
      details: { title: newCourse.title, slug: newCourse.slug, price: newCourse.price },
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, data: newCourse });
  } catch (error: any) {
    logger.error(`[createCourse] ${error.message}`, 'COURSES');
    sendError(res, 500, ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to create course directive.', req);
  }
};

// @desc    Create a new batch for an existing course (e.g. BMB Batch 2, Batch 3)
// @route   POST /api/courses/batches
export const createBatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const { courseId, courseSlug, batchNumber, scheduleText, startDate, totalSeats, availableSeats, zoomLink, status, assignedCoachName } = req.body;

    // Locate parent course
    const course = await prisma.course.findFirst({
      where: {
        OR: [
          ...(courseId ? [{ id: courseId }] : []),
          ...(courseSlug ? [{ slug: String(courseSlug).toLowerCase() }] : []),
        ],
      },
      include: { batches: { orderBy: { batchNumber: 'desc' }, take: 1 } },
    });

    if (!course) {
      sendError(res, 404, ErrorCode.NOT_FOUND, 'Target course not found to attach batch.', req);
      return;
    }

    const nextBatchNum = batchNumber !== undefined
      ? parseInt(batchNumber, 10)
      : (course.batches[0]?.batchNumber || 0) + 1;

    const cleanTotal = totalSeats !== undefined ? Math.max(1, parseInt(totalSeats, 10) || 20) : 20;
    const cleanAvailable = availableSeats !== undefined ? Math.max(0, parseInt(availableSeats, 10)) : cleanTotal;

    const newBatch = await prisma.courseBatch.create({
      data: {
        courseId: course.id,
        batchNumber: nextBatchNum,
        startDate: startDate ? new Date(startDate) : new Date(),
        scheduleText: scheduleText || `Next Cohort: 2026-09-20 (Zoom Live 8:30 PM)`,
        totalSeats: cleanTotal,
        availableSeats: cleanAvailable,
        zoomLink: zoomLink || null,
        status: (status as any) || 'UPCOMING',
        assignedCoachName: assignedCoachName || null,
      },
    });

    await cacheDelPattern('courses:');
    broadcastRealtimeEvent('course:updated', { courseSlug: course.slug, batchId: newBatch.id });

    // Trigger realtime notification for students
    await createNotificationHelper({
      userId: null,
      title: 'New cohort session scheduled',
      message: `Batch #${newBatch.batchNumber} for ${course.title} has been scheduled (${newBatch.scheduleText}).`,
      link: `/programs/${course.slug}`,
      type: 'COHORT_SESSION',
    });

    await recordAdminAudit({
      adminId: req.user?.id,
      adminEmail: req.user?.email,
      action: 'BATCH_CREATED',
      targetEntity: 'CourseBatch',
      targetId: newBatch.id,
      details: { courseSlug: course.slug, batchNumber: nextBatchNum, totalSeats: cleanTotal },
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, data: newBatch });
  } catch (error: any) {
    logger.error(`[createBatch] ${error.message}`, 'COURSES');
    sendError(res, 500, ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to create course batch.', req);
  }
};

// @desc    Delete a course batch
// @route   DELETE /api/courses/batches/:batchId
export const deleteBatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const batchId = String(req.params.batchId);

    const existing = await prisma.courseBatch.findUnique({
      where: { id: batchId },
      include: { course: true },
    });

    if (!existing) {
      sendError(res, 404, ErrorCode.NOT_FOUND, 'Course batch not found.', req);
      return;
    }

    await prisma.courseBatch.delete({
      where: { id: batchId },
    });

    await cacheDelPattern('courses:');
    broadcastRealtimeEvent('course:updated', { courseSlug: existing.course.slug, batchId });

    await recordAdminAudit({
      adminId: req.user?.id,
      adminEmail: req.user?.email,
      action: 'BATCH_DELETED',
      targetEntity: 'CourseBatch',
      targetId: batchId,
      details: { courseSlug: existing.course.slug, batchNumber: existing.batchNumber },
      ipAddress: req.ip,
    });

    res.status(200).json({ success: true, message: 'Course batch deleted successfully.' });
  } catch (error: any) {
    logger.error(`[deleteBatch] ${error.message}`, 'COURSES');
    sendError(res, 500, ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to delete course batch.', req);
  }
};
