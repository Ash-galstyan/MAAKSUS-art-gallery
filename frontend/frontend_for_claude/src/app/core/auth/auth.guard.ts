// frontend/src/app/core/auth/auth.guard.ts
/**
 * canActivate guard — sends unauthenticated users to /account/login,
 * preserving the intended URL via `redirect` query param.
 */
import { inject } from '@angular/core';
import type { CanActivateFn } from '@angular/router';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAuthenticated()) return true;
  return router.createUrlTree(['/account/login'], { queryParams: { redirect: state.url } });
};
