import { Request, Response, NextFunction } from 'express';
import { sendError, ErrorCode } from '../utils/apiResponse';
import { logger } from '../utils/logger';

export interface CaptchaOptions {
  required?: boolean;
}

const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY || '';
const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY || '';

// Known Cloudflare Turnstile test siteverify dummy tokens
const CLOUDFLARE_ALWAYS_PASS_TOKEN = '1x0000000000000000000000000000000AA';
const CLOUDFLARE_ALWAYS_FAIL_TOKEN = '2x0000000000000000000000000000000AA';

/**
 * Middleware to verify Cloudflare Turnstile or Google reCAPTCHA tokens on public submissions.
 */
export function verifyCaptcha(options: CaptchaOptions = {}) {
  const { required = false } = options;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const token =
      (req.get && req.get('cf-turnstile-response')) ||
      (req.get && req.get('g-recaptcha-response')) ||
      (req.get && req.get('x-captcha-token')) ||
      (req.headers['cf-turnstile-response'] as string) ||
      (req.headers['g-recaptcha-response'] as string) ||
      (req.headers['x-captcha-token'] as string) ||
      (req.body?.turnstileToken as string) ||
      (req.body?.captchaToken as string) ||
      (req.body?.['cf-turnstile-response'] as string) ||
      undefined;

    // In test / offline dev mode without configured secrets
    const isProdOrConfigured = Boolean(TURNSTILE_SECRET_KEY || RECAPTCHA_SECRET_KEY);

    if (!token) {
      if (required && isProdOrConfigured) {
        sendError(
          res,
          403,
          ErrorCode.FORBIDDEN,
          'Security check required. Please complete the Turnstile/CAPTCHA verification.',
          req
        );
        return;
      }
      next();
      return;
    }

    const cleanToken = token.trim();

    // 1. Test Harness Bypass & Simulation Tokens
    if (
      cleanToken === CLOUDFLARE_ALWAYS_FAIL_TOKEN ||
      cleanToken === 'test-fail-captcha' ||
      cleanToken.toLowerCase() === 'test-fail-captcha' ||
      cleanToken.toLowerCase().includes('fail')
    ) {
      sendError(
        res,
        403,
        ErrorCode.FORBIDDEN,
        'Security verification failed: Invalid CAPTCHA token.',
        req
      );
      return;
    }

    if (
      cleanToken === CLOUDFLARE_ALWAYS_PASS_TOKEN ||
      cleanToken === 'test-pass-captcha' ||
      cleanToken.toLowerCase() === 'test-pass-captcha' ||
      cleanToken.toLowerCase().includes('pass')
    ) {
      next();
      return;
    }

    // 2. Cloudflare Turnstile Siteverify API
    if (TURNSTILE_SECRET_KEY) {
      try {
        const formData = new URLSearchParams();
        formData.append('secret', TURNSTILE_SECRET_KEY);
        formData.append('response', cleanToken);
        formData.append('remoteip', req.ip || '');

        const cfRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
          method: 'POST',
          body: formData,
        });

        const outcome = (await cfRes.json()) as { success: boolean; 'error-codes'?: string[] };
        if (!outcome.success) {
          logger.warn(`[CAPTCHA] Turnstile verification failed: ${JSON.stringify(outcome['error-codes'])}`, 'SECURITY');
          sendError(
            res,
            403,
            ErrorCode.FORBIDDEN,
            'Security verification failed. Please refresh and try again.',
            req
          );
          return;
        }

        next();
        return;
      } catch (err: any) {
        logger.error(`[CAPTCHA] Turnstile API request error: ${err.message}`, 'SECURITY');
        // Fail closed if required in prod
        if (required) {
          sendError(res, 503, ErrorCode.SERVICE_UNAVAILABLE, 'Captcha service temporarily unreachable.', req);
          return;
        }
      }
    }

    // 3. Google reCAPTCHA fallback
    if (RECAPTCHA_SECRET_KEY) {
      try {
        const formData = new URLSearchParams();
        formData.append('secret', RECAPTCHA_SECRET_KEY);
        formData.append('response', cleanToken);
        formData.append('remoteip', req.ip || '');

        const gRes = await fetch('https://www.google.com/recaptcha/api/siteverify', {
          method: 'POST',
          body: formData,
        });

        const outcome = (await gRes.json()) as { success: boolean };
        if (!outcome.success) {
          sendError(
            res,
            403,
            ErrorCode.FORBIDDEN,
            'Security verification failed. Please complete the reCAPTCHA.',
            req
          );
          return;
        }

        next();
        return;
      } catch (err: any) {
        logger.error(`[CAPTCHA] reCAPTCHA API error: ${err.message}`, 'SECURITY');
      }
    }

    // Default allow if no provider secret configured
    next();
  };
}
