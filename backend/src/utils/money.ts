/**
 * money.ts — DATA-6 Financial Arithmetic & Payment Reconciliation
 *
 * Design principles:
 *  - All internal arithmetic uses integer minor units (LKR cents: 1 LKR = 100 cents)
 *    to avoid IEEE-754 floating-point drift (e.g. 0.1 + 0.2 ≠ 0.3).
 *  - Prisma Decimal fields are read with `.toFixed(2)` and then multiplied by 100
 *    to convert to cents before any arithmetic.
 *  - Rounding: "half-up" (ROUND_HALF_UP) — standard commercial rounding for LKR.
 *    Banker's rounding (ROUND_HALF_EVEN) is available as an alternative if needed.
 *  - All public functions accept Prisma Decimal | number | string and return number
 *    (JS number is safe for amounts up to ~9 quadrillion cents which is >> needed).
 */

import { Prisma } from '@prisma/client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MoneyInput = Prisma.Decimal | number | string | null | undefined;

export enum ReconciliationStatus {
  EXACT_MATCH = 'EXACT_MATCH',
  OVERPAID    = 'OVERPAID',
  UNDERPAID   = 'UNDERPAID',
}

export interface ReconciliationResult {
  status: ReconciliationStatus;
  expectedCents: number;   // authoritative price after discount, in minor units
  paidCents: number;       // student-declared paid amount, in minor units
  deltaCents: number;      // paidCents - expectedCents (positive = overpaid)
  expectedLkr: string;     // human-readable "RS. 12,500.00"
  paidLkr: string;         // human-readable "RS. 12,750.00"
  deltaLkr: string;        // human-readable "+250.00" or "-250.00"
}

export interface DiscountResult {
  originalCents: number;
  discountCents: number;
  finalCents: number;
  originalLkr: string;
  discountLkr: string;
  finalLkr: string;
}

// ---------------------------------------------------------------------------
// Core conversion helpers
// ---------------------------------------------------------------------------

/**
 * Convert any money input (Decimal, number, string) to integer cents.
 * Returns 0 for null/undefined/NaN.
 */
export function toCents(value: MoneyInput): number {
  if (value === null || value === undefined) return 0;

  let lkr: number;
  if (value instanceof Prisma.Decimal) {
    // Parse via string to avoid Decimal → JS float precision loss
    lkr = parseFloat(value.toFixed(2));
  } else if (typeof value === 'string') {
    lkr = parseFloat(value.replace(/[^0-9.\-]/g, ''));
  } else {
    lkr = value as number;
  }

  if (!isFinite(lkr) || isNaN(lkr)) return 0;

  // Half-up rounding to nearest cent
  return Math.round(lkr * 100);
}

/**
 * Convert integer cents to a LKR Decimal-safe number (2 d.p.).
 * Safe to pass directly to `new Prisma.Decimal(lkrFromCents(cents))`.
 */
export function lkrFromCents(cents: number): number {
  return Math.round(cents) / 100;
}

/**
 * Format cents as a human-readable LKR string.
 * e.g. 1250000 → "RS. 12,500.00"
 */
export function formatLkr(cents: number, symbol = 'RS.'): string {
  const lkr = lkrFromCents(cents);
  return `${symbol} ${lkr.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Convert a Prisma Decimal (or number/string) back to a JS number with 2 d.p.
 * Safe for JSON serialization.
 */
export function toNumber(value: MoneyInput): number {
  return lkrFromCents(toCents(value));
}

/**
 * Wrap a cents value back into a Prisma.Decimal for DB writes.
 */
export function toPrismaDecimal(cents: number): Prisma.Decimal {
  return new Prisma.Decimal(lkrFromCents(cents).toFixed(2));
}

// ---------------------------------------------------------------------------
// Discount calculation
// ---------------------------------------------------------------------------

/**
 * Calculate discount in exact integer cents.
 *
 * @param originalCents  Course price in minor units (from DB Decimal, toCents())
 * @param discountPercent  Coupon.discountPercent (Decimal %) — mutually exclusive with discountAmount
 * @param discountAmount   Coupon.discountAmount  (Decimal LKR)
 * @returns DiscountResult with all monetary values in both cents and human-readable LKR
 */
export function calculateDiscount(
  originalCents: number,
  discountPercent?: MoneyInput,
  discountAmount?: MoneyInput,
): DiscountResult {
  let discountCents = 0;

  const pctCents = toCents(discountPercent);
  const flatCents = toCents(discountAmount);

  if (pctCents > 0) {
    // Half-up rounding: (price * percent) / 100
    // Work entirely in cents: discountCents = round(originalCents * pct / 10000)
    // pctCents is the percent value * 100 (e.g. 20% → 2000 cents)
    // So: discountCents = originalCents * (pctCents / 100) / 100
    //                   = originalCents * pctCents / 10000
    discountCents = Math.round((originalCents * pctCents) / 10000);
  } else if (flatCents > 0) {
    discountCents = Math.min(originalCents, flatCents);
  }

  const finalCents = Math.max(0, originalCents - discountCents);

  return {
    originalCents,
    discountCents,
    finalCents,
    originalLkr: formatLkr(originalCents),
    discountLkr: formatLkr(discountCents),
    finalLkr: formatLkr(finalCents),
  };
}

// ---------------------------------------------------------------------------
// Payment reconciliation
// ---------------------------------------------------------------------------

/**
 * Reconcile a student-declared bank transfer amount against the authoritative
 * expected price (course price minus coupon discount).
 *
 * @param expectedCents   Authoritative price after discount (from calculateDiscount)
 * @param paidCents       Student-declared amount from PaymentSlip.amount field
 * @param toleranceLkr    Acceptable abs delta in LKR (default 1.00 = rounding tolerance)
 * @returns ReconciliationResult
 */
export function reconcilePayment(
  expectedCents: number,
  paidCents: number,
  toleranceLkr = 1.00,
): ReconciliationResult {
  const toleranceCents = Math.round(toleranceLkr * 100);
  const deltaCents = paidCents - expectedCents;
  const absDelta = Math.abs(deltaCents);

  let status: ReconciliationStatus;
  if (absDelta <= toleranceCents) {
    status = ReconciliationStatus.EXACT_MATCH;
  } else if (deltaCents > 0) {
    status = ReconciliationStatus.OVERPAID;
  } else {
    status = ReconciliationStatus.UNDERPAID;
  }

  const sign = deltaCents >= 0 ? '+' : '-';

  return {
    status,
    expectedCents,
    paidCents,
    deltaCents,
    expectedLkr: formatLkr(expectedCents),
    paidLkr: formatLkr(paidCents),
    deltaLkr: `${sign}${formatLkr(Math.abs(deltaCents)).replace(/^RS\.\s*/, '')}`,
  };
}

// ---------------------------------------------------------------------------
// Coupon validation helpers (used in controllers)
// ---------------------------------------------------------------------------

/**
 * Given a Prisma Coupon record (with Decimal fields), compute the full
 * discount for a given course price in LKR.
 * Returns a DiscountResult ready for API serialization.
 */
export function applyCoupon(
  coursePriceLkr: MoneyInput,
  coupon: { discountPercent?: MoneyInput; discountAmount?: MoneyInput },
): DiscountResult {
  const originalCents = toCents(coursePriceLkr);
  return calculateDiscount(originalCents, coupon.discountPercent, coupon.discountAmount);
}
