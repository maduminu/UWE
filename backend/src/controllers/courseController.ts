import { Request, Response } from 'express';
import { prisma } from '../config/db';

// @desc    Get all courses with active upcoming batches
// @route   GET /api/courses
export const getAllCourses = async (_req: Request, res: Response): Promise<void> => {
  try {
    const courses = await prisma.course.findMany({
      include: {
        batches: {
          where: { status: 'UPCOMING' },
          orderBy: { startDate: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    res.status(200).json({ success: true, count: courses.length, data: courses });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single course by slug (e.g. bmb, leadership)
// @route   GET /api/courses/:slug
export const getCourseBySlug = async (req: Request, res: Response): Promise<void> => {
  try {
    const slug = String(req.params.slug);
    const course = await prisma.course.findUnique({
      where: { slug },
      include: { batches: true },
    });

    if (!course) {
      res.status(404).json({ success: false, message: 'Course division not found' });
      return;
    }

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
    const { price, duration, subtitle } = req.body;

    const updated = await prisma.course.update({
      where: { id },
      data: {
        ...(price && { price: parseFloat(price) }),
        ...(duration && { duration }),
        ...(subtitle && { subtitle }),
      },
    });

    res.status(200).json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update seats available for a batch
// @route   PUT /api/courses/batches/:batchId/seats
export const updateBatchSeats = async (req: Request, res: Response): Promise<void> => {
  try {
    const batchId = String(req.params.batchId);
    const { availableSeats } = req.body;

    const updatedBatch = await prisma.courseBatch.update({
      where: { id: batchId },
      data: { availableSeats: parseInt(availableSeats, 10) },
    });

    res.status(200).json({ success: true, data: updatedBatch });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create new course program (CMS Admin)
// @route   POST /api/courses
export const createCourse = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, slug, subtitle, badge, category, description, price, currency, duration, nextBatchDate, seats } = req.body;

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
            status: 'UPCOMING',
          },
        },
      },
      include: {
        batches: true,
      },
    });

    res.status(201).json({ success: true, data: newCourse });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

