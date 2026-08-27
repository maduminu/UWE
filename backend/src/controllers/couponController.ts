import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { recordAdminAudit } from '../utils/auditLogger';

// @desc    Validate coupon code at checkout
// @route   POST /api/coupons/validate
export const validateCoupon = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, courseSlug, originalPrice } = req.body;

    if (!code || typeof code !== 'string') {
      res.status(400).json({ success: false, message: 'Coupon code is required.' });
      return;
    }

    const cleanCode = code.trim().toUpperCase();
    const coupon = await prisma.coupon.findUnique({
      where: { code: cleanCode },
    });

    if (!coupon || !coupon.isActive) {
      res.status(404).json({ success: false, message: 'Invalid or inactive coupon code.' });
      return;
    }

    // Check expiry
    if (coupon.expiryDate && new Date() > new Date(coupon.expiryDate)) {
      res.status(400).json({ success: false, message: 'This coupon code has expired.' });
      return;
    }

    // Check max uses
    if (coupon.usedCount >= coupon.maxUses) {
      res.status(400).json({ success: false, message: 'This coupon has reached its maximum usage limit.' });
      return;
    }

    // Check course restriction
    if (coupon.courseSlug && courseSlug && coupon.courseSlug.toLowerCase() !== courseSlug.toLowerCase()) {
      res.status(400).json({ success: false, message: `This coupon is only valid for the ${coupon.courseSlug.toUpperCase()} course.` });
      return;
    }

    // Calculate discount using authoritative database course price where available
    let price = typeof originalPrice === 'number' ? originalPrice : parseFloat(originalPrice) || 0;
    const targetSlug = (courseSlug || coupon.courseSlug || '').trim().toLowerCase();
    if (targetSlug) {
      const course = await prisma.course.findUnique({ where: { slug: targetSlug } });
      if (course && typeof course.price === 'number' && course.price > 0) {
        price = course.price;
      }
    }

    let discountAmount = 0;

    if (coupon.discountPercent) {
      discountAmount = (price * coupon.discountPercent) / 100;
    } else if (coupon.discountAmount) {
      discountAmount = Math.min(price, coupon.discountAmount);
    }

    const finalPrice = Math.max(0, price - discountAmount);

    res.status(200).json({
      success: true,
      message: `Coupon ${coupon.code} applied successfully!`,
      data: {
        code: coupon.code,
        discountPercent: coupon.discountPercent,
        discountAmount,
        originalPrice: price,
        finalPrice,
        description: coupon.description,
      },
    });
  } catch (error: any) {
    console.error('[validateCoupon]', error);
    res.status(500).json({ success: false, message: 'Failed to validate coupon code.' });
  }
};

// @desc    Get all coupons (Admin)
// @route   GET /api/coupons
export const getAllCoupons = async (_req: Request, res: Response): Promise<void> => {
  try {
    const coupons = await prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.status(200).json({ success: true, count: coupons.length, data: coupons });
  } catch (error: any) {
    console.error('[getAllCoupons]', error);
    res.status(500).json({ success: false, message: 'Failed to fetch coupons.' });
  }
};

// @desc    Create a new coupon (Admin)
// @route   POST /api/coupons
export const createCoupon = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, discountPercent, discountAmount, courseSlug, maxUses, expiryDate, description } = req.body;

    if (!code || (!discountPercent && !discountAmount)) {
      res.status(400).json({ success: false, message: 'Coupon Code and a discount percentage or amount are required.' });
      return;
    }

    const cleanCode = code.trim().toUpperCase();
    const existing = await prisma.coupon.findUnique({ where: { code: cleanCode } });
    if (existing) {
      res.status(400).json({ success: false, message: 'A coupon with this code already exists.' });
      return;
    }

    const newCoupon = await prisma.coupon.create({
      data: {
        code: cleanCode,
        discountPercent: discountPercent ? parseFloat(discountPercent) : null,
        discountAmount: discountAmount ? parseFloat(discountAmount) : null,
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
    console.error('[createCoupon]', error);
    res.status(500).json({ success: false, message: 'Failed to create coupon.' });
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
    console.error('[updateCoupon]', error);
    res.status(500).json({ success: false, message: 'Failed to update coupon.' });
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
    console.error('[deleteCoupon]', error);
    res.status(500).json({ success: false, message: 'Failed to delete coupon.' });
  }
};

// @desc    Atomically redeem coupon code at checkout / payment completion
// @route   POST /api/coupons/redeem
export const redeemCoupon = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, courseSlug, originalPrice } = req.body;

    if (!code || typeof code !== 'string') {
      res.status(400).json({ success: false, message: 'Coupon code is required.' });
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

      // Calculate authoritative discount
      let price = typeof originalPrice === 'number' ? originalPrice : parseFloat(originalPrice) || 0;
      const targetSlug = (courseSlug || coupon.courseSlug || '').trim().toLowerCase();
      if (targetSlug) {
        const course = await tx.course.findUnique({ where: { slug: targetSlug } });
        if (course && typeof course.price === 'number' && course.price > 0) {
          price = course.price;
        }
      }

      let discountAmount = 0;
      if (coupon.discountPercent) {
        discountAmount = (price * coupon.discountPercent) / 100;
      } else if (coupon.discountAmount) {
        discountAmount = Math.min(price, coupon.discountAmount);
      }

      const finalPrice = Math.max(0, price - discountAmount);

      return {
        code: coupon.code,
        discountPercent: coupon.discountPercent,
        discountAmount,
        originalPrice: price,
        finalPrice,
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
    res.status(400).json({ success: false, message: error.message || 'Failed to redeem coupon code.' });
  }
};
