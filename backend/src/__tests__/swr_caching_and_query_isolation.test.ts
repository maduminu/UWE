import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../index';
import { prisma } from '../config/db';
import { getJwtSecret } from '../middlewares/authenticate';
import {
  buildCanonicalCacheKey,
  cacheGetOrSWR,
  cacheSetSWR,
  cacheDelPattern,
  cacheFlush,
} from '../config/redis';
import jwt from 'jsonwebtoken';

describe('Enterprise Grade: Hybrid SWR Caching & Query Parameter Isolation Tests', () => {
  const JWT_SECRET = getJwtSecret();
  let studentToken: string;
  let adminToken: string;
  const testCourseSlug = `swr-course-${Date.now()}`;

  beforeAll(async () => {
    studentToken = jwt.sign(
      { id: 'student-swr-test', email: 'student.swr@uwe.lk', name: 'SWR Operative', type: 'student' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    adminToken = jwt.sign(
      { id: 'admin-swr-test', email: 'admin.swr@uwe.lk', role: 'SUPER_ADMIN', type: 'admin' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    await cacheFlush();
  });

  afterAll(async () => {
    try {
      await prisma.courseReview.deleteMany({
        where: { courseSlug: { startsWith: 'swr-course-' } },
      });
      await prisma.mastermindQuestion.deleteMany({
        where: { courseSlug: { startsWith: 'swr-course-' } },
      });
      await cacheFlush();
    } catch {
      /* ignore */
    }
  });

  describe('1. Canonical Cache Key Builder Unit Verification', () => {
    it('produces deterministic key regardless of query parameter insertion order', () => {
      const key1 = buildCanonicalCacheKey('reviews', 'bmb', { page: 1, limit: 20, rating: 5 });
      const key2 = buildCanonicalCacheKey('reviews', 'bmb', { rating: 5, limit: 20, page: 1 });
      expect(key1).toBe(key2);
      expect(key1).toBe('reviews:bmb?limit=20&page=1&rating=5');
    });

    it('ignores undefined, null, and empty string parameters', () => {
      const key = buildCanonicalCacheKey('reviews', 'bmb', {
        page: 1,
        limit: undefined,
        rating: null,
        empty: '',
      });
      expect(key).toBe('reviews:bmb?page=1');
    });

    it('normalizes identifiers to lower case', () => {
      const key = buildCanonicalCacheKey('REVIEWS', 'BMB');
      expect(key).toBe('reviews:bmb');
    });

    it('generates distinct keys for different filter parameters (preventing cache bleed)', () => {
      const keyRating5 = buildCanonicalCacheKey('reviews', 'bmb', { rating: 5 });
      const keyRating4 = buildCanonicalCacheKey('reviews', 'bmb', { rating: 4 });
      expect(keyRating5).not.toBe(keyRating4);
    });
  });

  describe('2. SWR In-Memory & Redis Engine Mechanics', () => {
    it('returns fresh data on first fetch and sets cached=false', async () => {
      const testKey = `test:swr:fresh-${Date.now()}`;
      let callCount = 0;
      const fetcher = async () => {
        callCount++;
        return { message: 'hello world', count: callCount };
      };

      const result1 = await cacheGetOrSWR(testKey, fetcher, { freshTtlSeconds: 10, staleTtlSeconds: 60 });
      expect(result1.cached).toBe(false);
      expect(result1.stale).toBe(false);
      expect(result1.data.count).toBe(1);

      // Second call immediately should be fresh HIT
      const result2 = await cacheGetOrSWR(testKey, fetcher, { freshTtlSeconds: 10, staleTtlSeconds: 60 });
      expect(result2.cached).toBe(true);
      expect(result2.stale).toBe(false);
      expect(result2.data.count).toBe(1);
      expect(callCount).toBe(1); // Fetcher was NOT called again
    });

    it('serves stale data instantly and triggers background revalidation when freshTtl expires', async () => {
      const testKey = `test:swr:stale-${Date.now()}`;
      let callCount = 0;
      const fetcher = async () => {
        callCount++;
        return { count: callCount };
      };

      // Manually set an entry where freshUntil is in the past, but staleUntil is in the future
      const now = Date.now();
      await cacheSetSWR(testKey, { count: 1 }, -5, 60); // freshUntil is past 5 seconds ago

      // Should return stale: true immediately with count 1
      const result = await cacheGetOrSWR(testKey, fetcher, { freshTtlSeconds: 5, staleTtlSeconds: 60 });
      expect(result.cached).toBe(true);
      expect(result.stale).toBe(true);
      expect(result.data.count).toBe(1);

      // Wait 100ms for background revalidation promise to complete
      await new Promise((r) => setTimeout(r, 100));

      // Subsequent call should now have the newly revalidated count: 1 (from fetcher)
      const freshCheck = await cacheGetOrSWR(testKey, fetcher, { freshTtlSeconds: 5, staleTtlSeconds: 60 });
      expect(freshCheck.cached).toBe(true);
      expect(freshCheck.stale).toBe(false);
      expect(callCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('3. Integration: Course Reviews SWR & Query Isolation', () => {
    beforeAll(async () => {
      // Seed 2 reviews: one 5-star and one 4-star
      await prisma.courseReview.create({
        data: {
          courseSlug: testCourseSlug,
          studentName: 'Operative Alpha',
          rating: 5,
          comment: 'Outstanding 5-star strategic tactical training.',
          isVerified: true,
          isApproved: true,
        },
      });

      await prisma.courseReview.create({
        data: {
          courseSlug: testCourseSlug,
          studentName: 'Operative Beta',
          rating: 4,
          comment: 'Very solid 4-star directive execution.',
          isVerified: true,
          isApproved: true,
        },
      });

      await cacheDelPattern('reviews:');
    });

    it('serves uncached MISS on first load, then HIT on second load with X-Cache headers', async () => {
      const res1 = await request(app).get(`/api/reviews/${testCourseSlug}`);
      expect(res1.status).toBe(200);
      expect(res1.headers['x-cache']).toBe('MISS');
      expect(res1.body.cached).toBe(false);
      expect(res1.body.count).toBe(2);

      const res2 = await request(app).get(`/api/reviews/${testCourseSlug}`);
      expect(res2.status).toBe(200);
      expect(res2.headers['x-cache']).toBe('HIT');
      expect(res2.body.cached).toBe(true);
      expect(res2.body.stale).toBe(false);
    });

    it('isolates cache results by query parameters (?rating=5 vs ?rating=4)', async () => {
      const res5 = await request(app).get(`/api/reviews/${testCourseSlug}?rating=5`);
      expect(res5.status).toBe(200);
      expect(res5.body.count).toBe(1);
      expect(res5.body.data[0].rating).toBe(5);

      const res4 = await request(app).get(`/api/reviews/${testCourseSlug}?rating=4`);
      expect(res4.status).toBe(200);
      expect(res4.body.count).toBe(1);
      expect(res4.body.data[0].rating).toBe(4);

      // Verifies that fetching rating=5 did NOT poison the rating=4 cache!
      const res5Cached = await request(app).get(`/api/reviews/${testCourseSlug}?rating=5`);
      expect(res5Cached.headers['x-cache']).toBe('HIT');
      expect(res5Cached.body.data[0].rating).toBe(5);
    });

    it('invalidates all review caches (including all query param variants) upon submitting a new review', async () => {
      // Warm the cache
      await request(app).get(`/api/reviews/${testCourseSlug}`);

      // Submit a review
      const postRes = await request(app)
        .post('/api/reviews')
        .send({
          courseSlug: testCourseSlug,
          studentName: 'Operative Gamma',
          rating: 5,
          comment: 'New review that invalidates the SWR cache.',
        });

      expect(postRes.status).toBe(201);

      // Next GET request must be a MISS because cacheDelPattern cleared it
      const nextGet = await request(app).get(`/api/reviews/${testCourseSlug}`);
      expect(nextGet.headers['x-cache']).toBe('MISS');
      expect(nextGet.body.count).toBe(3);
    });
  });

  describe('4. Integration: Mastermind Questions SWR & Query Isolation', () => {
    it('serves mastermind questions with SWR caching and X-Cache headers', async () => {
      await cacheDelPattern('mastermind:');

      const res1 = await request(app).get(`/api/mastermind/questions?courseSlug=${testCourseSlug}`);
      expect(res1.status).toBe(200);
      expect(res1.headers['x-cache']).toBe('MISS');

      const res2 = await request(app).get(`/api/mastermind/questions?courseSlug=${testCourseSlug}`);
      expect(res2.status).toBe(200);
      expect(res2.headers['x-cache']).toBe('HIT');
      expect(res2.body.cached).toBe(true);
    });

    it('invalidates mastermind cache on new question creation', async () => {
      // Warm cache
      await request(app).get(`/api/mastermind/questions?courseSlug=${testCourseSlug}`);

      // Create new question
      const createRes = await request(app)
        .post('/api/mastermind/questions')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          courseSlug: testCourseSlug,
          question: 'How do we scale SWR cache across distributed nodes?',
          drillTopic: 'Tactical Scaling',
        });

      expect(createRes.status).toBe(201);

      // Subsequent GET should be a MISS with updated count
      const nextGet = await request(app).get(`/api/mastermind/questions?courseSlug=${testCourseSlug}`);
      expect(nextGet.headers['x-cache']).toBe('MISS');
      expect(nextGet.body.data.some((q: any) => q.question.includes('scale SWR cache'))).toBe(true);
    });
  });
});
