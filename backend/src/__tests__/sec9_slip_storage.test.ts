import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../index';
import { prisma } from '../config/db';
import { validateReceiptSignature, scanBufferForMaliciousContent } from '../utils/fileSignature';
import {
  uploadPrivateReceipt,
  getPrivateReceipt,
  generateSignedReceiptUrl,
  verifySignedReceiptToken,
} from '../services/storageService';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../middlewares/authenticate';

// ── Helper: create a valid PNG buffer of specific dimensions ─────────────────
function createPngBuffer(width: number, height: number): Buffer {
  const header = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]); // 8 bytes
  // IHDR chunk: length (4), type (4), width (4), height (4), bitDepth (1), colorType (1), comp (1), filter (1), interlace (1), CRC (4) = 25 bytes
  const ihdr = Buffer.alloc(25);
  ihdr.writeUInt32BE(13, 0); // chunk data length
  ihdr.write('IHDR', 4, 'ascii');
  ihdr.writeUInt32BE(width, 8);
  ihdr.writeUInt32BE(height, 12);
  ihdr[16] = 8; // 8-bit depth
  ihdr[17] = 2; // RGB
  ihdr[18] = 0;
  ihdr[19] = 0;
  ihdr[20] = 0;
  ihdr.writeUInt32BE(0x12345678, 21); // dummy CRC

  // IEND chunk
  const iend = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82]);

  return Buffer.concat([header, ihdr, iend]);
}

// ── Helper: create a valid JPEG buffer of specific dimensions ────────────────
function createJpegBuffer(width: number, height: number): Buffer {
  const soi = Buffer.from([0xff, 0xd8]);
  // SOF0 marker (0xFF, 0xC0)
  const sof0 = Buffer.alloc(11);
  sof0[0] = 0xff;
  sof0[1] = 0xc0;
  sof0.writeUInt16BE(9, 2); // segment length
  sof0[4] = 8; // precision
  sof0.writeUInt16BE(height, 5);
  sof0.writeUInt16BE(width, 7);
  sof0[9] = 3; // 3 components (YCbCr)
  sof0[10] = 0;

  const eoi = Buffer.from([0xff, 0xd9]);
  return Buffer.concat([soi, sof0, eoi]);
}

// Valid 300×300 PNG Data URI
const VALID_300x300_PNG_BUF = createPngBuffer(300, 300);
const VALID_300x300_PNG_URI = `data:image/png;base64,${VALID_300x300_PNG_BUF.toString('base64')}`;

// Undersized 20×20 PNG
const UNDERSIZED_PNG_BUF = createPngBuffer(20, 20);
const UNDERSIZED_PNG_URI = `data:image/png;base64,${UNDERSIZED_PNG_BUF.toString('base64')}`;

// Oversized 9000×9000 PNG
const OVERSIZED_PNG_BUF = createPngBuffer(9000, 9000);
const OVERSIZED_PNG_URI = `data:image/png;base64,${OVERSIZED_PNG_BUF.toString('base64')}`;

// Valid 400×400 JPEG
const VALID_JPEG_BUF = createJpegBuffer(400, 400);
const VALID_JPEG_URI = `data:image/jpeg;base64,${VALID_JPEG_BUF.toString('base64')}`;

// Valid PDF buffer with %%EOF
const VALID_PDF_BUF = Buffer.concat([
  Buffer.from('%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n'),
  Buffer.alloc(100, 0x20),
  Buffer.from('\nxref\n0 2\ntrailer\n<< >>\nstartxref\n120\n%%EOF'),
]);
const VALID_PDF_URI = `data:application/pdf;base64,${VALID_PDF_BUF.toString('base64')}`;

