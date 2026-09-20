import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../index';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../middlewares/authenticate';

describe('SEC-8: Error Leakage, Stable Error Codes & Request ID Tests', () => {
  const secret = getJwtSecret();

  it('401 Unauthorized response returns code UNAUTHORIZED and server-side requestId', async () => {
    const res = await request(app).get('/api/users');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('UNAUTHORIZED');
    expect(res.body.message).toBeDefined();
    expect(typeof res.body.requestId).toBe('string');
    expect(res.body.requestId.length).toBeGreaterThan(0);
    // X-Request-Id header must match body requestId
    expect(res.headers['x-request-id']).toBe(res.body.requestId);
  });

  it('403 Forbidden response returns code FORBIDDEN and requestId', async () => {
    const studentToken = jwt.sign(
      { id: 'student-test-sec8', email: 'operative@uwe.lk', type: 'student', tokenVersion: 1 },
      secret,
      { expiresIn: '1h' }
    );

    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('FORBIDDEN');
    expect(res.body.requestId).toBeDefined();
  });

  it('400 Validation Error response returns code VALIDATION_ERROR and structured errors', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'invalid-email', password: '12' }); // missing name, short password, bad email

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(res.body.requestId).toBeDefined();
    expect(Array.isArray(res.body.errors)).toBe(true);
    // Stack trace must NOT be leaked
    expect(res.body.stack).toBeUndefined();
  });

  it('404 Not Found returns code NOT_FOUND and does not leak database details', async () => {
    const res = await request(app).get('/api/courses/non-existent-course-slug-12345');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('NOT_FOUND');
    expect(res.body.requestId).toBeDefined();
    // Verify no raw sql or internal stack
    expect(res.body.message).not.toContain('prisma');
    expect(res.body.message).not.toContain('SQL');
    expect(res.body.stack).toBeUndefined();
  });

  it('Echoes client-provided X-Request-Id header across error response and body', async () => {
    const customRequestId = 'trace-client-sec8-998877';

    const res = await request(app)
      .get('/api/courses/some-missing-slug')
      .set('X-Request-Id', customRequestId);

    expect(res.headers['x-request-id']).toBe(customRequestId);
    expect(res.body.requestId).toBe(customRequestId);
  });
});
