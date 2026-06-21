// backend/src/config/constants.ts
/**
 * Centralised constants — anything that's not user-configurable env but might
 * still want tweaking lives here.
 */
export const SUPPORTED_LOCALES = ['EN', 'HY', 'RU'] as const;
export type LocaleCode = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: LocaleCode = 'EN';

export const REFRESH_COOKIE_NAME = 'gallery_refresh';

export const IMAGE_SIZES = {
  thumbnail: 400,
  medium: 1200,
  // original is preserved as-is
} as const;

export const PASSWORD_RESET_TTL_MIN = 30;

export const RATE_LIMITS = {
  auth: { windowMs: 15 * 60_000, max: 20 },           // 20 attempts per 15 min per IP
  passwordReset: { windowMs: 60 * 60_000, max: 5 },   // 5/hour per IP
  payment: { windowMs: 60_000, max: 10 },             // 10/min per IP
} as const;
