import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { getErrorMessage, normalizeEnumValue } from '../utils/typeHelpers';

// @desc    Get all uploaded bank payment slips (Admin HQ)
// @route   GET /api/slips
export const getAllPaymentSlips = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status } = req.query;
    const slips = await prisma.paymentSlip.findMany({
      where: status ? { status: status as any } : {},
      orderBy: { createdAt: 'desc' },
    });
    res.status(200).json({ success: true, count: slips.length, data: slips });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

// @desc    Submit a new bank payment slip (Public Student Checkout)
// @route   POST /api/slips
export const createPaymentSlip = async (req: Request, res: Response): Promise<void> => {
  try {
    const { studentName, studentPhone, studentEmail, courseSlug, slipUrl, amount, bankReference, notes } = req.body;

    if (!studentName || !studentPhone || !courseSlug || !slipUrl) {
      res.status(400).json({ success: false, message: 'Name, Phone, Course, and Slip Image are required' });
      return;
    }

    const newSlip = await prisma.paymentSlip.create({
      data: {
        studentName: studentName.trim(),
        studentPhone: studentPhone.trim(),
        studentEmail: studentEmail ? studentEmail.trim().toLowerCase() : null,
        courseSlug: courseSlug.trim().toLowerCase(),
        slipUrl: slipUrl.trim(),
        amount: typeof amount === 'number' ? amount : parseFloat(amount) || null,
        bankReference: bankReference ? bankReference.trim() : null,
        notes: notes ? notes.trim() : null,
        status: 'PENDING',
      },
    });

    // Also automatically log/sync into Lead CRM
    try {
      await prisma.lead.create({
        data: {
          name: studentName.trim(),
          phone: studentPhone.trim(),
          email: studentEmail ? studentEmail.trim().toLowerCase() : null,
          courseSlug: courseSlug.trim().toLowerCase(),
          inquiryType: normalizeEnumValue(courseSlug, ['BMB', 'LEADERSHIP', 'IGNIT', 'CORPORATE', 'JOB_APPLICATION', 'GENERAL']) ?? 'GENERAL',
          message: `Bank Transfer Slip Uploaded (Ref: ${bankReference || 'N/A'}, Slip ID: ${newSlip.id.substring(0, 8)})`,
          status: 'NEW',
          whatsappSent: true,
        },
      });
    } catch {
      // Ignore lead duplication error
    }

    res.status(201).json({ success: true, data: newSlip });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Verify or Reject payment slip (Admin HQ)
// @route   PUT /api/slips/:id/status
export const updateSlipStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { status, notes } = req.body;

    const slip = await prisma.paymentSlip.update({
      where: { id },
      data: {
        status: normalizeEnumValue(status, ['PENDING', 'VERIFIED', 'REJECTED']) ?? 'PENDING',
        ...(notes && { notes }),
      },
    });

    // If verified, auto-enroll or update the user operative in database
    if (status === 'VERIFIED') {
      const email = slip.studentEmail || `${slip.studentPhone.replace(/\D/g, '')}@uwe.lk`;
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email },
            { phone: slip.studentPhone },
          ],
        },
      });

      if (existingUser) {
        const slugs = (existingUser.enrolledCourseSlugs || '').split(',').map((s) => s.trim()).filter(Boolean);
        if (!slugs.includes(slip.courseSlug)) {
          slugs.push(slip.courseSlug);
        }
        await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            isEnrolled: true,
            enrolledCourseSlugs: slugs.join(','),
          },
        });
      } else {
        await prisma.user.create({
          data: {
            name: slip.studentName,
            email,
            phone: slip.studentPhone,
            passwordHash: 'operative123',
            isEnrolled: true,
            enrolledCourseSlugs: slip.courseSlug,
          },
        });
      }
    }

    res.status(200).json({ success: true, data: slip });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
