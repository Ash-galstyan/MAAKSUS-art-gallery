// backend/src/middleware/rate-limit.ts
/**
 * Pre-configured rate limiters. Apply per-route in the routes file.
 *
 * Behind Nginx, make sure to set `app.set('trust proxy', 1)` (done in app.ts)
 * so the limiter sees the real client IP and not the proxy's.
 */
import rateLimit from 'express-rate-limit';
import { RATE_LIMITS } from '../config/constants';

export const authLimiter = rateLimit({
  windowMs: RATE_LIMITS.auth.windowMs,
  max: RATE_LIMITS.auth.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many requests, slow down' } },
});

export const passwordResetLimiter = rateLimit({
  windowMs: RATE_LIMITS.passwordReset.windowMs,
  max: RATE_LIMITS.passwordReset.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many reset requests' } },
});

export const paymentLimiter = rateLimit({
  windowMs: RATE_LIMITS.payment.windowMs,
  max: RATE_LIMITS.payment.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many payment attempts' } },
});
