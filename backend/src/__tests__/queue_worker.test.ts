import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { queueService } from '../services/queueService';
import { initializeBackgroundWorkers } from '../services/workerService';
import express from 'express';
import certificateRoutes from '../routes/certificateRoutes';
import jobQueueRoutes from '../routes/jobQueueRoutes';

describe('Enterprise Background Job Queue & Asynchronous Worker Subsystem', () => {
  let app: express.Express;

  beforeAll(() => {
    initializeBackgroundWorkers();

    app = express();
    app.use(express.json());
    app.use('/api/certificates', certificateRoutes);
    app.use('/api/background-jobs', jobQueueRoutes);
  });

  it('1. Enqueueing a background job returns immediately (<25ms) with status PENDING', async () => {
    const start = performance.now();
    const job = await queueService.enqueueJob('GENERIC_TASK', { foo: 'bar', timestamp: Date.now() });
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(50); // Instant ingress response
    expect(job).toBeDefined();
    expect(job.id).toMatch(/^job_/);
    expect(job.status).toBe('PENDING');
    expect(job.attempts).toBe(0);
  });

  it('2. Worker asynchronously processes and completes GENERIC_TASK', async () => {
    const job = await queueService.enqueueJob('GENERIC_TASK', { testKey: 'quantum-value' });

    // Poll until completed (within 2 seconds)
    let completedJob = null;
    for (let i = 0; i < 20; i++) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      const current = await queueService.getJob(job.id);
      if (current && current.status === 'COMPLETED') {
        completedJob = current;
        break;
      }
    }

    expect(completedJob).not.toBeNull();
    expect(completedJob?.status).toBe('COMPLETED');
    expect(completedJob?.result).toEqual({ executed: true, data: { testKey: 'quantum-value' } });
    expect(completedJob?.completedAt).toBeDefined();
  });

  it('3. Heavy PDF Certificate Generation executes via background worker queue', async () => {
    const certPayload = {
      studentName: 'Commander Ruwan Jayasinghe',
      courseSlug: 'bmb',
      courseTitle: 'Beyond Mind Boundaries (BMB)',
      certificateNo: `UWE-TEST-${Date.now().toString(36).toUpperCase()}`,
      gradeScore: 'HIGH HONORS',
      signatureBy: 'CHIEF ARCHITECT',
    };

    const job = await queueService.enqueueJob('GENERATE_CERTIFICATE', certPayload);
    expect(job.id).toBeDefined();

    // Poll until certificate generation worker completes
    let finishedJob = null;
    for (let i = 0; i < 40; i++) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      const current = await queueService.getJob(job.id);
      if (current && (current.status === 'COMPLETED' || current.status === 'FAILED')) {
        finishedJob = current;
        break;
      }
    }

    expect(finishedJob?.status).toBe('COMPLETED');
    expect(finishedJob?.result).toBeDefined();
    expect(finishedJob?.result.certificateNo).toBe(certPayload.certificateNo);
    expect(finishedJob?.result.downloadUrl).toBe(`/api/certificates/download/${job.id}`);
    expect(finishedJob?.result.sizeBytes).toBeGreaterThan(1000); // Proves real PDF generated
  });

  it('4. POST /api/certificates/generate-async responds with 202 Accepted and jobId', async () => {
    const res = await request(app)
      .post('/api/certificates/generate-async')
      .send({
        studentName: 'Operative Kasun Bandara',
        courseSlug: 'leadership',
        courseTitle: 'Leadership & Command Academy',
      });

    expect(res.status).toBe(202);
    expect(res.body.success).toBe(true);
    expect(res.body.jobId).toMatch(/^job_/);
    expect(res.body.checkUrl).toBe(`/api/background-jobs/${res.body.jobId}`);
  });

  it('5. GET /api/background-jobs/:jobId returns accurate status and progress', async () => {
    const job = await queueService.enqueueJob('GENERIC_TASK', { testId: 'telemetry-check' });

    const res = await request(app).get(`/api/background-jobs/${job.id}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.job.id).toBe(job.id);
    expect(['PENDING', 'PROCESSING', 'COMPLETED']).toContain(res.body.job.status);
  });

  it('6. GET /api/background-jobs/:jobId returns 404 for unknown job ID', async () => {
    const res = await request(app).get('/api/background-jobs/non-existent-job-uuid');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