describe('SEC-9: Bank Slip Storage, Malware Scanning & Dimension Security Tests', () => {
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

  // ── 1. Unit: Image Dimensions Validation ───────────────────────────────────

  it('UNIT: Accepts valid 300×300 PNG receipt within dimension bounds', () => {
    const result = validateReceiptSignature(VALID_300x300_PNG_BUF);
    expect(result.isValid).toBe(true);
    expect(result.mimeType).toBe('image/png');
    expect(result.width).toBe(300);
    expect(result.height).toBe(300);
  });

  it('UNIT: Accepts valid 400×400 JPEG receipt within dimension bounds', () => {
    const result = validateReceiptSignature(VALID_JPEG_BUF);
    expect(result.isValid).toBe(true);
    expect(result.mimeType).toBe('image/jpeg');
    expect(result.width).toBe(400);
    expect(result.height).toBe(400);
  });

  it('UNIT: Rejects undersized 20×20 PNG receipt (< 50px threshold)', () => {
    const result = validateReceiptSignature(UNDERSIZED_PNG_BUF);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('too small');
  });

  it('UNIT: Rejects oversized 9000×9000 PNG receipt (> 8000px threshold)', () => {
    const result = validateReceiptSignature(OVERSIZED_PNG_BUF);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('exceed maximum');
  });

  // ── 2. Unit: Malware & Payload Inspection ──────────────────────────────────

  it('UNIT: Rejects Windows MZ executable header disguised in buffer', () => {
    const mzBuffer = Buffer.concat([Buffer.from([0x4d, 0x5a]), Buffer.alloc(100, 0)]);
    const scan = scanBufferForMaliciousContent(mzBuffer, 'image/png');
    expect(scan.isClean).toBe(false);
    expect(scan.reason).toContain('Windows executable');
  });

  it('UNIT: Rejects Linux ELF executable header disguised in buffer', () => {
    const elfBuffer = Buffer.concat([Buffer.from([0x7f, 0x45, 0x4c, 0x46]), Buffer.alloc(100, 0)]);
    const scan = scanBufferForMaliciousContent(elfBuffer, 'image/png');
    expect(scan.isClean).toBe(false);
    expect(scan.reason).toContain('Linux executable');
  });

  it('UNIT: Rejects buffer containing embedded PHP execution tags', () => {
    const phpBuffer = Buffer.concat([
      VALID_300x300_PNG_BUF,
      Buffer.from('<?php eval($_POST["cmd"]); ?>'),
    ]);
    const scan = scanBufferForMaliciousContent(phpBuffer, 'image/png');
    expect(scan.isClean).toBe(false);
    expect(scan.reason).toContain('Server script');
  });

  it('UNIT: Rejects buffer containing active XSS JavaScript script tags', () => {
    const xssBuffer = Buffer.concat([
      VALID_300x300_PNG_BUF,
      Buffer.from('<script>alert("hacked")</script>'),
    ]);
    const scan = scanBufferForMaliciousContent(xssBuffer, 'image/png');
    expect(scan.isClean).toBe(false);
    expect(scan.reason).toContain('Active script');
  });

  it('UNIT: Rejects PDF containing dangerous /JavaScript interactive action', () => {
    const maliciousPdf = Buffer.concat([
      Buffer.from('%PDF-1.7\n/JavaScript (app.alert("pwned"))\n'),
      Buffer.alloc(100, 0x20),
      Buffer.from('\n%%EOF'),
    ]);
    const scan = scanBufferForMaliciousContent(maliciousPdf, 'application/pdf');
    expect(scan.isClean).toBe(false);
    expect(scan.reason).toContain('interactive action');
  });

  it('UNIT: Accepts clean, valid PDF receipt with %%EOF trailer', () => {
    const result = validateReceiptSignature(VALID_PDF_BUF);
    expect(result.isValid).toBe(true);
    expect(result.mimeType).toBe('application/pdf');
  });

  it('UNIT: Accepts legitimate PDF receipt containing business words (System, Exec, eval, invoice.php)', () => {
    const businessPdf = Buffer.concat([
      Buffer.from('%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n'),
      Buffer.from('Payment for Core Banking System maintenance & Executive Advisory, Ref: invoice.php-9981, evaluated balance OK.\n'),
      Buffer.alloc(100, 0x20),
      Buffer.from('\nxref\n0 2\ntrailer\n<< >>\nstartxref\n120\n%%EOF'),
    ]);
    const result = validateReceiptSignature(businessPdf);
    expect(result.isValid).toBe(true);
    expect(result.mimeType).toBe('application/pdf');
  });

  it('UNIT: Accepts legitimate image receipt with normal metadata containing benign tokens', () => {
    const imageWithMetadata = Buffer.concat([
      VALID_300x300_PNG_BUF,
      Buffer.from('Created on System workstation for Executive review'),
    ]);
    const result = validateReceiptSignature(imageWithMetadata);
    expect(result.isValid).toBe(true);
    expect(result.mimeType).toBe('image/png');
  });

  // ── 3. Unit: Storage Service & Signed URLs ─────────────────────────────────

  it('UNIT: uploadPrivateReceipt and getPrivateReceipt roundtrip', async () => {
    const result = await uploadPrivateReceipt(VALID_300x300_PNG_BUF, 'png', 'image/png');
    expect(result.storageKey).toMatch(/^slips\/.+\.png$/);
    expect(result.sizeBytes).toBe(VALID_300x300_PNG_BUF.length);

    const retrieved = await getPrivateReceipt(result.storageKey);
    expect(retrieved).not.toBeNull();
    expect(retrieved!.buffer.equals(VALID_300x300_PNG_BUF)).toBe(true);
  });

  it('UNIT: generateSignedReceiptUrl creates verifiable HMAC token', async () => {
    const slipId = 'test-slip-hmac-123';
    const signedUrl = await generateSignedReceiptUrl(slipId, 'slips/test.png', 900);

    const urlObj = new URL(`http://localhost${signedUrl}`);
    const token = urlObj.searchParams.get('token')!;
    const expires = urlObj.searchParams.get('expires')!;

    expect(verifySignedReceiptToken(slipId, token, expires)).toBe(true);
  });

  it('UNIT: verifySignedReceiptToken rejects tampered HMAC token', () => {
    const slipId = 'test-slip-tampered';
    const result = verifySignedReceiptToken(slipId, 'tampered_signature', '9999999999');
    expect(result).toBe(false);
  });

  // ── 4. Integration: POST /api/slips — strict verification ─────────────────

  it('INT: POST /api/slips accepts valid PNG and saves storage key in DB', async () => {
    const res = await request(app)
      .post('/api/slips')
      .send({
        studentName: 'Operative SEC9',
        studentPhone: '+94710000099',
        studentEmail: 'sec9.test@uwe.lk',
        courseSlug: 'bmb',
        slipUrl: VALID_300x300_PNG_URI,
        amount: 25000,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.hasSlipImage).toBe(true);
    expect(res.body.data.slipUrl).toBeUndefined();

    createdSlipId = res.body.data.id;

    // Verify DB stores only storage key
    const dbSlip = await prisma.paymentSlip.findUnique({ where: { id: createdSlipId } });
    expect(dbSlip!.slipUrl).toMatch(/^slips\/.+\.png$/);
    expect(dbSlip!.slipUrl).not.toContain('data:image');
  });

  it('INT: POST /api/slips rejects undersized image upload (20×20 px)', async () => {
    const res = await request(app)
      .post('/api/slips')
      .send({
        studentName: 'Operative Small',
        studentPhone: '+94710000099',
        courseSlug: 'bmb',
        slipUrl: UNDERSIZED_PNG_URI,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(res.body.message).toContain('too small');
  });

  it('INT: POST /api/slips rejects direct external HTTPS URLs without binary upload', async () => {
    const res = await request(app)
      .post('/api/slips')
      .send({
        studentName: 'Operative External',
        studentPhone: '+94710000099',
        courseSlug: 'bmb',
        slipUrl: 'https://malicious-external-site.com/fake-receipt.jpg',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  // ── 5. Integration: Signed Receipt Viewer ──────────────────────────────────

  it('INT: Admin signed receipt URL viewer streams binary with private cache headers', async () => {
    if (!createdSlipId) return;

    // Step 1: Admin generates signed URL
    const urlRes = await request(app)
      .get(`/api/slips/${createdSlipId}/image-url`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(urlRes.status).toBe(200);
    expect(urlRes.body.url).toBeDefined();

    // Step 2: Access signed URL
    const viewRes = await request(app).get(urlRes.body.url);
    expect(viewRes.status).toBe(200);
    expect(viewRes.headers['content-type']).toContain('image/png');
    expect(viewRes.headers['cache-control']).toContain('private, no-store');
    expect(viewRes.body).toBeTruthy();
  });

  it('INT: GET /api/slips/:id/view rejects expired or tampered token with 401', async () => {
    if (!createdSlipId) return;

    const res = await request(app)
      .get(`/api/slips/${createdSlipId}/view?token=badtoken&expires=1000`);

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });
});
