import { describe, it, expect, vi } from 'vitest';
import { sanitizeExternalUrl, sanitizeImageUrl } from '../utils/urlSecurity';

describe('Frontend URL Security & Anti-XSS Sanitizer Tests', () => {
  it('allows safe HTTPS external and WhatsApp links', () => {
    expect(sanitizeExternalUrl('https://wa.me/94717096386?text=test')).toBe('https://wa.me/94717096386?text=test');
    expect(sanitizeExternalUrl('https://uwe.lk/courses')).toBe('https://uwe.lk/courses');
    expect(sanitizeExternalUrl('https://api.whatsapp.com/send?phone=94717096386')).toBe('https://api.whatsapp.com/send?phone=94717096386');
    expect(sanitizeExternalUrl('mailto:info@uwe.lk')).toBe('mailto:info@uwe.lk');
    expect(sanitizeExternalUrl('tel:+94717096386')).toBe('tel:+94717096386');
  });

  it('blocks and sanitizes dangerous javascript: pseudo-protocol injection', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(sanitizeExternalUrl('javascript:alert(document.cookie)')).toBe('#');
    expect(sanitizeExternalUrl('JAVASCRIPT:alert(1)')).toBe('#');
    expect(sanitizeExternalUrl('vbscript:msgbox(1)')).toBe('#');
    expect(sanitizeExternalUrl('data:text/html,<script>alert(1)</script>')).toBe('#');
    expect(sanitizeExternalUrl('file:///etc/passwd')).toBe('#');
    warnSpy.mockRestore();
  });

  it('permits valid safe internal relative paths but blocks protocol-relative // URLs', () => {
    expect(sanitizeExternalUrl('/programs/bmb')).toBe('/programs/bmb');
    expect(sanitizeExternalUrl('//malicious-phishing-site.com')).toBe('#');
  });

  it('sanitizes image URLs and allows valid data-image formats while blocking script data URLs', () => {
    expect(sanitizeImageUrl('data:image/png;base64,iVBORw0KGgo=')).toBe('data:image/png;base64,iVBORw0KGgo=');
    expect(sanitizeImageUrl('data:image/jpeg;base64,/9j/4AAQSkZJRg==')).toBe('data:image/jpeg;base64,/9j/4AAQSkZJRg==');
    expect(sanitizeImageUrl('data:text/html;<script>alert(1)</script>', '/fallback.png')).toBe('/fallback.png');
    expect(sanitizeImageUrl('javascript:alert(1)', '/fallback.png')).toBe('/fallback.png');
  });
});
