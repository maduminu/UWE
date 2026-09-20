import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { Prisma } from '@prisma/client';
import { recordAdminAudit } from '../utils/auditLogger';
import { logger } from '../utils/logger';
import { validateReceiptSignature } from '../utils/fileSignature';
import {
  uploadPrivateReceipt,
  getPrivateReceipt,
  generateSignedReceiptUrl,
  verifySignedReceiptToken,
} from '../services/storageService';
import { sendError, ErrorCode } from '../utils/apiResponse';
import { toCents, applyCoupon, reconcilePayment, toPrismaDecimal } from '../utils/money';
import { broadcastRealtimeEvent } from '../utils/realtimeEmitter';

const PHONE_REGEX = /^[+\d\s\-()]{7,20}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// @desc    Get all uploaded bank payment slips (Admin HQ) with authenticated signed receipt URLs
// @route   GET /api/slips
export const getAllPaymentSlips = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status } = req.query;
    const slips = await prisma.paymentSlip.findMany({
      where: status ? { status: status as any } : {},
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        studentName: true,
        studentPhone: true,
        studentEmail: true,
        courseSlug: true,
        slipUrl: true,
        amount: true,
        bankReference: true,
        notes: true,
        status: true,
        adminNotes: true,
        couponCode: true,
        discountAmount: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Generate authenticated signed URLs for Admin HQ view (15-min TTL)
    const projected = await Promise.all(
      slips.map(async (s: any) => {
        let signedUrl = '';
        if (s.slipUrl) {
          try {
            signedUrl = await generateSignedReceiptUrl(s.id, s.slipUrl, 900);
          } catch {
            signedUrl = '';
          }
        }
        return {
          ...s,
          slipUrl: signedUrl,
          imageUrl: signedUrl,
          hasSlipImage: Boolean(s.slipUrl),
        };
      })
    );

    res.status(200).json({ success: true, count: projected.length, data: projected });
  } catch (error: any) {
    logger.error('[getAllPaymentSlips] ' + error.message, 'SLIPS');
    sendError(res, 500, ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to retrieve payment slips.', req);
  }
};

// @desc    Generate a short-lived signed URL for viewing a receipt image (Admin only)
// @route   GET /api/slips/:id/image-url
export const getSlipImageUrl = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const slip = await prisma.paymentSlip.findUnique({ where: { id } });

    if (!slip) {
      sendError(res, 404, ErrorCode.NOT_FOUND, 'Slip not found.', req);
      return;
    }

    // Generate a 15-minute provider-signed or HMAC-signed URL
    const signedUrl = await generateSignedReceiptUrl(id, slip.slipUrl, 900);
    res.status(200).json({ success: true, url: signedUrl, expiresInSeconds: 900 });
  } catch (error: any) {
    logger.error('[getSlipImageUrl] ' + error.message, 'SLIPS');
    sendError(res, 500, ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to generate slip image URL.', req);
  }
};

