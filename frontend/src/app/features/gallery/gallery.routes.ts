// frontend/src/app/features/gallery/gallery.routes.ts
import type { Routes } from '@angular/router';

export const GALLERY_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./gallery.component').then((m) => m.GalleryComponent),
  },
];
