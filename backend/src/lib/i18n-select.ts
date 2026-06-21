// backend/src/lib/i18n-select.ts
/**
 * Picks the right translation row for the active locale, falling back to EN if
 * the requested locale isn't present. Used by every list/detail query that
 * returns translatable content.
 *
 * Usage:
 *   const t = pickTranslation(artwork.translations, req.locale);
 *   res.json({ title: t?.title, ... });
 */
import type { LocaleCode } from '../config/constants';

export interface HasLocale {
  locale: LocaleCode;
}

export function pickTranslation<T extends HasLocale>(
  translations: T[],
  locale: LocaleCode,
): T | undefined {
  return (
    translations.find((t) => t.locale === locale) ??
    translations.find((t) => t.locale === 'EN') ??
    translations[0]
  );
}
