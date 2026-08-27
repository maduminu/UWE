import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../index';
import { prisma } from '../config/db';
import { validateReceiptSignature } from '../utils/fileSignature';
import {
  uploadPrivateReceipt,
  getPrivateReceipt,
  generateSignedReceiptUrl,
  verifySignedReceiptToken,
} from '../services/storageService';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../middlewares/authenticate';

// ── Minimal valid 1×1 PNG in base64 ──────────────────────────────────────────
// Proper PNG header: 89 50 4E 47 0D 0A 1A 0A ...
const VALID_PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const VALID_PNG_DATA_URI = `data:image/png;base64,${VALID_PNG_B64}`;

// Crafted malicious disguised file: SVG XML content prefixed with fake PNG MIME header
const DISGUISED_SVG_B64 = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'
).toString('base64');
const DISGUISED_SVG_URI = `data:image/png;base64,${DISGUISED_SVG_B64}`;

// Crafted disguised HTML script
const DISGUISED_HTML_B64 = Buffer.from(
  '<!DOCTYPE html><html><body><script>fetch("/admin")</script></body></html>'
).toString('base64');
const DISGUISED_HTML_URI = `data:image/jpeg;base64,${DISGUISED_HTML_B64}`;

describe('SEC-9: Bank Slip Storage & Security Integration Tests', () => {
  const secret = getJwtSecret();
  let adminToken: string;
  let createdSlipId: string;

  beforeAll(async () => {
    adminToken = jwt.sign(
      { id: 'admin-sec9-test', email: 'commander@uwe.lk', role: 'SUPER_ADMIN', type: 'admin' },
      secret,
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    try {
      if (createdSlipId) {
        await prisma.paymentSlip.deleteMany({ where: { id: createdSlipId } });
      }
      await prisma.paymentSlip.deleteMany({ where: { studentEmail: 'sec9.test@uwe.lk' } });
      await prisma.lead.deleteMany({ where: { phone: '+94710000099' } });
    } catch {
      /* ignore cleanup */
    }
  });

  // ── Unit: Magic Byte Validation ────────────────────────────────────────────

  it('UNIT: Validates a genuine 1×1 PNG by magic bytes', () => {
    const result = validateReceiptSignature(VALID_PNG_DATA_URI);
    expect(result.isValid).toBe(true);
    expect(result.mimeType).toBe('image/png');
    expect(result.extension).toBe('png');
    expect(result.buffer).toBeDefined();
  });

  it('UNIT: Rejects SVG XML file disguised as image/png (no PNG magic bytes)', () => {
    const result = validateReceiptSignature(DISGUISED_SVG_URI);
    expect(result.isValid).toBe(false);
  });

  it('UNIT: Rejects HTML file disguised as image/jpeg (no JPEG magic bytes)', () => {
    const result = validateReceiptSignature(DISGUISED_HTML_URI);
    expect(result.isValid).toBe(false);
  });

  it('UNIT: Rejects oversized buffer (> 5MB)', () => {
    // Create a buffer larger than 5MB — PNG magic bytes but oversized payload
    const oversized = Buffer.alloc(6 * 1024 * 1024, 0);
    oversized[0] = 0x89; oversized[1] = 0x50; oversized[2] = 0x4e; oversized[3] = 0x47;
    const result = validateReceiptSignature(oversized);
    expect(result.isValid).toBe(false);
  });

  it('UNIT: Validates a genuine JPEG by FF D8 FF magic bytes', () => {
    // Minimal JPEG header
    const jpegBuf = Buffer.alloc(12, 0);
    jpegBuf[0] = 0xff; jpegBuf[1] = 0xd8; jpegBuf[2] = 0xff;
    const result = validateReceiptSignature(jpegBuf);
    expect(result.isValid).toBe(true);
    expect(result.mimeType).toBe('image/jpeg');
  });

  it('UNIT: Validates a genuine PDF by %PDF- magic bytes', () => {
    const pdfBuf = Buffer.from('%PDF-1.7 fake content here');
    const result = validateReceiptSignature(pdfBuf);
    expect(result.isValid).toBe(true);
    expect(result.mimeType).toBe('application/pdf');
  });

  // ── Unit: Storage Service ──────────────────────────────────────────────────

  it('UNIT: uploadPrivateReceipt stores buffer and getPrivateReceipt retrieves it', async () => {
    const buf = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0x00]);
    const result = await uploadPrivateReceipt(buf, 'png', 'image/png');

    expect(result.storageKey).toMatch(/^slips\/.+\.png$/);
    expect(result.sizeBytes).toBe(buf.length);

    const retrieved = await getPrivateReceipt(result.storageKey);
    expect(retrieved).not.toBeNull();
    expect(retrieved!.mimeType).toBe('image/png');
    expect(retrieved!.buffer.equals(buf)).toBe(true);
  });

  it('UNIT: getPrivateReceipt returns null for unknown key', async () => {
    const result = await getPrivateReceipt('slips/nonexistent-key.png');
    expect(result).toBeNull();
  });

  // ── Unit: Signed URL Token ─────────────────────────────────────────────────

  it('UNIT: generateSignedReceiptUrl creates a token that verifySignedReceiptToken accepts', () => {
    const fakeSlipId = 'fake-slip-id-1234';
    const url = generateSignedReceiptUrl(fakeSlipId, 900);

    expect(url).toContain(`/api/slips/${fakeSlipId}/view?token=`);
    expect(url).toContain('&expires=');

    const urlObj = new URL(`http://localhost${url}`);
    const token = urlObj.searchParams.get('token')!;
    const expires = urlObj.searchParams.get('expires')!;

    expect(verifySignedReceiptToken(fakeSlipId, token, expires)).toBe(true);
  });

  it('UNIT: verifySignedReceiptToken rejects tampered token', () => {
    const fakeSlipId = 'fake-slip-id-9999';
    const url = generateSignedReceiptUrl(fakeSlipId, 900);
    const urlObj = new URL(`http://localhost${url}`);
    const expires = urlObj.searchParams.get('expires')!;

    const result = verifySignedReceiptToken(fakeSlipId, 'tampered_signature_abc123', expires);
    expect(result).toBe(false);
  });

  it('UNIT: verifySignedReceiptToken rejects expired token (expires in past)', () => {
    const fakeSlipId = 'fake-slip-id-expired';
    const expiredTimestamp = String(Math.floor(Date.now() / 1000) - 100); // 100s in past
    const result = verifySignedReceiptToken(fakeSlipId, 'any_signature', expiredTimestamp);
    expect(result).toBe(false);
  });

  // ── Integration: POST /api/slips — magic byte enforcement ─────────────────

  it('INT: POST /api/slips accepts a genuine PNG receipt and stores storage key (not base64) in DB', async () => {
    const res = await request(app)
      .post('/api/slips')
      .send({
        studentName: 'Operative SEC9',
        studentPhone: '+94710000099',
        studentEmail: 'sec9.test@uwe.lk',
        courseSlug: 'bmb',
        slipUrl: VALID_PNG_DATA_URI,
        amount: 25000,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.hasSlipImage).toBe(true);
    // slipUrl must NOT be returned
    expect(res.body.data.slipUrl).toBeUndefined();

    createdSlipId = res.body.data.id;

    // Verify the DB stores a storage key, not raw base64
    const dbSlip = await prisma.paymentSlip.findUnique({ where: { id: createdSlipId } });
    expect(dbSlip).not.toBeNull();
    // The stored value must be a storage key (slips/...) — never a raw data URI
    expect(dbSlip!.slipUrl).toMatch(/^slips\/.+/);
    expect(dbSlip!.slipUrl).not.toContain('base64');
  });

  it('INT: POST /api/slips rejects an SVG disguised as PNG (magic byte validation)', async () => {
    const res = await request(app)
      .post('/api/slips')
      .send({
        studentName: 'Malicious Operative',
        studentPhone: '+94710000088',
        courseSlug: 'bmb',
        slipUrl: DISGUISED_SVG_URI,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('binary signature validation');
  });

  it('INT: POST /api/slips rejects HTML disguised as JPEG (magic byte validation)', async () => {
    const res = await request(app)
      .post('/api/slips')
      .send({
        studentName: 'Bad Actor',
        studentPhone: '+94710000077',
        courseSlug: 'bmb',
        slipUrl: DISGUISED_HTML_URI,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('binary signature validation');
  });

  // ── Integration: GET /api/slips — slipUrl redacted in list ────────────────

  it('INT: GET /api/slips returns hasSlipImage boolean and never exposes slipUrl', async () => {
    const res = await request(app)
      .get('/api/slips')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    for (const slip of res.body.data) {
      // slipUrl must NEVER appear in list response
      expect(slip.slipUrl).toBeUndefined();
      // hasSlipImage is the only receipt indicator in list view
      expect(typeof slip.hasSlipImage).toBe('boolean');
    }
  });

  // ── Integration: GET /api/slips/:id/image-url — admin signed URL ──────────

  it('INT: GET /api/slips/:id/image-url returns a short-lived signed URL for admin', async () => {
    if (!createdSlipId) return;

    const res = await request(app)
      .get(`/api/slips/${createdSlipId}/image-url`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.url).toContain(`/api/slips/${createdSlipId}/view?token=`);
    expect(res.body.expiresInSeconds).toBe(900);
  });

  it('INT: GET /api/slips/:id/image-url is rejected without admin auth (401)', async () => {
    if (!createdSlipId) return;

    const res = await request(app)
      .get(`/api/slips/${createdSlipId}/image-url`);

    expect(res.status).toBe(401);
  });

  // ── Integration: GET /api/slips/:id/view — signed receipt retrieval ───────

  it('INT: GET /api/slips/:id/view with a valid signed token returns the receipt binary', async () => {
    if (!createdSlipId) return;

    // Step 1: Get signed URL
    const urlRes = await request(app)
      .get(`/api/slips/${createdSlipId}/image-url`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(urlRes.status).toBe(200);
    const signedPath = urlRes.body.url;

    // Step 2: Fetch the actual image using the signed URL
    const imageRes = await request(app).get(signedPath);

    expect(imageRes.status).toBe(200);
    expect(imageRes.headers['content-type']).toContain('image/png');
    expect(imageRes.headers['cache-control']).toContain('no-store');
    expect(imageRes.body).toBeTruthy();
  });

  it('INT: GET /api/slips/:id/view with tampered token returns 401', async () => {
    if (!createdSlipId) return;

    const res = await request(app)
      .get(`/api/slips/${createdSlipId}/view?token=tampered_signature&expires=9999999999`);

    expect(res.status).toBe(401);
  });

  it('INT: GET /api/slips/:id/view with expired token returns 401', async () => {
    if (!createdSlipId) return;

    const expiredTimestamp = Math.floor(Date.now() / 1000) - 100;
    const res = await request(app)
      .get(`/api/slips/${createdSlipId}/view?token=any_token&expires=${expiredTimestamp}`);

    expect(res.status).toBe(401);
  });
});
