import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/auth.guards';

export const routes: Routes = [
  {
    path: 'login',
    title: 'Iniciar sesión · Acortador',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'register',
    title: 'Crear cuenta · Acortador',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/register.page').then((m) => m.RegisterPage),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./features/layout/shell').then((m) => m.Shell),
    children: [
      {
        path: '',
        pathMatch: 'full',
        title: 'Dashboard · Acortador',
        loadComponent: () =>
          import('./features/dashboard/dashboard.page').then((m) => m.DashboardPage),
      },
      {
        path: 'urls',
        title: 'Mis URLs · Acortador',
        loadComponent: () => import('./features/urls/urls.page').then((m) => m.UrlsPage),
      },
      {
        path: 'urls/:id',
        title: 'Estadísticas · Acortador',
        loadComponent: () => import('./features/urls/url-detail.page').then((m) => m.UrlDetailPage),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
