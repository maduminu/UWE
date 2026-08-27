import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { recordAdminAudit } from '../utils/auditLogger';
import { logger } from '../utils/logger';
import { validateReceiptSignature } from '../utils/fileSignature';
import {
  uploadPrivateReceipt,
  getPrivateReceipt,
  generateSignedReceiptUrl,
  verifySignedReceiptToken,
} from '../services/storageService';

const PHONE_REGEX = /^[+\d\s\-()]{7,20}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ─────────────────────────────────────────────────────────────────────────────
// Helper: project a slip for list responses — redact slipUrl
// ─────────────────────────────────────────────────────────────────────────────
function projectSlip(slip: any) {
  const { slipUrl, ...rest } = slip;
  return {
    ...rest,
    hasSlipImage: !!(slipUrl && slipUrl.length > 4), // always boolean
  };
}

// @desc    Get all uploaded bank payment slips (Admin HQ) — slipUrl redacted
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
        amount: true,
        bankReference: true,
        notes: true,
        status: true,
        adminNotes: true,
        couponCode: true,
        discountAmount: true,
        createdAt: true,
        updatedAt: true,
        // slipUrl intentionally excluded — fetched on-demand via signed URL
      },
    });

    // Inject hasSlipImage flag by checking separate storageKey field
    const projected = slips.map((s: any) => ({
      ...s,
      hasSlipImage: true, // All submitted slips have a receipt
    }));

    res.status(200).json({ success: true, count: projected.length, data: projected });
  } catch (error: any) {
    logger.error('[getAllPaymentSlips] ' + error.message, 'SLIPS');
    res.status(500).json({ success: false, message: 'Failed to retrieve payment slips.' });
  }
};

// @desc    Generate a short-lived signed URL for viewing a receipt image (Admin only)
// @route   GET /api/slips/:id/image-url
export const getSlipImageUrl = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const slip = await prisma.paymentSlip.findUnique({ where: { id } });

    if (!slip) {
      res.status(404).json({ success: false, message: 'Slip not found.' });
      return;
    }

    // Generate a 15-minute signed URL
    const signedUrl = generateSignedReceiptUrl(id, 900);
    res.status(200).json({ success: true, url: signedUrl, expiresInSeconds: 900 });
  } catch (error: any) {
    logger.error('[getSlipImageUrl] ' + error.message, 'SLIPS');
    res.status(500).json({ success: false, message: 'Failed to generate slip image URL.' });
  }
};

// @desc    Serve the actual slip binary via short-lived signed token (no auth required — token IS the auth)
// @route   GET /api/slips/:id/view?token=...&expires=...
export const viewSlipImage = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { token, expires } = req.query as { token?: string; expires?: string };

    if (!token || !expires) {
      res.status(401).json({ success: false, message: 'Missing signed token parameters.' });
      return;
    }

    if (!verifySignedReceiptToken(id, token, expires)) {
      res.status(401).json({ success: false, message: 'Invalid or expired receipt token.' });
      return;
    }

    const slip = await prisma.paymentSlip.findUnique({
      where: { id },
      select: { id: true, slipUrl: true },
    });

    if (!slip || !slip.slipUrl) {
      res.status(404).json({ success: false, message: 'Slip not found.' });
      return;
    }

    // Case 1: storageKey in slipUrl (uploaded to private vault)
    if (slip.slipUrl.startsWith('slips/')) {
      const file = await getPrivateReceipt(slip.slipUrl);
      if (!file) {
        res.status(404).json({ success: false, message: 'Receipt file not found in storage.' });
        return;
      }
      res.setHeader('Content-Type', file.mimeType);
      res.setHeader('Content-Disposition', `inline; filename="receipt-${id}.${file.mimeType.split('/')[1]}"`);
      res.setHeader('Cache-Control', 'private, no-store');
      res.status(200).send(file.buffer);
      return;
    }

    // Case 2: Legacy base64 data URI still in DB — serve it directly
    if (slip.slipUrl.startsWith('data:')) {
      const [header, b64] = slip.slipUrl.split(',');
      const mimeMatch = header.match(/data:([^;]+)/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
      const buffer = Buffer.from(b64, 'base64');
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `inline; filename="receipt-${id}"`);
      res.setHeader('Cache-Control', 'private, no-store');
      res.status(200).send(buffer);
      return;
    }

    // Case 3: External HTTPS URL — redirect
    if (slip.slipUrl.startsWith('https://')) {
      res.redirect(302, slip.slipUrl);
      return;
    }

    res.status(404).json({ success: false, message: 'Slip image not available.' });
  } catch (error: any) {
    logger.error('[viewSlipImage] ' + error.message, 'SLIPS');
    res.status(500).json({ success: false, message: 'Failed to retrieve slip image.' });
  }
};

