// frontend/src/app/features/admin/admin.routes.ts
/**
 * Admin route tree. The role guard at the top level (in app.routes.ts) means
 * we don't need to re-check ADMIN role here.
 */
import type { Routes } from '@angular/router';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./admin-layout.component').then((m) => m.AdminLayoutComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'artworks' },
      {
        path: 'artworks',
        loadComponent: () =>
          import('./artworks/admin-artworks.component').then((m) => m.AdminArtworksComponent),
      },
      {
        path: 'categories',
        loadComponent: () =>
          import('./categories/admin-categories.component').then(
            (m) => m.AdminCategoriesComponent,
          ),
      },
      {
        path: 'artists',
        loadComponent: () =>
          import('./artists/admin-artists.component').then((m) => m.AdminArtistsComponent),
      },
      {
        path: 'print-options',
        loadComponent: () =>
          import('./print-options/admin-print-options.component').then(
            (m) => m.AdminPrintOptionsComponent,
          ),
      },
      {
        path: 'orders',
        loadComponent: () =>
          import('./orders/admin-orders.component').then((m) => m.AdminOrdersComponent),
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./users/admin-users.component').then((m) => m.AdminUsersComponent),
      },
    ],
  },
];