// @desc    Serve the actual slip binary via short-lived signed token (no auth required — token IS the auth)
// @route   GET /api/slips/:id/view?token=...&expires=...
export const viewSlipImage = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { token, expires } = req.query as { token?: string; expires?: string };

    if (!token || !expires) {
      sendError(res, 401, ErrorCode.UNAUTHORIZED, 'Missing signed token parameters.', req);
      return;
    }

    if (!verifySignedReceiptToken(id, token, expires)) {
      sendError(res, 401, ErrorCode.UNAUTHORIZED, 'Invalid or expired receipt token.', req);
      return;
    }

    const slip = await prisma.paymentSlip.findUnique({
      where: { id },
      select: {
        id: true,
        slipUrl: true,
        slipData: true,
        studentName: true,
        studentPhone: true,
        courseSlug: true,
        amount: true,
        bankReference: true,
        createdAt: true,
      },
    });

    if (!slip || !slip.slipUrl) {
      sendError(res, 404, ErrorCode.NOT_FOUND, 'Slip not found.', req);
      return;
    }

    // 1. External HTTPS seed URLs (redirect to image)
    if (slip.slipUrl.startsWith('https://') || slip.slipUrl.startsWith('http://')) {
      res.redirect(slip.slipUrl);
      return;
    }

    // 2. Base64 data URLs in slipUrl (legacy)
    if (slip.slipUrl.startsWith('data:')) {
      const parts = slip.slipUrl.split(';base64,');
      const mime = parts[0].replace('data:', '') || 'image/png';
      const buffer = Buffer.from(parts[1] || '', 'base64');
      res.setHeader('Content-Type', mime);
      res.setHeader('Cache-Control', 'private, no-store');
      res.status(200).send(buffer);
      return;
    }

    // 3. Vault Storage Key (slips/...) — try disk/memory/cloud
    const file = await getPrivateReceipt(slip.slipUrl);
    if (file) {
      res.setHeader('Content-Type', file.mimeType);
      res.setHeader('Content-Disposition', `inline; filename="receipt-${id}.${file.mimeType.split('/')[1] || 'png'}"`);
      res.setHeader('Cache-Control', 'private, no-store');
      res.status(200).send(file.buffer);
      return;
    }

    // 4. DB fallback — serve the original base64 data URI stored in slipData
    if (slip.slipData && slip.slipData.startsWith('data:')) {
      const parts = slip.slipData.split(';base64,');
      const mime = parts[0].replace('data:', '') || 'image/png';
      const buffer = Buffer.from(parts[1] || '', 'base64');

      // Re-persist to disk so subsequent requests are fast
      try {
        const ext = mime.split('/')[1] || 'png';
        await uploadPrivateReceipt(buffer, ext, mime);
      } catch { /* best effort re-cache */ }

      res.setHeader('Content-Type', mime);
      res.setHeader('Content-Disposition', `inline; filename="receipt-${id}.${mime.split('/')[1] || 'png'}"`);
      res.setHeader('Cache-Control', 'private, no-store');
      res.status(200).send(buffer);
      return;
    }

    // 5. Last resort — graceful placeholder SVG with strict XML entity escaping (SEC-MED-2 Fix)
    const escapeXml = (unsafe: string) =>
      unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');

    const safeStudentName = escapeXml(slip.studentName || 'Operative');
    const safeCourseSlug = escapeXml((slip.courseSlug || '').toUpperCase());
    const safeBankRef = escapeXml(slip.bankReference || 'N/A');
    const amountText = slip.amount ? `LKR ${Number(slip.amount).toLocaleString()}` : 'Payment Verification Pending';
    const dateText = new Date(slip.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    const svgFallback = `
      <svg width="600" height="400" viewBox="0 0 600 400" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="600" height="400" rx="16" fill="#0A0E1A"/>
        <rect x="1" y="1" width="598" height="398" rx="15" stroke="#FFB800" stroke-opacity="0.3" stroke-width="2"/>
        <circle cx="300" cy="110" r="40" fill="#131929" stroke="#FFB800" stroke-width="2"/>
        <path d="M290 100H310M290 110H310M290 120H302" stroke="#FFB800" stroke-width="3" stroke-linecap="round"/>
        <text x="300" y="180" text-anchor="middle" fill="#FFFFFF" font-family="system-ui, sans-serif" font-size="18" font-weight="bold">${safeStudentName}</text>
        <text x="300" y="205" text-anchor="middle" fill="#94A3B8" font-family="monospace" font-size="13">${safeCourseSlug} DIVISION • REF: ${safeBankRef}</text>
        <text x="300" y="250" text-anchor="middle" fill="#2ED573" font-family="monospace" font-size="22" font-weight="bold">${amountText}</text>
        <text x="300" y="285" text-anchor="middle" fill="#64748B" font-family="monospace" font-size="12">Verified Bank Deposit • ${dateText}</text>
        <rect x="200" y="320" width="200" height="32" rx="8" fill="#131929" stroke="#334155"/>
        <text x="300" y="341" text-anchor="middle" fill="#FFB800" font-family="monospace" font-size="11" font-weight="bold">UWE SECURE VAULT</text>
      </svg>
    `.trim();

    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'private, no-store');
    res.status(200).send(Buffer.from(svgFallback));
  } catch (error: any) {
    logger.error('[viewSlipImage] ' + error.message, 'SLIPS');
    sendError(res, 500, ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to retrieve slip image.', req);
  }
};

