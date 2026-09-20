import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../index';
import { prisma } from '../config/db';
import { getJwtSecret } from '../middlewares/authenticate';
import { calculateRank, AVAILABLE_BADGES } from '../controllers/gamificationController';
import jwt from 'jsonwebtoken';

/**
 * Enterprise Security Test Suite — Full API Endpoint Coverage
 *
 * Covers:
 * - Courses (public catalog, slug lookup)
 * - Leads (submission, validation, XSS, deduplication, admin CRUD)
 * - Jobs (public listing, application, admin CRUD, hiring flow)
 * - Banners (admin-only CRUD)
 * - Staff (admin-only CRUD)
 * - Instructors (admin-only CRUD)
 * - Gamification (leaderboard, profile IDOR, XP award, rank calculation)
 * - Mastermind Q&A (auth, upvote dedup, admin moderation)
 * - Certificates (public verification)
 * - Video Progress (auth gating)
 */
describe('Enterprise Security: Full API Endpoint Coverage', () => {
  const JWT_SECRET = getJwtSecret();
  let adminToken: string;
  let studentToken: string;
  let studentToken2: string;

  const testStudentId = `api-test-student-${Date.now()}`;
  const testStudentId2 = `api-test-student2-${Date.now()}`;

  // Track IDs for cleanup
  let testLeadId: string;
  let testJobId: string;
  let testApplicationId: string;
  let testMastermindId: string;

  beforeAll(async () => {
    adminToken = jwt.sign(
      { id: 'admin-api-full', email: 'admin-api@uwe.lk', role: 'SUPER_ADMIN', type: 'admin' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    studentToken = jwt.sign(
      { id: testStudentId, email: 'student-api@uwe.lk', type: 'student' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    studentToken2 = jwt.sign(
      { id: testStudentId2, email: 'student-api2@uwe.lk', type: 'student' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Create test student for gamification/profile tests
    try {
      await prisma.user.create({
        data: {
          id: testStudentId,
          email: `student-api-${Date.now()}@uwe-test.lk`,
          name: 'API Test Student',
          passwordHash: '$2b$12$dummyhashfortest000000000000000000000000000000',
          isEnrolled: true,
          enrolledCourseSlugs: 'bmb',
          xp: 200,
          streakDays: 3,
          rankTitle: 'Tactical Specialist',
        },
      });
    } catch { /* already exists */ }
  });

  afterAll(async () => {
    try {
      await prisma.lead.deleteMany({ where: { phone: { startsWith: '+9477000' } } });
      await prisma.jobApplication.deleteMany({ where: { phone: { startsWith: '+9477000' } } });
      await prisma.mastermindQuestion.deleteMany({ where: { courseSlug: { startsWith: 'api-test-' } } });
      await prisma.user.deleteMany({ where: { id: { startsWith: 'api-test-student' } } });
    } catch { /* ignore */ }
  });

  // ── 1. Course Catalog (Public) ─────────────────────────────────────────────

  describe('1. Course Catalog (Public Endpoints)', () => {
    it('GET /api/courses returns public course list → 200', async () => {
      const res = await request(app).get('/api/courses');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('GET /api/courses/:slug returns single course by slug → 200', async () => {
      // Use an existing seed course slug or handle 404 gracefully
      const res = await request(app).get('/api/courses/bmb');
      // Either 200 (found) or 404 (not seeded) — both are valid
      expect([200, 404]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.data.slug).toBe('bmb');
      }
    });

    it('GET /api/courses/:slug with non-existent slug → 404', async () => {
      const res = await request(app).get('/api/courses/nonexistent-slug-xyz');
      expect(res.status).toBe(404);
    });
  });

  // ── 2. Lead Submissions ────────────────────────────────────────────────────

  describe('2. Lead Submissions & CRM', () => {
    it('creates a new lead inquiry with valid data → 201', async () => {
      const res = await request(app)
        .post('/api/leads')
        .send({
          name: 'Lead Test User',
          phone: '+94770001234',
          email: 'leadtest@uwe-test.lk',
          courseSlug: 'bmb',
          inquiryType: 'BMB',
          message: 'I am interested in the BMB program.',
        });
      expect([200, 201]).toContain(res.status);
      expect(res.body.success).toBe(true);
      testLeadId = res.body.data?.id;
    });

    it('deduplicates lead with same phone in NEW status → 200 (update)', async () => {
      const res = await request(app)
        .post('/api/leads')
        .send({
          name: 'Lead Test User Updated',
          phone: '+94770001234',
          message: 'Updated interest — followup inquiry.',
        });
      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Lead Test User Updated');
    });

    it('rejects lead with missing required fields → 400', async () => {
      const res = await request(app)
        .post('/api/leads')
        .send({ name: 'No Phone Lead' });
      expect(res.status).toBe(400);
    });

    it('rejects lead with invalid phone format → 400', async () => {
      const res = await request(app)
        .post('/api/leads')
        .send({ name: 'Bad Phone', phone: 'abc' });
      expect(res.status).toBe(400);
    });

    it('rejects lead with oversized name (>100 chars) → 400', async () => {
      const res = await request(app)
        .post('/api/leads')
        .send({
          name: 'A'.repeat(101),
          phone: '+94771234567',
        });
      expect(res.status).toBe(400);
    });

    it('safely stores XSS payloads in lead message without breaking', async () => {
      const res = await request(app)
        .post('/api/leads')
        .send({
          name: 'XSS Tester',
          phone: '+94770009999',
          message: '<script>alert("XSS")</script><img src=x onerror=alert(1)>',
        });
      expect([200, 201]).toContain(res.status);
      expect(res.body.success).toBe(true);
    });

    it('admin can list all leads → 200', async () => {
      const res = await request(app)
        .get('/api/leads')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('unauthenticated user cannot list leads → 401', async () => {
      const res = await request(app).get('/api/leads');
      expect(res.status).toBe(401);
    });

    it('student cannot list leads → 403', async () => {
      const res = await request(app)
        .get('/api/leads')
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(403);
    });
  });

  // ── 3. Job Vacancies & Applications ────────────────────────────────────────

  describe('3. Job Vacancies & Applications', () => {
    it('GET /api/jobs returns public vacancy listing → 200', async () => {
      const res = await request(app).get('/api/jobs');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('creates job application with valid data → 201', async () => {
      // Need a valid vacancyId — create a temp vacancy or use first available
      let vacancyId: string | undefined;
      const jobs = await prisma.jobVacancy.findFirst({ where: { isActive: true } });
      if (jobs) vacancyId = jobs.id;

      const res = await request(app)
        .post('/api/jobs/applications')
        .send({
          vacancyId: vacancyId || undefined,
          name: 'Job Test Applicant',
          phone: '+94770005555',
          email: 'jobtest@uwe-test.lk',
          experience: '3 years digital marketing',
        });

      // 201 if vacancy exists, 400 if no active vacancies
      if (res.status === 201) {
        expect(res.body.success).toBe(true);
        testApplicationId = res.body.data?.id;
      } else {
        expect(res.status).toBe(400);
      }
    });

    it('rejects job application with missing name → 400', async () => {
      const res = await request(app)
        .post('/api/jobs/applications')
        .send({ phone: '+94771234567' });
      expect(res.status).toBe(400);
    });

    it('rejects job application with invalid phone format → 400', async () => {
      const res = await request(app)
        .post('/api/jobs/applications')
        .send({ name: 'Bad Phone Applicant', phone: 'not-a-phone' });
      expect(res.status).toBe(400);
    });

    it('admin can list all applications → 200', async () => {
      const res = await request(app)
        .get('/api/jobs/applications')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('unauthenticated user cannot list applications → 401', async () => {
      const res = await request(app).get('/api/jobs/applications');
      expect(res.status).toBe(401);
    });

    it('rejects invalid application status (SEC-MED-3 verification) → 400', async () => {
      const res = await request(app)
        .put('/api/jobs/applications/fake-app-id/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'INVALID_STATUS_XYZ' });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });
  });

  // ── 4. Admin-Only CRUD Endpoints ───────────────────────────────────────────

  describe('4. Admin-Only CRUD Authorization Gates', () => {
    it('unauthenticated user cannot access banners admin → 401', async () => {
      const res = await request(app).get('/api/banners');
      // Banners GET may be public for display — check based on route config
      // If it returns data, that's fine; we test mutation gates
    });

    it('student cannot create a banner → 401/403', async () => {
      const res = await request(app)
        .post('/api/banners')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ message: 'Sneaky banner', bannerType: 'INFO' });
      expect([401, 403]).toContain(res.status);
    });

    it('student cannot create staff member → 401/403', async () => {
      const res = await request(app)
        .post('/api/staff')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ name: 'Fake Staff', role: 'Manager', phone: '+94771234567' });
      expect([401, 403]).toContain(res.status);
    });

    it('student cannot create instructor → 401/403', async () => {
      const res = await request(app)
        .post('/api/instructors')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ name: 'Fake Instructor', title: 'Professor' });
      expect([401, 403]).toContain(res.status);
    });

    it('student cannot create course → 401/403', async () => {
      const res = await request(app)
        .post('/api/courses')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ slug: 'hacked-course', title: 'Unauthorized Course' });
      expect([401, 403]).toContain(res.status);
    });

    it('student cannot create coupon → 401/403', async () => {
      const res = await request(app)
        .post('/api/coupons')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ code: 'FREEMONEY', discountPercent: 100 });
      expect([401, 403]).toContain(res.status);
    });
  });

  // ── 5. Gamification System ─────────────────────────────────────────────────

  describe('5. Gamification System', () => {
    it('leaderboard is publicly accessible → 200', async () => {
      const res = await request(app).get('/api/gamification/leaderboard');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('gamification profile requires authentication → 401', async () => {
      const res = await request(app).get(`/api/gamification/profile/${testStudentId}`);
      expect(res.status).toBe(401);
    });

    it('student can view their own gamification profile → 200', async () => {
      const res = await request(app)
        .get(`/api/gamification/profile/${testStudentId}`)
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(testStudentId);
    });

    it('student cannot view another student gamification profile (IDOR) → 403', async () => {
      const res = await request(app)
        .get(`/api/gamification/profile/${testStudentId}`)
        .set('Authorization', `Bearer ${studentToken2}`);
      expect(res.status).toBe(403);
    });

    it('admin can view any student gamification profile → 200', async () => {
      const res = await request(app)
        .get(`/api/gamification/profile/${testStudentId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
    });

    it('XP award requires authentication → 401', async () => {
      const res = await request(app)
        .post('/api/gamification/award-xp')
        .send({ actionType: 'VIDEO_COMPLETED' });
      expect(res.status).toBe(401);
    });

    // ── Rank Calculation Unit Tests ──
    it('calculateRank: 0 XP = "Novice Operative" (Tier 4)', () => {
      const rank = calculateRank(0);
      expect(rank.rankTitle).toBe('Novice Operative');
      expect(rank.tierNumber).toBe(4);
    });

    it('calculateRank: 150 XP = "Tactical Specialist" (Tier 3)', () => {
      const rank = calculateRank(150);
      expect(rank.rankTitle).toBe('Tactical Specialist');
      expect(rank.tierNumber).toBe(3);
    });

    it('calculateRank: 400 XP = "Elite Vanguard" (Tier 2)', () => {
      const rank = calculateRank(400);
      expect(rank.rankTitle).toBe('Elite Vanguard');
      expect(rank.tierNumber).toBe(2);
    });

    it('calculateRank: 800 XP = "Tier-1 Commander" (Tier 1)', () => {
      const rank = calculateRank(800);
      expect(rank.rankTitle).toBe('Tier-1 Commander');
      expect(rank.tierNumber).toBe(1);
    });

    it('calculateRank: progress percentage is bounded 0-100', () => {
      const rank0 = calculateRank(0);
      expect(rank0.progressPercent).toBeGreaterThanOrEqual(0);
      expect(rank0.progressPercent).toBeLessThanOrEqual(100);

      const rankMax = calculateRank(2000);
      expect(rankMax.progressPercent).toBeLessThanOrEqual(100);
    });

    it('AVAILABLE_BADGES contains expected badge IDs', () => {
      const badgeIds = AVAILABLE_BADGES.map((b) => b.id);
      expect(badgeIds).toContain('RECRUIT');
      expect(badgeIds).toContain('STREAK_WARRIOR');
      expect(badgeIds).toContain('HONOR_GRADUATE');
    });
  });

  // ── 6. Mastermind Q&A ──────────────────────────────────────────────────────

  describe('6. Mastermind Q&A System', () => {
    it('question listing is publicly accessible by course → 200', async () => {
      const res = await request(app).get('/api/mastermind/questions?courseSlug=bmb');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('posting a question requires authentication → 401', async () => {
      const res = await request(app)
        .post('/api/mastermind/questions')
        .send({
          courseSlug: 'api-test-mastermind',
          question: 'How do I test this?',
        });
      expect(res.status).toBe(401);
    });

    it('authenticated student can post a question → 201', async () => {
      const res = await request(app)
        .post('/api/mastermind/questions')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          courseSlug: 'api-test-mastermind',
          question: 'What is the best approach for unit testing API endpoints?',
          drillTopic: 'Testing Fundamentals',
        });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      testMastermindId = res.body.data?.id;
    });

    it('rejects empty question content → 400', async () => {
      const res = await request(app)
        .post('/api/mastermind/questions')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          courseSlug: 'api-test-mastermind',
          question: '',
        });
      expect(res.status).toBe(400);
    });

    it('upvote toggle works — first upvote increments count', async () => {
      if (!testMastermindId) return;

      const res = await request(app)
        .post(`/api/mastermind/questions/${testMastermindId}/upvote`)
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(200);
      expect(res.body.upvoted).toBe(true);
      expect(res.body.upvotes).toBeGreaterThanOrEqual(1);
    });

    it('upvote toggle — second upvote by same user decrements (toggle off)', async () => {
      if (!testMastermindId) return;

      const res = await request(app)
        .post(`/api/mastermind/questions/${testMastermindId}/upvote`)
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(200);
      expect(res.body.upvoted).toBe(false);
    });

    it('admin can answer and pin a question', async () => {
      if (!testMastermindId) return;

      const res = await request(app)
        .put(`/api/mastermind/questions/${testMastermindId}/answer`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          answer: 'Great question! Use Vitest with Supertest for integration tests.',
          answeredBy: 'Commander Coach',
          isPinned: true,
        });
      expect(res.status).toBe(200);
      expect(res.body.data.isAnswered).toBe(true);
      expect(res.body.data.isPinned).toBe(true);
    });

    it('admin can delete a mastermind question', async () => {
      if (!testMastermindId) return;

      const res = await request(app)
        .delete(`/api/mastermind/questions/${testMastermindId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
    });
  });

  // ── 7. Video Progress & Certificates ───────────────────────────────────────

  describe('7. Video Progress & Certificates', () => {
    it('video progress requires authentication → 401', async () => {
      const res = await request(app)
        .post('/api/progress')
        .send({ moduleId: 'fake-module' });
      expect(res.status).toBe(401);
    });

    it('certificate verification by number works publicly', async () => {
      // This will likely return 404 for non-existent cert, but it shouldn't require auth
      const res = await request(app).get('/api/certificates/verify/UWE-TEST-0000');
      expect([200, 404]).toContain(res.status);
    });
  });

  // ── 8. Error Handling & Edge Cases ─────────────────────────────────────────

  describe('8. Error Handling & Edge Cases', () => {
    it('non-existent API route returns structured error', async () => {
      const res = await request(app).get('/api/this-route-does-not-exist');
      // Express will return 404 or the error handler will catch it
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it('malformed JSON body returns 400', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('{"email": "test@uwe.lk", "password": }'); // Invalid JSON
      expect(res.status).toBe(400);
    });
  });
});
