import { Router, Request, Response } from 'express';
import { queueService, JobType } from '../services/queueService';
import { sendError, ErrorCode } from '../utils/apiResponse';

const router = Router();

// @desc    Poll job execution status and results
// @route   GET /api/jobs/:jobId
router.get('/:jobId', async (req: Request, res: Response): Promise<void> => {
  try {
    const jobId = String(req.params.jobId);
    const job = await queueService.getJob(jobId);

    if (!job) {
      sendError(res, 404, ErrorCode.NOT_FOUND, `Job with ID '${jobId}' not found.`, req);
      return;
    }

    res.status(200).json({
      success: true,
      job: {
        id: job.id,
        type: job.type,
        status: job.status,
        progress: job.progress,
        result: job.result || null,
        error: job.error || null,
        attempts: job.attempts,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        completedAt: job.completedAt || null,
      },
    });
  } catch (err: any) {
    sendError(res, 500, ErrorCode.INTERNAL_SERVER_ERROR, `Failed to retrieve job status: ${err.message}`, req);
  }
});

// @desc    Enqueue a background job (Internal/Async Gateway)
// @route   POST /api/jobs/enqueue
router.post('/enqueue', async (req: Request, res: Response): Promise<void> => {
  try {
    const { type, data, priority } = req.body as {
      type: JobType;
      data: any;
      priority?: 'HIGH' | 'NORMAL' | 'LOW';
    };

    if (!type) {
      res.status(400).json({ success: false, message: 'Job type is required' });
      return;
    }

    const job = await queueService.enqueueJob(type, data || {}, { priority });

    res.status(202).json({
      success: true,
      message: 'Job accepted for background execution',
      jobId: job.id,
      status: job.status,
    });
  } catch (err: any) {
    sendError(res, 500, ErrorCode.INTERNAL_SERVER_ERROR, `Failed to enqueue job: ${err.message}`, req);
  }
});

export default router;
