import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { filter } from 'rxjs/operators';

interface NavItem {
  label: string;
  route: string;
  roles?: string[];
  svg: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="app-shell">
      <!-- SIDEBAR -->
      <aside class="sidebar">

        <!-- Brand -->
        <div class="sb-brand">
          <div class="sb-mark">K</div>
          <div><div class="sb-title">KeepOn</div><div class="sb-sub">Gestion équipes terrain</div></div>
        </div>

        <!-- Nav -->
        <nav class="sb-nav">
          <ng-container *ngFor="let section of visibleSections">
            <div class="sb-section">{{ section.title }}</div>
            <ng-container *ngFor="let item of section.items">
              <a class="nav-item"
                 [routerLink]="item.route"
                 routerLinkActive="active"
                 [routerLinkActiveOptions]="{exact: item.route === '/dashboard'}">
                <span class="nav-dot" aria-hidden="true"></span>
                <span class="nav-label">{{ item.label }}</span>
              </a>
            </ng-container>
            <div class="sb-divider"></div>
          </ng-container>
        </nav>

        <!-- Footer -->
        <div class="sb-foot">
          <div class="sb-role">
            <div class="sb-role-dot"></div>
            <div>
              <div class="sb-role-name">{{ auth.currentUser()?.name }}</div>
              <div class="sb-role-lbl">{{ roleLabel }}</div>
            </div>
          </div>
          <button class="sb-logout" (click)="auth.logout()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Déconnexion
          </button>
        </div>
      </aside>

      <!-- MAIN -->
      <div class="main-area">

        <!-- Topbar -->
        <header class="topbar">
          <div class="tb-left">
            <span class="tb-title">KeepOn</span>
            <span class="tb-sep">/</span>
            <span class="tb-page">{{ currentPageLabel }}</span>
          </div>
          <div class="tb-right">
            <button class="tb-notif" title="Notifications">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.7 21a2 2 0 0 1-3.4 0"/>
              </svg>
            </button>
            <div class="tb-user">
              <div class="tb-av">{{ userInitial }}</div>
              <div>
                <div class="tb-uname">{{ auth.currentUser()?.name }}</div>
                <div class="tb-urole">{{ roleLabel }}</div>
              </div>
            </div>
          </div>
        </header>

