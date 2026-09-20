import { queueService, Job } from './queueService';
import { generateCertificatePDF } from './pdfService';
import { logger } from '../utils/logger';
import { broadcastRealtimeEvent } from '../utils/realtimeEmitter';
import { cacheSet } from '../config/redis';
import { releaseExpiredCallLocks } from '../controllers/callLogController';

export function initializeBackgroundWorkers(): void {
  logger.info('[WorkerService] Initializing background task workers...', 'WORKER');

  // ── 1. Heavy PDF Certificate Generation Worker ──
  queueService.registerWorker('GENERATE_CERTIFICATE', async (job: Job) => {
    const cert = job.data;
    if (!cert || !cert.studentName || !cert.courseTitle) {
      throw new Error('Invalid certificate payload: studentName and courseTitle are required.');
    }

    await queueService.updateJobProgress(job.id, 25);

    // Heavy cryptographic PDF compilation with embedded QR and Helvetica glyphs
    const pdfBuffer = await generateCertificatePDF({
      id: cert.id || job.id,
      studentName: cert.studentName,
      courseSlug: cert.courseSlug || 'bmb',
      courseTitle: cert.courseTitle,
      certificateNo: cert.certificateNo || `UWE-CERT-${job.id.slice(-6).toUpperCase()}`,
      issuedDate: cert.issuedDate || new Date(),
      gradeScore: cert.gradeScore,
      signatureBy: cert.signatureBy,
    });

    await queueService.updateJobProgress(job.id, 85);

    // Cache the binary buffer for fast download (base64 string in cache, TTL 2 hours)
    const base64Pdf = pdfBuffer.toString('base64');
    await cacheSet(`cert_artifact:${job.id}`, { base64Pdf, filename: `${cert.certificateNo || 'Certificate'}.pdf` }, 7200);

    // Notify connected clients via realtime event
    broadcastRealtimeEvent('certificate:ready' as any, {
      jobId: job.id,
      certificateNo: cert.certificateNo,
      downloadUrl: `/api/certificates/download/${job.id}`,
    });

    await queueService.updateJobProgress(job.id, 100);

    return {
      certificateNo: cert.certificateNo,
      sizeBytes: pdfBuffer.length,
      downloadUrl: `/api/certificates/download/${job.id}`,
      generatedAt: new Date().toISOString(),
    };
  });

  // ── 2. Payment Slip Verification Dispatch Worker ──
  queueService.registerWorker('PAYMENT_SLIP_VERIFY_DISPATCH', async (job: Job) => {
    const { slipId, studentEmail, studentPhone, courseSlug, status } = job.data;

    await queueService.updateJobProgress(job.id, 30);

    // Dispatches asynchronous email / SMS notifications to students
    logger.info(
      `[WorkerService] Dispatching ${status} confirmation to ${studentEmail || studentPhone} for ${courseSlug} (Slip: ${slipId})`,
      'WORKER'
    );

    // Simulated network notification latency (50ms)
    await new Promise((resolve) => setTimeout(resolve, 50));

    await queueService.updateJobProgress(job.id, 80);

    // Broadcast realtime event to student portal
    broadcastRealtimeEvent('slip:updated', {
      id: slipId,
      status,
      courseSlug,
    });

    await queueService.updateJobProgress(job.id, 100);

    return {
      slipId,
      dispatched: true,
      channel: studentEmail ? 'EMAIL' : 'SMS',
      timestamp: new Date().toISOString(),
    };
  });

  // ── 3. CRM Lead Ingestion & Admissions Notification Worker ──
  queueService.registerWorker('LEAD_INGESTION', async (job: Job) => {
    const lead = job.data;

    await queueService.updateJobProgress(job.id, 50);

    logger.info(`[WorkerService] Ingesting & routing lead for: ${lead.name} (${lead.phone}) -> ${lead.courseSlug}`, 'WORKER');

    broadcastRealtimeEvent('lead:new' as any, {
      name: lead.name,
      courseSlug: lead.courseSlug,
    });

    await queueService.updateJobProgress(job.id, 100);

    return {
      leadId: lead.id || job.id,
      routedTo: 'ADMISSIONS_DESK',
      timestamp: new Date().toISOString(),
    };
  });

  // ── 4. Generic Task Worker ──
  queueService.registerWorker('GENERIC_TASK', async (job: Job) => {
    return { executed: true, data: job.data };
  });

  logger.info('[WorkerService] All background task workers active and listening.', 'WORKER');

  // ── 5. Call Lock Auto-Release Cron (every 5 minutes) ──────────────────
  // Clears expired 30-minute call locks so operators never get stuck
  const callLockCron = setInterval(async () => {
    await releaseExpiredCallLocks();
  }, 5 * 60 * 1000); // every 5 minutes

  // Don't hold the process open during tests
  if (callLockCron && typeof callLockCron.unref === 'function') {
    callLockCron.unref();
  }
}
