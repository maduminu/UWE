import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { recordAdminAudit } from '../utils/auditLogger';
import { logger } from '../utils/logger';
import { sendError, ErrorCode } from '../utils/apiResponse';
import { broadcastRealtimeEvent } from '../utils/realtimeEmitter';

const PHONE_REGEX = /^[+\d\s\-()]{7,20}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// @desc    Get all job vacancies with application counts
// @route   GET /api/jobs
export const getAllJobs = async (req: Request, res: Response): Promise<void> => {
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
  } catch (error: any) {
    logger.error(`[getAllJobs] ${error.message}`, 'JOBS');
    sendError(res, 500, ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to retrieve job listings.', req);
  }
};

// @desc    Create new job vacancy (CMS Admin)
// @route   POST /api/jobs
export const createJob = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, department, employmentType, incomeText, requirements, isActive, openPositions } = req.body;

    if (!title || !incomeText) {
      sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'Title and Income details are required.', req);
      return;
    }

    if (title.trim().length > 150) {
      sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'Title must be under 150 characters.', req);
      return;
    }

    const seats = typeof openPositions === 'number' ? openPositions : parseInt(openPositions) || 5;

    const newVacancy = await prisma.jobVacancy.create({
      data: {
        title: title.trim(),
        department: (department || 'Sales & Growth').trim(),
        employmentType: (employmentType as any) || 'WORK_FROM_HOME',
        incomeText: incomeText.trim(),
        requirements: (requirements || 'Strong communication skills, self-motivated, basic WhatsApp fluency.').trim(),
        isActive: typeof isActive === 'boolean' ? isActive : true,
        openPositions: Math.max(1, seats),
        hiredCount: 0,
        hiringStatus: 'HIRING',
      },
    });

    res.status(201).json({ success: true, data: newVacancy });
  } catch (error: any) {
    logger.error(`[createJob] ${error.message}`, 'JOBS');
    sendError(res, 500, ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to create job vacancy.', req);
  }
};

// @desc    Update job vacancy status or details
// @route   PUT /api/jobs/:id
export const updateJob = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { title, department, employmentType, incomeText, requirements, isActive, openPositions, hiringStatus } = req.body;

    // If openPositions is being changed, recalculate hiring status
    let derivedStatus: any = undefined;
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
        ...(typeof title === 'string' && { title: title.trim() }),
        ...(typeof department === 'string' && { department: department.trim() }),
        ...(employmentType && { employmentType: employmentType as any }),
        ...(typeof incomeText === 'string' && { incomeText: incomeText.trim() }),
        ...(typeof requirements === 'string' && { requirements: requirements.trim() }),
        ...(typeof isActive === 'boolean' && { isActive }),
        ...(typeof openPositions !== 'undefined' && { openPositions: Math.max(1, parseInt(openPositions)) }),
        ...(derivedStatus && { hiringStatus: derivedStatus as any }),
      },
    });

    res.status(200).json({ success: true, data: updated });
  } catch (error: any) {
    logger.error(`[updateJob] ${error.message}`, 'JOBS');
    sendError(res, 500, ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to update job vacancy.', req);
  }
};

