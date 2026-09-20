import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../index';
import { prisma } from '../config/db';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-minimum-32-chars-length!';

const adminToken = jwt.sign(
  { id: 'admin-test-id', email: 'admin@uwe.test', role: 'SUPER_ADMIN', type: 'admin' },
  JWT_SECRET,
  { expiresIn: '1h' }
);

const studentToken = jwt.sign(
  { id: 'student-test-id', email: 'student@uwe.test', role: 'STUDENT', type: 'student' },
  JWT_SECRET,
  { expiresIn: '1h' }
);

describe('Social Proof & Collaborative Business Partners API', () => {
  beforeAll(async () => {
    // Ensure database connection
    await prisma.$connect();
  });

  describe('1. Top 5-Star Testimonials API', () => {
    it('GET /api/reviews/testimonials/top returns 200 and public list of 5-star reviews', async () => {
      const res = await request(app)
        .get('/api/reviews/testimonials/top')
        .expect(200);

      expect(res.body).toHaveProperty('success', true);
      expect(Array.isArray(res.body.data)).toBe(true);
      if (res.body.data.length > 0) {
        expect(res.body.data[0].rating).toBe(5);
        expect(res.body.data[0].isApproved).toBe(true);
      }
    });
  });

  describe('2. Collaborative Business Partners Public API', () => {
    it('GET /api/partners returns 200 and automatically seeds default partners if empty', async () => {
      const res = await request(app)
        .get('/api/partners')
        .expect(200);

      expect(res.body).toHaveProperty('success', true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0]).toHaveProperty('name');
      expect(res.body.data[0]).toHaveProperty('companyName');
      expect(res.body.data[0]).toHaveProperty('courseSlug');
    });

    it('GET /api/partners?courseSlug=bmb filters by directive', async () => {
      const res = await request(app)
        .get('/api/partners?courseSlug=bmb')
        .expect(200);

      expect(res.body).toHaveProperty('success', true);
      res.body.data.forEach((p: any) => {
        expect(p.courseSlug.toLowerCase()).toBe('bmb');
      });
    });

    it('GET /api/partners?isFeatured=true filters featured alliance leaders', async () => {
      const res = await request(app)
        .get('/api/partners?isFeatured=true')
        .expect(200);

      expect(res.body).toHaveProperty('success', true);
      res.body.data.forEach((p: any) => {
        expect(p.isFeatured).toBe(true);
      });
    });

    it('GET /api/partners/:id returns single partner dossier or 404', async () => {
      const listRes = await request(app).get('/api/partners').expect(200);
      const firstPartner = listRes.body.data[0];

      const detailRes = await request(app)
        .get(`/api/partners/${firstPartner.id}`)
        .expect(200);

      expect(detailRes.body).toHaveProperty('success', true);
      expect(detailRes.body.data.id).toBe(firstPartner.id);
      expect(detailRes.body.data.name).toBe(firstPartner.name);

      await request(app)
        .get('/api/partners/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });
  });

  describe('3. Admin RBAC & Partner Lifecycle', () => {
    let createdPartnerId: string;

    it('rejects partner creation without admin token (401)', async () => {
      await request(app)
        .post('/api/partners')
        .send({
          name: 'Unauthorized User',
          title: 'Founder',
          companyName: 'No Auth Corp',
          bio: 'Test bio',
          courseSlug: 'bmb',
        })
        .expect(401);
    });

    it('rejects partner creation by student role (403)', async () => {
      await request(app)
        .post('/api/partners')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          name: 'Student Partner',
          title: 'Founder',
          companyName: 'Student Corp',
          bio: 'Test bio',
          courseSlug: 'bmb',
        })
        .expect(403);
    });

    it('allows SUPER_ADMIN to create a new partner dossier', async () => {
      const res = await request(app)
        .post('/api/partners')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Automated Test Operative',
          title: 'Executive Director',
          companyName: 'Quantum Paradigm Ltd',
          companyType: 'AI Systems',
          industry: 'DeepTech',
          bio: 'Automated test operative created during security verification.',
          courseSlug: 'ignit',
          cohort: 'IGNIT Cohort 7 / 2025',
          isFeatured: true,
          metrics: JSON.stringify({ valuation: '$10M', revenue: '$2.5M' }),
          testimonial: 'UWE protocols redefined our executive strategy.',
        })
        .expect(201);

      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.name).toBe('Automated Test Operative');
      createdPartnerId = res.body.data.id;
    });

    it('allows SUPER_ADMIN to update the partner dossier', async () => {
      const res = await request(app)
        .put(`/api/partners/${createdPartnerId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Senior Managing Director',
          isFeatured: false,
        })
        .expect(200);

      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data.title).toBe('Senior Managing Director');
      expect(res.body.data.isFeatured).toBe(false);
    });

    it('allows SUPER_ADMIN to delete the partner dossier', async () => {
      await request(app)
        .delete(`/api/partners/${createdPartnerId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      await request(app)
        .get(`/api/partners/${createdPartnerId}`)
        .expect(404);
    });
  });
});
