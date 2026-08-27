/**
 * Utility to validate file magic bytes (binary signatures) for receipts.
 * Protects against disguised malicious payloads, scripts, and SVG/HTML XSS files.
 */

export interface FileSignatureResult {
  isValid: boolean;
  mimeType?: string;
  extension?: string;
  buffer?: Buffer;
}

export function validateReceiptSignature(input: Buffer | string): FileSignatureResult {
  let buffer: Buffer;

  if (Buffer.isBuffer(input)) {
    buffer = input;
  } else if (typeof input === 'string') {
    // If it's a base64 data URI or raw base64 string
    const base64Clean = input.includes('base64,') ? input.split('base64,')[1].trim() : input.trim();
    try {
      buffer = Buffer.from(base64Clean, 'base64');
    } catch {
      return { isValid: false };
    }
  } else {
    return { isValid: false };
  }

  // Minimum buffer size for header check
  if (buffer.length < 4) {
    return { isValid: false };
  }

  // Max 5MB size limit
  if (buffer.length > 5 * 1024 * 1024) {
    return { isValid: false };
  }

  // 1. PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return { isValid: true, mimeType: 'image/png', extension: 'png', buffer };
  }

  // 2. JPEG: FF D8 FF
  if (
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return { isValid: true, mimeType: 'image/jpeg', extension: 'jpg', buffer };
  }

  // 3. PDF: %PDF- (25 50 44 46)
  if (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46
  ) {
    return { isValid: true, mimeType: 'application/pdf', extension: 'pdf', buffer };
  }

  // 4. WEBP: RIFF....WEBP (52 49 46 46 .... 57 45 42 50)
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return { isValid: true, mimeType: 'image/webp', extension: 'webp', buffer };
  }

  return { isValid: false };
}