// @desc    Get all recruitment job applications
// @route   GET /api/jobs/applications
export const getAllApplications = async (req: Request, res: Response): Promise<void> => {
  try {
    const applications = await prisma.jobApplication.findMany({
      include: {
        vacancy: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.status(200).json({ success: true, count: applications.length, data: applications });
  } catch (error: any) {
    logger.error(`[getAllApplications] ${error.message}`, 'JOBS');
    sendError(res, 500, ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to retrieve applications.', req);
  }
};

// @desc    Submit new job application (Public Applicant)
// @route   POST /api/jobs/applications
export const createApplication = async (req: Request, res: Response): Promise<void> => {
  try {
    const { vacancyId, name, phone, email, experience } = req.body;

    if (!name || !phone) {
      sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'Name and phone number are required.', req);
      return;
    }

    if (name.trim().length > 100) {
      sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'Name must be under 100 characters.', req);
      return;
    }

    if (experience && experience.trim().length > 1000) {
      sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'Experience summary must be under 1000 characters.', req);
      return;
    }

    const cleanPhone = phone.trim();
    if (!PHONE_REGEX.test(cleanPhone)) {
      sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'Invalid phone number format.', req);
      return;
    }

    if (email && !EMAIL_REGEX.test(email.trim())) {
      sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'Invalid email address format.', req);
      return;
    }

    // Default to first vacancy if not specified
    let targetVacancyId = vacancyId;
    if (!targetVacancyId) {
      const firstVacancy = await prisma.jobVacancy.findFirst({ where: { isActive: true } });
      if (firstVacancy) targetVacancyId = firstVacancy.id;
    }

    if (!targetVacancyId) {
      sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'No active job vacancies found to apply for.', req);
      return;
    }

    const application = await prisma.jobApplication.create({
      data: {
        vacancyId: targetVacancyId,
        name: name.trim(),
        phone: cleanPhone,
        email: email ? email.trim().toLowerCase() : null,
        experience: experience ? experience.trim() : null,
        status: 'APPLIED',
      },
    });

    res.status(201).json({ success: true, data: application });
  } catch (error: any) {
    logger.error(`[createApplication] ${error.message}`, 'JOBS');
    sendError(res, 500, ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to submit application. Please try again.', req);
  }
};

// @desc    Update applicant status (APPLIED -> REVIEWED -> SHORTLISTED -> HIRED -> REJECTED)
// @route   PUT /api/jobs/applications/:id/status
export const updateApplicationStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { status } = req.body;

    const VALID_APPLICATION_STATUSES = ['APPLIED', 'REVIEWED', 'SHORTLISTED', 'HIRED', 'REJECTED'];
    const normalizedStatus = String(status || '').toUpperCase();

    if (!status || !VALID_APPLICATION_STATUSES.includes(normalizedStatus)) {
      sendError(
        res,
        400,
        ErrorCode.VALIDATION_ERROR,
        `Invalid application status. Must be one of: ${VALID_APPLICATION_STATUSES.join(', ')}`,
        req
      );
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      const existingApp = await tx.jobApplication.findUnique({ where: { id } });
      if (!existingApp) {
        throw new Error('Application not found');
      }

      const updated = await tx.jobApplication.update({
        where: { id },
        data: {
          status: normalizedStatus as any,
        },
        include: {
          vacancy: true,
        },
      });

      // Auto-sync vacancy: HIRED -> atomic increment/decrement hiredCount, recalculate hiringStatus
      if (updated.vacancyId) {
        const isNowHired = String(status).toUpperCase() === 'HIRED';
        const wasPreviouslyHired = existingApp.status === 'HIRED';

        if (isNowHired !== wasPreviouslyHired) {
          if (isNowHired) {
            const vacancy = await tx.jobVacancy.findUnique({ where: { id: updated.vacancyId } });
            if (!vacancy) {
              throw new Error('Target job vacancy directive not found.');
            }

            // Atomically guard increment in DB where hiredCount < openPositions
            const updateRes = await tx.jobVacancy.updateMany({
              where: {
                id: updated.vacancyId,
                hiredCount: { lt: vacancy.openPositions },
              },
              data: {
                hiredCount: { increment: 1 },
              },
            });

            if (updateRes.count === 0) {
              throw new Error(`Cannot hire applicant: all ${vacancy.openPositions} open positions for ${vacancy.title} have already been filled.`);
            }

            // Recalculate status from DB
            const finalVacancy = await tx.jobVacancy.findUnique({ where: { id: updated.vacancyId } });
            if (finalVacancy && finalVacancy.hiredCount >= finalVacancy.openPositions && finalVacancy.hiringStatus !== 'HIRING_FINISHED') {
              await tx.jobVacancy.update({
                where: { id: updated.vacancyId },
                data: { hiringStatus: 'HIRING_FINISHED' },
              });
            }
          } else {
            // Reverted from HIRED: conditionally decrement in DB where hiredCount > 0
            const updateRes = await tx.jobVacancy.updateMany({
              where: {
                id: updated.vacancyId,
                hiredCount: { gt: 0 },
              },
              data: {
                hiredCount: { decrement: 1 },
              },
            });

            if (updateRes.count > 0) {
              const finalVacancy = await tx.jobVacancy.findUnique({ where: { id: updated.vacancyId } });
              if (finalVacancy && finalVacancy.hiredCount < finalVacancy.openPositions && finalVacancy.hiringStatus === 'HIRING_FINISHED') {
                await tx.jobVacancy.update({
                  where: { id: updated.vacancyId },
                  data: { hiringStatus: 'HIRING' },
                });
              }
            }
          }
        }
      }

      return updated;
    });

    await recordAdminAudit({
      adminId: req.user?.id,
      adminEmail: req.user?.email,
      action: `JOB_APP_${status}`,
      targetEntity: 'JobApplication',
      targetId: id,
      details: { applicantName: result.name, vacancyId: result.vacancyId, status },
      ipAddress: req.ip,
    });

    broadcastRealtimeEvent('job:updated', { vacancyId: result.vacancyId });
    broadcastRealtimeEvent('job_app:updated', { applicationId: id });

    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    logger.error(`[updateApplicationStatus] ${error.message}`, 'JOBS');
    sendError(res, 500, ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to update application status.', req);
  }
};

