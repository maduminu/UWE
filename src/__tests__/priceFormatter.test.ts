import { describe, it, expect } from 'vitest';
import { parsePrice, formatPrice } from '../utils/priceFormatter';

describe('Price Formatter & Parser Utility Tests', () => {
  it('parses numeric input accurately', () => {
    expect(parsePrice(12500)).toBe(12500);
    expect(parsePrice(100000)).toBe(100000);
    expect(parsePrice(0)).toBe(0);
  });

  it('parses formatted strings with comma separators', () => {
    expect(parsePrice('12,500')).toBe(12500);
    expect(parsePrice('100,000')).toBe(100000);
    expect(parsePrice('1,250,000')).toBe(1250000);
  });

  it('parses strings with currency prefixes and spaces', () => {
    expect(parsePrice('RS. 12,500')).toBe(12500);
    expect(parsePrice('RS. 100,000')).toBe(100000);
    expect(parsePrice('RS 45,000')).toBe(45000);
    expect(parsePrice('$ 500')).toBe(500);
  });

  it('handles dot used as thousand separator', () => {
    expect(parsePrice('12.500')).toBe(12500);
    expect(parsePrice('100.000')).toBe(100000);
  });

  it('handles invalid or empty inputs gracefully', () => {
    expect(parsePrice('')).toBe(0);
    expect(parsePrice(null as any)).toBe(0);
    expect(parsePrice(undefined as any)).toBe(0);
    expect(parsePrice('invalid_text')).toBe(0);
  });

  it('formats numeric values into currency display string', () => {
    expect(formatPrice(12500)).toBe('RS. 12,500');
    expect(formatPrice(100000)).toBe('RS. 100,000');
    expect(formatPrice(45000, 'USD')).toBe('USD 45,000');
  });
});
