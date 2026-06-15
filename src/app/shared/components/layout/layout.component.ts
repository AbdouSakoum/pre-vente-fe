import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  roles?: string[];
}

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="app-shell">
      <!-- SIDEBAR -->
      <aside class="sidebar">
        <div class="sidebar-brand">
          <span class="brand-icon">🛒</span>
          <div>
            <div class="brand-name">Pré-vente</div>
            <div class="brand-sub">{{ auth.currentUser()?.name }}</div>
          </div>
        </div>

        <nav class="sidebar-nav">
          <ng-container *ngFor="let item of visibleNavItems">
            <a class="nav-item" [routerLink]="item.route" routerLinkActive="active">
              <span class="material-icons nav-icon">{{ item.icon }}</span>
              <span class="nav-label">{{ item.label }}</span>
            </a>
          </ng-container>
        </nav>

        <div class="sidebar-footer">
          <div class="role-chip">{{ roleLabel }}</div>
          <button class="logout-btn" (click)="auth.logout()">
            <span class="material-icons">logout</span>
            Déconnexion
          </button>
        </div>
      </aside>

      <!-- MAIN -->
      <div class="main-area">
        <header class="topbar">
          <span class="topbar-title">{{ pageTitle }}</span>
          <div class="topbar-right">
            <span class="material-icons" style="color:#94a3b8">account_circle</span>
            <span class="topbar-user">{{ auth.currentUser()?.name }}</span>
          </div>
        </header>
        <main class="main-content">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `,
  styles: [`
    .app-shell { display: flex; height: 100vh; overflow: hidden; font-family: 'Roboto', sans-serif; }

    /* SIDEBAR */
    .sidebar {
      width: 240px; min-width: 240px;
      background: #0f172a;
      display: flex; flex-direction: column;
      box-shadow: 2px 0 8px rgba(0,0,0,0.15);
    }
    .sidebar-brand {
      display: flex; align-items: center; gap: 12px;
      padding: 20px 16px;
      border-bottom: 1px solid rgba(255,255,255,0.08);
    }
    .brand-icon { font-size: 28px; }
    .brand-name { font-size: 16px; font-weight: 700; color: #f1f5f9; }
    .brand-sub { font-size: 11px; color: #64748b; margin-top: 2px; }

    /* NAV */
    .sidebar-nav { flex: 1; padding: 12px 8px; display: flex; flex-direction: column; gap: 2px; overflow-y: auto; }
    .nav-item {
      display: flex; align-items: center; gap: 12px;
      padding: 10px 12px; border-radius: 8px;
      color: #94a3b8; text-decoration: none;
      font-size: 14px; font-weight: 500;
      transition: all 0.15s;
      cursor: pointer;
    }
    .nav-item:hover { background: rgba(255,255,255,0.06); color: #e2e8f0; }
    .nav-item.active { background: #3b82f6; color: #fff; }
    .nav-item.active .nav-icon { color: #fff; }
    .nav-icon { font-size: 20px; color: #64748b; flex-shrink: 0; }
    .nav-item.active .nav-icon { color: #fff; }

    /* FOOTER */
    .sidebar-footer {
      padding: 12px 8px;
      border-top: 1px solid rgba(255,255,255,0.08);
      display: flex; flex-direction: column; gap: 8px;
    }
    .role-chip {
      text-align: center; font-size: 11px; font-weight: 600;
      background: rgba(59,130,246,0.2); color: #60a5fa;
      padding: 4px 12px; border-radius: 20px;
    }
    .logout-btn {
      display: flex; align-items: center; justify-content: center; gap: 8px;
      padding: 9px; border-radius: 8px; border: none;
      background: rgba(239,68,68,0.1); color: #f87171;
      cursor: pointer; font-size: 13px; font-weight: 500;
      transition: background 0.15s; width: 100%;
    }
    .logout-btn:hover { background: rgba(239,68,68,0.2); }
    .logout-btn .material-icons { font-size: 18px; }

    /* TOPBAR */
    .main-area { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
    .topbar {
      height: 56px; background: #fff;
      border-bottom: 1px solid #e2e8f0;
      display: flex; align-items: center;
      justify-content: space-between;
      padding: 0 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
      flex-shrink: 0;
    }
    .topbar-title { font-size: 16px; font-weight: 600; color: #1e293b; }
    .topbar-right { display: flex; align-items: center; gap: 8px; }
    .topbar-user { font-size: 13px; color: #64748b; }

    /* CONTENT */
    .main-content { flex: 1; overflow-y: auto; padding: 24px; background: #f8fafc; display:flex; flex-direction:column; }

    /* RESPONSIVE SIDEBAR */
    @media (max-width: 768px) {
      .sidebar { width: 56px; min-width: 56px; }
      .brand-name, .brand-sub, .nav-label, .role-chip, .logout-btn span:not(.material-icons) { display: none; }
      .sidebar-brand { padding: 14px 8px; justify-content: center; }
      .nav-item { padding: 12px; justify-content: center; }
      .sidebar-footer { align-items: center; }
      .logout-btn { padding: 10px; justify-content: center; }
      .main-content { padding: 12px; }
    }
  `]
})
export class LayoutComponent {
  pageTitle = 'Application Pré-vente';

  private navItems: NavItem[] = [
    { label: 'Tableau de bord', icon: 'dashboard', route: '/dashboard' },
    { label: 'Clients', icon: 'people', route: '/clients' },
    { label: 'Visites', icon: 'location_on', route: '/visits', roles: ['admin', 'pre_seller'] },
    { label: 'Commandes', icon: 'receipt_long', route: '/orders' },
    { label: 'Livraisons', icon: 'local_shipping', route: '/delivery', roles: ['admin', 'delivery'] },
    { label: 'Catalogue', icon: 'inventory_2', route: '/catalog' },
    { label: 'Stock', icon: 'warehouse', route: '/stock', roles: ['admin', 'stock_manager'] },
    { label: 'Équipe', icon: 'group', route: '/users', roles: ['admin'] },
  ];

  constructor(public auth: AuthService) {}

  get visibleNavItems(): NavItem[] {
    return this.navItems.filter(item =>
      !item.roles || item.roles.includes(this.auth.role)
    );
  }

  get roleLabel(): string {
    const map: any = {
      admin: 'Administrateur',
      stock_manager: 'Gestionnaire Stock',
      pre_seller: 'Pré-vendeur',
      delivery: 'Livreur'
    };
    return map[this.auth.role] || this.auth.role;
  }
}
