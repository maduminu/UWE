import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../index';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../middlewares/authenticate';
import { generateCertificatePDF } from '../services/pdfService';

describe('Phase 9: Secure Content & High-Traffic Streaming Integration Tests', () => {
  const testSecret = getJwtSecret();
  const studentToken = jwt.sign(
    { id: 'student-unique-123', email: 'teststudent@uwe.lk', type: 'student' },
    testSecret,
    { expiresIn: '1h' }
  );

  // ── 1. Automated PDF Certificate Generator ──
  it('generateCertificatePDF creates a valid PDF binary buffer', async () => {
    const mockCert = {
      id: 'test-cert-uuid-1234',
      studentName: 'Kasun Bandara',
      courseSlug: 'bmb',
      courseTitle: 'BMB Mind Division Masterclass',
      certificateNo: 'UWE-BMB-2026-9999',
      issuedDate: new Date(),
      gradeScore: 'HONORS (DISTINCTION)',
      signatureBy: 'UWE COMMAND COUNCIL',
    };

    const pdfBuffer = await generateCertificatePDF(mockCert);
    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(1000);
    // PDF Magic Bytes: starts with %PDF-
    const header = pdfBuffer.slice(0, 5).toString('utf8');
    expect(header).toBe('%PDF-');
  });

  it('GET /api/certificates/download/:certId returns 404 for invalid cert ID', async () => {
    const res = await request(app).get('/api/certificates/download/non-existent-cert-999');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  // ── 2. Mastermind Live Q&A and Real-Time Polling ──
  it('GET /api/mastermind/questions returns live questions array and server timestamp', async () => {
    const res = await request(app).get('/api/mastermind/questions?courseSlug=bmb');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body).toHaveProperty('serverTime');
  });

  it('POST /api/mastermind/questions validates input and creates question', async () => {
    const res = await request(app)
      .post('/api/mastermind/questions')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        courseSlug: 'bmb',
        question: 'How do I maintain state control under high-stress negotiations?',
        drillTopic: 'Overthinking & State Control',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data.question).toContain('state control');
  });

  it('POST /api/mastermind/questions/:id/upvote enforces 1 vote per user (toggles upvote)', async () => {
    // 1. Create a question
    const createRes = await request(app)
      .post('/api/mastermind/questions')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        courseSlug: 'bmb',
        question: 'Testing upvote single-vote enforcement',
      });
    const qId = createRes.body.data.id;

    // 2. Upvote once by user-1
    const upvote1 = await request(app)
      .post(`/api/mastermind/questions/${qId}/upvote`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ userId: 'student-unique-123' });
    expect(upvote1.status).toBe(200);
    expect(upvote1.body.upvoted).toBe(true);
    expect(upvote1.body.upvotes).toBe(1);

    // 3. Second click by same user-1 should toggle off (decrement back to 0), not increment to 2
    const upvote2 = await request(app)
      .post(`/api/mastermind/questions/${qId}/upvote`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ userId: 'student-unique-123' });
    expect(upvote2.status).toBe(200);
    expect(upvote2.body.upvoted).toBe(false);
    expect(upvote2.body.upvotes).toBe(0);
  });
});

