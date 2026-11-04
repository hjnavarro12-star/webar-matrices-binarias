import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'ar',
    pathMatch: 'full',
  },
  {
    // RA-PBI-03 — Yeison implementa ArViewComponent aquí
    path: 'ar',
    loadComponent: () =>
      import('./features/ar/components/ar-view/ar-view.component').then(
        (m) => m.ArViewComponent
      ),
  },
  {
    path: '**',
    redirectTo: 'ar',
  },
];
