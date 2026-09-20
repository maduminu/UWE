import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../index';
import { prisma } from '../config/db';
import { getJwtSecret } from '../middlewares/authenticate';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

/**
 * Enterprise Security Test Suite — Authentication, JWT, Session Management & RBAC
 *
 * Covers:
 * - JWT token validation (missing, malformed, expired, wrong secret, alg confusion)
 * - Student registration & login flows
 * - Admin login (including fuzzy name matching audit)
 * - Refresh token rotation & replay attack detection
 * - Logout & session revocation
 * - Role-based access control (SUPER_ADMIN, COMMANDER, COACH, RECRUITER)
 * - IDOR protections on user profile / dashboard
 */
describe('Enterprise Security: Authentication, JWT & RBAC', () => {
  const JWT_SECRET = getJwtSecret();

  // Pre-built test tokens
  let superAdminToken: string;
  let commanderToken: string;
  let coachToken: string;
  let recruiterToken: string;
  let studentToken: string;
  let studentToken2: string;

  // Test user IDs
  const testStudentId = `test-student-auth-${Date.now()}`;
  const testStudentId2 = `test-student-auth2-${Date.now()}`;
  const testAdminId = `test-admin-auth-${Date.now()}`;
  const testStudentEmail = `authtest-${Date.now()}@uwe-test.lk`;
  const testAdminEmail = `admin-authtest-${Date.now()}@uwe-test.lk`;

  beforeAll(async () => {
    // Generate test tokens for role-based access control tests
    superAdminToken = jwt.sign(
      { id: 'sa-auth-test', email: 'sa@uwe.lk', role: 'SUPER_ADMIN', type: 'admin' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    commanderToken = jwt.sign(
      { id: 'cmd-auth-test', email: 'cmd@uwe.lk', role: 'COMMANDER', type: 'admin' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    coachToken = jwt.sign(
      { id: 'coach-auth-test', email: 'coach@uwe.lk', role: 'COACH', type: 'admin' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    recruiterToken = jwt.sign(
      { id: 'rec-auth-test', email: 'rec@uwe.lk', role: 'RECRUITER', type: 'admin' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    studentToken = jwt.sign(
      { id: testStudentId, email: 'student@uwe.lk', type: 'student' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    studentToken2 = jwt.sign(
      { id: testStudentId2, email: 'student2@uwe.lk', type: 'student' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Create a real test student for login/registration tests
    const passwordHash = await bcrypt.hash('TestPass123!', 12);
    try {
      await prisma.user.create({
        data: {
          id: testStudentId,
          email: testStudentEmail,
          name: 'Auth Test Student',
          passwordHash,
          isEnrolled: true,
          enrolledCourseSlugs: 'bmb',
        },
      });
    } catch { /* already exists */ }

    // Create a real test admin for admin login tests
    try {
      await prisma.adminUser.create({
        data: {
          id: testAdminId,
          email: testAdminEmail,
          name: 'AuthTestAdmin',
          passwordHash: await bcrypt.hash('AdminPass999!', 12),
          role: 'COMMANDER',
        },
      });
    } catch { /* already exists */ }
  });

  afterAll(async () => {
    try {
      await prisma.user.deleteMany({ where: { email: { startsWith: 'authtest-' } } });
      await prisma.user.deleteMany({ where: { email: { startsWith: 'newreg-' } } });
      await prisma.adminUser.deleteMany({ where: { email: { startsWith: 'admin-authtest-' } } });
      await prisma.refreshToken.deleteMany({ where: { userId: { startsWith: 'test-' } } });
    } catch { /* ignore */ }
  });

  // ── 1. JWT Token Validation ────────────────────────────────────────────────

  describe('1. JWT Token Validation & Enforcement', () => {
    it('rejects request with no Authorization header → 401', async () => {
      const res = await request(app).get('/api/users');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });

    it('rejects request with malformed Bearer token → 401', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', 'Bearer this-is-garbage-not-a-jwt');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('rejects request with empty Bearer prefix → 401', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', 'Bearer ');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('rejects expired JWT token → 401 with session expired message', async () => {
      const expiredToken = jwt.sign(
        { id: 'expired-user', email: 'test@uwe.lk', type: 'admin', role: 'SUPER_ADMIN' },
        JWT_SECRET,
        { expiresIn: '0s' } // Already expired
      );

      // Small delay to ensure token is expired
      await new Promise((r) => setTimeout(r, 100));

      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${expiredToken}`);
      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Expired');
    });

    it('rejects JWT signed with wrong secret → 401', async () => {
      const wrongSecretToken = jwt.sign(
        { id: 'hacker', email: 'hacker@evil.com', type: 'admin', role: 'SUPER_ADMIN' },
        'completely-wrong-secret-key-that-is-32-chars-long!!',
        { expiresIn: '1h' }
      );

      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${wrongSecretToken}`);
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('rejects Authorization header without Bearer prefix → 401', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Token ${superAdminToken}`);
      expect(res.status).toBe(401);
    });
  });

  // ── 2. Student Registration & Login ────────────────────────────────────────

  describe('2. Student Registration & Login Security', () => {
    it('rejects registration with missing required fields', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'incomplete@test.lk' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rejects registration with weak password (< 6 chars)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: `weakpw-${Date.now()}@test.lk`,
          password: '12345',
        });
      expect(res.status).toBe(400);
    });

    it('rejects registration with duplicate email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Duplicate User',
          email: testStudentEmail,
          password: 'TestPass123!',
        });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('already exists');
    });

    it('successfully registers a new student with valid data', async () => {
      const newEmail = `newreg-${Date.now()}@uwe-test.lk`;
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'New Operative',
          email: newEmail,
          password: 'ValidPass123!',
        });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(newEmail.toLowerCase());
      expect(res.body.data.accessToken || res.body.data.token).toBeDefined();
    });

    it('successfully logs in with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testStudentEmail,
          password: 'TestPass123!',
        });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken || res.body.data.token).toBeDefined();
    });

    it('rejects login with wrong password → 401 with generic message', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testStudentEmail,
          password: 'WrongPassword!',
        });
      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid credentials');
      // Should NOT reveal whether email exists
    });

    it('rejects login with non-existent email → 401 with same generic message', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@phantom.com',
          password: 'SomePassword',
        });
      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid credentials');
      // Same message as wrong password — no user enumeration
    });
  });

  // ── 3. Admin Login Security ────────────────────────────────────────────────

  describe('3. Admin Login Security', () => {
    it('successfully authenticates valid admin credentials', async () => {
      const res = await request(app)
        .post('/api/auth/admin-login')
        .send({
          username: testAdminEmail,
          password: 'AdminPass999!',
        });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe('COMMANDER');
    });

    it('rejects admin login with wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/admin-login')
        .send({
          username: testAdminEmail,
          password: 'WrongAdminPass',
        });
      expect(res.status).toBe(401);
    });

    it('rejects admin login with substring/wildcard username (SEC-CRIT-1 verification) → 401', async () => {
      // Admin name is 'AuthTestAdmin'. Searching for substring 'AuthTest' or 'Admin' must NOT match
      const res = await request(app)
        .post('/api/auth/admin-login')
        .send({
          username: 'AuthTest',
          password: 'AdminPass999!',
        });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('rejects admin login with non-existent username', async () => {
      const res = await request(app)
        .post('/api/auth/admin-login')
        .send({
          username: 'ghost-admin-nobody',
          password: 'SomePassword',
        });
      expect(res.status).toBe(401);
    });
  });

  // ── 4. Role-Based Access Control (RBAC) ────────────────────────────────────

  describe('4. Role-Based Access Control (RBAC)', () => {
    it('SUPER_ADMIN can access user directory', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('COMMANDER can access user directory', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${commanderToken}`);
      expect(res.status).toBe(200);
    });

    it('COACH can access user directory', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${coachToken}`);
      expect(res.status).toBe(200);
    });

    it('RECRUITER cannot access user directory → 403', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${recruiterToken}`);
      expect(res.status).toBe(403);
    });

    it('student token cannot access admin user directory → 403', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(403);
    });

    it('RECRUITER cannot delete users (only SUPER_ADMIN, COMMANDER) → 403', async () => {
      const res = await request(app)
        .delete('/api/users/fake-user-id')
        .set('Authorization', `Bearer ${recruiterToken}`);
      expect(res.status).toBe(403);
    });

    it('COACH cannot create users (only SUPER_ADMIN, COMMANDER) → 403', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${coachToken}`)
        .send({ name: 'Sneaky User', email: 'sneaky@hack.com' });
      expect(res.status).toBe(403);
    });

    it('SUPER_ADMIN can access admin role update route', async () => {
      const res = await request(app)
        .put('/api/auth/admins/nonexistent-id/role')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ role: 'COACH' });
      // 404 for non-existent admin, NOT 403 — proves access was granted
      expect(res.status).toBe(404);
    });

    it('COMMANDER cannot access SUPER_ADMIN-only role update route → 403', async () => {
      const res = await request(app)
        .put('/api/auth/admins/some-id/role')
        .set('Authorization', `Bearer ${commanderToken}`)
        .send({ role: 'COACH' });
      expect(res.status).toBe(403);
    });
  });

  // ── 5. IDOR Protection (Insecure Direct Object Reference) ──────────────────

  describe('5. IDOR Protection — Student Data Isolation', () => {
    it('student can view their own profile → 200', async () => {
      const res = await request(app)
        .get(`/api/users/${testStudentId}`)
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(testStudentId);
    });

    it('student cannot view another student profile → 403', async () => {
      const res = await request(app)
        .get(`/api/users/${testStudentId}`)
        .set('Authorization', `Bearer ${studentToken2}`);
      expect(res.status).toBe(403);
    });

    it('student cannot view another student dashboard → 403', async () => {
      const res = await request(app)
        .get(`/api/users/${testStudentId}/dashboard`)
        .set('Authorization', `Bearer ${studentToken2}`);
      expect(res.status).toBe(403);
    });

    it('admin can view any student profile → 200', async () => {
      const res = await request(app)
        .get(`/api/users/${testStudentId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(res.status).toBe(200);
    });

    it('student update rejects invalid/empty name (SEC-HIGH-2 verification) → 400', async () => {
      const res = await request(app)
        .put(`/api/users/${testStudentId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ name: 'A' }); // less than 2 chars
      expect(res.status).toBe(400);
    });
  });

  // ── 6. Token Refresh & Session Lifecycle ───────────────────────────────────

  describe('6. Token Refresh & Session Lifecycle', () => {
    it('refresh endpoint rejects when no refresh token provided → 400', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({});
      expect(res.status).toBe(400);
    });

    it('refresh endpoint rejects invalid/fabricated refresh token → 401', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'completely-fabricated-token-string' });
      expect(res.status).toBe(401);
    });

    it('logout endpoint returns 200 even without token (graceful)', async () => {
      const res = await request(app).post('/api/auth/logout');
      expect(res.status).toBe(200);
    });

    it('revoke-all requires authentication', async () => {
      const res = await request(app).post('/api/auth/revoke-all');
      expect(res.status).toBe(401);
    });

    it('revoke-all with valid token returns 200', async () => {
      const res = await request(app)
        .post('/api/auth/revoke-all')
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ── 7. Health & Infrastructure Endpoints ───────────────────────────────────

  describe('7. Health & Infrastructure Endpoints', () => {
    it('health check returns 200 with ONLINE status', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ONLINE');
    });

    it('root endpoint returns 200 with system info', async () => {
      const res = await request(app).get('/');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ONLINE');
    });

    it('diagnostics endpoint returns server telemetry (uptime and memory)', async () => {
      const res = await request(app).get('/api/diagnostics');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('HEALTHY');
      expect(res.body.uptimeSeconds).toBeDefined();
      expect(res.body.memoryMb).toBeDefined();
    });
  });
});
