import { Request, Response } from 'express';
import { prisma } from '../config/db';

const VALID_INQUIRY_TYPES = ['BMB', 'LEADERSHIP', 'IGNIT', 'CORPORATE', 'JOB_APPLICATION', 'GENERAL'];
const VALID_LEAD_STATUSES = ['NEW', 'CONTACTED', 'ENROLLED', 'REJECTED'];

// Validation helpers
const PHONE_REGEX = /^[+\d\s\-()\u0020]{7,20}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// @desc    Get all lead inquiries (Admin HQ) with abandoned slip detection (>24h without enrollment)
// @route   GET /api/leads
export const getAllLeads = async (req: Request, res: Response): Promise<void> => {
  try {
    const { abandoned } = req.query;
    const leads = await prisma.lead.findMany({
      orderBy: { createdAt: 'desc' },
      include: { course: true },
    });

    const now = Date.now();
    const twentyFourHoursMs = 24 * 60 * 60 * 1000;

    // Enhance leads with dynamic abandoned slip calculation
    const enhancedLeads = leads.map((lead) => {
      const ageMs = now - new Date(lead.createdAt).getTime();
      const hoursPending = Math.floor(ageMs / (1000 * 60 * 60));
      const isAbandoned = lead.status === 'NEW' && ageMs >= twentyFourHoursMs;

      return {
        ...lead,
        hoursPending,
        isAbandoned: lead.isAbandoned || isAbandoned,
      };
    });

    const filtered = abandoned === 'true'
      ? enhancedLeads.filter((l) => l.isAbandoned)
      : enhancedLeads;

    const abandonedCount = enhancedLeads.filter((l) => l.isAbandoned).length;

    res.status(200).json({
      success: true,
      count: filtered.length,
      abandonedCount,
      data: filtered,
    });
  } catch (error: any) {
    console.error('[getAllLeads]', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve leads.' });
  }
};

// @desc    Record an abandoned slip WhatsApp follow-up reminder
// @route   POST /api/leads/:id/abandoned-reminder
export const recordAbandonedReminder = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.lead.findUnique({ where: { id } });

    if (!existing) {
      res.status(404).json({ success: false, message: 'Lead not found.' });
      return;
    }

    const updated = await prisma.lead.update({
      where: { id },
      data: {
        lastReminderSentAt: new Date(),
        status: existing.status === 'NEW' ? 'CONTACTED' : existing.status,
        notes: existing.notes
          ? `${existing.notes} | [Abandoned Slip WhatsApp Reminder Sent: ${new Date().toLocaleDateString()}]`
          : `[Abandoned Slip WhatsApp Reminder Sent: ${new Date().toLocaleDateString()}]`,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Abandoned slip reminder logged successfully.',
      data: updated,
    });
  } catch (error: any) {
    console.error('[recordAbandonedReminder]', error);
    res.status(500).json({ success: false, message: 'Failed to record reminder.' });
  }
};

// @desc    Submit new lead inquiry / WhatsApp dispatch log
// @route   POST /api/leads
export const createLead = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, phone, email, courseSlug, inquiryType, message } = req.body;

    // Required field check
    if (!name || !phone) {
      res.status(400).json({ success: false, message: 'Name and phone number are required.' });
      return;
    }

    // Length validation
    if (name.trim().length > 100) {
      res.status(400).json({ success: false, message: 'Name must be under 100 characters.' });
      return;
    }
    if (message && message.trim().length > 1000) {
      res.status(400).json({ success: false, message: 'Message must be under 1000 characters.' });
      return;
    }

    // Phone format validation
    const cleanPhone = phone.trim();
    if (!PHONE_REGEX.test(cleanPhone)) {
      res.status(400).json({ success: false, message: 'Invalid phone number format. Use digits, spaces, +, -, or ().' });
      return;
    }

    // Email format validation (if provided)
    if (email && !EMAIL_REGEX.test(email.trim())) {
      res.status(400).json({ success: false, message: 'Invalid email address format.' });
      return;
    }

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

    // ── Deduplication Security: If an inquiry from this phone/email exists with status 'NEW', update it rather than duplicating ──
    const existingLead = await prisma.lead.findFirst({
      where: {
        OR: [
          { phone: cleanPhone },
          ...(email ? [{ email: email.trim().toLowerCase() }] : []),
        ],
        status: 'NEW',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existingLead) {
      const updated = await prisma.lead.update({
        where: { id: existingLead.id },
        data: {
          name: name.trim(),
          message: message ? message.trim() : existingLead.message,
          courseSlug: courseSlug ? courseSlug.toLowerCase() : existingLead.courseSlug,
          courseId: courseId || existingLead.courseId,
          inquiryType: normalizedInquiryType as any,
          whatsappSent: true,
        },
      });
      res.status(200).json({ success: true, message: 'Inquiry updated.', data: updated });
      return;
    }

    const lead = await prisma.lead.create({
      data: {
        name: name.trim(),
        phone: cleanPhone,
        email: email ? email.trim().toLowerCase() : null,
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
    console.error('[createLead]', error);
    res.status(500).json({ success: false, message: 'Failed to submit inquiry. Please try again.' });
  }
};

// @desc    Update lead status (NEW -> CONTACTED -> ENROLLED -> REJECTED)
// @route   PUT /api/leads/:id/status
export const updateLeadStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { status, notes } = req.body;

    // Check if lead exists
    const existing = await prisma.lead.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Lead record not found.' });
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

    // Notes length cap
    if (notes && notes.trim().length > 500) {
      res.status(400).json({ success: false, message: 'Notes must be under 500 characters.' });
      return;
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
    console.error('[updateLeadStatus]', error);
    res.status(500).json({ success: false, message: 'Failed to update lead status.' });
  }
};

// @desc    Delete lead record (Admin HQ)
// @route   DELETE /api/leads/:id
export const deleteLead = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.lead.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Lead record not found.' });
      return;
    }

    await prisma.lead.delete({ where: { id } });
    res.status(200).json({ success: true, message: 'Lead record deleted successfully.' });
  } catch (error: any) {
    console.error('[deleteLead]', error);
    res.status(500).json({ success: false, message: 'Failed to delete lead.' });
  }
};
