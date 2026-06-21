// frontend/src/app/app.routes.ts
/**
 * Top-level routes.
 *
 * Everything is lazy-loaded — keeps the initial bundle small and means each
 * feature compiles independently. Phase 6 fills in the gallery route, Phase 7
 * wall-preview, Phase 8 customization/cart, Phase 9 checkout & admin.
 */
import type { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { adminGuard } from './core/auth/role.guard';

export const APP_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadChildren: () => import('./features/gallery/gallery.routes').then((m) => m.GALLERY_ROUTES),
  },
  {
    path: 'artwork/:id',
    loadChildren: () =>
      import('./features/artwork-detail/artwork-detail.routes').then((m) => m.ARTWORK_DETAIL_ROUTES),
  },
  {
    path: 'wall-preview/:artworkId',
    loadChildren: () =>
      import('./features/wall-preview/wall-preview.routes').then((m) => m.WALL_PREVIEW_ROUTES),
  },
  {
    path: 'customize/:artworkId',
    loadChildren: () =>
      import('./features/customization/customization.routes').then((m) => m.CUSTOMIZATION_ROUTES),
  },
  {
    path: 'cart',
    loadChildren: () => import('./features/cart/cart.routes').then((m) => m.CART_ROUTES),
  },
  {
    path: 'checkout',
    canActivate: [authGuard],
    loadChildren: () => import('./features/checkout/checkout.routes').then((m) => m.CHECKOUT_ROUTES),
  },
  {
    path: 'order/:id',
    canActivate: [authGuard],
    loadChildren: () => import('./features/checkout/checkout.routes').then((m) => m.ORDER_ROUTES),
  },
  {
    path: 'account',
    loadChildren: () => import('./features/account/account.routes').then((m) => m.ACCOUNT_ROUTES),
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadChildren: () => import('./features/admin/admin.routes').then((m) => m.ADMIN_ROUTES),
  },
  { path: '**', redirectTo: '' },
];
