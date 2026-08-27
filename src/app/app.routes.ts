import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent) },
  { path: 'privacy', loadComponent: () => import('./pages/privacy/privacy.component').then(m => m.PrivacyComponent) },
  { path: 'superadmin', loadComponent: () => import('./pages/superadmin/superadmin.component').then(m => m.SuperadminComponent) },
  { path: 'change-password', loadComponent: () => import('./pages/change-password/change-password.component').then(m => m.ChangePasswordComponent) },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./shared/components/layout/layout.component').then(m => m.LayoutComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'catalog', loadComponent: () => import('./pages/catalog/catalog.component').then(m => m.CatalogComponent) },
      { path: 'orders', loadComponent: () => import('./pages/orders/orders.component').then(m => m.OrdersComponent) },
      { path: 'invoices', loadComponent: () => import('./pages/invoices/invoices.component').then(m => m.InvoicesComponent) },
      { path: 'clients', loadComponent: () => import('./pages/clients/clients.component').then(m => m.ClientsComponent) },
      { path: 'users', canActivate: [roleGuard('admin')], loadComponent: () => import('./pages/users/users.component').then(m => m.UsersComponent) },
      { path: 'stock', canActivate: [roleGuard('admin', 'stock_manager')], loadComponent: () => import('./pages/stock/stock.component').then(m => m.StockComponent) },
      { path: 'delivery', canActivate: [roleGuard('admin', 'delivery')], loadComponent: () => import('./pages/delivery/delivery.component').then(m => m.DeliveryComponent) },
      { path: 'visits', canActivate: [roleGuard('admin', 'pre_seller')], loadComponent: () => import('./pages/visits/visits.component').then(m => m.VisitsComponent) },
      { path: 'print-settings', canActivate: [roleGuard('admin')], loadComponent: () => import('./pages/print-settings/print-settings.component').then(m => m.PrintSettingsComponent) },
    ]
  },
  { path: '**', redirectTo: '' }
];