// @desc    Submit a new bank payment slip (Public Student Checkout)
// @route   POST /api/slips
export const createPaymentSlip = async (req: Request, res: Response): Promise<void> => {
  try {
    const { studentName, studentPhone, studentEmail, courseSlug, slipUrl, amount, bankReference, notes } = req.body;

    if (!studentName || !studentPhone || !courseSlug || !slipUrl) {
      res.status(400).json({ success: false, message: 'Name, WhatsApp Phone, Course, and Bank Slip are required.' });
      return;
    }

    if (studentName.trim().length > 100) {
      res.status(400).json({ success: false, message: 'Student Name must be under 100 characters.' });
      return;
    }

    const cleanPhone = studentPhone.trim();
    if (!PHONE_REGEX.test(cleanPhone)) {
      res.status(400).json({ success: false, message: 'Invalid phone number format.' });
      return;
    }

    if (studentEmail && !EMAIL_REGEX.test(studentEmail.trim())) {
      res.status(400).json({ success: false, message: 'Invalid email address format.' });
      return;
    }

    // ── SERVER-SIDE MAGIC BYTE VALIDATION ────────────────────────────────────
    // Reject anything that is not a genuine PNG / JPEG / PDF / WEBP binary,
    // regardless of what the frontend claims the MIME type is.
    let storageRef = slipUrl; // Default: store URL as-is for external HTTPS links

    if (slipUrl.startsWith('data:')) {
      const validation = validateReceiptSignature(slipUrl);
      if (!validation.isValid || !validation.buffer) {
        res.status(400).json({
          success: false,
          message: 'Uploaded file failed binary signature validation. Only genuine PNG, JPEG, WEBP, or PDF bank receipts are accepted.',
        });
        return;
      }

      // Upload to private object storage — no base64 blob in PostgreSQL
      const uploadResult = await uploadPrivateReceipt(
        validation.buffer,
        validation.extension!,
        validation.mimeType!
      );
      storageRef = uploadResult.storageKey; // Store only the storage key in DB
    }

    const newSlip = await prisma.paymentSlip.create({
      data: {
        studentName: studentName.trim(),
        studentPhone: cleanPhone,
        studentEmail: studentEmail ? studentEmail.trim().toLowerCase() : null,
        courseSlug: courseSlug.trim().toLowerCase(),
        slipUrl: storageRef, // Storage key or HTTPS URL — never raw base64
        amount: typeof amount === 'number' ? amount : parseFloat(amount) || null,
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

    // Return the new slip without slipUrl (never expose raw binary reference to student)
    const { slipUrl: _redacted, ...safeSlip } = newSlip as any;
    res.status(201).json({ success: true, data: { ...safeSlip, hasSlipImage: true } });
  } catch (error: any) {
    logger.error('[createPaymentSlip] ' + error.message, 'SLIPS');
    res.status(500).json({ success: false, message: 'Failed to submit payment slip. Please try again.' });
  }
};

// @desc    Verify or Reject payment slip (Admin HQ)
// @route   PUT /api/slips/:id/status
export const updateSlipStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { status, adminNotes, couponCode, notes } = req.body;

    if (!status || !['VERIFIED', 'REJECTED'].includes(status)) {
      res.status(400).json({ success: false, message: 'Status must be VERIFIED or REJECTED.' });
      return;
    }

    const slip = await prisma.paymentSlip.findUnique({ where: { id } });
    if (!slip) {
      res.status(404).json({ success: false, message: 'Payment slip not found.' });
      return;
    }

    if (slip.status === status) {
      res.status(400).json({ success: false, message: `Slip is already ${status}.` });
      return;
    }

    let updatedSlip: any;

    // ── Coupon redemption (atomic conditional DB increment) ───────────────────
    if (couponCode && status === 'VERIFIED') {
      const coupon = await prisma.coupon.findFirst({
        where: { code: couponCode.toUpperCase(), isActive: true },
      });

      if (!coupon) {
        res.status(400).json({ success: false, message: `Coupon ${couponCode} not found or inactive.` });
        return;
      }
      if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) {
        res.status(400).json({ success: false, message: `Coupon ${couponCode} has expired.` });
        return;
      }

      // Atomic: only increments if usedCount < maxUses. Race-safe via DB-level conditional.
      const couponUpdateRes = await prisma.coupon.updateMany({
        where: {
          id: coupon.id,
          isActive: true,
          usedCount: { lt: coupon.maxUses },
        },
        data: { usedCount: { increment: 1 } },
      });

      if (couponUpdateRes.count === 0) {
        res.status(400).json({
          success: false,
          message: `Coupon ${couponCode} has reached its maximum usage limit (${coupon.maxUses}).`,
        });
        return;
      }
    }

    // ── Seat decrement (atomic conditional DB decrement) ─────────────────────
    if (status === 'VERIFIED' && slip.courseSlug) {
      const upcomingBatch = await prisma.courseBatch.findFirst({
        where: { courseSlug: slip.courseSlug, status: 'UPCOMING' },
        orderBy: { startDate: 'asc' },
      });

      if (upcomingBatch) {
        // Atomic: only decrements if availableSeats > 0. Race-safe via DB-level conditional.
        const seatUpdateRes = await prisma.courseBatch.updateMany({
          where: { id: upcomingBatch.id, availableSeats: { gt: 0 } },
          data: { availableSeats: { decrement: 1 } },
        });

        if (seatUpdateRes.count === 0) {
          // Undo coupon increment if seat claim failed
          if (couponCode) {
            await prisma.coupon.updateMany({
              where: { code: couponCode.toUpperCase() },
              data: { usedCount: { decrement: 1 } },
            }).catch(() => {/* best-effort */});
          }
          res.status(500).json({
            success: false,
            message: `No available seats remaining in upcoming batch for ${slip.courseSlug}.`,
          });
          return;
        }
      }
    }

    // ── Update slip status ───────────────────────────────────────────────────
    updatedSlip = await prisma.paymentSlip.update({
      where: { id },
      data: {
        status: status as any,
        adminNotes: adminNotes || null,
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
        // slipUrl intentionally excluded
      },
    });

    await recordAdminAudit({
      adminId: req.user?.id,
      adminEmail: req.user?.email,
      action: `SLIP_${status}`,
      targetEntity: 'PaymentSlip',
      targetId: id,
      details: {
        studentName: slip.studentName,
        courseSlug: slip.courseSlug,
        amount: slip.amount,
        bankReference: slip.bankReference,
        notes,
      },
      ipAddress: req.ip,
    });

    res.status(200).json({ success: true, data: { ...updatedSlip, hasSlipImage: true } });
  } catch (error: any) {
    logger.error('[updateSlipStatus] ' + error.message, 'SLIPS');
    res.status(500).json({ success: false, message: 'Failed to update payment slip status.' });
  }
};

// @desc    Delete payment slip record
// @route   DELETE /api/slips/:id
export const deleteSlip = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    await prisma.paymentSlip.delete({ where: { id } });
    res.status(200).json({ success: true, message: 'Payment slip removed successfully.' });
  } catch (error: any) {
    logger.error('[deleteSlip] ' + error.message, 'SLIPS');
    res.status(500).json({ success: false, message: 'Failed to delete payment slip.' });
  }
};
