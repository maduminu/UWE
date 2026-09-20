/**
 * Utility to validate file magic bytes (binary signatures), image dimensions,
 * and perform deep malware/payload inspection for receipts.
 * Protects against disguised malicious payloads, scripts, executables, and decompression bombs.
 */

export interface FileSignatureResult {
  isValid: boolean;
  mimeType?: string;
  extension?: string;
  buffer?: Buffer;
  width?: number;
  height?: number;
  error?: string;
}

export interface DimensionOptions {
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
}

const DEFAULT_DIMENSION_LIMITS: DimensionOptions = {
  minWidth: 50,
  minHeight: 50,
  maxWidth: 8000,
  maxHeight: 8000,
};

/**
 * Scan buffer for malicious patterns (embedded executables, active scripts, PHP/HTML polyglots, and dangerous PDF actions).
 * Targets real threat vectors without false-positive keyword triggers on benign bank statements.
 */
export function scanBufferForMaliciousContent(buffer: Buffer, mimeType: string): { isClean: boolean; reason?: string } {
  // 1. Executable Headers Check (Offset 0)
  // MZ header (DOS/PE executable: 4D 5A)
  if (buffer.length >= 2 && buffer[0] === 0x4d && buffer[1] === 0x5a) {
    return { isClean: false, reason: 'Disguised Windows executable (MZ header) detected.' };
  }
  // ELF header (Linux executable: 7F 45 4C 46)
  if (buffer.length >= 4 && buffer[0] === 0x7f && buffer[1] === 0x45 && buffer[2] === 0x4c && buffer[3] === 0x46) {
    return { isClean: false, reason: 'Disguised Linux executable (ELF header) detected.' };
  }
  // Mach-O / Java Class (CA FE BA BE or FE ED FA CE)
  if (
    buffer.length >= 4 &&
    ((buffer[0] === 0xca && buffer[1] === 0xfe && buffer[2] === 0xba && buffer[3] === 0xbe) ||
      (buffer[0] === 0xfe && buffer[1] === 0xed && buffer[2] === 0xfa && buffer[3] === 0xce))
  ) {
    return { isClean: false, reason: 'Disguised binary executable/class detected.' };
  }
  // Shebang script header (#! : 23 21)
  if (buffer.length >= 2 && buffer[0] === 0x23 && buffer[1] === 0x21) {
    return { isClean: false, reason: 'Disguised shell script (shebang) detected.' };
  }

  // 2. Text / Script Pattern Inspection (inspecting string representation for injection wrappers)
  const bufferString = buffer.toString('binary');

  // Server-side code execution tags (strict PHP/ASP tags, not benign words)
  const serverCodePatterns = [
    /<\?php\b/i,
    /<\?=\s/i,
    /<%\s/i,
    /<script[\s\S]*?language\s*=\s*["']?php/i,
  ];

  for (const pattern of serverCodePatterns) {
    if (pattern.test(bufferString)) {
      return { isClean: false, reason: 'Server script injection signature (PHP/ASP) detected in receipt buffer.' };
    }
  }

  // Active client-side script tags & HTML injection polyglots
  const scriptPatterns = [
    /<script[\s\S]*?>[\s\S]*?<\/script>/i,
    /<script\b/i,
    /javascript:\s*[a-z0-9_$]/i,
    /vbscript:\s*[a-z0-9_$]/i,
    /<html[\s>]/i,
    /<svg[\s>]/i,
    /onload\s*=\s*["'][^"']+["']/i,
    /onerror\s*=\s*["'][^"']+["']/i,
  ];

  for (const pattern of scriptPatterns) {
    if (pattern.test(bufferString)) {
      return { isClean: false, reason: 'Active script or HTML tags detected in receipt buffer.' };
    }
  }

  // 3. PDF-Specific Dangerous Action Dictionaries
  if (mimeType === 'application/pdf') {
    const dangerousPdfKeywords = [
      /\/JavaScript\b/i,
      /\/JS\s*[<(]/i,
      /\/Launch\b/i,
      /\/EmbeddedFiles\b/i,
      /\/RichMedia\b/i,
      /\/SubmitForm\b/i,
    ];

    for (const kw of dangerousPdfKeywords) {
      if (kw.test(bufferString)) {
        return { isClean: false, reason: `Suspicious interactive action (${kw.source}) detected in PDF.` };
      }
    }
  }

  return { isClean: true };
}

/**
 * Extract dimensions from PNG buffer (IHDR chunk at byte 16).
 */
function extractPngDimensions(buffer: Buffer): { width: number; height: number } | null {
  if (buffer.length < 24) return null;
  // IHDR chunk starts at byte 12 (length: 13, tag 'IHDR' at 12-15)
  // Width is 4 bytes big-endian at offset 16, Height is 4 bytes at offset 20
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  return { width, height };
}

/**
 * Extract dimensions from JPEG buffer by traversing markers (SOF0 = 0xFFC0, SOF2 = 0xFFC2).
 */
function extractJpegDimensions(buffer: Buffer): { width: number; height: number } | null {
  let offset = 2; // skip SOI marker (0xFF, 0xD8)
  while (offset < buffer.length - 8) {
    if (buffer[offset] !== 0xff) {
      offset++;
      continue;
    }
    const marker = buffer[offset + 1];
    // Baseline SOF0 (0xC0), Extended SOF1 (0xC1), Progressive SOF2 (0xC2)
    if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
      const height = buffer.readUInt16BE(offset + 5);
      const width = buffer.readUInt16BE(offset + 7);
      return { width, height };
    }
    // Skip to next marker using length field
    const segmentLength = buffer.readUInt16BE(offset + 2);
    offset += 2 + segmentLength;
  }
  return null;
}

/**
 * Extract dimensions from WEBP buffer (VP8, VP8L, VP8X).
 */
function extractWebpDimensions(buffer: Buffer): { width: number; height: number } | null {
  if (buffer.length < 30) return null;
  const chunkType = buffer.toString('ascii', 12, 16);

  if (chunkType === 'VP8 ') {
    // Lossy VP8
    const width = buffer.readUInt16LE(26) & 0x3fff;
    const height = buffer.readUInt16LE(28) & 0x3fff;
    return { width, height };
  } else if (chunkType === 'VP8L') {
    // Lossless VP8L: 14 bits width, 14 bits height in byte 21-24
    if (buffer.length < 25) return null;
    const b0 = buffer[21];
    const b1 = buffer[22];
    const b2 = buffer[23];
    const b3 = buffer[24];
    const width = 1 + (((b1 & 0x3f) << 8) | b0);
    const height = 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6));
    return { width, height };
  } else if (chunkType === 'VP8X') {
    // Extended VP8X: width 24-bit uint at 24, height 24-bit uint at 27 (0-indexed canvas dimension)
    if (buffer.length < 30) return null;
    const width = 1 + (buffer[24] | (buffer[25] << 8) | (buffer[26] << 16));
    const height = 1 + (buffer[27] | (buffer[28] << 8) | (buffer[29] << 16));
    return { width, height };
  }
  return null;
}

