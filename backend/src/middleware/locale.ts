// backend/src/middleware/locale.ts
/**
 * Resolves the active locale for the request and attaches it as `req.locale`.
 * Priority: `?locale=` query → `Accept-Language` header → DEFAULT_LOCALE.
 * Always populated — downstream handlers never need to null-check.
 */
import type { Request, Response, NextFunction } from 'express';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type LocaleCode } from '../config/constants';

function normalize(input: string | undefined): LocaleCode | null {
  if (!input) return null;
  const upper = input.slice(0, 2).toUpperCase();
  return (SUPPORTED_LOCALES as readonly string[]).includes(upper)
    ? (upper as LocaleCode)
    : null;
}

export function localeMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const fromQuery = normalize(typeof req.query.locale === 'string' ? req.query.locale : undefined);
  const fromHeader = normalize(req.headers['accept-language']?.split(',')[0]);
  req.locale = fromQuery ?? fromHeader ?? DEFAULT_LOCALE;
  next();
}
