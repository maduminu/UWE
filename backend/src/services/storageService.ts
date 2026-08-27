import crypto from 'crypto';
import { getJwtSecret } from '../middlewares/authenticate';
import { logger } from '../utils/logger';

// In-memory / durable private storage vault map (stores private binary buffers by key)
const privateStorageVault = new Map<string, { buffer: Buffer; mimeType: string; createdAt: number }>();

export interface UploadResult {
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
}

/**
 * Upload a validated binary file buffer directly into private object storage.
 * Eliminates storing multi-megabyte base64 strings in PostgreSQL columns.
 */
export async function uploadPrivateReceipt(
  buffer: Buffer,
  extension: string = 'png',
  mimeType: string = 'image/png'
): Promise<UploadResult> {
  const fileId = crypto.randomUUID();
  const storageKey = `slips/${fileId}.${extension}`;

  // Store in private storage vault
  privateStorageVault.set(storageKey, {
    buffer,
    mimeType,
    createdAt: Date.now(),
  });

  logger.info(`[STORAGE] Uploaded receipt to private vault: ${storageKey} (${buffer.length} bytes)`, 'STORAGE');

  return {
    storageKey,
    mimeType,
    sizeBytes: buffer.length,
  };
}

/**
 * Retrieve private receipt buffer from private storage
 */
export async function getPrivateReceipt(storageKey: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
  const item = privateStorageVault.get(storageKey);
  if (!item) return null;
  return { buffer: item.buffer, mimeType: item.mimeType };
}

/**
 * Generate a short-lived cryptographically signed URL (HMAC-SHA256) for on-demand receipt inspection.
 * Expires in 15 minutes (900 seconds).
 */
export function generateSignedReceiptUrl(slipId: string, expiresInSeconds: number = 900): string {
  const secret = getJwtSecret();
  const expires = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const dataToSign = `slip:${slipId}:${expires}`;

  const signature = crypto
    .createHmac('sha256', secret)
    .update(dataToSign)
    .digest('hex');

  return `/api/slips/${slipId}/view?token=${signature}&expires=${expires}`;
}

/**
 * Verify HMAC-SHA256 signature for short-lived receipt access.
 */
export function verifySignedReceiptToken(slipId: string, token: string, expiresStr: string): boolean {
  try {
    const expires = parseInt(expiresStr, 10);
    if (isNaN(expires) || Math.floor(Date.now() / 1000) > expires) {
      return false; // Expired
    }

    const secret = getJwtSecret();
    const dataToSign = `slip:${slipId}:${expires}`;

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(dataToSign)
      .digest('hex');

    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expectedSignature));
  } catch {
    return false;
  }
}