// @desc    Delete a job vacancy (Admin)
// @route   DELETE /api/jobs/:id
export const deleteJob = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.jobVacancy.findUnique({ where: { id } });
    if (!existing) {
      sendError(res, 404, ErrorCode.NOT_FOUND, 'Job vacancy not found.', req);
      return;
    }

    await prisma.jobVacancy.delete({ where: { id } });
    broadcastRealtimeEvent('job:updated', { vacancyId: id, deleted: true });

    await recordAdminAudit({
      adminId: req.user?.id,
      adminEmail: req.user?.email,
      action: 'JOB_DELETED',
      targetEntity: 'JobVacancy',
      targetId: id,
      details: { title: existing.title },
      ipAddress: req.ip,
    });

    res.status(200).json({ success: true, message: 'Job vacancy deleted successfully.' });
  } catch (error: any) {
    logger.error(`[deleteJob] ${error.message}`, 'JOBS');
    sendError(res, 500, ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to delete job vacancy.', req);
  }
};

// @desc    Delete a job application (Admin)
// @route   DELETE /api/jobs/applications/:id
export const deleteApplication = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.jobApplication.findUnique({ where: { id } });
    if (!existing) {
      sendError(res, 404, ErrorCode.NOT_FOUND, 'Application not found.', req);
      return;
    }

    // If deleting a hired applicant, decrement hired count on vacancy
    if (existing.status === 'HIRED' && existing.vacancyId) {
      const vacancy = await prisma.jobVacancy.findUnique({ where: { id: existing.vacancyId } });
      if (vacancy && vacancy.hiredCount > 0) {
        const newHired = Math.max(0, vacancy.hiredCount - 1);
        await prisma.jobVacancy.update({
          where: { id: existing.vacancyId },
          data: {
            hiredCount: newHired,
            hiringStatus: 'HIRING',
            isActive: true,
          },
        });
      }
    }

    await prisma.jobApplication.delete({ where: { id } });
    broadcastRealtimeEvent('job_app:updated', { applicationId: id, deleted: true });
    broadcastRealtimeEvent('job:updated', { vacancyId: existing.vacancyId });

    await recordAdminAudit({
      adminId: req.user?.id,
      adminEmail: req.user?.email,
      action: 'JOB_APP_DELETED',
      targetEntity: 'JobApplication',
      targetId: id,
      details: { name: existing.name, vacancyId: existing.vacancyId },
      ipAddress: req.ip,
    });

    res.status(200).json({ success: true, message: 'Job application deleted successfully.' });
  } catch (error: any) {
    logger.error(`[deleteApplication] ${error.message}`, 'JOBS');
    sendError(res, 500, ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to delete application.', req);
  }
};
