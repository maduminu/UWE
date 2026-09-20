import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../index';
import { prisma } from '../config/db';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-minimum-32-chars-length!';

const adminToken = jwt.sign(
  { id: 'admin-qa-coach', email: 'coach@uwe.lk', role: 'SUPER_ADMIN', type: 'admin' },
  JWT_SECRET,
  { expiresIn: '1h' }
);

const studentToken = jwt.sign(
  { id: 'student-qa-sadun', email: 'sadun@uwe.lk', role: 'STUDENT', type: 'student' },
  JWT_SECRET,
  { expiresIn: '1h' }
);

describe('Mastermind Q&A: Reply Attribution & Coach Follow-Up Flow', () => {
  let testQuestionId: string;

  beforeAll(async () => {
    await prisma.$connect();

    // Ensure test admin exists
    await prisma.adminUser.upsert({
      where: { email: 'coach@uwe.lk' },
      update: { name: 'Commander Coach', role: 'SUPER_ADMIN' },
      create: {
        id: 'admin-qa-coach',
        name: 'Commander Coach',
        email: 'coach@uwe.lk',
        passwordHash: 'hash',
        role: 'SUPER_ADMIN',
      },
    });

    // Ensure test student user exists
    await prisma.user.upsert({
      where: { email: 'sadun@uwe.lk' },
      update: { name: 'Sadun Perera', rankTitle: 'ENROLLED OPERATIVE' },
      create: {
        id: 'student-qa-sadun',
        name: 'Sadun Perera',
        email: 'sadun@uwe.lk',
        passwordHash: 'hash',
        rankTitle: 'ENROLLED OPERATIVE',
      },
    });

    // Create a base question
    const q = await prisma.mastermindQuestion.create({
      data: {
        courseSlug: 'bmb',
        userId: 'student-qa-sadun',
        authorName: 'Sadun Perera',
        authorBadge: 'ENROLLED OPERATIVE',
        question: 'How do I maintain alpha brainwave state during high-ticket live negotiation?',
        drillTopic: 'Neuro-Anchoring Drills',
        isAnswered: false,
      },
    });
    testQuestionId = q.id;
  });

  it('1. Coach answers the student question -> isAnswered becomes true', async () => {
    const res = await request(app)
      .put(`/api/mastermind/questions/${testQuestionId}/answer`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        answer: 'Anchor your breathing to a 4-second box cycle before counter-offering.',
        answeredBy: 'Commander Coach',
      })
      .expect(200);

    expect(res.body.success).toBe(true);

    const updated = await prisma.mastermindQuestion.findUnique({ where: { id: testQuestionId } });
    expect(updated?.isAnswered).toBe(true);
    expect(updated?.answeredBy).toBe('Commander Coach');
  });

  it('2. Student sends a follow-up reply -> attributed to student and resets isAnswered to false for admin queue', async () => {
    const res = await request(app)
      .post(`/api/mastermind/questions/${testQuestionId}/replies`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        body: 'Thank you Commander! Should I do this box breathing before or during their speech?',
        asCoach: false,
        authorName: 'Sadun Perera',
        authorBadge: 'ENROLLED OPERATIVE',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('id');
    // Crucial check: must NOT be coach / Super Admin
    expect(res.body.data.isCoach).toBe(false);
    expect(res.body.data.authorName).toBe('Sadun Perera');
    expect(res.body.data.authorBadge).toBe('ENROLLED OPERATIVE');

    // Crucial check: question must now be marked isAnswered = false so it enters UNANSWERED admin queue
    const updated = await prisma.mastermindQuestion.findUnique({ where: { id: testQuestionId } });
    expect(updated?.isAnswered).toBe(false);
  });

  it('3. Public question feed returns question with replies intact and correctly tagged', async () => {
    const res = await request(app)
      .get('/api/mastermind/questions?courseSlug=bmb')
      .expect(200);

    expect(res.body.success).toBe(true);
    const target = res.body.data.find((q: any) => q.id === testQuestionId);
    expect(target).toBeDefined();
    expect(target.isAnswered).toBe(false);
    expect(target.replies.length).toBeGreaterThan(0);

    const latestReply = target.replies[target.replies.length - 1];
    expect(latestReply.isCoach).toBe(false);
    expect(latestReply.authorName).toBe('Sadun Perera');
  });

  it('4. Coach posts a thread reply -> attributed to Coach and marks isAnswered = true again', async () => {
    const res = await request(app)
      .post(`/api/mastermind/questions/${testQuestionId}/replies`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        body: 'Initiate 2 cycles immediately before you walk into the negotiation room.',
        asCoach: true,
        authorName: 'Commander Coach',
        authorBadge: 'COMMAND COUNCIL',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.isCoach).toBe(true);
    expect(res.body.data.authorName).toBe('Commander Coach');

    // Question is now answered again
    const updated = await prisma.mastermindQuestion.findUnique({ where: { id: testQuestionId } });
    expect(updated?.isAnswered).toBe(true);
    expect(updated?.answeredBy).toBe('Commander Coach');
  });
});
