import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { cacheGet, cacheSet, cacheDelPattern } from '../config/redis';
import { recordAdminAudit } from '../utils/auditLogger';

// @desc    Get all courses with active upcoming batches (cached)
// @route   GET /api/courses
export const getAllCourses = async (_req: Request, res: Response): Promise<void> => {
  try {
    const cached = await cacheGet<any[]>('courses:all');
    if (cached) {
      res.status(200).json({ success: true, count: cached.length, data: cached, cached: true });
      return;
    }

    const courses = await prisma.course.findMany({
      include: {
        batches: {
          where: { status: 'UPCOMING' },
          orderBy: { startDate: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    await cacheSet('courses:all', courses, 3600); // 1 hour TTL
    res.status(200).json({ success: true, count: courses.length, data: courses });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
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
      include: { batches: true },
    });

    if (!course) {
      res.status(404).json({ success: false, message: 'Course division not found' });
      return;
    }

    await cacheSet(cacheKey, course, 3600);
    res.status(200).json({ success: true, data: course });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update course price / duration (CMS Admin)
// @route   PUT /api/courses/:id
export const updateCourse = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { price, duration, subtitle, title, badge } = req.body;

    const updated = await prisma.course.update({
      where: { id },
      data: {
        ...(price !== undefined && { price: parseFloat(price) }),
        ...(duration && { duration }),
        ...(subtitle && { subtitle }),
        ...(title && { title }),
        ...(badge && { badge }),
      },
    });

    await cacheDelPattern('courses:');

    await recordAdminAudit({
      adminId: req.user?.id,
      adminEmail: req.user?.email,
      action: 'COURSE_UPDATED',
      targetEntity: 'Course',
      targetId: id,
      details: { title: updated.title, price: updated.price },
      ipAddress: req.ip,
    });

    res.status(200).json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update batch schedule, seats, and zoom link (CMS Admin)
// @route   PUT /api/courses/batches/:batchId
export const updateBatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const batchId = String(req.params.batchId);
    const { availableSeats, totalSeats, scheduleText, zoomLink, status } = req.body;

    const updatedBatch = await prisma.$transaction(async (tx) => {
      const existingBatch = await tx.courseBatch.findUnique({ where: { id: batchId } });
      if (!existingBatch) {
        throw new Error('Course batch directive not found');
      }

      const newTotal = totalSeats !== undefined ? Math.max(1, parseInt(totalSeats, 10) || 1) : existingBatch.totalSeats;
      let newAvailable = availableSeats !== undefined ? Math.max(0, parseInt(availableSeats, 10) || 0) : existingBatch.availableSeats;

      if (newAvailable > newTotal) {
        newAvailable = newTotal;
      }

      return await tx.courseBatch.update({
        where: { id: batchId },
        data: {
          availableSeats: newAvailable,
          totalSeats: newTotal,
          ...(scheduleText !== undefined && { scheduleText: String(scheduleText) }),
          ...(zoomLink !== undefined && { zoomLink: zoomLink ? String(zoomLink) : null }),
          ...(status !== undefined && { status }),
        },
      });
    });

    await cacheDelPattern('courses:');

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
    res.status(is404 ? 404 : 500).json({ success: false, message: error.message });
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
    res.status(is404 ? 404 : 500).json({ success: false, message: error.message });
  }
};

// @desc    Create new course program (CMS Admin)
// @route   POST /api/courses
export const createCourse = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, slug, subtitle, badge, category, description, price, currency, duration, nextBatchDate, seats, zoomLink } = req.body;

    if (!title || price === undefined) {
      res.status(400).json({ success: false, message: 'Title and Price are required' });
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
        price: parseFloat(price),
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
    res.status(500).json({ success: false, message: error.message });
  }
};
