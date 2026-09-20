import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { sanitizeExternalUrl, sanitizeImageUrl, isSafeUrl } from '../utils/urlSecurity';
import { formatPrice, parsePrice } from '../utils/priceFormatter';

/**
 * Enterprise Security Test Suite — Frontend URL Security, Auth Service & Price Formatting
 *
 * Covers:
 * - sanitizeExternalUrl: XSS protocol blocking, safe URL passthrough
 * - sanitizeImageUrl: image data URI validation
 * - isSafeUrl: URL safety checker
 * - Price formatting edge cases
 * - Auth service session lifecycle (localStorage mocks)
 */
describe('Enterprise Security: Frontend URL, Auth & Price Safety', () => {
  // ── 1. URL Sanitization — XSS Protocol Blocking ───────────────────────────

  describe('1. sanitizeExternalUrl — XSS Protocol Blocking', () => {
    it('blocks javascript: scheme → returns fallback', () => {
      expect(sanitizeExternalUrl('javascript:alert("hacked")')).toBe('#');
      expect(sanitizeExternalUrl('javascript:void(0)')).toBe('#');
      expect(sanitizeExternalUrl('JAVASCRIPT:ALERT(1)')).toBe('#');
    });

    it('blocks vbscript: scheme → returns fallback', () => {
      expect(sanitizeExternalUrl('vbscript:msgbox("hacked")')).toBe('#');
      expect(sanitizeExternalUrl('VBSCRIPT:EXEC')).toBe('#');
    });

    it('blocks data:text/html scheme → returns fallback', () => {
      expect(sanitizeExternalUrl('data:text/html,<script>alert(1)</script>')).toBe('#');
      expect(sanitizeExternalUrl('data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==')).toBe('#');
    });

    it('blocks file: scheme → returns fallback', () => {
      expect(sanitizeExternalUrl('file:///etc/passwd')).toBe('#');
    });

    it('blocks protocol-relative URLs (//evil.com) → returns fallback', () => {
      expect(sanitizeExternalUrl('//evil.com/steal-cookies')).toBe('#');
      expect(sanitizeExternalUrl('//attacker.io')).toBe('#');
    });

    it('allows standard https:// URLs', () => {
      const url = 'https://www.uwe.lk/courses';
      expect(sanitizeExternalUrl(url)).toBe(url);
    });

    it('allows standard http:// URLs', () => {
      const url = 'http://localhost:3000/dev';
      expect(sanitizeExternalUrl(url)).toBe(url);
    });

    it('allows WhatsApp deep links (wa.me)', () => {
      const waUrl = 'https://wa.me/94717096386?text=Hello';
      expect(sanitizeExternalUrl(waUrl)).toBe(waUrl);
    });

    it('allows WhatsApp API links', () => {
      const waApiUrl = 'https://api.whatsapp.com/send?phone=94717096386';
      expect(sanitizeExternalUrl(waApiUrl)).toBe(waApiUrl);
    });

    it('allows relative paths starting with single /', () => {
      expect(sanitizeExternalUrl('/about')).toBe('/about');
      expect(sanitizeExternalUrl('/courses/bmb')).toBe('/courses/bmb');
    });

    it('returns fallback for null/undefined/empty input', () => {
      expect(sanitizeExternalUrl(null)).toBe('#');
      expect(sanitizeExternalUrl(undefined)).toBe('#');
      expect(sanitizeExternalUrl('')).toBe('#');
    });

    it('allows custom fallback value', () => {
      expect(sanitizeExternalUrl('javascript:hack()', '/safe')).toBe('/safe');
    });

    it('handles whitespace-padded URLs', () => {
      expect(sanitizeExternalUrl('  https://uwe.lk  ')).toBe('https://uwe.lk');
    });
  });

  // ── 2. Image URL Sanitization ─────────────────────────────────────────────

  describe('2. sanitizeImageUrl — Image Data URI Validation', () => {
    it('allows valid PNG base64 data URI', () => {
      const pngUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAE=';
      expect(sanitizeImageUrl(pngUri)).toBe(pngUri);
    });

    it('allows valid JPEG base64 data URI', () => {
      const jpegUri = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
      expect(sanitizeImageUrl(jpegUri)).toBe(jpegUri);
    });

    it('allows valid WEBP base64 data URI', () => {
      const webpUri = 'data:image/webp;base64,UklGRh4AAABXRUJQVlA4=';
      expect(sanitizeImageUrl(webpUri)).toBe(webpUri);
    });

    it('blocks data:text/html URI disguised as image', () => {
      const malicious = 'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==';
      expect(sanitizeImageUrl(malicious, '/default.png')).toBe('/default.png');
    });

    it('blocks javascript: scheme in image URL', () => {
      expect(sanitizeImageUrl('javascript:alert(1)', '/default.png')).toBe('/default.png');
    });

    it('allows standard HTTPS image URLs', () => {
      const imageUrl = 'https://cdn.uwe.lk/images/course-banner.jpg';
      expect(sanitizeImageUrl(imageUrl)).toBe(imageUrl);
    });

    it('returns default image for null/empty input', () => {
      expect(sanitizeImageUrl(null, '/fallback.png')).toBe('/fallback.png');
      expect(sanitizeImageUrl('', '/fallback.png')).toBe('/fallback.png');
    });
  });

  // ── 3. isSafeUrl Utility ──────────────────────────────────────────────────

  describe('3. isSafeUrl — URL Safety Checker', () => {
    it('returns true for safe HTTPS URLs', () => {
      expect(isSafeUrl('https://uwe.lk')).toBe(true);
      expect(isSafeUrl('https://assets.uwe.lk/document.pdf')).toBe(true);
    });

    it('returns false for javascript: URLs', () => {
      expect(isSafeUrl('javascript:alert(1)')).toBe(false);
    });

    it('returns false for data:text/html URLs', () => {
      expect(isSafeUrl('data:text/html,<h1>hacked</h1>')).toBe(false);
    });

    it('returns false for null/undefined/empty', () => {
      expect(isSafeUrl(null)).toBe(false);
      expect(isSafeUrl(undefined)).toBe(false);
      expect(isSafeUrl('')).toBe(false);
    });

    it('returns true for relative paths', () => {
      expect(isSafeUrl('/about')).toBe(true);
    });

    it('returns true for WhatsApp deep links', () => {
      expect(isSafeUrl('https://wa.me/94717096386?text=Hello')).toBe(true);
    });
  });

  // ── 4. Price Formatting & Parsing ─────────────────────────────────────────

  describe('4. Price Formatting & Parsing Edge Cases', () => {
    it('formatPrice handles standard LKR amounts', () => {
      expect(formatPrice(75000)).toBe('RS. 75,000');
      expect(formatPrice(25000)).toBe('RS. 25,000');
      expect(formatPrice(100000)).toBe('RS. 100,000');
    });

    it('formatPrice handles zero (free tier)', () => {
      expect(formatPrice(0)).toBe('RS. 0');
    });

    it('formatPrice handles custom currency prefix', () => {
      expect(formatPrice(50000, 'LKR')).toBe('LKR 50,000');
      expect(formatPrice(50000, '$')).toBe('$ 50,000');
    });

    it('parsePrice extracts numeric value from formatted string', () => {
      expect(parsePrice('RS. 75,000')).toBe(75000);
      expect(parsePrice('RS. 25,000')).toBe(25000);
      expect(parsePrice('RS. 0')).toBe(0);
    });

    it('parsePrice returns 0 for non-numeric / "FREE" strings', () => {
      expect(parsePrice('FREE')).toBe(0);
      expect(parsePrice('N/A')).toBe(0);
      expect(parsePrice('')).toBe(0);
    });

    it('formatPrice handles negative numbers gracefully', () => {
      const result = formatPrice(-1000);
      // Should not crash — may return formatted negative or absolute value
      expect(typeof result).toBe('string');
    });

    it('installment calculation avoids floating point drift', () => {
      const price = 75000;
      const installments = 3;
      const per = Math.round(price / installments);
      const total = per * installments;

      // Verify no floating-point drift causes off-by-one
      expect(per).toBe(25000);
      expect(total).toBe(price);
    });

    it('discount percentage computation is exact', () => {
      const original = 80000;
      const discount = 15;
      const final = original * (1 - discount / 100);

      expect(final).toBe(68000);
      expect(original - final).toBe(12000);
    });
  });

  // ── 5. Auth Service Session Logic ──────────────────────────────────────────

  describe('5. Auth Service — Session Edge Cases', () => {
    // Mock localStorage for Node.js test environment
    let storage: Record<string, string>;

    beforeEach(() => {
      storage = {};
      vi.stubGlobal('localStorage', {
        getItem: (key: string) => storage[key] || null,
        setItem: (key: string, value: string) => { storage[key] = value; },
        removeItem: (key: string) => { delete storage[key]; },
        clear: () => { storage = {}; },
        length: 0,
        key: () => null,
      });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('authService.getAuthHeaders returns correct Bearer format', async () => {
      // Dynamically import after localStorage mock is set up
      const { authService } = await import('../services/auth');

      const testUser = { id: 'test', name: 'Test', email: 'test@test.lk', enrolledCourseSlugs: [] };
      authService.setStudentSession('test-token-xyz', testUser);

      const headers = authService.getAuthHeaders('student');
      expect(headers.Authorization).toBe('Bearer test-token-xyz');
      expect(headers['Content-Type']).toBe('application/json');
    });

    it('authService.getAuthHeaders returns no auth for unauthenticated', async () => {
      const { authService } = await import('../services/auth');

      // Clear any sessions
      authService.clearStudentSession();
      authService.clearAdminSession();

      const headers = authService.getAuthHeaders('student');
      expect(headers.Authorization).toBeUndefined();
      expect(headers['Content-Type']).toBe('application/json');
    });

    it('expired session auto-clears from storage', async () => {
      const { authService } = await import('../services/auth');

      const testUser = { id: 'test', name: 'Test', email: 'test@test.lk', enrolledCourseSlugs: [] };

      // Set session with 0ms duration (immediately expired)
      authService.setStudentSession('expired-token', testUser, undefined, 0);

      // Small delay to ensure expiry
      await new Promise((r) => setTimeout(r, 10));

      const session = authService.getStudentSession();
      expect(session).toBeNull();
    });

    it('admin session stores and retrieves role correctly', async () => {
      const { authService } = await import('../services/auth');

      const adminUser = { id: 'admin-1', name: 'Admin', email: 'admin@uwe.lk', role: 'SUPER_ADMIN' as const };
      authService.setAdminSession('admin-token', adminUser);

      const session = authService.getAdminSession();
      expect(session).not.toBeNull();
      expect(session!.user.role).toBe('SUPER_ADMIN');
      expect(session!.token).toBe('admin-token');
    });

    it('clearStudentSession removes all student keys', async () => {
      const { authService } = await import('../services/auth');

      const testUser = { id: 'test', name: 'Test', email: 'test@test.lk', enrolledCourseSlugs: [] };
      authService.setStudentSession('token', testUser);

      authService.clearStudentSession();

      expect(authService.getStudentSession()).toBeNull();
      expect(authService.getStudentToken()).toBeNull();
    });
  });

  // ── 6. WhatsApp Link Generation Security ──────────────────────────────────

  describe('6. WhatsApp Link Generation Security', () => {
    function generateWhatsAppUrl(courseTitle: string, phone = '94717096386') {
      const text = encodeURIComponent(
        `Hello, I wish to enroll in the ${courseTitle} program. Please send payment instructions.`
      );
      return `https://wa.me/${phone}?text=${text}`;
    }

    it('properly encodes special characters in course titles', () => {
      const url = generateWhatsAppUrl('Business & Marketing (Advanced)');
      expect(url).toContain('https://wa.me/94717096386?text=');
      expect(url).not.toContain(' '); // No raw spaces
      expect(url).toContain('%26'); // & encoded
      expect(isSafeUrl(url)).toBe(true);
    });

    it('handles Unicode/Sinhala characters safely', () => {
      const url = generateWhatsAppUrl('සිංහල Course / Tamil கோர்ஸ்');
      expect(url).toContain('https://wa.me/');
      expect(isSafeUrl(url)).toBe(true);
    });

    it('generated URL is always a safe URL', () => {
      const url = generateWhatsAppUrl('<script>alert(1)</script>');
      expect(isSafeUrl(url)).toBe(true);
      expect(url).not.toContain('<script>'); // Should be encoded
    });
  });
});
