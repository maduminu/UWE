/**
 * data6_money_correctness.test.ts
 * DATA-6: Exact financial arithmetic, rounding, and payment reconciliation.
 */

import { describe, test, expect } from 'vitest';
import {
  toCents,
  lkrFromCents,
  formatLkr,
  toNumber,
  toPrismaDecimal,
  calculateDiscount,
  applyCoupon,
  reconcilePayment,
  ReconciliationStatus,
} from '../utils/money';
import { Prisma } from '@prisma/client';

// ---------------------------------------------------------------------------
// 1. Minor-unit conversion
// ---------------------------------------------------------------------------
describe('DATA-6 | toCents — exact minor unit conversion', () => {
  test('converts plain number correctly', () => {
    expect(toCents(12500)).toBe(1250000);
  });

  test('converts decimal number with half-up rounding', () => {
    // 12500.555 → rounds to 12500.56 → 1250056 cents
    expect(toCents(12500.555)).toBe(1250056);
  });

  test('converts Prisma.Decimal correctly', () => {
    const d = new Prisma.Decimal('12500.00');
    expect(toCents(d)).toBe(1250000);
  });

  test('converts string value', () => {
    expect(toCents('2500')).toBe(250000);
  });

  test('returns 0 for null', () => {
    expect(toCents(null)).toBe(0);
  });

  test('returns 0 for undefined', () => {
    expect(toCents(undefined)).toBe(0);
  });

  test('no IEEE-754 drift: 0.1 + 0.2 via toCents', () => {
    // Float 0.1 + 0.2 = 0.30000000000000004 in JS
    // Via cents: toCents(0.1) + toCents(0.2) = 10 + 20 = 30
    expect(toCents(0.1) + toCents(0.2)).toBe(30);
  });
});

describe('DATA-6 | lkrFromCents & formatLkr', () => {
  test('lkrFromCents converts correctly', () => {
    expect(lkrFromCents(1250000)).toBe(12500);
  });

  test('formatLkr renders human-readable string', () => {
    expect(formatLkr(1250000)).toBe('RS. 12,500.00');
  });

  test('formatLkr with custom symbol', () => {
    expect(formatLkr(250000, 'LKR')).toBe('LKR 2,500.00');
  });

  test('toPrismaDecimal returns Prisma.Decimal instance', () => {
    const d = toPrismaDecimal(1250000);
    expect(d instanceof Prisma.Decimal).toBe(true);
    expect(d.toFixed(2)).toBe('12500.00');
  });
});

// ---------------------------------------------------------------------------
// 2. Discount calculation (exact integer arithmetic)
// ---------------------------------------------------------------------------
describe('DATA-6 | calculateDiscount — integer arithmetic', () => {
  const originalCents = 1250000; // RS. 12,500.00

  test('percentage discount: 20% off RS. 12,500 → RS. 2,500 off', () => {
    const result = calculateDiscount(originalCents, 20, undefined);
    expect(result.discountCents).toBe(250000);
    expect(result.finalCents).toBe(1000000);
    expect(result.finalLkr).toBe('RS. 10,000.00');
  });

  test('percentage discount half-up rounding: 33% of RS. 1.00', () => {
    // 33% of 100 cents = 33 cents (exactly 33.00 — no rounding issue here)
    const result = calculateDiscount(100, 33, undefined);
    expect(result.discountCents).toBe(33);
    expect(result.finalCents).toBe(67);
  });

  test('flat discount: RS. 2,500 off RS. 12,500', () => {
    const result = calculateDiscount(originalCents, undefined, 2500);
    expect(result.discountCents).toBe(250000);
    expect(result.finalCents).toBe(1000000);
  });

  test('flat discount capped at original price (no negative)', () => {
    const result = calculateDiscount(100000, undefined, 200000); // RS. 1,000 off RS. 2,000 price
    expect(result.finalCents).toBe(0);
    expect(result.discountCents).toBe(100000);
  });

  test('no discount if both values are zero/null', () => {
    const result = calculateDiscount(1250000, undefined, undefined);
    expect(result.discountCents).toBe(0);
    expect(result.finalCents).toBe(1250000);
  });

  test('percentage takes priority over flat amount', () => {
    // Both provided — only percent applies (first branch wins)
    const result = calculateDiscount(1000000, 10, 50000);
    expect(result.discountCents).toBe(100000); // 10% of 10000 = 1000 LKR
  });
});

// ---------------------------------------------------------------------------
// 3. applyCoupon — using Prisma.Decimal inputs
// ---------------------------------------------------------------------------
describe('DATA-6 | applyCoupon — Prisma Decimal inputs', () => {
  test('applies percentage coupon from Decimal fields', () => {
    const coupon = {
      discountPercent: new Prisma.Decimal('20.00'),
      discountAmount: undefined,
    };
    const result = applyCoupon(new Prisma.Decimal('12500.00'), coupon);
    expect(result.discountCents).toBe(250000);
    expect(result.finalCents).toBe(1000000);
  });

  test('applies flat coupon from Decimal fields', () => {
    const coupon = {
      discountPercent: undefined,
      discountAmount: new Prisma.Decimal('2500.00'),
    };
    const result = applyCoupon(12500, coupon);
    expect(result.discountCents).toBe(250000);
    expect(result.finalCents).toBe(1000000);
  });
});

// ---------------------------------------------------------------------------
// 4. Payment reconciliation
// ---------------------------------------------------------------------------
describe('DATA-6 | reconcilePayment — exact, over, under', () => {
  const expectedCents = 1000000; // RS. 10,000.00 after coupon

  test('EXACT_MATCH: paid exactly the expected amount', () => {
    const r = reconcilePayment(expectedCents, 1000000);
    expect(r.status).toBe(ReconciliationStatus.EXACT_MATCH);
    expect(r.deltaCents).toBe(0);
  });

  test('EXACT_MATCH: within default RS. 1.00 tolerance (50 cents over)', () => {
    const r = reconcilePayment(expectedCents, 1000050); // 50 cents = 0.50 LKR
    expect(r.status).toBe(ReconciliationStatus.EXACT_MATCH);
  });

  test('EXACT_MATCH: within RS. 1.00 tolerance (100 cents = 1 LKR)', () => {
    const r = reconcilePayment(expectedCents, 1000100);
    expect(r.status).toBe(ReconciliationStatus.EXACT_MATCH);
  });

  test('OVERPAID: paid more than tolerance', () => {
    const r = reconcilePayment(expectedCents, 1002500); // RS. 25 overpaid
    expect(r.status).toBe(ReconciliationStatus.OVERPAID);
    expect(r.deltaCents).toBe(2500);
    expect(r.deltaLkr).toBe('+25.00');
  });

  test('UNDERPAID: paid less than tolerance', () => {
    const r = reconcilePayment(expectedCents, 990000); // RS. 100 underpaid
    expect(r.status).toBe(ReconciliationStatus.UNDERPAID);
    expect(r.deltaCents).toBe(-10000);
    expect(r.deltaLkr).toBe('-100.00');
  });

  test('custom tolerance: RS. 50.00', () => {
    const r = reconcilePayment(expectedCents, 1004500, 50.00); // RS. 45 over — within RS. 50 tolerance
    expect(r.status).toBe(ReconciliationStatus.EXACT_MATCH);
  });

  test('reconciliation result includes human-readable LKR strings', () => {
    const r = reconcilePayment(expectedCents, 1000000);
    expect(r.expectedLkr).toBe('RS. 10,000.00');
    expect(r.paidLkr).toBe('RS. 10,000.00');
  });
});
