import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../index';
import { prisma } from '../config/db';

// Helper to create a valid 300×300 PNG buffer
function createPngBuffer(width: number, height: number): Buffer {
  const header = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(25);
  ihdr.writeUInt32BE(13, 0);
  ihdr.write('IHDR', 4, 'ascii');
  ihdr.writeUInt32BE(width, 8);
  ihdr.writeUInt32BE(height, 12);
  ihdr[16] = 8;
  ihdr[17] = 2;
  ihdr[18] = 0;
  ihdr[19] = 0;
  ihdr[20] = 0;
  ihdr.writeUInt32BE(0x12345678, 21);
  const iend = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82]);
  return Buffer.concat([header, ihdr, iend]);
}

const VALID_PNG_URI = `data:image/png;base64,${createPngBuffer(300, 300).toString('base64')}`;
const RUN_ID = Date.now();

describe('SEC-10: Public Abuse Protection & Idempotency Integration Tests', () => {
  let createdLeadId: string;
  let createdSlipId: string;
  let createdJobId: string;
  let testVacancyId: string;

  beforeAll(async () => {
    const vacancy = await prisma.jobVacancy.create({
      data: {
        title: `Abuse Protection Vacancy ${RUN_ID}`,
        department: 'Operations',
        employmentType: 'WORK_FROM_HOME',
        incomeText: 'LKR 150,000+',
        requirements: 'Testing requirements',
        openPositions: 5,
        isActive: true,
      },
    });
    testVacancyId = vacancy.id;
  });

  afterAll(async () => {
    try {
      if (testVacancyId) {
        await prisma.jobApplication.deleteMany({ where: { vacancyId: testVacancyId } });
        await prisma.jobVacancy.deleteMany({ where: { id: testVacancyId } });
      }
      await prisma.lead.deleteMany({ where: { email: { contains: `sec10.${RUN_ID}` } } });
      await prisma.paymentSlip.deleteMany({ where: { studentEmail: { contains: `sec10.${RUN_ID}` } } });
      await prisma.lead.deleteMany({ where: { email: { contains: `sec10.${RUN_ID}` } } });
    } catch {
      /* ignore cleanup errors */
    }
  });

  // ── 1. Idempotency Key Replay on Leads ─────────────────────────────────────

  it('Lead submission with Idempotency-Key creates lead once, subsequent replay returns cached response without duplicate DB insert', async () => {
    const idempKey = `idemp-lead-${RUN_ID}-1`;
    const payload = {
      name: 'Idempotent Operative',
      phone: `+9471${Math.floor(1000000 + Math.random() * 8999999)}`,
      email: `lead.sec10.${RUN_ID}@uwe.lk`,
      courseSlug: 'bmb',
      message: 'Testing idempotency on lead creation.',
    };

    // 1st request — performs insert
    const res1 = await request(app)
      .post('/api/leads')
      .set('Idempotency-Key', idempKey)
      .send(payload);

    expect(res1.status).toBe(201);
    expect(res1.body.success).toBe(true);
    expect(res1.body.data.id).toBeDefined();
    expect(res1.headers['x-idempotency-replay']).toBeUndefined();
    createdLeadId = res1.body.data.id;

    // 2nd request with same key — must return cached response immediately
    const res2 = await request(app)
      .post('/api/leads')
      .set('Idempotency-Key', idempKey)
      .send(payload);

    expect(res2.status).toBe(201);
    expect(res2.body.success).toBe(true);
    expect(res2.body.data.id).toBe(createdLeadId);
    expect(res2.headers['x-idempotency-replay']).toBe('true');

    // Verify DB count: only exactly 1 lead created
    const count = await prisma.lead.count({ where: { email: payload.email } });
    expect(count).toBe(1);
  });

  // ── 2. Idempotency Key Replay on Job Applications ──────────────────────────

  it('Job application with X-Idempotency-Key is idempotent across retries', async () => {
    const idempKey = `idemp-job-${RUN_ID}-2`;
    const payload = {
      vacancyId: testVacancyId,
      name: 'Candidate Sec10',
      phone: '+94718887766',
      email: `job.sec10.${RUN_ID}@uwe.lk`,
      experience: '5 years operations experience',
    };

    // 1st request
    const res1 = await request(app)
      .post('/api/jobs/applications')
      .set('X-Idempotency-Key', idempKey)
      .send(payload);

    expect(res1.status).toBe(201);
    expect(res1.body.success).toBe(true);
    createdJobId = res1.body.data.id;

    // 2nd request with same key
    const res2 = await request(app)
      .post('/api/jobs/applications')
      .set('X-Idempotency-Key', idempKey)
      .send(payload);

    expect(res2.status).toBe(201);
    expect(res2.body.data.id).toBe(createdJobId);
    expect(res2.headers['x-idempotency-replay']).toBe('true');

    // Verify only 1 application in DB
    const count = await prisma.jobApplication.count({ where: { email: payload.email } });
    expect(count).toBe(1);
  });

  // ── 3. Idempotency Key Replay on Bank Slips ────────────────────────────────

  it('Payment slip checkout with Idempotency-Key returns cached response on replay', async () => {
    const idempKey = `idemp-slip-${RUN_ID}-3`;
    const payload = {
      studentName: 'Slip Student Sec10',
      studentPhone: '+94717776655',
      studentEmail: `slip.sec10.${RUN_ID}@uwe.lk`,
      courseSlug: 'bmb',
      slipUrl: VALID_PNG_URI,
      amount: 25000,
      bankReference: `REF-${RUN_ID}`,
    };

    // 1st request
    const res1 = await request(app)
      .post('/api/slips')
      .set('Idempotency-Key', idempKey)
      .send(payload);

    expect(res1.status).toBe(201);
    expect(res1.body.success).toBe(true);
    createdSlipId = res1.body.data.id;

    // 2nd request with same key
    const res2 = await request(app)
      .post('/api/slips')
      .set('Idempotency-Key', idempKey)
      .send(payload);

    expect(res2.status).toBe(201);
    expect(res2.body.data.id).toBe(createdSlipId);
    expect(res2.headers['x-idempotency-replay']).toBe('true');

    // Verify only 1 slip in DB
    const count = await prisma.paymentSlip.count({ where: { studentEmail: payload.studentEmail } });
    expect(count).toBe(1);
  });

  // ── 4. CAPTCHA / Turnstile Verification ────────────────────────────────────

  it('Rejects public submission with fake/invalid CAPTCHA token with 403 Forbidden', async () => {
    const res = await request(app)
      .post('/api/leads')
      .set('cf-turnstile-response', 'test-fail-captcha')
      .send({
        name: 'Spam Bot',
        phone: '+94711234567',
        courseSlug: 'bmb',
        message: 'Spam payload',
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('FORBIDDEN');
    expect(res.body.message).toContain('Security verification failed');
  });

  it('Accepts public submission with valid Turnstile bypass/test token', async () => {
    const res = await request(app)
      .post('/api/leads')
      .set('cf-turnstile-response', 'test-pass-captcha')
      .send({
        name: 'Legit Human',
        phone: `+9471${Math.floor(1000000 + Math.random() * 8999999)}`,
        email: `captcha.sec10.${RUN_ID}@uwe.lk`,
        courseSlug: 'bmb',
        message: 'Genuine inquiry.',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });
});
