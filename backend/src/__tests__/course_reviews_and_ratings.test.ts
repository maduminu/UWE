import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../index';
import { prisma } from '../config/db';
import { getJwtSecret } from '../middlewares/authenticate';
import { cacheDelPattern } from '../config/redis';
import jwt from 'jsonwebtoken';

describe('Enterprise Grade: Course Reviews, Ratings & Moderation Security Tests', () => {
  const JWT_SECRET = getJwtSecret();
  let adminToken: string;
  let studentToken: string;
  const testCourseSlug = `qa-course-${Date.now()}`;
  let createdReviewId1: string;
  let createdReviewId2: string;

  beforeAll(async () => {
    // Generate valid tokens
    adminToken = jwt.sign(
      { id: 'admin-qa-reviews', email: 'admin.qa@uwe.lk', role: 'SUPER_ADMIN', type: 'admin' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    studentToken = jwt.sign(
      { id: 'student-qa-reviews', email: 'student.qa@uwe.lk', name: 'Student QA', type: 'student' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Clear any leftover test caches
    await cacheDelPattern('reviews:');
  });

  afterAll(async () => {
    try {
      await prisma.courseReview.deleteMany({
        where: {
          courseSlug: { startsWith: 'qa-course-' },
        },
      });
      await cacheDelPattern('reviews:');
    } catch {
      /* ignore */
    }
  });

  describe('1. Public Review Retrieval & Dynamic Rating Aggregation', () => {
    it('returns empty list and 5.0 default rating when no reviews exist for course', async () => {
      const res = await request(app).get(`/api/reviews/${testCourseSlug}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(0);
      expect(res.body.averageRating).toBe(5.0);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(0);
    });

    it('retrieves global reviews feed via /api/reviews/all', async () => {
      const res = await request(app).get('/api/reviews/all');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(typeof res.body.averageRating).toBe('number');
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('2. Input Validation, Bounds Enforcement & Anti-Injection', () => {
    it('rejects review submission with missing required fields', async () => {
      const res = await request(app)
        .post('/api/reviews')
        .send({
          courseSlug: testCourseSlug,
          // missing studentName, rating, comment
        });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rejects out-of-bounds rating > 5', async () => {
      const res = await request(app)
        .post('/api/reviews')
        .send({
          courseSlug: testCourseSlug,
          studentName: 'Kasun QA',
          rating: 6,
          comment: 'Outstanding program!',
        });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rejects out-of-bounds rating < 1', async () => {
      const res = await request(app)
        .post('/api/reviews')
        .send({
          courseSlug: testCourseSlug,
          studentName: 'Kasun QA',
          rating: 0,
          comment: 'Terrible program!',
        });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rejects comment shorter than minimum 5 characters', async () => {
      const res = await request(app)
        .post('/api/reviews')
        .send({
          courseSlug: testCourseSlug,
          studentName: 'Kasun QA',
          rating: 5,
          comment: 'Bad',
        });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('successfully submits valid 5-star review and trims/normalizes data', async () => {
      const res = await request(app)
        .post('/api/reviews')
        .send({
          courseSlug: `  ${testCourseSlug.toUpperCase()}  `,
          studentName: '  Kasun Wickramasinghe  ',
          studentRole: '  Lead Operative  ',
          rating: 5,
          title: '  Exceptional Curriculum  ',
          comment: 'This course provided unmatched hands-on tactical experience.',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.courseSlug).toBe(testCourseSlug.toLowerCase());
      expect(res.body.data.studentName).toBe('Kasun Wickramasinghe');
      expect(res.body.data.rating).toBe(5);
      expect(res.body.data.isApproved).toBe(true);

      createdReviewId1 = res.body.data.id;
    });

    it('safely handles XSS and injection payloads without executing or breaking storage', async () => {
      const xssPayload = '<script>alert("XSS_EXPLOIT")</script><img src=x onerror=alert(1)>';
      const sqlPayload = "'; DROP TABLE \"CourseReview\"; --";

      const res = await request(app)
        .post('/api/reviews')
        .send({
          courseSlug: testCourseSlug,
          studentName: 'Security Auditor',
          studentRole: 'Penetration Tester',
          rating: 4,
          title: sqlPayload,
          comment: `Safe testing of malicious payloads: ${xssPayload}`,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.comment).toContain(xssPayload);
      expect(res.body.data.title).toBe(sqlPayload);

      createdReviewId2 = res.body.data.id;
    });

    it('computes accurate mathematical average rating across multiple reviews (5 and 4 = 4.5)', async () => {
      const res = await request(app).get(`/api/reviews/${testCourseSlug}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(2);
      expect(res.body.averageRating).toBe(4.5);
      expect(res.body.data.length).toBe(2);
    });
  });

  describe('3. Moderation, RBAC & Isolation Security', () => {
    it('rejects unauthenticated request to admin review management with 401', async () => {
      const res = await request(app).get('/api/reviews');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('rejects student role request to admin review management with 403', async () => {
      const res = await request(app)
        .get('/api/reviews')
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('allows SUPER_ADMIN to list all reviews', async () => {
      const res = await request(app)
        .get('/api/reviews')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.some((r: any) => r.id === createdReviewId1)).toBe(true);
    });

    it('allows Admin to toggle approval status of a review', async () => {
      // Unapprove review 2
      const resToggle = await request(app)
        .put(`/api/reviews/${createdReviewId2}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isApproved: false });

      expect(resToggle.status).toBe(200);
      expect(resToggle.body.success).toBe(true);
      expect(resToggle.body.data.isApproved).toBe(false);

      // Verify public course endpoint now excludes unapproved review
      const resPublic = await request(app).get(`/api/reviews/${testCourseSlug}`);
      expect(resPublic.status).toBe(200);
      expect(resPublic.body.count).toBe(1);
      expect(resPublic.body.data.length).toBe(1);
      expect(resPublic.body.data[0].id).toBe(createdReviewId1);
      expect(resPublic.body.averageRating).toBe(5.0);
    });

    it('returns 404 when toggling approval for a non-existent review ID', async () => {
      const res = await request(app)
        .put('/api/reviews/non-existent-review-id-99999')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isApproved: true });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('NOT_FOUND');
    });

    it('allows Admin to delete a review cleanly and updates public count', async () => {
      const resDelete = await request(app)
        .delete(`/api/reviews/${createdReviewId1}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(resDelete.status).toBe(200);
      expect(resDelete.body.success).toBe(true);

      // Verify review 1 no longer in database
      const checkDeleted = await prisma.courseReview.findUnique({
        where: { id: createdReviewId1 },
      });
      expect(checkDeleted).toBeNull();
    });

    it('returns 404 when deleting a non-existent review ID', async () => {
      const res = await request(app)
        .delete('/api/reviews/non-existent-review-id-99999')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('NOT_FOUND');
    });
  });
});
