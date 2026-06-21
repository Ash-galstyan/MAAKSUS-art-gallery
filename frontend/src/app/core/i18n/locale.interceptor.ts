// frontend/src/app/core/i18n/locale.interceptor.ts
/**
 * Adds Accept-Language to every API request so the backend can pick the
 * right translation row. We use uppercase to match the backend enum (EN/HY/RU)
 * which the locale middleware normalises anyway, but this keeps logs tidy.
 */
import { inject } from '@angular/core';
import type { HttpInterceptorFn } from '@angular/common/http';
import { I18nService } from './i18n.service';

export const localeInterceptor: HttpInterceptorFn = (req, next) => {
  const i18n = inject(I18nService);
  return next(req.clone({ setHeaders: { 'Accept-Language': i18n.localeServer() } }));
};
