// frontend/src/app/features/customization/customization.routes.ts
import type { Routes } from '@angular/router';

export const CUSTOMIZATION_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./customization.component').then((m) => m.CustomizationComponent),
  },
];
