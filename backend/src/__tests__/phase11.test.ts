import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../index';
import { prisma } from '../config/db';
import { calculateRank } from '../controllers/gamificationController';
import { getJwtSecret } from '../middlewares/authenticate';
import jwt from 'jsonwebtoken';

describe('Phase 11: Growth & Student Retention Tools Integration Tests', () => {
  const JWT_SECRET = getJwtSecret();
  let adminToken: string;
  let studentToken: string;
  let testUserId: string;
  let testLeadId: string;

  beforeAll(async () => {
    // Generate valid admin token
    adminToken = jwt.sign(
      { id: 'admin-phase11-test', email: 'admin@uwe.lk', role: 'SUPER_ADMIN', type: 'admin' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Create or find a test student user with isolated email
    const uniqueEmail = `phase11.student.${Date.now()}@uwe.lk`;
    const user = await prisma.user.create({
      data: {
        name: 'Test Operative Phase11',
        email: uniqueEmail,
        passwordHash: 'password123',
        enrolledCourseSlugs: 'bmb,leadership',
        xp: 100,
        streakDays: 2,
        rankTitle: 'Novice Operative',
      },
    });
    testUserId = user.id;

    studentToken = jwt.sign(
      { id: user.id, email: user.email, name: user.name, type: 'student' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Create a test lead
    const lead = await prisma.lead.create({
      data: {
        name: 'Abandoned Prospect Test',
        phone: '0779988776',
        email: `abandoned.${Date.now()}@test.com`,
        courseSlug: 'bmb',
        status: 'NEW',
      },
    });
    testLeadId = lead.id;
  });

  afterAll(async () => {
    // Clean up test records
    try {
      if (testUserId) await prisma.user.deleteMany({ where: { id: testUserId } });
      if (testLeadId) await prisma.lead.deleteMany({ where: { id: testLeadId } });
    } catch {
      /* ignore cleanup errors */
    }
  });

  // ── 1. Abandoned Slip Detection & Reminders ──
  it('GET /api/leads calculates abandoned status and returns abandoned count', async () => {
    const res = await request(app)
      .get('/api/leads')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(typeof res.body.abandonedCount).toBe('number');
  });

  it('POST /api/leads/:id/abandoned-reminder logs follow-up and updates status', async () => {
    const res = await request(app)
      .post(`/api/leads/${testLeadId}/abandoned-reminder`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('CONTACTED');
    expect(res.body.data.lastReminderSentAt).toBeDefined();
  });

  // ── 2. Tactical Rank & Gamification Progression ──
  it('calculateRank assigns correct tier titles and progress percentages', () => {
    expect(calculateRank(50).rankTitle).toBe('Novice Operative');
    expect(calculateRank(200).rankTitle).toBe('Tactical Specialist');
    expect(calculateRank(500).rankTitle).toBe('Elite Vanguard');
    expect(calculateRank(900).rankTitle).toBe('Tier-1 Commander');
  });

  it('GET /api/gamification/leaderboard returns ranked operatives', async () => {
    const res = await request(app).get('/api/gamification/leaderboard');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    if (res.body.data.length > 0) {
      expect(res.body.data[0].standing).toBe(1);
      expect(res.body.data[0].operativeId).toContain('#UWE-OP-');
      expect(res.body.data[0].rankTitle).toBeDefined();
    }
  });

  it('GET /api/gamification/profile/:userId returns student XP progress dossier', async () => {
    const res = await request(app).get(`/api/gamification/profile/${testUserId}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.operativeId).toBeDefined();
    expect(res.body.data.rankInfo).toBeDefined();
    expect(Array.isArray(res.body.data.badges)).toBe(true);
  });

  it('POST /api/gamification/award-xp adds XP and upgrades student rank', async () => {
    const res = await request(app)
      .post('/api/gamification/award-xp')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        userId: testUserId,
        actionType: 'DRILL_COMPLETED',
        xpAmount: 100,
        badgeId: 'NEURO_ARCHITECT',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.xpAwarded).toBe(100);
    expect(res.body.data.xp).toBeGreaterThanOrEqual(200);
    expect(res.body.data.badges).toContain('NEURO_ARCHITECT');
  });

  // ── 3. Multi-Coach Cohort Assignment ──
  it('PUT /api/users/:id/assign-coach successfully assigns a coach to a student', async () => {
    const res = await request(app)
      .put(`/api/users/${testUserId}/assign-coach`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        assignedCoachId: 'coach-janith-01',
        assignedCoachName: 'Commander Janith Perera',
        cohortTag: 'BRAVO-COHORT-2026',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.assignedCoachName).toBe('Commander Janith Perera');
    expect(res.body.data.cohortTag).toBe('BRAVO-COHORT-2026');
  });
});
