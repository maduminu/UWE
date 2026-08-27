import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../index';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../middlewares/authenticate';

describe('Phase 7: Enterprise Enhancements Integration Tests', () => {
  const testSecret = getJwtSecret();

  const superAdminToken = jwt.sign(
    { id: 'adm-super', email: 'super@uwe.lk', role: 'SUPER_ADMIN', type: 'admin' },
    testSecret,
    { expiresIn: '1h' }
  );

  const recruiterToken = jwt.sign(
    { id: 'adm-recruiter', email: 'recruiter@uwe.lk', role: 'RECRUITER', type: 'admin' },
    testSecret,
    { expiresIn: '1h' }
  );

  const coachToken = jwt.sign(
    { id: 'adm-coach', email: 'coach@uwe.lk', role: 'COACH', type: 'admin' },
    testSecret,
    { expiresIn: '1h' }
  );

  // ── 1. OpenAPI & Interactive Docs ──
  it('GET /api/docs/spec.json returns valid OpenAPI 3.0.3 schema', async () => {
    const res = await request(app).get('/api/docs/spec.json');
    expect(res.status).toBe(200);
    expect(res.body.openapi).toBe('3.0.3');
    expect(res.body.info.title).toContain('UWE');
    expect(res.body.paths).toHaveProperty('/health');
    expect(res.body.paths).toHaveProperty('/auth/login');
  });

  it('GET /api/docs serves HTML Swagger UI documentation interface', async () => {
    const res = await request(app).get('/api/docs');
    expect(res.status).toBe(200);
    expect(res.text).toContain('swagger-ui');
    expect(res.text).toContain('UWE Command Center API Docs');
  });

  // ── 2. Diagnostics & Server Telemetry ──
  it('GET /api/diagnostics returns memory usage and server uptime', async () => {
    const res = await request(app).get('/api/diagnostics');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('HEALTHY');
    expect(res.body).toHaveProperty('uptimeSeconds');
    expect(res.body).toHaveProperty('memoryMb');
  });

  // ── 3. Zod Input Validation ──
  it('POST /api/auth/register fails with 400 when invalid email is supplied', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Invalid Email User',
        email: 'not-a-valid-email',
        password: 'password123',
      });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Invalid email address');
  });

  it('POST /api/leads fails with 400 when name is too short', async () => {
    const res = await request(app)
      .post('/api/leads')
      .send({
        name: 'A',
        phone: '12345678',
      });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Name must be at least 2 characters');
  });

  let testStudentUser: any = null;

  beforeAll(async () => {
    const { prisma } = await import('../config/db');
    testStudentUser = await prisma.user.upsert({
      where: { email: 'phase7.student@uwe.lk' },
      update: { isEnrolled: true, tokenVersion: 1 },
      create: {
        email: 'phase7.student@uwe.lk',
        name: 'Phase 7 Student',
        passwordHash: '$2a$12$e6m37N3c7b/vMvj.P1rMre8yS9r5xR5.g9R5xR5.g9R5xR5.g9R5.',
        isEnrolled: true,
        tokenVersion: 1,
      },
    });
  });

  afterAll(async () => {
    const { prisma } = await import('../config/db');
    await prisma.user.deleteMany({ where: { email: 'phase7.student@uwe.lk' } });
  });

  // ── 4. Refresh Token & Silent Re-Auth ──
  it('POST /api/auth/refresh rejects missing token with 400', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/auth/refresh rotates token and rejects reused/replayed old refresh tokens', async () => {
    // 1. Generate active token pair via tokenService (with JTI in cache)
    const { generateTokenPair } = await import('../services/tokenService');
    const initialTokens = await generateTokenPair({
      id: testStudentUser.id,
      email: testStudentUser.email,
      type: 'student',
      tokenVersion: testStudentUser.tokenVersion,
    });

    // 2. First refresh should succeed and rotate the token
    const res1 = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: initialTokens.refreshToken });

    expect(res1.status).toBe(200);
    expect(res1.body.success).toBe(true);
    expect(res1.body.data.refreshToken).toBeDefined();
    expect(res1.body.data.refreshToken).not.toBe(initialTokens.refreshToken);

    // 3. Attempting to REUSE the old consumed refresh token (replay attack) must be rejected with 401
    const res2 = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: initialTokens.refreshToken });

    expect(res2.status).toBe(401);
    expect(res2.body.success).toBe(false);
    expect(res2.body.message).toContain('Revoked');
  }, 15000);

  it('POST /api/auth/revoke-all invalidates all active sessions for user', async () => {
    const { generateTokenPair } = await import('../services/tokenService');
    const activeTokens = await generateTokenPair({
      id: testStudentUser.id,
      email: testStudentUser.email,
      type: 'student',
      tokenVersion: testStudentUser.tokenVersion,
    });

    const revokeRes = await request(app)
      .post('/api/auth/revoke-all')
      .set('Authorization', `Bearer ${activeTokens.accessToken}`);

    expect(revokeRes.status).toBe(200);
    expect(revokeRes.body.success).toBe(true);

    // Any previous refresh token should now be rejected with 401
    const refreshRes = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: activeTokens.refreshToken });

    expect(refreshRes.status).toBe(401);
    expect(refreshRes.body.success).toBe(false);
  });

  // ── 5. Role-Based Access Control (RBAC) ──
  it('Staff deletion rejects RECRUITER role with 403 (SUPER_ADMIN/COMMANDER only)', async () => {
    const res = await request(app)
      .delete('/api/staff/some-staff-id')
      .set('Authorization', `Bearer ${recruiterToken}`);
    expect(res.status).toBe(403);
    expect(res.body.message).toContain('Insufficient clearance');
  });

  it('Recruiter can access CRM leads endpoint GET /api/leads', async () => {
    const res = await request(app)
      .get('/api/leads')
      .set('Authorization', `Bearer ${recruiterToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('Coach cannot modify course fees PUT /api/courses/:id', async () => {
    const res = await request(app)
      .put('/api/courses/some-course-id')
      .set('Authorization', `Bearer ${coachToken}`)
      .send({ price: 20000 });
    expect(res.status).toBe(403);
    expect(res.body.message).toContain('Insufficient clearance');
  });

  it('SUPER_ADMIN has universal clearance across all restricted endpoints', async () => {
    const res = await request(app)
      .get('/api/leads')
      .set('Authorization', `Bearer ${superAdminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
