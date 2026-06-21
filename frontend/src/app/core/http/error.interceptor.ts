// frontend/src/app/core/http/error.interceptor.ts
/**
 * Centralised error feedback for API responses.
 *
 * Behaviour:
 *   - Skips 401 — let auth.interceptor handle the refresh dance.
 *   - For known error codes (VALIDATION_ERROR, RATE_LIMITED, etc.) shows
 *     a localised snackbar; otherwise shows the server message verbatim.
 *   - Rethrows so component-level handlers can still react if they want.
 */
import { inject } from '@angular/core';
import { HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { I18nService } from '../i18n/i18n.service';
import type { ApiErrorBody } from '../api-models/api-error.model';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const snack = inject(MatSnackBar);
  const i18n = inject(I18nService);

  return next(req).pipe(
    catchError((err) => {
      if (err instanceof HttpErrorResponse && err.status !== 401) {
        const body = err.error as ApiErrorBody | undefined;
        const code = body?.error?.code;
        // Try a localised message first; fall back to whatever the server sent.
        const localised = code ? i18n.t(`errors.${code}`) : null;
        const isMissing = !localised || localised === `errors.${code}`;
        const message = isMissing
          ? body?.error?.message ?? i18n.t('errors.GENERIC')
          : localised;
        snack.open(message, i18n.t('common.dismiss'), { duration: 4000 });
      }
      return throwError(() => err);
    }),
  );
};
