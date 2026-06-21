// frontend/src/app/features/wall-preview/wall-preview.routes.ts
import type { Routes } from '@angular/router';

export const WALL_PREVIEW_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./wall-preview.component').then((m) => m.WallPreviewComponent),
  },
];
