// frontend/src/app/features/artists/artists.routes.ts
import type { Routes } from '@angular/router';

export const ARTISTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./artists-index.component').then((m) => m.ArtistsIndexComponent),
  },
];
