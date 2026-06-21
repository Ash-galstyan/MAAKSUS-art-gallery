// frontend/src/app/features/cart/cart.routes.ts
import type { Routes } from '@angular/router';

export const CART_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./cart.component').then((m) => m.CartComponent),
  },
];
