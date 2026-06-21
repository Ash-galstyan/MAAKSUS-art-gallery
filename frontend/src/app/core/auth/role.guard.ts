// frontend/src/app/core/auth/role.guard.ts
/**
 * canActivate guard — only allows admin role through. Non-admins (or
 * anonymous) get bounced to the gallery.
 */
import { inject } from '@angular/core';
import type { CanActivateFn } from '@angular/router';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAdmin()) return true;
  return router.createUrlTree(['/']);
};
