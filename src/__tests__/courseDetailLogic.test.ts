import { describe, it, expect } from 'vitest';
import { formatPrice, parsePrice } from '../utils/priceFormatter';
import { sanitizeExternalUrl, sanitizeImageUrl, isSafeUrl } from '../utils/urlSecurity';

describe('Enterprise Grade: Course Detail Page Business Logic & Safety Tests', () => {
  describe('1. Price Computations & Installment Breakdown Precision', () => {
    it('accurately splits course price into 3 equal installments without floating point drift', () => {
      const fullPrice = 75000;
      const installmentCount = 3;
      const perInstallment = Math.round(fullPrice / installmentCount);

      expect(perInstallment).toBe(25000);
      expect(perInstallment * installmentCount).toBe(fullPrice);
      expect(formatPrice(perInstallment)).toBe('RS. 25,000');
      expect(formatPrice(perInstallment, 'LKR')).toBe('LKR 25,000');
    });

    it('handles non-divisible price split with exact penny/cent integrity', () => {
      const oddPrice = 100000; // 100,000 / 3 = 33,333.333...
      const baseInstallment = Math.floor(oddPrice / 3);
      const remainder = oddPrice - baseInstallment * 3;

      expect(baseInstallment).toBe(33333);
      expect(remainder).toBe(1);
      expect(baseInstallment * 3 + remainder).toBe(100000);
    });

    it('computes discount percentage savings accurately', () => {
      const originalPrice = 80000;
      const discountPercent = 15;
      const discountedPrice = originalPrice * (1 - discountPercent / 100);
      const savings = originalPrice - discountedPrice;

      expect(discountedPrice).toBe(68000);
      expect(savings).toBe(12000);
      expect(formatPrice(discountedPrice)).toBe('RS. 68,000');
    });

    it('safely handles zero / free tier courses without NaN or division by zero', () => {
      const freePrice = 0;
      expect(formatPrice(freePrice)).toBe('RS. 0');
      expect(parsePrice('RS. 0')).toBe(0);
      expect(parsePrice('FREE')).toBe(0);
    });
  });

  describe('2. Dynamic Rating & Review Aggregation Logic', () => {
    interface ReviewItem {
      rating: number;
    }

    function calculateDynamicCourseRating(
      reviews: ReviewItem[],
      catalogDefaultRating: number,
      catalogDefaultCount: number
    ) {
      if (!reviews || reviews.length === 0) {
        return {
          rating: catalogDefaultRating,
          reviewCount: catalogDefaultCount,
          isUsingCatalogDefaults: true,
        };
      }
      const sum = reviews.reduce((acc, curr) => acc + curr.rating, 0);
      const avg = sum / reviews.length;
      return {
        rating: parseFloat(avg.toFixed(1)),
        reviewCount: reviews.length,
        isUsingCatalogDefaults: false,
      };
    }

    it('falls back to catalog metadata when review array is empty', () => {
      const result = calculateDynamicCourseRating([], 4.9, 120);
      expect(result.rating).toBe(4.9);
      expect(result.reviewCount).toBe(120);
      expect(result.isUsingCatalogDefaults).toBe(true);
    });

    it('dynamically computes weighted average when reviews exist', () => {
      const reviews = [
        { rating: 5 },
        { rating: 5 },
        { rating: 4 },
      ]; // (5 + 5 + 4) / 3 = 4.6666... -> 4.7
      const result = calculateDynamicCourseRating(reviews, 4.9, 120);
      expect(result.rating).toBe(4.7);
      expect(result.reviewCount).toBe(3);
      expect(result.isUsingCatalogDefaults).toBe(false);
    });

    it('handles single 1-star review accurately', () => {
      const reviews = [{ rating: 1 }];
      const result = calculateDynamicCourseRating(reviews, 5.0, 50);
      expect(result.rating).toBe(1.0);
      expect(result.reviewCount).toBe(1);
    });
  });

  describe('3. WhatsApp Inquiry & Directive Deep Link Generator', () => {
    function generateWhatsAppInquiryUrl(courseTitle: string, courseBadge: string, phone = '94717096386') {
      const text = encodeURIComponent(
        `Hello Command Council, I wish to enroll in the ${courseTitle} directive (${courseBadge}). Please send the payment instructions and batch access.`
      );
      return `https://wa.me/${phone}?text=${text}`;
    }

    it('correctly formats and encodes course directive inquiry parameters', () => {
      const url = generateWhatsAppInquiryUrl('Advanced Cyber Defense & SOC Analysis', 'ACD-01');
      expect(url).toContain('https://wa.me/94717096386?text=');
      expect(url).toContain('Advanced%20Cyber%20Defense%20%26%20SOC%20Analysis');
      expect(url).toContain('ACD-01');
      expect(url.includes(' ')).toBe(false); // No raw spaces
    });

    it('safely handles non-ASCII & special symbols in course titles', () => {
      const url = generateWhatsAppInquiryUrl('AI & Machine Learning (100% Practical / සිංහල)', 'AIML-PRO');
      expect(url).toContain('100%25%20Practical');
      expect(isSafeUrl(url)).toBe(true);
    });
  });

  describe('4. Anti-XSS & URL Security for Course Media & Resources', () => {
    it('blocks dangerous protocol links in course syllabi and video links', () => {
      expect(isSafeUrl('javascript:alert("hacked")')).toBe(false);
      expect(isSafeUrl('vbscript:msgbox("hacked")')).toBe(false);
      expect(isSafeUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
      expect(sanitizeExternalUrl('javascript:alert(1)')).toBe('#');
    });

    it('permits secure external syllabus PDFs and official CDN video assets', () => {
      const syllabusPdfUrl = 'https://assets.uwe.lk/syllabi/fullstack-defense-2026.pdf';
      const cdnPreviewUrl = 'https://stream.uwe.lk/previews/intro-module.mp4';

      expect(isSafeUrl(syllabusPdfUrl)).toBe(true);
      expect(sanitizeExternalUrl(syllabusPdfUrl)).toBe(syllabusPdfUrl);

      expect(isSafeUrl(cdnPreviewUrl)).toBe(true);
      expect(sanitizeExternalUrl(cdnPreviewUrl)).toBe(cdnPreviewUrl);
    });

    it('permits valid base64 data image avatars but blocks non-image data schemes', () => {
      const validPngData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const maliciousScriptData = 'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==';

      expect(sanitizeImageUrl(validPngData)).toBe(validPngData);
      expect(sanitizeImageUrl(maliciousScriptData, '/default-avatar.png')).toBe('/default-avatar.png');
    });
  });

  describe('5. Curriculum Module Duration & Lecture Aggregation', () => {
    interface CurriculumModule {
      id: string;
      title: string;
      lectures: Array<{ title: string; durationMinutes: number }>;
    }

    function calculateCurriculumTotals(modules: CurriculumModule[]) {
      const totalLectures = modules.reduce((sum, m) => sum + m.lectures.length, 0);
      const totalMinutes = modules.reduce(
        (sum, m) => sum + m.lectures.reduce((acc, l) => acc + l.durationMinutes, 0),
        0
      );
      const hours = Math.floor(totalMinutes / 60);
      const remainingMinutes = totalMinutes % 60;

      return {
        totalModules: modules.length,
        totalLectures,
        totalMinutes,
        formattedDuration: `${hours}h ${remainingMinutes}m`,
      };
    }

    it('calculates total modules, lectures, and human readable duration cleanly', () => {
      const modules: CurriculumModule[] = [
        {
          id: 'mod-1',
          title: 'Module 1: Reconnaissance',
          lectures: [
            { title: 'OSINT Fundamentals', durationMinutes: 45 },
            { title: 'Network Scanning', durationMinutes: 75 },
          ],
        },
        {
          id: 'mod-2',
          title: 'Module 2: Exploitation & Defense',
          lectures: [
            { title: 'Buffer Overflow Analysis', durationMinutes: 90 },
            { title: 'Hardening & Remediation', durationMinutes: 60 },
          ],
        },
      ];

      const totals = calculateCurriculumTotals(modules);
      expect(totals.totalModules).toBe(2);
      expect(totals.totalLectures).toBe(4);
      expect(totals.totalMinutes).toBe(270); // 4.5 hours = 270 minutes
      expect(totals.formattedDuration).toBe('4h 30m');
    });
  });
});