// @desc    Submit a new bank payment slip (Public Student Checkout)
// @route   POST /api/slips
export const createPaymentSlip = async (req: Request, res: Response): Promise<void> => {
  try {
    const { studentName, studentPhone, studentEmail, courseSlug, slipUrl, amount, bankReference, notes } = req.body;

    if (!studentName || !studentPhone || !courseSlug || !slipUrl) {
      sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'Name, WhatsApp Phone, Course, and Bank Slip are required.', req);
      return;
    }

    if (studentName.trim().length > 100) {
      sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'Student Name must be under 100 characters.', req);
      return;
    }

    const cleanPhone = studentPhone.trim();
    if (!PHONE_REGEX.test(cleanPhone)) {
      sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'Invalid phone number format.', req);
      return;
    }

    if (studentEmail && !EMAIL_REGEX.test(studentEmail.trim())) {
      sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'Invalid email address format.', req);
      return;
    }

    // ── SERVER-SIDE BINARY & MAGIC BYTE VALIDATION (SEC-9) ───────────────────
    // Reject external HTTP links or unverified payloads; all receipts must be valid binary buffers.
    if (typeof slipUrl !== 'string' || (!slipUrl.startsWith('data:') && !slipUrl.match(/^[A-Za-z0-9+/=]+$/))) {
      sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'Uploaded file failed binary signature validation. Direct external links are not permitted.', req);
      return;
    }

    const validation = validateReceiptSignature(slipUrl);
    if (!validation.isValid || !validation.buffer) {
      sendError(
        res,
        400,
        ErrorCode.VALIDATION_ERROR,
        validation.error || 'Uploaded file failed binary signature validation. Only genuine PNG, JPEG, WEBP, or PDF bank receipts are accepted.',
        req
      );
      return;
    }

    // Upload to private object storage (disk + memory cache)
    const uploadResult = await uploadPrivateReceipt(
      validation.buffer,
      validation.extension!,
      validation.mimeType!
    );
    const storageRef = uploadResult.storageKey;

    const newSlip = await prisma.paymentSlip.create({
      data: {
        studentName: studentName.trim(),
        studentPhone: cleanPhone,
        studentEmail: studentEmail ? studentEmail.trim().toLowerCase() : null,
        courseSlug: courseSlug.trim().toLowerCase(),
        slipUrl: storageRef, // Private storage key for fast disk/cloud retrieval
        slipData: slipUrl,   // Original base64 data URI — reliable DB fallback so image is NEVER lost
        // DATA-6: Store amount as Decimal — convert via cents to avoid float drift
        amount: amount != null ? toPrismaDecimal(toCents(typeof amount === 'number' ? amount : parseFloat(amount) || 0)) : null,
        bankReference: bankReference ? bankReference.trim() : null,
        notes: notes ? notes.trim() : null,
        status: 'PENDING',
      },
    });

    // Auto-sync into Lead CRM (ignore duplicate errors)
    try {
      await prisma.lead.create({
        data: {
          name: studentName.trim(),
          phone: cleanPhone,
          email: studentEmail ? studentEmail.trim().toLowerCase() : null,
          courseSlug: courseSlug.trim().toLowerCase(),
          inquiryType: courseSlug.toUpperCase() as any,
          message: `Bank Transfer Slip Uploaded (Ref: ${bankReference || 'N/A'}, Slip ID: ${newSlip.id.substring(0, 8)})`,
          status: 'NEW',
          whatsappSent: true,
        },
      });
    } catch {
      // Ignore lead duplication errors
    }

    // Return the new slip without slipUrl/slipData (never expose raw binary data to student)
    const { slipUrl: _redacted, slipData: _redactedData, ...safeSlip } = newSlip as any;
    res.status(201).json({ success: true, data: { ...safeSlip, hasSlipImage: true } });
  } catch (error: any) {
    logger.error('[createPaymentSlip] ' + error.message, 'SLIPS');
    sendError(res, 500, ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to submit payment slip. Please try again.', req);
  }
};

