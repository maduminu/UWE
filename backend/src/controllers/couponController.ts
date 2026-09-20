import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { Prisma } from '@prisma/client';
import { recordAdminAudit } from '../utils/auditLogger';
import { logger } from '../utils/logger';
import { sendError, ErrorCode } from '../utils/apiResponse';
import { toCents, applyCoupon, lkrFromCents } from '../utils/money';

// @desc    Validate coupon code at checkout
// @route   POST /api/coupons/validate
export const validateCoupon = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, courseSlug, originalPrice } = req.body;

    if (!code || typeof code !== 'string') {
      sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'Coupon code is required.', req);
      return;
    }

    const cleanCode = code.trim().toUpperCase();
    const coupon = await prisma.coupon.findUnique({
      where: { code: cleanCode },
    });

    if (!coupon || !coupon.isActive) {
      sendError(res, 404, ErrorCode.NOT_FOUND, 'Invalid or inactive coupon code.', req);
      return;
    }

    // Check expiry
    if (coupon.expiryDate && new Date() > new Date(coupon.expiryDate)) {
      sendError(res, 400, ErrorCode.BAD_REQUEST, 'This coupon code has expired.', req);
      return;
    }

    // Check max uses
    if (coupon.usedCount >= coupon.maxUses) {
      sendError(res, 400, ErrorCode.BAD_REQUEST, 'This coupon has reached its maximum usage limit.', req);
      return;
    }

    // Check course restriction
    if (coupon.courseSlug && courseSlug && coupon.courseSlug.toLowerCase() !== courseSlug.toLowerCase()) {
      sendError(res, 400, ErrorCode.BAD_REQUEST, `This coupon is only valid for the ${coupon.courseSlug.toUpperCase()} course.`, req);
      return;
    }

    // Calculate discount using authoritative database course price where available
    let priceInput: any = typeof originalPrice === 'number' ? originalPrice : parseFloat(originalPrice) || 0;
    const targetSlug = (courseSlug || coupon.courseSlug || '').trim().toLowerCase();
    if (targetSlug) {
      const course = await prisma.course.findUnique({ where: { slug: targetSlug } });
      if (course && toCents(course.price) > 0) {
        priceInput = course.price; // Prisma Decimal — exact
      }
    }

    const discount = applyCoupon(priceInput, coupon);

    res.status(200).json({
      success: true,
      message: `Coupon ${coupon.code} applied successfully!`,
      data: {
        code: coupon.code,
        discountPercent: coupon.discountPercent ? lkrFromCents(toCents(coupon.discountPercent)) : null,
        discountAmount: lkrFromCents(discount.discountCents),
        originalPrice: lkrFromCents(discount.originalCents),
        finalPrice: lkrFromCents(discount.finalCents),
        description: coupon.description,
      },
    });
  } catch (error: any) {
    logger.error(`[validateCoupon] ${error.message}`, 'COUPONS');
    sendError(res, 500, ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to validate coupon code.', req);
  }
};

// @desc    Get all coupons (Admin)
// @route   GET /api/coupons
export const getAllCoupons = async (req: Request, res: Response): Promise<void> => {
  try {
    const coupons = await prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.status(200).json({ success: true, count: coupons.length, data: coupons });
  } catch (error: any) {
    logger.error(`[getAllCoupons] ${error.message}`, 'COUPONS');
    sendError(res, 500, ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to fetch coupons.', req);
  }
};

// @desc    Create a new coupon (Admin)
// @route   POST /api/coupons
export const createCoupon = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, discountPercent, discountAmount, courseSlug, maxUses, expiryDate, description } = req.body;

    if (!code || (!discountPercent && !discountAmount)) {
      sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'Coupon Code and a discount percentage or amount are required.', req);
      return;
    }

    const cleanCode = code.trim().toUpperCase();
    const existing = await prisma.coupon.findUnique({ where: { code: cleanCode } });
    if (existing) {
      sendError(res, 400, ErrorCode.CONFLICT, 'A coupon with this code already exists.', req);
      return;
    }

    const newCoupon = await prisma.coupon.create({
      data: {
        code: cleanCode,
        discountPercent: discountPercent ? new Prisma.Decimal(parseFloat(discountPercent).toFixed(2)) : null,
        discountAmount: discountAmount ? new Prisma.Decimal(parseFloat(discountAmount).toFixed(2)) : null,
        courseSlug: courseSlug ? courseSlug.trim().toLowerCase() : null,
        maxUses: maxUses ? parseInt(maxUses, 10) : 100,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        description: description ? description.trim() : null,
        isActive: true,
      },
    });

    await recordAdminAudit({
      adminId: req.user?.id,
      adminEmail: req.user?.email,
      action: 'COUPON_CREATED',
      targetEntity: 'Coupon',
      targetId: newCoupon.id,
      details: { code: newCoupon.code, discountPercent: newCoupon.discountPercent, discountAmount: newCoupon.discountAmount },
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, message: 'Coupon created successfully.', data: newCoupon });
  } catch (error: any) {
    logger.error(`[createCoupon] ${error.message}`, 'COUPONS');
    sendError(res, 500, ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to create coupon.', req);
  }
};

