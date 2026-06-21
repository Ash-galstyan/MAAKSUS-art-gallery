// frontend/src/app/features/account/account.routes.ts
/**
 * Account route tree — public auth screens + authed profile.
 * Lazy-loaded from app.routes.ts.
 */
import type { Routes } from '@angular/router';
import { authGuard } from '../../core/auth/auth.guard';

export const ACCOUNT_ROUTES: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () => import('./register.component').then((m) => m.RegisterComponent),
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./forgot-password.component').then((m) => m.ForgotPasswordComponent),
  },
  {
    path: 'reset-password',
    loadComponent: () => import('./reset-password.component').then((m) => m.ResetPasswordComponent),
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () => import('./profile.component').then((m) => m.ProfileComponent),
  },
];