/**
 * Main validation function:
 * 1. Checks magic bytes for PNG, JPEG, PDF, and WEBP.
 * 2. Scans for malware, scripts, and embedded binaries.
 * 3. Validates image dimensions against minimum and maximum boundaries.
 */
export function validateReceiptSignature(
  input: Buffer | string,
  dimensions: DimensionOptions = DEFAULT_DIMENSION_LIMITS
): FileSignatureResult {
  let buffer: Buffer;

  if (Buffer.isBuffer(input)) {
    buffer = input;
  } else if (typeof input === 'string') {
    // If it's a base64 data URI or raw base64 string
    const base64Clean = input.includes('base64,') ? input.split('base64,')[1].trim() : input.trim();
    try {
      buffer = Buffer.from(base64Clean, 'base64');
    } catch {
      return { isValid: false, error: 'Malformed base64 payload.' };
    }
  } else {
    return { isValid: false, error: 'Invalid input format.' };
  }

  // Minimum buffer size for header check
  if (buffer.length < 12) {
    return { isValid: false, error: 'File size too small.' };
  }

  // Max 5MB size limit
  if (buffer.length > 5 * 1024 * 1024) {
    return { isValid: false, error: 'File size exceeds maximum 5MB limit.' };
  }

  let mimeType: string | undefined;
  let extension: string | undefined;
  let imgDims: { width: number; height: number } | null = null;

  // 1. PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    mimeType = 'image/png';
    extension = 'png';
    imgDims = extractPngDimensions(buffer);
  }
  // 2. JPEG: FF D8 FF
  else if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    mimeType = 'image/jpeg';
    extension = 'jpg';
    imgDims = extractJpegDimensions(buffer);
  }
  // 3. PDF: %PDF- (25 50 44 46)
  else if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    // Validate minimum PDF length and EOF structure
    if (buffer.length < 100) {
      return { isValid: false, error: 'Invalid or truncated PDF file structure.' };
    }
    const pdfTail = buffer.slice(-1024).toString('binary');
    if (!pdfTail.includes('%%EOF')) {
      return { isValid: false, error: 'PDF file is missing valid EOF trailer marker.' };
    }
    mimeType = 'application/pdf';
    extension = 'pdf';
  }
  // 4. WEBP: RIFF....WEBP (52 49 46 46 .... 57 45 42 50)
  else if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    mimeType = 'image/webp';
    extension = 'webp';
    imgDims = extractWebpDimensions(buffer);
  } else {
    return { isValid: false, error: 'Unsupported file type. Only genuine PNG, JPEG, WEBP, or PDF bank receipts are allowed.' };
  }

  // 2. Malware & Heuristic Security Scan
  const scanResult = scanBufferForMaliciousContent(buffer, mimeType);
  if (!scanResult.isClean) {
    return { isValid: false, error: scanResult.reason || 'Malicious content signature detected.' };
  }

  // 3. Image Dimension Checks (for image files)
  if (imgDims) {
    const minW = dimensions.minWidth ?? DEFAULT_DIMENSION_LIMITS.minWidth!;
    const minH = dimensions.minHeight ?? DEFAULT_DIMENSION_LIMITS.minHeight!;
    const maxW = dimensions.maxWidth ?? DEFAULT_DIMENSION_LIMITS.maxWidth!;
    const maxH = dimensions.maxHeight ?? DEFAULT_DIMENSION_LIMITS.maxHeight!;

    if (imgDims.width < minW || imgDims.height < minH) {
      return {
        isValid: false,
        error: `Receipt image dimensions (${imgDims.width}x${imgDims.height}) are too small. Minimum required is ${minW}x${minH} pixels.`,
      };
    }

    if (imgDims.width > maxW || imgDims.height > maxH) {
      return {
        isValid: false,
        error: `Receipt image dimensions (${imgDims.width}x${imgDims.height}) exceed maximum allowed ${maxW}x${maxH} pixels.`,
      };
    }
  }

  return {
    isValid: true,
    mimeType,
    extension,
    buffer,
    width: imgDims?.width,
    height: imgDims?.height,
  };
}
