// frontend/src/app/features/checkout/checkout.routes.ts
import type { Routes } from '@angular/router';

export const CHECKOUT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./checkout.component').then((m) => m.CheckoutComponent),
  },
];

export const ORDER_ROUTES: Routes = [
  {
    path: 'failed',
    loadComponent: () =>
      import('./order-failed.component').then((m) => m.OrderFailedComponent),
  },
  {
    path: ':id/confirmation',
    loadComponent: () =>
      import('./order-confirmation.component').then((m) => m.OrderConfirmationComponent),
  },
  {
    path: ':id/failed',
    loadComponent: () =>
      import('./order-failed.component').then((m) => m.OrderFailedComponent),
  },
];
