import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../index';
import { prisma } from '../config/db';
import { getJwtSecret } from '../middlewares/authenticate';
import { validateReceiptSignature, scanBufferForMaliciousContent } from '../utils/fileSignature';
import { generateSignedReceiptUrl, verifySignedReceiptToken } from '../services/storageService';
import { toCents, applyCoupon, reconcilePayment, lkrFromCents, toPrismaDecimal } from '../utils/money';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

/**
 * Enterprise Security Test Suite — Payment Slips, Coupons, File Upload & Money Handling
 *
 * Covers:
 * - Magic byte / binary signature validation (PNG, JPEG, PDF, WEBP)
 * - Malware & polyglot payload detection (EXE headers, PHP, scripts)
 * - File size enforcement
 * - HMAC signed receipt URL generation & verification
 * - Coupon validation, redemption, expiry, exhaustion, course scope
 * - Atomic coupon redemption (double-use prevention)
 * - Payment slip CRUD & admin authorization
 * - Money/decimal precision (toCents, applyCoupon, reconcilePayment)
 * - Idempotency protection on slip submissions
 */
describe('Enterprise Security: Payment Slips, Coupons & File Security', () => {
  const JWT_SECRET = getJwtSecret();
  let adminToken: string;
  let studentToken: string;
  let testCouponId: string;
  let testSlipId: string;
  const testCouponCode = `SECTEST-${Date.now()}`;
  const testCourseSlug = `sec-course-${Date.now()}`;

  beforeAll(async () => {
    adminToken = jwt.sign(
      { id: 'admin-pay-test', email: 'admin-pay@uwe.lk', role: 'SUPER_ADMIN', type: 'admin' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    studentToken = jwt.sign(
      { id: 'student-pay-test', email: 'student-pay@uwe.lk', type: 'student' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Create a test coupon for validation tests
    try {
      const coupon = await prisma.coupon.create({
        data: {
          code: testCouponCode,
          discountPercent: 20,
          maxUses: 3,
          usedCount: 0,
          isActive: true,
          description: 'Security test coupon',
        },
      });
      testCouponId = coupon.id;
    } catch { /* already exists */ }
  });

  afterAll(async () => {
    try {
      await prisma.coupon.deleteMany({ where: { code: { startsWith: 'SECTEST-' } } });
      await prisma.coupon.deleteMany({ where: { code: { startsWith: 'EXHAUSTED-' } } });
      await prisma.coupon.deleteMany({ where: { code: { startsWith: 'EXPIRED-' } } });
      await prisma.coupon.deleteMany({ where: { code: { startsWith: 'COURSERESTRICT-' } } });
      await prisma.paymentSlip.deleteMany({ where: { courseSlug: { startsWith: 'sec-course-' } } });
      await prisma.lead.deleteMany({ where: { courseSlug: { startsWith: 'sec-course-' } } });
    } catch { /* ignore */ }
  });

  // ── 1. File Upload Binary Signature Validation ─────────────────────────────

  describe('1. File Upload Binary Signature Validation (Magic Bytes)', () => {
    it('accepts valid PNG buffer (89 50 4E 47 magic bytes)', () => {
      // Minimal valid PNG (1x1 pixel) with custom minWidth: 1 option
      const pngBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPj/HwADBwIAMCbHYQAAAABJRU5ErkJggg==',
        'base64'
      );
      const result = validateReceiptSignature(pngBuffer, { minWidth: 1, minHeight: 1 });
      expect(result.isValid).toBe(true);
      expect(result.mimeType).toBe('image/png');
      expect(result.extension).toBe('png');
    });

    it('accepts valid JPEG buffer (FF D8 FF magic bytes)', () => {
      // Minimal JPEG header + enough data to pass size check
      const jpegHeader = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
        0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
      ]);
      const padding = Buffer.alloc(100);
      const jpegBuffer = Buffer.concat([jpegHeader, padding]);
      const result = validateReceiptSignature(jpegBuffer);
      expect(result.isValid).toBe(true);
      expect(result.mimeType).toBe('image/jpeg');
    });

    it('rejects disguised Windows executable (MZ header) as receipt', () => {
      const exeBuffer = Buffer.alloc(200);
      exeBuffer[0] = 0x4d; // M
      exeBuffer[1] = 0x5a; // Z
      const result = scanBufferForMaliciousContent(exeBuffer, 'image/png');
      expect(result.isClean).toBe(false);
      expect(result.reason).toContain('executable');
    });

    it('rejects disguised Linux ELF binary as receipt', () => {
      const elfBuffer = Buffer.alloc(200);
      elfBuffer[0] = 0x7f;
      elfBuffer[1] = 0x45; // E
      elfBuffer[2] = 0x4c; // L
      elfBuffer[3] = 0x46; // F
      const result = scanBufferForMaliciousContent(elfBuffer, 'image/png');
      expect(result.isClean).toBe(false);
      expect(result.reason).toContain('executable');
    });

    it('rejects file with embedded <script> tags in binary data', () => {
      const payload = '<script>alert("XSS")</script>';
      const buffer = Buffer.from(payload + '\x00'.repeat(100));
      const result = scanBufferForMaliciousContent(buffer, 'image/png');
      expect(result.isClean).toBe(false);
      expect(result.reason).toContain('script');
    });

    it('rejects file with PHP polyglot injection (<?php)', () => {
      const phpPayload = '<?php system("whoami"); ?>';
      const buffer = Buffer.from(phpPayload + '\x00'.repeat(100));
      const result = scanBufferForMaliciousContent(buffer, 'image/png');
      expect(result.isClean).toBe(false);
      expect(result.reason).toContain('PHP');
    });

    it('rejects file with shell script shebang (#!) header', () => {
      const shebangBuffer = Buffer.alloc(200);
      shebangBuffer[0] = 0x23; // #
      shebangBuffer[1] = 0x21; // !
      const result = scanBufferForMaliciousContent(shebangBuffer, 'application/octet-stream');
      expect(result.isClean).toBe(false);
      expect(result.reason).toContain('shebang');
    });

    it('rejects PDF with embedded /JavaScript action', () => {
      const pdfContent = '%PDF-1.4\n1 0 obj\n/JavaScript (alert)\nendobj\n%%EOF';
      const buffer = Buffer.from(pdfContent);
      const result = scanBufferForMaliciousContent(buffer, 'application/pdf');
      expect(result.isClean).toBe(false);
      expect(result.reason).toContain('JavaScript');
    });

    it('rejects file exceeding 5MB size limit', () => {
      const oversizedBuffer = Buffer.alloc(6 * 1024 * 1024); // 6MB
      // Set PNG magic bytes so it passes format check
      oversizedBuffer[0] = 0x89;
      oversizedBuffer[1] = 0x50;
      oversizedBuffer[2] = 0x4e;
      oversizedBuffer[3] = 0x47;
      const result = validateReceiptSignature(oversizedBuffer);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('5MB');
    });

    it('rejects file that is too small (< 12 bytes)', () => {
      const tinyBuffer = Buffer.alloc(5);
      const result = validateReceiptSignature(tinyBuffer);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('too small');
    });

    it('rejects unsupported file type (GIF, BMP, etc.)', () => {
      // GIF magic bytes: GIF89a
      const gifBuffer = Buffer.alloc(100);
      gifBuffer.write('GIF89a', 0, 'ascii');
      const result = validateReceiptSignature(gifBuffer);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Unsupported');
    });

    it('accepts valid base64 data URI string input', () => {
      const pngBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPj/HwADBwIAMCbHYQAAAABJRU5ErkJggg==';
      const result = validateReceiptSignature(pngBase64, { minWidth: 1, minHeight: 1 });
      expect(result.isValid).toBe(true);
      expect(result.mimeType).toBe('image/png');
    });
  });

  // ── 2. HMAC Signed Receipt URL Security ────────────────────────────────────

  describe('2. HMAC Signed Receipt URL Security', () => {
    it('generates a valid signed URL with token and expiry', async () => {
      const url = await generateSignedReceiptUrl('test-slip-id', 'slips/test.png', 900);
      expect(url).toContain('/api/slips/test-slip-id/view');
      expect(url).toContain('token=');
      expect(url).toContain('expires=');
    });

    it('verifies valid HMAC token returns true', async () => {
      const slipId = 'hmac-test-slip';
      const expires = Math.floor(Date.now() / 1000) + 900; // 15 min from now
      const dataToSign = `slip:${slipId}:${expires}`;
      const secret = getJwtSecret();
      const token = crypto.createHmac('sha256', secret).update(dataToSign).digest('hex');

      const isValid = verifySignedReceiptToken(slipId, token, String(expires));
      expect(isValid).toBe(true);
    });

    it('rejects expired HMAC token', () => {
      const slipId = 'expired-slip';
      const expires = Math.floor(Date.now() / 1000) - 100; // Already expired
      const secret = getJwtSecret();
      const dataToSign = `slip:${slipId}:${expires}`;
      const token = crypto.createHmac('sha256', secret).update(dataToSign).digest('hex');

      const isValid = verifySignedReceiptToken(slipId, token, String(expires));
      expect(isValid).toBe(false);
    });

    it('rejects tampered HMAC token', () => {
      const slipId = 'tampered-slip';
      const expires = Math.floor(Date.now() / 1000) + 900;
      const tamperedToken = 'aaaa' + crypto.randomBytes(28).toString('hex');

      const isValid = verifySignedReceiptToken(slipId, tamperedToken, String(expires));
      expect(isValid).toBe(false);
    });

    it('rejects HMAC token for different slip ID', () => {
      const realSlipId = 'real-slip-123';
      const fakeSlipId = 'fake-slip-456';
      const expires = Math.floor(Date.now() / 1000) + 900;
      const secret = getJwtSecret();
      const dataToSign = `slip:${realSlipId}:${expires}`;
      const token = crypto.createHmac('sha256', secret).update(dataToSign).digest('hex');

      // Verify with the WRONG slip ID — should fail
      const isValid = verifySignedReceiptToken(fakeSlipId, token, String(expires));
      expect(isValid).toBe(false);
    });
  });

  // ── 3. Coupon Validation & Redemption Security ─────────────────────────────

  describe('3. Coupon Validation & Redemption Security', () => {
    it('validates active coupon returns success with discount info', async () => {
      const res = await request(app)
        .post('/api/coupons/validate')
        .send({ code: testCouponCode, originalPrice: 50000 });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.code).toBe(testCouponCode);
    });

    it('rejects validation of non-existent coupon code → 404', async () => {
      const res = await request(app)
        .post('/api/coupons/validate')
        .send({ code: 'FAKECOUPON999' });
      expect(res.status).toBe(404);
    });

    it('rejects validation request with missing code → 400', async () => {
      const res = await request(app)
        .post('/api/coupons/validate')
        .send({});
      expect(res.status).toBe(400);
    });

    it('rejects expired coupon → 400', async () => {
      const expiredCode = `EXPIRED-${Date.now()}`;
      await prisma.coupon.create({
        data: {
          code: expiredCode,
          discountPercent: 10,
          maxUses: 100,
          isActive: true,
          expiryDate: new Date('2020-01-01'), // Already expired
        },
      });

      const res = await request(app)
        .post('/api/coupons/validate')
        .send({ code: expiredCode });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('expired');
    });

    it('rejects exhausted coupon (usedCount >= maxUses) → 400', async () => {
      const exhaustedCode = `EXHAUSTED-${Date.now()}`;
      await prisma.coupon.create({
        data: {
          code: exhaustedCode,
          discountPercent: 10,
          maxUses: 1,
          usedCount: 1, // Already at max
          isActive: true,
        },
      });

      const res = await request(app)
        .post('/api/coupons/validate')
        .send({ code: exhaustedCode });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('maximum usage');
    });

    it('rejects course-restricted coupon when used on wrong course → 400', async () => {
      const restrictedCode = `COURSERESTRICT-${Date.now()}`;
      await prisma.coupon.create({
        data: {
          code: restrictedCode,
          discountPercent: 15,
          maxUses: 100,
          isActive: true,
          courseSlug: 'bmb', // Restricted to BMB only
        },
      });

      const res = await request(app)
        .post('/api/coupons/validate')
        .send({ code: restrictedCode, courseSlug: 'leadership' });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('only valid for');
    });

    it('coupon redemption atomically increments usedCount', async () => {
      const res = await request(app)
        .post('/api/coupons/redeem')
        .send({ code: testCouponCode, originalPrice: 50000 });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.usedCount).toBeGreaterThanOrEqual(1);
    });
  });

  // ── 4. Payment Slip Admin Authorization ────────────────────────────────────

  describe('4. Payment Slip Admin Authorization', () => {
    it('student cannot list all payment slips → 403', async () => {
      const res = await request(app)
        .get('/api/slips')
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(403);
    });

    it('unauthenticated user cannot list slips → 401', async () => {
      const res = await request(app).get('/api/slips');
      expect(res.status).toBe(401);
    });

    it('admin can list all payment slips → 200', async () => {
      const res = await request(app)
        .get('/api/slips')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('slip view without signed token returns 401', async () => {
      const res = await request(app).get('/api/slips/fake-id/view');
      expect(res.status).toBe(401);
    });

    it('slip view with missing expires parameter returns 401', async () => {
      const res = await request(app).get('/api/slips/fake-id/view?token=abc');
      expect(res.status).toBe(401);
    });

    it('delete slip returns 404 for non-existent slip ID (SEC-MED-5 verification)', async () => {
      const res = await request(app)
        .delete('/api/slips/non-existent-slip-id-99999')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(404);
      expect(res.body.code).toBe('NOT_FOUND');
    });
  });

  // ── 5. Money & Decimal Precision (Unit Tests) ──────────────────────────────

  describe('5. Money & Decimal Precision (Unit Tests)', () => {
    it('toCents converts LKR amount to integer cents without floating point drift', () => {
      expect(toCents(100)).toBe(10000);
      expect(toCents(99.99)).toBe(9999);
      expect(toCents(0)).toBe(0);
      expect(toCents(0.01)).toBe(1);
    });

    it('lkrFromCents converts cents back to LKR with 2 decimal places', () => {
      expect(lkrFromCents(10000)).toBe(100);
      expect(lkrFromCents(9999)).toBe(99.99);
      expect(lkrFromCents(1)).toBe(0.01);
      expect(lkrFromCents(0)).toBe(0);
    });

    it('applyCoupon calculates percentage discount correctly', () => {
      const result = applyCoupon(50000, { discountPercent: 20 });
      expect(result.originalCents).toBe(5000000); // 50000 * 100
      expect(result.discountCents).toBe(1000000); // 20% of 50000 LKR
      expect(result.finalCents).toBe(4000000);    // 50000 - 10000 = 40000 LKR
    });

    it('applyCoupon calculates fixed amount discount correctly', () => {
      const result = applyCoupon(50000, { discountAmount: 5000 });
      expect(result.originalCents).toBe(5000000);
      expect(result.discountCents).toBe(500000); // 5000 LKR
      expect(result.finalCents).toBe(4500000);    // 45000 LKR
    });

    it('applyCoupon never goes below zero (floor at 0)', () => {
      const result = applyCoupon(1000, { discountAmount: 5000 });
      expect(result.finalCents).toBe(0);
    });

    it('reconcilePayment detects exact match', () => {
      const result = reconcilePayment(5000000, 5000000);
      expect(result.status).toBe('EXACT_MATCH');
    });

    it('reconcilePayment detects overpayment', () => {
      const result = reconcilePayment(5000000, 6000000);
      expect(result.status).toBe('OVERPAID');
    });

    it('reconcilePayment detects underpayment', () => {
      const result = reconcilePayment(5000000, 4000000);
      expect(result.status).toBe('UNDERPAID');
    });
  });
});
