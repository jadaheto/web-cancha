import { LOCALE_ID } from '@angular/core';
import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  // Portal público (estructura tipo iCancha: inicio → sede → zona → reserva)
  {
    path: '',
    // Montos y fechas en formato colombiano ($60.000, «sábado 7 de noviembre»).
    providers: [{ provide: LOCALE_ID, useValue: 'es-CO' }],
    loadComponent: () =>
      import('./ui/templates/public-layout.component').then((m) => m.PublicLayoutComponent),
    children: [
      { path: '', loadComponent: () => import('./pages/public/home/home.page').then((m) => m.HomePage) },
      { path: 'sede/:slug', loadComponent: () => import('./pages/public/venue/venue.page').then((m) => m.VenuePage) },
      { path: 'cancha/:id', loadComponent: () => import('./pages/public/court/court.page').then((m) => m.CourtPage) },
      // Página de confirmación de pago (URL de respuesta de ePayco): doble confirmación ePayco + Comfasucre.
      { path: 'pago/confirmacion', loadComponent: () => import('./pages/public/payment-confirmation/payment-confirmation.page').then((m) => m.PaymentConfirmationPage) },
      { path: 'pago/confirmacion/:id', loadComponent: () => import('./pages/public/payment-confirmation/payment-confirmation.page').then((m) => m.PaymentConfirmationPage) },
      // Rutas anteriores: siguen funcionando con la misma página.
      { path: 'reserva', loadComponent: () => import('./pages/public/payment-confirmation/payment-confirmation.page').then((m) => m.PaymentConfirmationPage) },
      { path: 'reserva/:id', loadComponent: () => import('./pages/public/payment-confirmation/payment-confirmation.page').then((m) => m.PaymentConfirmationPage) },
    ],
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'admin',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./ui/templates/admin-layout.component').then((m) => m.AdminLayoutComponent),
    children: [
      { path: '', loadComponent: () => import('./pages/dashboard/dashboard.page').then((m) => m.DashboardPage) },
      { path: 'reservations', loadComponent: () => import('./pages/reservations/reservations.page').then((m) => m.ReservationsPage) },
      { path: 'reservations/new', loadComponent: () => import('./pages/reservations/reservation-form.page').then((m) => m.ReservationFormPage) },
      { path: 'payments', loadComponent: () => import('./pages/payments/payments.page').then((m) => m.PaymentsPage) },
      { path: 'courts', loadComponent: () => import('./pages/courts/courts-list.page').then((m) => m.CourtsListPage) },
      { path: 'courts/new', loadComponent: () => import('./pages/courts/court-form.page').then((m) => m.CourtFormPage) },
      { path: 'courts/:id', loadComponent: () => import('./pages/courts/court-form.page').then((m) => m.CourtFormPage) },
      { path: 'users', loadComponent: () => import('./pages/users/users.page').then((m) => m.UsersPage) },
      { path: 'analytics', loadComponent: () => import('./pages/analytics/analytics.page').then((m) => m.AnalyticsPage) },
      { path: 'settings', loadComponent: () => import('./pages/settings/settings.page').then((m) => m.SettingsPage) },
    ],
  },
  { path: '**', redirectTo: '' },
];
