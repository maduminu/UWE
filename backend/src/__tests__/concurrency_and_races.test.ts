import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../index';
import { prisma } from '../config/db';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../middlewares/authenticate';

// All concurrency tests use unique, timestamped IDs to avoid cross-run state pollution
const RUN_ID = Date.now();

describe('Transactional Commerce & Concurrency Invariant Tests (DATA-1, DATA-2, DATA-3)', () => {
  const secret = getJwtSecret();
  let adminToken: string;

  // Per-test fixture IDs
  let couponId: string;
  let batchId: string;
  let vacancyId: string;
  const courseSlug = `concurrency-course-${RUN_ID}`;
  const couponCode = `RACE_COUPON_${RUN_ID}`;
  const slipIds: string[] = [];
  const appIds: string[] = [];

  beforeAll(async () => {
    adminToken = jwt.sign(
      { id: 'admin-concurrency-test', email: 'commander@uwe.lk', role: 'SUPER_ADMIN', type: 'admin' },
      secret,
      { expiresIn: '1h' }
    );

    // ── DATA-1: Create 1-use coupon ──────────────────────────────────────────
    const coupon = await prisma.coupon.create({
      data: {
        code: couponCode,
        discountPercent: 20,
        maxUses: 1,
        usedCount: 0,
        isActive: true,
      },
    });
    couponId = coupon.id;

    // ── DATA-2: Create course with 1 remaining seat ──────────────────────────
    const course = await prisma.course.create({
      data: {
        slug: courseSlug,
        title: 'Concurrency Defense Program',
        subtitle: 'Tactical Race Prevention',
        badge: 'SECURITY',
        category: 'COMMAND',
        description: 'Testing concurrency safety.',
        price: 5000,
        duration: '5 Days',
        batches: {
          create: {
            batchNumber: RUN_ID % 10000,
            startDate: new Date(Date.now() + 86400000),
            scheduleText: `CONCURRENCY_TEST_BATCH_${RUN_ID}`,
            totalSeats: 10,
            availableSeats: 1,
            status: 'UPCOMING',
          },
        },
      },
      include: { batches: true },
    });
    batchId = course.batches[0].id;

    // Create 5 pending slips for DATA-2
    for (let i = 0; i < 5; i++) {
      const slip = await prisma.paymentSlip.create({
        data: {
          studentName: `Operative ${i}`,
          studentPhone: `+94710${RUN_ID}${i}`.slice(0, 20),
          studentEmail: `concurrency.test.${RUN_ID}.${i}@uwe.lk`,
          courseSlug,
          slipUrl: `slips/test-fixture-${RUN_ID}-${i}.png`,
          amount: 5000,
          status: 'PENDING',
        },
      });
      slipIds.push(slip.id);
    }

    // ── DATA-3: Create vacancy with 1 open position ──────────────────────────
    const vacancy = await prisma.jobVacancy.create({
      data: {
        title: `Concurrency Tactical Lead ${RUN_ID}`,
        department: 'Security HQ',
        employmentType: 'FULL_TIME',
        incomeText: 'RS. 150,000+',
        requirements: '["Senior Engineer", "TypeScript"]',
        openPositions: 1,
        hiredCount: 0,
        hiringStatus: 'HIRING',
      },
    });
    vacancyId = vacancy.id;

    // Create 5 applications for DATA-3
    for (let i = 0; i < 5; i++) {
      const appRecord = await prisma.jobApplication.create({
        data: {
          vacancyId: vacancy.id,
          name: `Candidate ${i}`,
          email: `concurrency.applicant.${RUN_ID}.${i}@example.com`,
          phone: `+94770${RUN_ID}${i}`.slice(0, 20),
          status: 'SHORTLISTED',
        },
      });
      appIds.push(appRecord.id);
    }
  }, 30000);

  afterAll(async () => {
    try {
      if (slipIds.length) await prisma.paymentSlip.deleteMany({ where: { id: { in: slipIds } } });
      if (appIds.length) await prisma.jobApplication.deleteMany({ where: { id: { in: appIds } } });
      if (vacancyId) await prisma.jobVacancy.deleteMany({ where: { id: vacancyId } });
      if (batchId) await prisma.courseBatch.deleteMany({ where: { id: batchId } });
      await prisma.course.deleteMany({ where: { slug: courseSlug } });
      if (couponId) await prisma.coupon.deleteMany({ where: { id: couponId } });
    } catch {
      /* ignore cleanup */
    }
  }, 30000);

  // ── DATA-1: Coupon Concurrency Race Test ────────────────────────────────────
  it('DATA-1: Concurrent checkout redemptions for a 1-use coupon permit exactly 1 winner', async () => {
    const redemptionPromises = Array.from({ length: 5 }).map(() =>
      request(app)
        .post('/api/coupons/redeem')
        .send({ code: couponCode, originalPrice: 10000 })
    );

    const responses = await Promise.all(redemptionPromises);

    const successResponses = responses.filter((r) => r.status === 200 && r.body.success === true);
    const failureResponses = responses.filter((r) => r.status !== 200);

    expect(successResponses.length).toBe(1);
    expect(failureResponses.length).toBe(4);

    const freshCoupon = await prisma.coupon.findUnique({ where: { id: couponId } });
    expect(freshCoupon?.usedCount).toBe(1);
  }, 20000);

  // ── DATA-2: Batch Seat Concurrency Test ─────────────────────────────────────
  it('DATA-2: Concurrent slip verifications for 1 remaining seat permit exactly 1 decrement (never drops < 0)', async () => {
    const verifyPromises = slipIds.map((id) =>
      request(app)
        .put(`/api/slips/${id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'VERIFIED' })
    );

    const responses = await Promise.all(verifyPromises);

    const successResponses = responses.filter((r) => r.status === 200 && r.body.success === true);
    const failureResponses = responses.filter((r) => r.status === 500 && r.body.success === false);

    // Exactly 1 must claim the last seat
    expect(successResponses.length).toBe(1);
    expect(failureResponses.length).toBe(4);

    // DB must never go below 0
    const freshBatch = await prisma.courseBatch.findUnique({ where: { id: batchId } });
    expect(freshBatch?.availableSeats).toBe(0);
  }, 20000);

  // ── DATA-3: Job Vacancy Hiring Counter Concurrency Test ─────────────────────
  it('DATA-3: Concurrent candidate hires for 1 open position allow exactly 1 hire and lock vacancy', async () => {
    const hirePromises = appIds.map((id) =>
      request(app)
        .put(`/api/jobs/applications/${id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'HIRED' })
    );

    const responses = await Promise.all(hirePromises);

    const successResponses = responses.filter((r) => r.status === 200 && r.body.success === true);
    const failureResponses = responses.filter((r) => r.status === 500 && r.body.success === false);

    expect(successResponses.length).toBe(1);
    expect(failureResponses.length).toBe(4);

    const freshVacancy = await prisma.jobVacancy.findUnique({ where: { id: vacancyId } });
    expect(freshVacancy?.hiredCount).toBe(1);
    expect(freshVacancy?.hiringStatus).toBe('HIRING_FINISHED');
  }, 20000);
});
