import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import app from '../index';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../middlewares/authenticate';
import { prisma } from '../config/db';

describe('UWE Security & Route Protection Integration Tests', () => {
  const testSecret = getJwtSecret();

  afterAll(async () => {
    try {
      await prisma.lead.deleteMany({
        where: {
          email: { in: ['testlead@example.com', 'testlead.auth@example.com'] },
        },
      });
    } catch {
      /* ignore */
    }
  });

  const studentToken = jwt.sign(
    { id: 'usr-student-001', email: 'student@uwe.lk', type: 'student' },
    testSecret,
    { expiresIn: '1h' }
  );

  const adminToken = jwt.sign(
    { id: 'usr-admin-001', email: 'admin@uwe.lk', role: 'COMMANDER', type: 'admin' },
    testSecret,
    { expiresIn: '1h' }
  );

  it('Public endpoint GET /api/health responds with status ONLINE', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ONLINE');
  });

  it('Public endpoint GET /api/courses is accessible without authentication', async () => {
    const res = await request(app).get('/api/courses');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('Privileged endpoint GET /api/users rejects missing token with 401', async () => {
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('Privileged endpoint GET /api/users rejects invalid token with 401', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', 'Bearer invalid_garbage_token');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('Privileged endpoint rejects token without Bearer prefix', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', adminToken);
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('Privileged endpoint rejects expired token with session expired message', async () => {
    const expiredToken = jwt.sign(
      { id: 'usr-admin-001', email: 'admin@uwe.lk', role: 'COMMANDER', type: 'admin' },
      testSecret,
      { expiresIn: '-1s' }
    );
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${expiredToken}`);
    expect(res.status).toBe(401);
    expect(res.body.message).toContain('Session Expired');
  });

  it('Admin mutation POST /api/courses rejects student tokens with 403 Forbidden', async () => {
    const res = await request(app)
      .post('/api/courses')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ title: 'Unauthorized Course', price: 9999 });
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('Admin endpoint GET /api/users accepts valid admin token', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('Admin endpoint GET /api/leads rejects unauthenticated access with 401', async () => {
    const res = await request(app).get('/api/leads');
    expect(res.status).toBe(401);
  });

  it('Public lead creation POST /api/leads is accessible without token', async () => {
    const res = await request(app)
      .post('/api/leads')
      .send({
        name: 'Test Lead Security',
        phone: `071999${Math.floor(1000 + Math.random() * 9000)}`,
        email: 'testlead.auth@example.com',
      });
    expect([200, 201]).toContain(res.status);
    expect(res.body.success).toBe(true);
  });

  it('Student cannot view another student progress (Ownership check returns 403)', async () => {
    const res = await request(app)
      .get('/api/progress/other-user-999')
      .set('Authorization', `Bearer ${studentToken}`);
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});
