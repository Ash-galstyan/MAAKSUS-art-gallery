// frontend/src/app/core/auth/auth.interceptor.ts
/**
 * Attaches the access token to outgoing requests and recovers from a single
 * 401 by calling refresh, then retrying the original request once.
 *
 * Skips:
 *   - /auth/refresh  (would recurse)
 *   - /auth/login    (no token yet; 401 is the legitimate "wrong creds" answer)
 *   - /auth/register
 *
 * If refresh fails, the original 401 propagates so the caller knows the user
 * isn't logged in.
 */
import { inject } from '@angular/core';
import type { HttpInterceptorFn } from '@angular/common/http';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';

const SKIP_URL_PATTERNS = [/\/auth\/refresh$/, /\/auth\/login$/, /\/auth\/register$/];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const shouldSkip = SKIP_URL_PATTERNS.some((re) => re.test(req.url));

  const withAuth = (token: string | null) =>
    token
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` }, withCredentials: true })
      : req.clone({ withCredentials: true });

  const authed = shouldSkip ? req.clone({ withCredentials: true }) : withAuth(auth.getAccessToken());

  return next(authed).pipe(
    catchError((err) => {
      if (
        err instanceof HttpErrorResponse &&
        err.status === 401 &&
        !shouldSkip &&
        auth.getAccessToken() !== null // we had a token; might be just expired
      ) {
        return from(auth.refresh()).pipe(
          switchMap((newToken) => {
            if (!newToken) return throwError(() => err);
            return next(withAuth(newToken));
          }),
        );
      }
      return throwError(() => err);
    }),
  );
};
