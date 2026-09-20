import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../index';
import { prisma } from '../config/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../middlewares/authenticate';
import { generateTokenPair } from '../services/tokenService';

const TEST_RUN = Date.now();

describe('SEC-1: Token Revocation, Fail-Closed & HttpOnly Cookie Integration Tests', () => {
  const secret = getJwtSecret();
  let superAdminToken: string;
  let targetAdmin: any;
  let testStudent: any;

  beforeAll(async () => {
    // 1. Create Super Admin for role modifications
    superAdminToken = jwt.sign(
      {
        id: `super-admin-${TEST_RUN}`,
        email: `super.admin.${TEST_RUN}@uwe.lk`,
        role: 'SUPER_ADMIN',
        type: 'admin',
        tokenVersion: 1,
      },
      secret,
      { expiresIn: '1h' }
    );

    // 2. Create Target Admin (COMMANDER)
    const passwordHash = await bcrypt.hash('TacticalPassword123!', 12);
    targetAdmin = await prisma.adminUser.create({
      data: {
        email: `commander.sec1.${TEST_RUN}@uwe.lk`,
        name: 'Target Commander',
        role: 'COMMANDER',
        passwordHash,
        tokenVersion: 1,
      },
    });

    // 3. Create Student Operative
    testStudent = await prisma.user.create({
      data: {
        email: `student.sec1.${TEST_RUN}@uwe.lk`,
        name: 'Student Sec1',
        phone: '+94711112233',
        passwordHash,
        isEnrolled: true,
        enrolledCourseSlugs: 'bmb,leadership',
        tokenVersion: 1,
      },
    });
  });

  afterAll(async () => {
    try {
      if (targetAdmin?.id) {
        await prisma.refreshToken.deleteMany({ where: { userId: targetAdmin.id } });
        await prisma.adminUser.deleteMany({ where: { id: targetAdmin.id } });
      }
      if (testStudent?.id) {
        await prisma.refreshToken.deleteMany({ where: { userId: testStudent.id } });
        await prisma.user.deleteMany({ where: { id: testStudent.id } });
      }
    } catch {
      /* ignore cleanup errors */
    }
  });

  // ── 1. HttpOnly, Secure Cookie Issuance & Silent Refresh Flow ─────────────

  it('Student login sets HttpOnly refreshToken cookie with strict path /api/auth', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testStudent.email,
        password: 'TacticalPassword123!',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();

    // Verify Set-Cookie header contains refreshToken with HttpOnly and Path=/api/auth
    const cookies = res.headers['set-cookie'] as unknown as string[] | undefined;
    expect(cookies).toBeDefined();
    const refreshCookie = cookies?.find((c) => c.startsWith('refreshToken='));
    expect(refreshCookie).toBeDefined();
    expect(refreshCookie).toContain('HttpOnly');
    expect(refreshCookie).toContain('Path=/api/auth');
  });

  it('POST /api/auth/refresh reads HttpOnly cookie and returns new rotated tokens + new cookie', async () => {
    // 1. Generate active token pair
    const tokens = await generateTokenPair({
      id: testStudent.id,
      email: testStudent.email,
      type: 'student',
      tokenVersion: 1,
    });

    // 2. Call refresh sending cookie without body
    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', [`refreshToken=${tokens.refreshToken}`])
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    expect(res.body.data.refreshToken).not.toBe(tokens.refreshToken);

    // Verify response Set-Cookie contains rotated token
    const cookies = res.headers['set-cookie'] as unknown as string[] | undefined;
    expect(cookies).toBeDefined();
    const newCookie = cookies?.find((c) => c.startsWith('refreshToken='));
    expect(newCookie).toBeDefined();
    expect(newCookie).toContain('HttpOnly');
  });

  it('POST /api/auth/logout clears HttpOnly refreshToken cookie', async () => {
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', ['refreshToken=some-token'])
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const cookies = res.headers['set-cookie'] as unknown as string[] | undefined;
    expect(cookies).toBeDefined();
    // Expiration date in the past to clear cookie
    const clearedCookie = cookies?.find((c) => c.startsWith('refreshToken=;'));
    expect(clearedCookie).toBeDefined();
  });

  // ── 2. Explicit Token Revocation on Admin Role Change ──────────────────────

  it('PUT /api/auth/admins/:id/role updates role AND immediately invalidates active sessions', async () => {
    // 1. Generate active tokens for target admin while they are COMMANDER
    const activeTokens = await generateTokenPair({
      id: targetAdmin.id,
      email: targetAdmin.email,
      role: 'COMMANDER',
      type: 'admin',
      tokenVersion: 1,
    });

    // 2. Super Admin demotes target admin from COMMANDER to RECRUITER
    const roleChangeRes = await request(app)
      .put(`/api/auth/admins/${targetAdmin.id}/role`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ role: 'RECRUITER' });

    expect(roleChangeRes.status).toBe(200);
    expect(roleChangeRes.body.success).toBe(true);
    expect(roleChangeRes.body.data.role).toBe('RECRUITER');
    expect(roleChangeRes.body.message).toContain('All active sessions have been revoked');

    // Verify tokenVersion in DB was incremented
    const updatedAdminDb = await prisma.adminUser.findUnique({ where: { id: targetAdmin.id } });
    expect(updatedAdminDb?.role).toBe('RECRUITER');
    expect(updatedAdminDb?.tokenVersion).toBe(2);

    // 3. Attempting to refresh with previous refresh token MUST be rejected with 401
    const refreshRes = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', [`refreshToken=${activeTokens.refreshToken}`])
      .send({});

    expect(refreshRes.status).toBe(401);
    expect(refreshRes.body.success).toBe(false);
    expect(refreshRes.body.message).toContain('Revoked');
  }, 15000);

  it('PUT /api/auth/admins/:id/role is rejected with 403 for non-SUPER_ADMIN users', async () => {
    const coachToken = jwt.sign(
      { id: 'coach-1', email: 'coach@uwe.lk', role: 'COACH', type: 'admin', tokenVersion: 1 },
      secret,
      { expiresIn: '1h' }
    );

    const res = await request(app)
      .put(`/api/auth/admins/${targetAdmin.id}/role`)
      .set('Authorization', `Bearer ${coachToken}`)
      .send({ role: 'COMMANDER' });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});