// @desc    Toggle or update coupon (Admin)
// @route   PUT /api/coupons/:id
export const updateCoupon = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { isActive, maxUses, expiryDate, description } = req.body;

    const updated = await prisma.coupon.update({
      where: { id },
      data: {
        ...(typeof isActive === 'boolean' ? { isActive } : {}),
        ...(maxUses ? { maxUses: parseInt(maxUses, 10) } : {}),
        ...(expiryDate ? { expiryDate: new Date(expiryDate) } : {}),
        ...(description !== undefined ? { description } : {}),
      },
    });

    await recordAdminAudit({
      adminId: req.user?.id,
      adminEmail: req.user?.email,
      action: 'COUPON_UPDATED',
      targetEntity: 'Coupon',
      targetId: id,
      details: { isActive: updated.isActive, maxUses: updated.maxUses },
      ipAddress: req.ip,
    });

    res.status(200).json({ success: true, message: 'Coupon updated.', data: updated });
  } catch (error: any) {
    logger.error(`[updateCoupon] ${error.message}`, 'COUPONS');
    sendError(res, 500, ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to update coupon.', req);
  }
};

// @desc    Delete coupon (Admin)
// @route   DELETE /api/coupons/:id
export const deleteCoupon = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    await prisma.coupon.delete({ where: { id } });

    await recordAdminAudit({
      adminId: req.user?.id,
      adminEmail: req.user?.email,
      action: 'COUPON_DELETED',
      targetEntity: 'Coupon',
      targetId: id,
      details: {},
      ipAddress: req.ip,
    });

    res.status(200).json({ success: true, message: 'Coupon deleted.' });
  } catch (error: any) {
    logger.error(`[deleteCoupon] ${error.message}`, 'COUPONS');
    sendError(res, 500, ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to delete coupon.', req);
  }
};

// @desc    Atomically redeem coupon code at checkout / payment completion
// @route   POST /api/coupons/redeem
export const redeemCoupon = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, courseSlug, originalPrice } = req.body;

    if (!code || typeof code !== 'string') {
      sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'Coupon code is required.', req);
      return;
    }

    const cleanCode = code.trim().toUpperCase();

    const redemptionResult = await prisma.$transaction(async (tx) => {
      const coupon = await tx.coupon.findUnique({
        where: { code: cleanCode },
      });

      if (!coupon || !coupon.isActive) {
        throw new Error('Invalid or inactive coupon code.');
      }

      if (coupon.expiryDate && new Date() > new Date(coupon.expiryDate)) {
        throw new Error('This coupon code has expired.');
      }

      if (coupon.courseSlug && courseSlug && coupon.courseSlug.toLowerCase() !== courseSlug.toLowerCase()) {
        throw new Error(`This coupon is only valid for the ${coupon.courseSlug.toUpperCase()} course.`);
      }

      // Conditional atomic increment in DB
      const updateRes = await tx.coupon.updateMany({
        where: {
          id: coupon.id,
          isActive: true,
          usedCount: { lt: coupon.maxUses },
        },
        data: {
          usedCount: { increment: 1 },
        },
      });

      if (updateRes.count === 0) {
        throw new Error('This coupon has reached its maximum usage limit.');
      }

      // Calculate authoritative discount via exact Decimal arithmetic
      let priceInput: any = typeof originalPrice === 'number' ? originalPrice : parseFloat(originalPrice) || 0;
      const targetSlug = (courseSlug || coupon.courseSlug || '').trim().toLowerCase();
      if (targetSlug) {
        const course = await tx.course.findUnique({ where: { slug: targetSlug } });
        if (course && toCents(course.price) > 0) {
          priceInput = course.price;
        }
      }

      const discount = applyCoupon(priceInput, coupon);

      return {
        code: coupon.code,
        discountPercent: coupon.discountPercent ? lkrFromCents(toCents(coupon.discountPercent)) : null,
        discountAmount: lkrFromCents(discount.discountCents),
        originalPrice: lkrFromCents(discount.originalCents),
        finalPrice: lkrFromCents(discount.finalCents),
        usedCount: coupon.usedCount + 1,
        maxUses: coupon.maxUses,
      };
    });

    res.status(200).json({
      success: true,
      message: `Coupon ${redemptionResult.code} redeemed successfully!`,
      data: redemptionResult,
    });
  } catch (error: any) {
    logger.warn(`[redeemCoupon] ${error.message}`, 'COUPONS');
    sendError(res, 400, ErrorCode.BAD_REQUEST, 'Failed to redeem coupon code.', req);
  }
};
