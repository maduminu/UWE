import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

/**
 * Generic Express middleware to validate request body against a Zod schema.
 */
export const validateBody = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const result = schema.safeParse(req.body || {});
      if (!result.success) {
        const issues = result.error?.issues || result.error?.errors || [];
        const formattedErrors = issues.map((err: any) => ({
          field: Array.isArray(err.path) ? err.path.join('.') : String(err.path || 'root'),
          message: err.message || 'Validation error',
        }));

        const errorSummary = formattedErrors.map((e: any) => `${e.field}: ${e.message}`).join(', ');

        res.status(400).json({
          success: false,
          message: `Validation failed: ${errorSummary}`,
          errors: formattedErrors,
        });
        return;
      }

      req.body = result.data;
      next();
    } catch (err: any) {
      res.status(400).json({
        success: false,
        message: `Invalid request payload format: ${err?.message || 'Unknown error'}`,
      });
    }
  };
};

export const validate = validateBody;

/**
 * Generic Express middleware to validate request query params against a Zod schema.
 */
export const validateQuery = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const result = schema.safeParse(req.query || {});
      if (!result.success) {
        const issues = result.error?.issues || result.error?.errors || [];
        const formattedErrors = issues.map((err: any) => ({
          field: Array.isArray(err.path) ? err.path.join('.') : String(err.path || 'root'),
          message: err.message || 'Validation error',
        }));

        const errorSummary = formattedErrors.map((e: any) => `${e.field}: ${e.message}`).join(', ');

        res.status(400).json({
          success: false,
          message: `Invalid query parameters: ${errorSummary}`,
          errors: formattedErrors,
        });
        return;
      }

      req.query = result.data as any;
      next();
    } catch (err: any) {
      res.status(400).json({
        success: false,
        message: `Invalid query parameters: ${err?.message || 'Unknown error'}`,
      });
    }
  };
};

// ── Common Schemas ─────────────────────────────────────────────────────────

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const adminLoginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const leadSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().min(5, 'Valid phone number is required'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  courseSlug: z.string().optional(),
  inquiryType: z.enum(['BMB', 'LEADERSHIP', 'IGNIT', 'CORPORATE', 'JOB_APPLICATION', 'GENERAL']).optional(),
  message: z.string().optional(),
  notes: z.string().optional(),
});

export const jobApplicationSchema = z.object({
  vacancyId: z.string().min(1, 'Vacancy ID is required'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().min(5, 'Valid phone number is required'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  experience: z.string().optional(),
});

export const paymentSlipSchema = z.object({
  studentName: z.string().trim().min(2, 'Student name is required').max(100),
  studentPhone: z.string().trim().min(5, 'Valid phone number is required').max(25),
  studentEmail: z.string().email('Invalid email address').optional().or(z.literal('')),
  courseSlug: z.string().min(1, 'Course program is required'),
  // NOTE: Magic-byte (binary signature) server-side validation occurs in paymentSlipController.ts.
  // This Zod refine only blocks obviously invalid strings (non-data URI, non-HTTPS).
  // File size is capped at ~6MB (base64 overhead ~33%).
  slipUrl: z.string().min(1, 'Bank receipt / slip image is required').max(7000000, 'Receipt file size exceeds 5MB limit').refine(
    (val) =>
      val.startsWith('data:image/jpeg') ||
      val.startsWith('data:image/png') ||
      val.startsWith('data:image/webp') ||
      val.startsWith('data:image/jpg') ||
      val.startsWith('data:application/pdf') ||
      val.startsWith('https://') ||
      (process.env.NODE_ENV !== 'production' && val.startsWith('http://localhost')),
    { message: 'Payment slip must be a valid JPEG, PNG, WEBP, PDF receipt or secure HTTPS URL' }
  ),
  amount: z.number().nonnegative().optional(),
  bankReference: z.string().trim().max(100).optional(),
  notes: z.string().trim().max(500).optional(),
});

export const couponSchema = z.object({
  code: z.string().min(2, 'Coupon code must be at least 2 characters').toUpperCase(),
  discountPercent: z.number().min(1).max(100).optional(),
  discountAmount: z.number().positive().optional(),
  courseSlug: z.string().optional().nullable(),
  maxUses: z.number().int().positive().optional(),
  expiryDate: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
});

export const reviewSchema = z.object({
  courseSlug: z.string().min(1, 'Course slug is required'),
  studentName: z.string().min(2, 'Student name must be at least 2 characters'),
  studentRole: z.string().optional(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(5, 'Review comment must be at least 5 characters'),
  title: z.string().optional(),
});

export const bannerSchema = z.object({
  message: z.string().min(5, 'Banner message must be at least 5 characters'),
  badgeText: z.string().optional().nullable(),
  linkUrl: z.string().optional().nullable(),
  bannerType: z.enum(['URGENT', 'PROMO', 'INFO']).optional(),
  isActive: z.boolean().optional(),
});

export const staffSchema = z.object({
  name: z.string().trim().min(2, 'Name is required').max(100),
  role: z.string().trim().min(2, 'Role is required').max(100),
  phone: z.string().trim().min(5, 'Valid phone is required').max(30),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  avatarUrl: z.string().optional().nullable(),
  bio: z.string().optional().nullable(),
  badgeText: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export const instructorSchema = z.object({
  name: z.string().trim().min(2, 'Name is required').max(100),
  title: z.string().trim().min(2, 'Title is required').max(100),
  bio: z.string().optional().nullable(),
  avatarUrl: z.string().optional().nullable(),
  badgeText: z.string().optional().nullable(),
  courseSlugs: z.string().optional().nullable(),
  rating: z.number().min(0).max(5).optional(),
  studentsCount: z.number().int().nonnegative().optional(),
  isActive: z.boolean().optional(),
});

export const batchUpdateSchema = z.object({
  scheduleText: z.string().optional(),
  availableSeats: z.number().int().nonnegative().optional(),
  totalSeats: z.number().int().positive().optional(),
  zoomLink: z.string().optional().nullable(),
  status: z.enum(['UPCOMING', 'IN_PROGRESS', 'COMPLETED']).optional(),
});
