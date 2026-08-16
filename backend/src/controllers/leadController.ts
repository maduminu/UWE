import { Request, Response } from 'express';
import { prisma } from '../config/db';

const VALID_INQUIRY_TYPES = ['BMB', 'LEADERSHIP', 'IGNIT', 'CORPORATE', 'JOB_APPLICATION', 'GENERAL'];
const VALID_LEAD_STATUSES = ['NEW', 'CONTACTED', 'ENROLLED', 'REJECTED'];

// @desc    Get all lead inquiries (Admin HQ)
// @route   GET /api/leads
export const getAllLeads = async (_req: Request, res: Response): Promise<void> => {
  try {
    const leads = await prisma.lead.findMany({
      orderBy: { createdAt: 'desc' },
      include: { course: true },
    });
    res.status(200).json({ success: true, count: leads.length, data: leads });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Submit new lead inquiry / WhatsApp dispatch log
// @route   POST /api/leads
export const createLead = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, phone, email, courseSlug, inquiryType, message } = req.body;

    if (!name || !phone) {
      res.status(400).json({ success: false, message: 'Name and Phone number are required' });
      return;
    }

    // Clean phone string
    const cleanPhone = phone.trim();

    // Validate inquiryType enum
    let normalizedInquiryType = (inquiryType || 'GENERAL').toUpperCase();
    if (!VALID_INQUIRY_TYPES.includes(normalizedInquiryType)) {
      normalizedInquiryType = 'GENERAL';
    }

    // Connect to course if slug matches
    let courseId: string | undefined = undefined;
    if (courseSlug) {
      const course = await prisma.course.findUnique({ where: { slug: courseSlug.toLowerCase() } });
      if (course) courseId = course.id;
    }

    const lead = await prisma.lead.create({
      data: {
        name: name.trim(),
        phone: cleanPhone,
        email: email ? email.trim() : null,
        courseSlug: courseSlug ? courseSlug.toLowerCase() : null,
        courseId,
        inquiryType: normalizedInquiryType as any,
        message: message ? message.trim() : null,
        whatsappSent: true,
        status: 'NEW',
      },
    });

    res.status(201).json({ success: true, data: lead });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update lead status (NEW -> CONTACTED -> ENROLLED)
// @route   PUT /api/leads/:id/status
export const updateLeadStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    // Check if lead exists
    const existing = await prisma.lead.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Lead record not found' });
      return;
    }

    // Validate status enum if provided
    if (status) {
      const normalizedStatus = status.toUpperCase();
      if (!VALID_LEAD_STATUSES.includes(normalizedStatus)) {
        res.status(400).json({
          success: false,
          message: `Invalid status. Must be one of: ${VALID_LEAD_STATUSES.join(', ')}`,
        });
        return;
      }
    }

    const updated = await prisma.lead.update({
      where: { id },
      data: {
        ...(status && { status: status.toUpperCase() as any }),
        ...(typeof notes === 'string' && { notes: notes.trim() }),
      },
    });

    res.status(200).json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
