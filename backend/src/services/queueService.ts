import crypto from 'crypto';
import { logger } from '../utils/logger';
import { cacheGet, cacheSet, cacheDel } from '../config/redis';

export type JobType =
  | 'GENERATE_CERTIFICATE'
  | 'PAYMENT_SLIP_VERIFY_DISPATCH'
  | 'LEAD_INGESTION'
  | 'GENERIC_TASK';

export type JobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface Job<T = any, R = any> {
  id: string;
  type: JobType;
  data: T;
  status: JobStatus;
  progress: number;
  result?: R;
  error?: string;
  attempts: number;
  maxAttempts: number;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
}

export type JobHandler<T = any, R = any> = (job: Job<T, R>) => Promise<R>;

interface EnqueueOptions {
  maxAttempts?: number;
  priority?: 'HIGH' | 'NORMAL' | 'LOW';
}

class BackgroundJobQueue {
  private inMemoryJobs = new Map<string, Job>();
  private pendingQueue: string[] = [];
  private handlers = new Map<JobType, JobHandler>();
  private activeWorkers = 0;
  private maxConcurrency = 5;
  private isProcessing = false;

  constructor() {
    // Periodically drain queue if pending jobs linger
    if (typeof setInterval !== 'undefined') {
      const interval = setInterval(() => {
        this.processQueue();
      }, 500);
      if (interval.unref) interval.unref();
    }
  }

  /**
   * Register a worker handler for a specific job type
   */
  public registerWorker<T = any, R = any>(type: JobType, handler: JobHandler<T, R>): void {
    this.handlers.set(type, handler);
    logger.info(`[JobQueue] Registered worker for job type: ${type}`, 'QUEUE');
  }

  /**
   * Enqueue a new background job. Returns immediately (<10ms) with Job ID.
   */
  public async enqueueJob<T = any, R = any>(
    type: JobType,
    data: T,
    options?: EnqueueOptions
  ): Promise<Job<T, R>> {
    const id = `job_${crypto.randomUUID()}`;
    const now = Date.now();

    const job: Job<T, R> = {
      id,
      type,
      data,
      status: 'PENDING',
      progress: 0,
      attempts: 0,
      maxAttempts: options?.maxAttempts || 3,
      createdAt: now,
      updatedAt: now,
    };

    // Store in-memory
    this.inMemoryJobs.set(id, job);

    // Also persist in Redis cache store if available (TTL 24h)
    try {
      await cacheSet(`job:${id}`, job, 86400);
    } catch {
      /* in-memory fallback */
    }

    if (options?.priority === 'HIGH') {
      this.pendingQueue.unshift(id);
    } else {
      this.pendingQueue.push(id);
    }

    logger.info(`[JobQueue] Enqueued job: ${id} (${type})`, 'QUEUE');

    // Trigger processing asynchronously without awaiting
    setImmediate(() => {
      this.processQueue();
    });

    return job;
  }

  /**
   * Retrieve current job status and payload/result
   */
  public async getJob<T = any, R = any>(id: string): Promise<Job<T, R> | null> {
    // 1. Check in-memory store
    if (this.inMemoryJobs.has(id)) {
      return this.inMemoryJobs.get(id) as Job<T, R>;
    }

    // 2. Check distributed Redis store
    try {
      const cached = await cacheGet<Job<T, R>>(`job:${id}`);
      if (cached) {
        this.inMemoryJobs.set(id, cached);
        return cached;
      }
    } catch {
      /* ignore */
    }

    return null;
  }

  /**
   * Update progress percentage of a running job
   */
  public async updateJobProgress(id: string, progress: number): Promise<void> {
    const job = await this.getJob(id);
    if (!job) return;

    job.progress = Math.min(100, Math.max(0, progress));
    job.updatedAt = Date.now();
    this.inMemoryJobs.set(id, job);

    try {
      await cacheSet(`job:${id}`, job, 86400);
    } catch {
      /* ignore */
    }
  }

  /**
   * Worker queue processing loop with concurrency throttling
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      while (this.pendingQueue.length > 0 && this.activeWorkers < this.maxConcurrency) {
        const jobId = this.pendingQueue.shift();
        if (!jobId) continue;

        const job = this.inMemoryJobs.get(jobId);
        if (!job || job.status !== 'PENDING') continue;

        this.activeWorkers++;
        this.executeJob(job)
          .catch((err) => {
            logger.error(`[JobQueue] Unhandled job execution error for ${job.id}: ${err.message}`, 'QUEUE');
          })
          .finally(() => {
            this.activeWorkers--;
            this.processQueue();
          });
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Execute a single job through its registered worker handler
   */
  private async executeJob(job: Job): Promise<void> {
    const handler = this.handlers.get(job.type);

    if (!handler) {
      job.status = 'FAILED';
      job.error = `No registered worker handler for job type: ${job.type}`;
      job.updatedAt = Date.now();
      logger.error(`[JobQueue] ${job.error}`, 'QUEUE');
      return;
    }

    job.status = 'PROCESSING';
    job.attempts++;
    job.updatedAt = Date.now();

    try {
      logger.info(`[JobQueue] Processing job: ${job.id} (Attempt ${job.attempts}/${job.maxAttempts})`, 'QUEUE');
      const result = await handler(job);

      job.status = 'COMPLETED';
      job.progress = 100;
      job.result = result;
      job.completedAt = Date.now();
      job.updatedAt = Date.now();

      logger.info(`[JobQueue] Job completed successfully: ${job.id}`, 'QUEUE');
    } catch (err: any) {
      job.error = err.message || 'Unknown execution failure';
      job.updatedAt = Date.now();

      if (job.attempts < job.maxAttempts) {
        job.status = 'PENDING';
        logger.warn(`[JobQueue] Job ${job.id} failed, retrying (${job.attempts}/${job.maxAttempts}): ${err.message}`, 'QUEUE');
        // Exponential backoff retry
        const backoffMs = Math.min(1000 * Math.pow(2, job.attempts), 10000);
        setTimeout(() => {
          this.pendingQueue.push(job.id);
          this.processQueue();
        }, backoffMs);
      } else {
        job.status = 'FAILED';
        logger.error(`[JobQueue] Job ${job.id} permanently failed after ${job.attempts} attempts: ${err.message}`, 'QUEUE');
      }
    } finally {
      // Sync state to cache
      try {
        await cacheSet(`job:${job.id}`, job, 86400);
      } catch {
        /* ignore */
      }
    }
  }
}

export const queueService = new BackgroundJobQueue();
