import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { getErrorMessage, normalizeEnumValue } from '../utils/typeHelpers';

// @desc    Get all job vacancies with application counts
// @route   GET /api/jobs
export const getAllJobs = async (_req: Request, res: Response): Promise<void> => {
  try {
    const vacancies = await prisma.jobVacancy.findMany({
      include: {
        _count: {
          select: { applications: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.status(200).json({ success: true, count: vacancies.length, data: vacancies });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

// @desc    Create new job vacancy (CMS Admin)
// @route   POST /api/jobs
export const createJob = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, department, employmentType, incomeText, requirements, isActive, openPositions } = req.body;

    if (!title || !incomeText) {
      res.status(400).json({ success: false, message: 'Title and Income details are required' });
      return;
    }

    const seats = typeof openPositions === 'number' ? openPositions : parseInt(openPositions) || 5;
    const normalizedEmploymentType =
      (normalizeEnumValue(employmentType, ['FULL_TIME', 'PART_TIME', 'WORK_FROM_HOME', 'HYBRID']) as
        | 'FULL_TIME'
        | 'PART_TIME'
        | 'WORK_FROM_HOME'
        | 'HYBRID'
        | undefined) ?? 'WORK_FROM_HOME';

    const newVacancy = await prisma.jobVacancy.create({
      data: {
        title: title.trim(),
        department: department || 'Sales & Growth',
        employmentType: normalizedEmploymentType,
        incomeText: incomeText.trim(),
        requirements: requirements || 'Strong communication skills, self-motivated, basic WhatsApp fluency.',
        isActive: typeof isActive === 'boolean' ? isActive : true,
        openPositions: seats,
        hiredCount: 0,
        hiringStatus: 'HIRING',
      },
    });

    res.status(201).json({ success: true, data: newVacancy });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

// @desc    Update job vacancy status or details
// @route   PUT /api/jobs/:id
export const updateJob = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { title, department, employmentType, incomeText, requirements, isActive, openPositions, hiringStatus } = req.body;

    // If openPositions is being changed, recalculate hiring status
    let derivedStatus: 'HIRING' | 'HIRING_FINISHED' | 'PAUSED' | undefined;
    if (typeof openPositions !== 'undefined' || typeof hiringStatus !== 'undefined') {
      if (hiringStatus) {
        derivedStatus = hiringStatus;
      } else if (typeof openPositions !== 'undefined') {
        const current = await prisma.jobVacancy.findUnique({ where: { id } });
        if (current) {
          const newOpen = parseInt(openPositions);
          const remaining = newOpen - current.hiredCount;
          derivedStatus = remaining <= 0 ? 'HIRING_FINISHED' : 'HIRING';
        }
      }
    }

    const updated = await prisma.jobVacancy.update({
      where: { id },
      data: {
        ...(typeof title === 'string' && { title }),
        ...(typeof department === 'string' && { department }),
        ...(employmentType && {
          employmentType:
            (normalizeEnumValue(employmentType, ['FULL_TIME', 'PART_TIME', 'WORK_FROM_HOME', 'HYBRID']) as
              | 'FULL_TIME'
              | 'PART_TIME'
              | 'WORK_FROM_HOME'
              | 'HYBRID'
              | undefined) ?? 'WORK_FROM_HOME',
        }),
        ...(typeof incomeText === 'string' && { incomeText }),
        ...(typeof requirements === 'string' && { requirements }),
        ...(typeof isActive === 'boolean' && { isActive }),
        ...(typeof openPositions !== 'undefined' && { openPositions: parseInt(openPositions) }),
        ...(derivedStatus && { hiringStatus: derivedStatus }),
      },
    });

    res.status(200).json({ success: true, data: updated });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

// @desc    Get all recruitment job applications
// @route   GET /api/jobs/applications
export const getAllApplications = async (_req: Request, res: Response): Promise<void> => {
  try {
    const applications = await prisma.jobApplication.findMany({
      include: {
        vacancy: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.status(200).json({ success: true, count: applications.length, data: applications });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

// @desc    Submit new job application (Public Applicant)
// @route   POST /api/jobs/applications (also supports /api/jobs/apply)
export const createApplication = async (req: Request, res: Response): Promise<void> => {
  try {
    const { vacancyId, name, phone, email, experience } = req.body;

    if (!name || !phone) {
      res.status(400).json({ success: false, message: 'Name and Phone are required' });
      return;
    }

    // Support applications without a specific vacancyId (general inquiry)
    let finalVacancyId = vacancyId;
    if (!finalVacancyId) {
      // Auto-route to first active vacancy
      const firstActive = await prisma.jobVacancy.findFirst({ where: { isActive: true } });
      if (firstActive) finalVacancyId = firstActive.id;
    }

    if (!finalVacancyId) {
      res.status(400).json({ success: false, message: 'No active vacancies available at this time' });
      return;
    }

    const application = await prisma.jobApplication.create({
      data: {
        vacancyId: finalVacancyId,
        name: name.trim(),
        phone: phone.trim(),
        email: email ? email.trim() : null,
        experience: experience ? experience.trim() : 'No prior experience specified',
        status: 'APPLIED',
      },
      include: {
        vacancy: true,
      },
    });

    res.status(201).json({ success: true, data: application });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

// @desc    Update application review status (auto-decrements vacancy open positions on HIRED)
// @route   PUT /api/jobs/applications/:id/status
export const updateApplicationStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { status } = req.body;

    const validStatuses = ['APPLIED', 'REVIEWED', 'SHORTLISTED', 'HIRED', 'REJECTED'];
    if (status && !validStatuses.includes(status.toUpperCase())) {
      res.status(400).json({ success: false, message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
      return;
    }

    // Fetch existing application to detect status transition
    const existingApp = await prisma.jobApplication.findUnique({
      where: { id },
      include: { vacancy: true },
    });

    const updated = await prisma.jobApplication.update({
      where: { id },
      data: {
        status:
          (normalizeEnumValue(status, ['APPLIED', 'REVIEWED', 'SHORTLISTED', 'HIRED', 'REJECTED']) as
            | 'APPLIED'
            | 'REVIEWED'
            | 'SHORTLISTED'
            | 'HIRED'
            | 'REJECTED'
            | undefined) ?? 'APPLIED',
      },
      include: {
        vacancy: true,
      },
    });

    // ── Auto-sync vacancy: HIRED → increment hiredCount, recalculate hiringStatus ──
    if (updated.vacancyId) {
      const wasHired = status.toUpperCase() === 'HIRED';
      const wasUnhired = existingApp?.status === 'HIRED' && status.toUpperCase() !== 'HIRED';

      if (wasHired || wasUnhired) {
        const vacancy = await prisma.jobVacancy.findUnique({
          where: { id: updated.vacancyId },
        });

        if (vacancy) {
          const newHiredCount = Math.max(0, vacancy.hiredCount + (wasHired ? 1 : -1));
          const remainingPositions = vacancy.openPositions - newHiredCount;
          const newHiringStatus = remainingPositions <= 0 ? 'HIRING_FINISHED' : 'HIRING';

          await prisma.jobVacancy.update({
            where: { id: updated.vacancyId },
            data: {
              hiredCount: newHiredCount,
              hiringStatus: newHiringStatus,
              // Auto-deactivate if all positions filled
              isActive: remainingPositions > 0,
            },
          });
        }
      }
    }

    res.status(200).json({ success: true, data: updated });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};
