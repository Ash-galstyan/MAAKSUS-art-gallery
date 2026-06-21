// frontend/src/app/features/artwork-detail/artwork-detail.routes.ts
import type { Routes } from '@angular/router';

export const ARTWORK_DETAIL_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./artwork-detail.component').then((m) => m.ArtworkDetailComponent),
  },
];
