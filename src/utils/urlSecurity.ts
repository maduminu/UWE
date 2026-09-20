/**
 * URL & Protocol Security Utilities
 * Enforces safe outbound protocols (https://, wa.me, mailto, tel) and strips malicious schemes (javascript:, vbscript:, data:text/html)
 */

const ALLOWED_PROTOCOLS = new Set(['https:', 'http:', 'mailto:', 'tel:']);

export const sanitizeExternalUrl = (rawUrl?: string | null, fallback: string = '#'): string => {
  if (!rawUrl || typeof rawUrl !== 'string') return fallback;

  const trimmed = rawUrl.trim();

  // Handle WhatsApp web/short links
  if (trimmed.startsWith('https://wa.me/') || trimmed.startsWith('https://api.whatsapp.com/')) {
    return trimmed;
  }

  // Reject protocol-relative URLs (e.g. //attacker.com) and obvious malicious schemes immediately
  if (trimmed.startsWith('//') || /^(javascript|vbscript|data:text\/html|file):/i.test(trimmed)) {
    console.warn(`[Security Alert] Blocked unsafe URL scheme: ${trimmed.slice(0, 30)}...`);
    return fallback;
  }

  // Relative paths on same origin are permitted if starting with a single '/'
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return trimmed;
  }

  try {
    const baseOrigin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'https://uwe.lk';
    const parsed = new URL(trimmed, baseOrigin);
    if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
      console.warn(`[Security Alert] Protocol not permitted: ${parsed.protocol}`);
      return fallback;
    }
    return trimmed;
  } catch {
    return fallback;
  }
};

/**
 * Validates if an image or poster URL is safe for rendering in <img> tags
 */
export const sanitizeImageUrl = (rawUrl?: string | null, defaultImage: string = ''): string => {
  if (!rawUrl || typeof rawUrl !== 'string') return defaultImage;

  const trimmed = rawUrl.trim();

  // Allow trusted data image URLs
  if (
    trimmed.startsWith('data:image/jpeg') ||
    trimmed.startsWith('data:image/png') ||
    trimmed.startsWith('data:image/webp') ||
    trimmed.startsWith('data:image/jpg')
  ) {
    return trimmed;
  }

  return sanitizeExternalUrl(trimmed, defaultImage);
};

/**
 * Checks if a given URL is safe according to allowed protocol policy
 */
export const isSafeUrl = (rawUrl?: string | null): boolean => {
  if (!rawUrl || typeof rawUrl !== 'string') return false;
  const sanitized = sanitizeExternalUrl(rawUrl, '__INVALID__');
  return sanitized !== '__INVALID__' && sanitized !== '#';
};