        <main class="main-content">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `,
  styles: [`
    :host {
      --grad:linear-gradient(150deg,#F0603F,#D93A1E);
      --bg:#F5F4F1; --card:#fff; --border:#E9E6E0;
      --text:#1A1917; --muted:#77736B; --muted2:#9A958C;
      --red:#E0492F; --red-d:#B93A24; --red-soft:#FDEDE9;
      --green:#4ADE80;
      --font-body:'Instrument Sans',-apple-system,"Segoe UI",sans-serif;
      --font-brand:var(--font-body);
    }

    .app-shell { display:flex; height:100vh; overflow:hidden; font-family:var(--font-body); background:var(--bg); color:var(--text); -webkit-font-smoothing:antialiased; }

    /* ── SIDEBAR ── */
    .sidebar {
      width:252px; flex:0 0 252px;
      background:#16150F; color:#F5F4F1; border-right:0;
      display:flex; flex-direction:column; overflow:hidden;
    }

    .sb-brand {
      display:flex; align-items:center; gap:12px;
      padding:22px 20px 12px;
      margin-bottom:10px;
    }
    .sb-mark { width:34px; height:34px; border-radius:10px; background:var(--grad); display:grid; place-items:center; color:#fff; font-weight:600; font-size:15px; }
    .sb-title { font-family:var(--font-brand); font-size:15px; font-weight:600; color:#F5F4F1; letter-spacing:-.01em; line-height:1.1; }
    .sb-sub { font-size:11px; color:#85817A; margin-top:2px; }

    .sb-divider { display:none; }
    .sb-section {
      padding:8px 14px 0;
      font-size:10.5px; font-weight:700; letter-spacing:.06em; text-transform:uppercase;
      color:#6B675F; margin:10px 0 4px; letter-spacing:.13em;
    }

    .sb-nav { flex:1; overflow-y:auto; padding:2px 16px; display:flex; flex-direction:column; gap:2px; }
    .sb-nav::-webkit-scrollbar { width:4px; }
    .sb-nav::-webkit-scrollbar-thumb { background:var(--border); border-radius:4px; }

    .nav-item {
      display:flex; align-items:center; gap:11px;
      padding:9px 12px; border-radius:9px;
      color:#A9A49B; font-size:13.5px; font-weight:500;
      text-decoration:none; width:100%; transition:.13s; position:relative;
    }
    .nav-item:hover { background:#201F16; color:#F5F4F1; }
    .nav-item.active { background:#262419; color:#fff; font-weight:600; }
    .nav-item.active .nav-icon { color:#F0603F; }

    .nav-icon { display:flex; flex:0 0 17px; color:#6B675F; }
    .nav-icon ::ng-deep svg { width:17px; height:17px; }

    .nav-label { flex:1; }
    .nav-dot { width:5px; height:5px; flex:0 0 5px; border-radius:999px; background:#3B3930; transition:.13s; }
    .nav-item:hover .nav-dot { background:#6B675F; }
    .nav-item.active .nav-dot { background:#F0603F; }


    /* ── FOOTER ── */
    .sb-foot { padding:12px 16px 16px; display:flex; flex-direction:column; gap:8px; margin-top:8px; }

    .sb-role {
      background:#201F16; border:0;
      border-radius:10px; padding:9px 13px;
      display:flex; align-items:center; gap:9px;
    }
    .sb-role-dot {
      width:8px; height:8px; border-radius:99px; flex:0 0 8px;
      background:var(--green); box-shadow:0 0 0 3px rgba(34,160,92,.18);
      animation:pulse 2.4s infinite;
    }
    @keyframes pulse {
      0%,100% { box-shadow:0 0 0 3px rgba(34,160,92,.18); }
      50%      { box-shadow:0 0 0 5px rgba(34,160,92,.06); }
    }
    .sb-role-name { font-size:12.5px; font-weight:600; color:#F5F4F1; }
    .sb-role-lbl  { font-size:10.5px; color:#85817A; margin-top:1px; }

    .sb-logout {
      display:flex; align-items:center; gap:9px;
      color:#85817A; font-weight:500; font-size:12.5px;
      padding:10px 12px; border-radius:10px;
      transition:.13s; width:100%; text-align:left;
      font-family:var(--font-body); cursor:pointer; border:none; background:none;
    }
    .sb-logout:hover { background:#201F16; color:#F0603F; }
    .sb-logout svg { width:17px; height:17px; flex:0 0 17px; }

    /* ── TOPBAR ── */
    .main-area { flex:1; display:flex; flex-direction:column; overflow:hidden; }

    .topbar {
      height:62px; flex:0 0 62px;
      background:rgba(245,244,241,.88); backdrop-filter:blur(10px);
      border-bottom:1px solid var(--border);
      display:flex; align-items:center; justify-content:space-between;
      padding:0 28px; gap:16px;
    }
    .tb-left { display:flex; align-items:center; gap:12px; }
    .tb-title { font-family:var(--font-brand); font-size:13px; font-weight:400; color:var(--muted); }
    .tb-sep   { color:var(--border); font-size:18px; font-weight:300; }
    .tb-page  { font-size:13px; font-weight:600; color:var(--text); }

    .tb-right { display:flex; align-items:center; gap:10px; }

    .tb-notif {
      width:36px; height:36px; border-radius:9px;
      display:flex; align-items:center; justify-content:center;
      color:var(--muted); transition:.13s; border:1px solid #E6E3DC; background:#fff; cursor:pointer;
    }
    .tb-notif:hover { background:var(--bg); }
    .tb-notif svg { width:19px; height:19px; }

    .tb-user {
      display:flex; align-items:center; gap:9px;
      padding:4px 10px 4px 4px; border-radius:10px; transition:.13s; cursor:default; border:1px solid #E6E3DC; background:#fff;
    }
    .tb-user:hover { background:var(--bg); }
    .tb-av {
      width:32px; height:32px; border-radius:10px; flex:0 0 32px;
      background:var(--grad); color:#fff;
      display:flex; align-items:center; justify-content:center;
      font-weight:600; font-size:12px;
    }
    .tb-uname { font-size:12px; font-weight:600; line-height:1.2; }
    .tb-urole { font-size:11px; color:var(--muted); }

    /* ── CONTENT ── */
    .main-content { flex:1; overflow-y:auto; padding:28px 32px 56px; background:var(--bg); }

    /* ── RESPONSIVE ── */
    @media (max-width:768px) {
      .sidebar { width:56px; flex:0 0 56px; }
      .sb-title, .sb-sub, .nav-label,
      .sb-section, .sb-divider, .sb-role-name, .sb-role-lbl { display:none; }
      .sb-brand { padding:14px 8px; justify-content:center; }
      .sb-logo-img { width:36px; }
      .nav-item { padding:12px; justify-content:center; }
      .nav-dot { width:7px; height:7px; flex-basis:7px; }
      .sb-foot { align-items:center; padding:12px 8px; }
      .sb-role { padding:8px; justify-content:center; }
      .sb-logout { padding:10px; justify-content:center; }
      .sb-logout svg { margin:0; }
      .main-content { padding:14px; }
      .tb-title, .tb-sep { display:none; }
      .tb-uname, .tb-urole { display:none; }
    }
  `]
})
export class LayoutComponent implements OnInit {


  private allSections: NavSection[] = [
    {
      title: 'Principal',
      items: [
        {
          label: 'Tableau de bord', route: '/dashboard',
          svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>`
        },
        {
          label: 'Clients', route: '/clients',
          svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M16 6a3 3 0 0 1 0 6M21 20a6 6 0 0 0-3-5"/></svg>`
        },
        {
          label: 'Visites', route: '/visits', roles: ['admin', 'pre_seller'],
          svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
        },
      ]
    },
    {
      title: 'Commercial',
      items: [
        {
          label: 'Commandes', route: '/orders',
          svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 2h9a1 1 0 0 1 1 1v18l-3-2-2 2-2-2-2 2-2-2-3 2V5a1 1 0 0 1 1-1z"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="9" y1="12" x2="15" y2="12"/></svg>`,
        },
        {
          label: 'Factures', route: '/invoices',
          svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
        },
        {
          label: 'Livraisons', route: '/delivery', roles: ['admin', 'delivery'],
          svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="6" width="14" height="11" rx="1"/><path d="M15 9h4l3 3v5h-7z"/><circle cx="6" cy="19" r="1.6"/><circle cx="18" cy="19" r="1.6"/></svg>`
        },
      ]
    },
    {
      title: 'Catalogue & Stocks',
      items: [
        {
          label: 'Catalogue', route: '/catalog',
          svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M9 4v5"/></svg>`
        },
        {
          label: 'Stock', route: '/stock', roles: ['admin', 'stock_manager'],
          svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-6 9 6v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 21V12h6v9"/></svg>`,
        },
      ]
    },
    {
      title: 'Administration',
      items: [
        {
          label: 'Équipe', route: '/users', roles: ['admin'],
          svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M16 6a3 3 0 0 1 0 6M21 20a6 6 0 0 0-3-5"/></svg>`
        },
        {
          label: 'Paramètres', route: '/print-settings', roles: ['admin'],
          svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>`
        },
      ]
    },
  ];

  currentPageLabel = 'Tableau de bord';
  visibleSections: NavSection[] = [];

  constructor(public auth: AuthService, private router: Router) {
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => {
      this.updatePageLabel();
    });
    this.updatePageLabel();
  }

  ngOnInit() {
    this.computeVisibleSections();
  }


  private computeVisibleSections(): void {
    const role = this.auth.role;
    this.visibleSections = this.allSections
      .map(section => ({
        ...section,
        items: section.items.filter(item => !item.roles || item.roles.includes(role))
      }))
      .filter(section => section.items.length > 0);
  }

  private updatePageLabel(): void {
    const url = this.router.url.split('?')[0];
    const all = this.allSections.flatMap(s => s.items);
    const match = all.find(i => url === i.route || url.startsWith(i.route + '/'));
    this.currentPageLabel = match?.label ?? 'Tableau de bord';
  }

  get userInitial(): string {
    return (this.auth.currentUser()?.name || '?')[0].toUpperCase();
  }

  get roleLabel(): string {
    const map: Record<string, string> = {
      admin: 'Administrateur',
      stock_manager: 'Gestionnaire Stock',
      pre_seller: 'Pré-vendeur',
      delivery: 'Livreur'
    };
    return map[this.auth.role] || this.auth.role;
  }
}