// @desc    Verify or Reject payment slip (Admin HQ)
// @route   PUT /api/slips/:id/status
export const updateSlipStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { status, adminNotes, couponCode, notes } = req.body;

    if (!status || !['VERIFIED', 'REJECTED'].includes(status)) {
      sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'Status must be VERIFIED or REJECTED.', req);
      return;
    }

    // Atomic transaction for slip status update, coupon usage, and seat decrement
    const result = await prisma.$transaction(async (tx) => {
      const slip = await tx.paymentSlip.findUnique({ where: { id } });
      if (!slip) {
        throw new Error('NOT_FOUND');
      }

      if (slip.status === status) {
        throw new Error(`ALREADY_${status}`);
      }

      // ── Coupon redemption (atomic conditional DB increment) ───────────────────
      if (couponCode && status === 'VERIFIED') {
        const coupon = await tx.coupon.findFirst({
          where: { code: couponCode.toUpperCase(), isActive: true },
        });

        if (!coupon) {
          throw new Error('COUPON_NOT_FOUND');
        }
        if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) {
          throw new Error('COUPON_EXPIRED');
        }

        // Atomic: only increments if usedCount < maxUses. Race-safe via DB-level conditional.
        const couponUpdateRes = await tx.coupon.updateMany({
          where: {
            id: coupon.id,
            isActive: true,
            usedCount: { lt: coupon.maxUses },
          },
          data: { usedCount: { increment: 1 } },
        });

        if (couponUpdateRes.count === 0) {
          throw new Error('COUPON_EXHAUSTED');
        }
      }

      // ── Payment Reconciliation (DATA-6) ──────────────────────────────────────
      let reconciliationNote = '';
      if (status === 'VERIFIED' && slip.amount != null) {
        let coursePriceInput: any = 0;
        const course = await tx.course.findFirst({ where: { slug: slip.courseSlug } });
        if (course) coursePriceInput = course.price;

        const activeCode = (couponCode || slip.couponCode || '').toUpperCase();
        let couponForRecon: { discountPercent?: any; discountAmount?: any } = {};
        if (activeCode) {
          const recon = await tx.coupon.findUnique({ where: { code: activeCode } });
          if (recon) couponForRecon = recon;
        }

        const discountResult = applyCoupon(coursePriceInput, couponForRecon);
        const recon = reconcilePayment(discountResult.finalCents, toCents(slip.amount));

        reconciliationNote = `[RECON:${recon.status}] Expected ${recon.expectedLkr}, Paid ${recon.paidLkr}, Delta ${recon.deltaLkr}`;
        logger.info(`[updateSlipStatus] Slip ${id} reconciliation: ${reconciliationNote}`, 'SLIPS');
      }

      // ── Seat decrement (atomic conditional DB decrement) ─────────────────────
      if (status === 'VERIFIED' && slip.courseSlug) {
        const upcomingBatch = await tx.courseBatch.findFirst({
          where: { course: { slug: slip.courseSlug }, status: 'UPCOMING' },
          orderBy: { startDate: 'asc' },
        });

        if (upcomingBatch) {
          // Atomic: only decrements if availableSeats > 0.
          const seatUpdateRes = await tx.courseBatch.updateMany({
            where: { id: upcomingBatch.id, availableSeats: { gt: 0 } },
            data: { availableSeats: { decrement: 1 } },
          });

          if (seatUpdateRes.count === 0) {
            throw new Error('SEATS_EXHAUSTED');
          }
        }
      }

      // ── Update slip status ───────────────────────────────────────────────────
      const updatedSlip = await tx.paymentSlip.update({
        where: { id },
        data: {
          status: status as any,
          adminNotes: reconciliationNote
            ? [adminNotes, reconciliationNote].filter(Boolean).join(' | ')
            : adminNotes || null,
          couponCode: couponCode || null,
          notes: notes || null,
        },
        select: {
          id: true,
          studentName: true,
          studentPhone: true,
          studentEmail: true,
          courseSlug: true,
          amount: true,
          bankReference: true,
          notes: true,
          status: true,
          adminNotes: true,
          couponCode: true,
          discountAmount: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // ── Auto-enroll user on slip verification ──────────────────────────────
      if (status === 'VERIFIED' && slip.courseSlug) {
        const studentEmail = slip.studentEmail ? slip.studentEmail.trim().toLowerCase() : null;
        const studentPhone = slip.studentPhone ? slip.studentPhone.trim() : null;

        if (studentEmail || studentPhone) {
          const matchedUser = await tx.user.findFirst({
            where: {
              OR: [
                ...(studentEmail ? [{ email: studentEmail }] : []),
                ...(studentPhone ? [{ phone: studentPhone }] : []),
              ],
            },
          });

          if (matchedUser) {
            const currentSlugs = (matchedUser.enrolledCourseSlugs || '')
              .split(',')
              .map((s) => s.trim().toLowerCase())
              .filter(Boolean);

            const targetSlug = slip.courseSlug.trim().toLowerCase();
            if (!currentSlugs.includes(targetSlug)) {
              currentSlugs.push(targetSlug);
            }

            await tx.user.update({
              where: { id: matchedUser.id },
              data: {
                isEnrolled: true,
                enrolledCourseSlugs: currentSlugs.join(','),
              },
            });
          }
        }
      }

      return { updatedSlip, originalSlip: slip };
    });

    await recordAdminAudit({
      adminId: req.user?.id,
      adminEmail: req.user?.email,
      action: `SLIP_${status}`,
      targetEntity: 'PaymentSlip',
      targetId: id,
      details: {
        studentName: result.originalSlip.studentName,
        courseSlug: result.originalSlip.courseSlug,
        amount: result.originalSlip.amount,
        bankReference: result.originalSlip.bankReference,
        notes,
      },
      ipAddress: req.ip,
    });

    // Broadcast live events across all open tabs/devices
    broadcastRealtimeEvent(status === 'VERIFIED' ? 'slip:verified' : 'slip:rejected', {
      slipId: id,
      studentEmail: result.originalSlip.studentEmail,
      studentPhone: result.originalSlip.studentPhone,
      courseSlug: result.originalSlip.courseSlug,
      status,
    });
    broadcastRealtimeEvent('user:updated', {
      studentEmail: result.originalSlip.studentEmail,
      studentPhone: result.originalSlip.studentPhone,
      courseSlug: result.originalSlip.courseSlug,
    });

    res.status(200).json({ success: true, data: { ...result.updatedSlip, hasSlipImage: true } });
  } catch (error: any) {
    logger.error('[updateSlipStatus] ' + error.message, 'SLIPS');

    if (error.message === 'NOT_FOUND') {
      sendError(res, 404, ErrorCode.NOT_FOUND, 'Payment slip not found.', req);
      return;
    }
    if (error.message?.startsWith('ALREADY_')) {
      sendError(res, 400, ErrorCode.BAD_REQUEST, `Slip is already ${req.body.status}.`, req);
      return;
    }
    if (error.message === 'COUPON_NOT_FOUND') {
      sendError(res, 400, ErrorCode.BAD_REQUEST, `Coupon ${req.body.couponCode} not found or inactive.`, req);
      return;
    }
    if (error.message === 'COUPON_EXPIRED') {
      sendError(res, 400, ErrorCode.BAD_REQUEST, `Coupon ${req.body.couponCode} has expired.`, req);
      return;
    }
    if (error.message === 'COUPON_EXHAUSTED') {
      sendError(res, 400, ErrorCode.BAD_REQUEST, `Coupon ${req.body.couponCode} has reached its maximum usage limit.`, req);
      return;
    }
    if (error.message === 'SEATS_EXHAUSTED') {
      sendError(res, 500, ErrorCode.INTERNAL_SERVER_ERROR, `No available seats remaining in upcoming batch.`, req);
      return;
    }

    sendError(res, 500, ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to update payment slip status.', req);
  }
};

// @desc    Delete payment slip record
// @route   DELETE /api/slips/:id
export const deleteSlip = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.paymentSlip.findUnique({ where: { id } });
    if (!existing) {
      sendError(res, 404, ErrorCode.NOT_FOUND, 'Payment slip not found.', req);
      return;
    }

    await prisma.paymentSlip.delete({ where: { id } });
    res.status(200).json({ success: true, message: 'Payment slip removed successfully.' });
  } catch (error: any) {
    logger.error('[deleteSlip] ' + error.message, 'SLIPS');
    sendError(res, 500, ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to delete payment slip.', req);
  }
};
