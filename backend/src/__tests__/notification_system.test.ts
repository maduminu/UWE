import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../index';
import { prisma } from '../config/db';
import { getJwtSecret } from '../middlewares/authenticate';
import { createNotificationHelper } from '../controllers/notificationController';

describe('Enterprise Grade: Realtime Notification System Tests', () => {
  const testStudentId = `student-notif-${Date.now()}`;
  const otherStudentId = `student-other-${Date.now()}`;
  const testCourseSlug = `notif-course-${Date.now()}`;
  let studentToken: string;
  let adminToken: string;

  beforeAll(async () => {
    const secret = getJwtSecret();

    studentToken = jwt.sign(
      { id: testStudentId, email: 'student@uwe.lk', role: 'STUDENT', type: 'student' },
      secret,
      { algorithm: 'HS256', expiresIn: '1h' }
    );

    adminToken = jwt.sign(
      { id: 'admin-super-id', email: 'admin@uwe.lk', role: 'SUPER_ADMIN', type: 'admin' },
      secret,
      { algorithm: 'HS256', expiresIn: '1h' }
    );

    // Create test course
    await prisma.course.create({
      data: {
        slug: testCourseSlug,
        title: 'Tactical Notifications Directive',
        subtitle: 'Automated Realtime Push',
        price: 25000,
        badge: 'TACTICAL',
        category: 'MIND',
        description: 'Test course for realtime notifications',
        duration: '3 Days',
      },
    });
  });

  afterAll(async () => {
    try {
      await prisma.notification.deleteMany({
        where: {
          OR: [
            { userId: testStudentId },
            { userId: otherStudentId },
            { title: { contains: 'Tactical' } },
            { link: { contains: testCourseSlug } },
            { message: { contains: testCourseSlug } },
            { message: { contains: 'Tactical Notifications Directive' } },
          ],
        },
      });
      await prisma.courseBatch.deleteMany({
        where: { course: { slug: testCourseSlug } },
      });
      await prisma.courseReview.deleteMany({
        where: { courseSlug: testCourseSlug },
      });
      await prisma.mastermindQuestion.deleteMany({
        where: { courseSlug: testCourseSlug },
      });
      await prisma.course.deleteMany({
        where: { slug: testCourseSlug },
      });
    } catch {
      /* ignore cleanup error */
    }
  });

  describe('1. Direct Notification Creation & Retrieval', () => {
    it('creates targeted and global notifications using helper', async () => {
      const targeted = await createNotificationHelper({
        userId: testStudentId,
        title: 'Targeted Operative Briefing',
        message: 'Your personal mission files are ready.',
        link: '/dashboard',
        type: 'MASTERMIND_ANSWER',
      });
      expect(targeted).not.toBeNull();
      expect(targeted?.userId).toBe(testStudentId);
      expect(targeted?.isRead).toBe(false);

      const globalBroadcast = await createNotificationHelper({
        userId: null,
        title: 'Tactical Global Broadcast',
        message: 'Command Council has issued a global announcement.',
        link: '/programs',
        type: 'COHORT_SESSION',
      });
      expect(globalBroadcast).not.toBeNull();
      expect(globalBroadcast?.userId).toBeNull();
    });

    it('retrieves notifications for student (targeted + global broadcasts)', async () => {
      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.unreadCount).toBeGreaterThanOrEqual(2);
      expect(Array.isArray(res.body.data)).toBe(true);

      const titles = res.body.data.map((n: any) => n.title);
      expect(titles).toContain('Targeted Operative Briefing');
      expect(titles).toContain('Tactical Global Broadcast');
    });

    it('does NOT leak targeted notifications of other students', async () => {
      // Create notification for other student
      await createNotificationHelper({
        userId: otherStudentId,
        title: 'Classified For Other Operative',
        message: 'Top secret intel.',
        type: 'MASTERMIND_ANSWER',
      });

      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      const titles = res.body.data.map((n: any) => n.title);
      expect(titles).not.toContain('Classified For Other Operative');
    });
  });

  describe('2. Read Status Transitions', () => {
    it('marks a single notification as read and decrements unread count', async () => {
      const notif = await createNotificationHelper({
        userId: testStudentId,
        title: 'Test Mark Read Item',
        message: 'Testing single item mark as read.',
      });

      const readRes = await request(app)
        .put(`/api/notifications/${notif?.id}/read`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(readRes.status).toBe(200);
      expect(readRes.body.success).toBe(true);
      expect(readRes.body.data.isRead).toBe(true);
    });

    it('marks all unread notifications as read via read-all endpoint', async () => {
      const readAllRes = await request(app)
        .put('/api/notifications/read-all')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(readAllRes.status).toBe(200);
      expect(readAllRes.body.success).toBe(true);

      const checkRes = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(checkRes.status).toBe(200);
      expect(checkRes.body.unreadCount).toBe(0);
    });
  });

  describe('3. Trigger Integrations: Coach Answer, Review Approval, Cohort Schedule', () => {
    it('automatically generates notification when coach answers a mastermind question', async () => {
      // 1. Post a question as student
      const qRes = await request(app)
        .post('/api/mastermind/questions')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          courseSlug: testCourseSlug,
          question: 'How do neural directives link to live market execution?',
          drillTopic: 'Mind Architecture',
        });

      expect(qRes.status).toBe(201);
      const questionId = qRes.body.data.id;

      // 2. Answer question as Admin/Coach
      const answerRes = await request(app)
        .put(`/api/mastermind/questions/${questionId}/answer`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          answer: 'Direct neural anchors trigger subconscious execution automatically.',
          answeredBy: 'Commander Ruwan',
        });

      expect(answerRes.status).toBe(200);

      // 3. Verify student received notification
      const notifRes = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(notifRes.status).toBe(200);
      const answerNotif = notifRes.body.data.find((n: any) =>
        n.title.includes('Coach answered your question')
      );
      expect(answerNotif).toBeDefined();
      expect(answerNotif.type).toBe('MASTERMIND_ANSWER');
      expect(answerNotif.link).toContain(testCourseSlug);
    });

    it('automatically generates notification when admin approves a review', async () => {
      // 1. Submit review
      const revRes = await request(app)
        .post('/api/reviews')
        .send({
          courseSlug: testCourseSlug,
          studentName: 'Verified Operative Delta',
          rating: 5,
          comment: 'Outstanding clarity and mental transformation.',
          userId: testStudentId,
        });

      expect(revRes.status).toBe(201);
      const reviewId = revRes.body.data.id;

      // 2. Approve review as admin
      const approveRes = await request(app)
        .put(`/api/reviews/${reviewId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isApproved: true });

      expect(approveRes.status).toBe(200);

      // 3. Verify student received notification
      const notifRes = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(notifRes.status).toBe(200);
      const reviewNotif = notifRes.body.data.find(
        (n: any) => n.title === 'Your review has been verified and published'
      );
      expect(reviewNotif).toBeDefined();
      expect(reviewNotif.type).toBe('REVIEW_APPROVED');
    });

    it('automatically generates notification when admin creates a course batch (cohort session)', async () => {
      const batchRes = await request(app)
        .post('/api/courses/batches')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          courseSlug: testCourseSlug,
          batchNumber: 7,
          scheduleText: 'Live Zoom Cohort: Saturday 8:30 PM',
          totalSeats: 25,
          availableSeats: 25,
        });

      expect(batchRes.status).toBe(201);

      // Verify student received cohort scheduled notification
      const notifRes = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(notifRes.status).toBe(200);
      const cohortNotif = notifRes.body.data.find(
        (n: any) => n.title === 'New cohort session scheduled'
      );
      expect(cohortNotif).toBeDefined();
      expect(cohortNotif.type).toBe('COHORT_SESSION');
      expect(cohortNotif.message).toContain('Batch #7');
    });
  });
});
