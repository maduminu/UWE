import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { getJwtSecret } from '../middlewares/authenticate';
import { logger } from '../utils/logger';

export interface UploadResult {
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
  provider: 'supabase' | 's3' | 'vault';
}

// In-memory cache for ultra-fast serving
const memoryCache = new Map<string, { buffer: Buffer; mimeType: string; createdAt: number }>();

// Durable local disk storage directory: uploads/slips
const DISK_STORAGE_DIR = path.resolve(process.cwd(), 'uploads', 'slips');
try {
  if (!fs.existsSync(DISK_STORAGE_DIR)) {
    fs.mkdirSync(DISK_STORAGE_DIR, { recursive: true });
  }
} catch {
  // Read-only environment fallback
}

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';
const SUPABASE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'bank-slips';

/**
 * Determine if Supabase Storage is configured in environment
 */
function isSupabaseStorageConfigured(): boolean {
  if (process.env.NODE_ENV === 'test') return false;
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_KEY);
}

/**
 * Helper to get local disk filepath for a storage key
 */
function getDiskFilePath(storageKey: string): string {
  const safeFilename = path.basename(storageKey);
  return path.join(DISK_STORAGE_DIR, safeFilename);
}

/**
 * Upload a validated binary file buffer directly into private object storage.
 * Saves to Supabase (if configured), in-memory cache, and local disk.
 */
export async function uploadPrivateReceipt(
  buffer: Buffer,
  extension: string = 'png',
  mimeType: string = 'image/png'
): Promise<UploadResult> {
  const fileId = crypto.randomUUID();
  const storageKey = `slips/${fileId}.${extension}`;

  if (isSupabaseStorageConfigured()) {
    try {
      const uploadEndpoint = `${SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/${SUPABASE_BUCKET}/${storageKey}`;
      const response = await fetch(uploadEndpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': mimeType,
          'x-upsert': 'true',
        },
        body: buffer,
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`[STORAGE] Supabase Storage upload failed (${response.status}): ${errorText}`, 'STORAGE');
        throw new Error(`Cloud storage upload failed: ${response.statusText}`);
      }

      logger.info(`[STORAGE] Uploaded receipt to Supabase Storage: ${storageKey} (${buffer.length} bytes)`, 'STORAGE');
      return {
        storageKey,
        mimeType,
        sizeBytes: buffer.length,
        provider: 'supabase',
      };
    } catch (cloudErr: any) {
      logger.warn(`[STORAGE] Cloud storage upload fallback to local vault: ${cloudErr.message}`, 'STORAGE');
    }
  }

  // 1. Save to in-memory cache
  memoryCache.set(storageKey, {
    buffer,
    mimeType,
    createdAt: Date.now(),
  });

  // 2. Persist to durable local filesystem disk
  try {
    const diskPath = getDiskFilePath(storageKey);
    fs.writeFileSync(diskPath, buffer);
  } catch (fsErr: any) {
    logger.warn(`[STORAGE] Could not write to disk (${fsErr.message}), cached in memory only.`, 'STORAGE');
  }

  logger.info(`[STORAGE] Uploaded receipt to private vault: ${storageKey} (${buffer.length} bytes)`, 'STORAGE');

  return {
    storageKey,
    mimeType,
    sizeBytes: buffer.length,
    provider: 'vault',
  };
}

/**
 * Retrieve private receipt buffer from cloud, memory cache, or durable disk
 */
export async function getPrivateReceipt(storageKey: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
  // 1. Check Supabase Storage if configured
  if (isSupabaseStorageConfigured()) {
    try {
      const downloadEndpoint = `${SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/authenticated/${SUPABASE_BUCKET}/${storageKey}`;
      const response = await fetch(downloadEndpoint, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
      });

      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        const mimeType = response.headers.get('content-type') || 'application/octet-stream';
        return {
          buffer: Buffer.from(arrayBuffer),
          mimeType,
        };
      }
    } catch (cloudErr: any) {
      logger.warn(`[STORAGE] Cloud retrieval failed, checking local vault: ${cloudErr.message}`, 'STORAGE');
    }
  }

  // 2. Check in-memory cache
  const cached = memoryCache.get(storageKey);
  if (cached) {
    return { buffer: cached.buffer, mimeType: cached.mimeType };
  }

  // 3. Check durable local filesystem disk
  try {
    const diskPath = getDiskFilePath(storageKey);
    if (fs.existsSync(diskPath)) {
      const buffer = fs.readFileSync(diskPath);
      const ext = path.extname(storageKey).toLowerCase();
      const mimeType =
        ext === '.jpg' || ext === '.jpeg'
          ? 'image/jpeg'
          : ext === '.pdf'
          ? 'application/pdf'
          : ext === '.webp'
          ? 'image/webp'
          : 'image/png';

      // Repopulate memory cache
      memoryCache.set(storageKey, { buffer, mimeType, createdAt: Date.now() });
      return { buffer, mimeType };
    }
  } catch (fsErr: any) {
    logger.warn(`[STORAGE] Error reading from disk: ${fsErr.message}`, 'STORAGE');
  }

  return null;
}

/**
 * Generate a short-lived cryptographically signed URL for on-demand receipt inspection.
 * If Supabase Storage is configured, requests a provider-signed URL.
 * Otherwise returns a secure HMAC-SHA256 authenticated gateway URL.
 * Default expiration: 15 minutes (900 seconds).
 */
export async function generateSignedReceiptUrl(slipId: string, storageKey?: string, expiresInSeconds: number = 900): Promise<string> {
  if (storageKey && isSupabaseStorageConfigured()) {
    try {
      const signEndpoint = `${SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/sign/${SUPABASE_BUCKET}/${storageKey}`;
      const response = await fetch(signEndpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ expiresIn: expiresInSeconds }),
      });

      if (response.ok) {
        const data = (await response.json()) as { signedURL?: string };
        if (data?.signedURL) {
          const fullSignedUrl = data.signedURL.startsWith('http')
            ? data.signedURL
            : `${SUPABASE_URL.replace(/\/$/, '')}/storage/v1${data.signedURL}`;
          return fullSignedUrl;
        }
      }
    } catch (err: any) {
      logger.warn(`[STORAGE] Could not generate Supabase provider signed URL: ${err.message}`, 'STORAGE');
    }
  }

  // HMAC-SHA256 authenticated gateway signed URL
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
 * Verify HMAC-SHA256 signed receipt token parameters
 */
export function verifySignedReceiptToken(slipId: string, token: string, expiresStr: string): boolean {
  try {
    const expires = parseInt(expiresStr, 10);
    if (isNaN(expires) || Date.now() / 1000 > expires) {
      return false; // Token expired
    }

    const secret = getJwtSecret();
    const dataToSign = `slip:${slipId}:${expires}`;

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(dataToSign)
      .digest('hex');

    // Constant-time comparison
    if (token.length !== expectedSignature.length) return false;
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expectedSignature));
  } catch {
    return false;
  }
}
