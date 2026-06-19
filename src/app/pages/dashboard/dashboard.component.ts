import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../services/api.service';

type Period = 'today' | 'week' | 'month' | 'all';

interface Tournee {
  id: string; name: string;
  total_assigned: number; delivered: number; restantes: number; ca_livre: number;
}
interface Visite {
  id: string; name: string;
  total: number; converties: number; perdues: number; en_cours: number; ca_converti: number;
}
interface StockAlert {
  product_name: string; variant_name: string;
  quantity: number; seuil: number; niveau: 'rupture' | 'critique' | 'faible'; pct: number;
}
interface ActivityEvent {
  type: string; time: string; label: string; actor: string | null; ref: string | null; color: 'green' | 'amber' | 'blue';
}
interface DashboardData {
  period: string;
  kpis: {
    clients:    { total: number };
    orders:     { total: number };
    deliveries: { delivered: number; total: number };
    revenue:    { ca: number; encaisse: number };
    stock:      { total: number; alertes: number };
  };
  tournees: Tournee[];
  visites:  Visite[];
}

const AVATAR_COLORS = ['#3b82f6','#7c3aed','#0d9488','#d97706','#e2483d','#16a34a','#2f6bff','#9333ea'];

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <!-- PAGE HEAD -->
    <div class="phead">
      <div class="phead-l">
        <h1>Tableau de bord</h1>
        <div class="sub">Aperçu en temps réel de votre activité commerciale terrain</div>
      </div>
      <div class="phead-r">
        <div class="period-bar">
          <button class="period-btn" [class.active]="period() === 'today'"  (click)="setPeriod('today')">Aujourd'hui</button>
          <button class="period-btn" [class.active]="period() === 'week'"   (click)="setPeriod('week')">Cette semaine</button>
          <button class="period-btn" [class.active]="period() === 'month'"  (click)="setPeriod('month')">Ce mois</button>
          <button class="period-btn" [class.active]="period() === 'all'"    (click)="setPeriod('all')">Tout</button>
        </div>
        <button class="btn-refresh" (click)="refresh()" [class.spinning]="loading">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M23 4v6h-6"/><path d="M20.5 15a9 9 0 1 1-2.8-9.4L23 10"/></svg>
          Actualiser
        </button>
      </div>
    </div>

    <!-- KPI CARDS -->
    <div class="kpis" [class.loading]="loading">

      <div class="kpi">
        <div class="kpi-top">
          <div class="kpi-ico ki-blue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M16 6a3 3 0 0 1 0 6M21 20a6 6 0 0 0-3-5"/></svg>
          </div>
          <span class="kpi-trend neu">Total</span>
        </div>
        <div class="kpi-v">{{ data()?.kpis?.clients?.total ?? '—' }}</div>
        <div class="kpi-l">Clients actifs</div>
      </div>

      <div class="kpi">
        <div class="kpi-top">
          <div class="kpi-ico ki-amber">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 2h9a1 1 0 0 1 1 1v18l-3-2-2 2-2-2-2 2-2-2-3 2V5a1 1 0 0 1 1-1z"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="9" y1="12" x2="15" y2="12"/></svg>
          </div>
          <span class="kpi-trend" [class.up]="(data()?.kpis?.orders?.total ?? 0) > 0" [class.neu]="!(data()?.kpis?.orders?.total)">
            <svg *ngIf="(data()?.kpis?.orders?.total ?? 0) > 0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
            {{ data()?.kpis?.orders?.total ?? 0 }}
          </span>
        </div>
        <div class="kpi-v">{{ data()?.kpis?.orders?.total ?? '—' }}</div>
        <div class="kpi-l">Commandes {{ periodLabel() }}</div>
      </div>

      <div class="kpi">
        <div class="kpi-top">
          <div class="kpi-ico ki-teal">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="6" width="14" height="11" rx="1"/><path d="M15 9h4l3 3v5h-7z"/><circle cx="6" cy="19" r="1.6"/><circle cx="18" cy="19" r="1.6"/></svg>
          </div>
          <span class="kpi-trend" style="background:#fff7e8;color:#a8620a" *ngIf="inProgressCount() > 0">{{ inProgressCount() }} active{{ inProgressCount() > 1 ? 's' : '' }}</span>
          <span class="kpi-trend neu" *ngIf="inProgressCount() === 0">—</span>
        </div>
        <div class="kpi-v">
          <ng-container *ngIf="data()?.kpis?.deliveries as d">{{ d.delivered }}/{{ d.total }}</ng-container>
          <ng-container *ngIf="!data()?.kpis?.deliveries">—</ng-container>
        </div>
        <div class="kpi-l">Livraisons {{ periodLabel() }}</div>
      </div>

      <div class="kpi">
        <div class="kpi-top">
          <div class="kpi-ico ki-green">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/></svg>
          </div>
          <span class="kpi-trend up" *ngIf="(data()?.kpis?.revenue?.ca ?? 0) > 0">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
            {{ encaisseRate() }}% encaissé
          </span>
          <span class="kpi-trend neu" *ngIf="(data()?.kpis?.revenue?.ca ?? 0) === 0">—</span>
        </div>
        <div class="kpi-v">{{ fmt(data()?.kpis?.revenue?.ca ?? 0) }}</div>
        <div class="kpi-l">CA {{ periodLabel() }} (DH)</div>
      </div>

      <div class="kpi">
        <div class="kpi-top">
          <div class="kpi-ico ki-red">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-6 9 6v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 21V12h6v9"/></svg>
          </div>
          <span class="kpi-trend down" *ngIf="(data()?.kpis?.stock?.alertes ?? 0) > 0">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            {{ data()?.kpis?.stock?.alertes }} alerte{{ (data()?.kpis?.stock?.alertes ?? 0) > 1 ? 's' : '' }}
          </span>
          <span class="kpi-trend neu" *ngIf="(data()?.kpis?.stock?.alertes ?? 0) === 0">OK</span>
        </div>
        <div class="kpi-v">{{ fmt(data()?.kpis?.stock?.total ?? 0, false) }}</div>
        <div class="kpi-l">Unités en stock</div>
      </div>

    </div>

    <!-- ROW : Visites + Tournées -->
    <div class="grid2" [class.loading]="loading">

      <!-- VISITES PAR PRÉ-VENDEUR -->
      <div class="card">
        <div class="card-h">
          <span class="ch-l">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            Visites {{ periodLabel() }}
          </span>
          <a class="ch-r" routerLink="/visits">Voir tout →</a>
        </div>

        <!-- empty -->
        <div class="empty-state" *ngIf="!data()?.visites?.length">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          Aucune visite sur cette période
        </div>

        <div class="member-list" *ngIf="data()?.visites?.length">
          <div class="member-row" *ngFor="let v of data()?.visites; let i = index">
            <div class="m-av" [style.background]="avatarColor(i)">{{ initials(v.name) }}</div>
            <div class="m-info">
              <div class="m-name">{{ v.name }}</div>
              <div class="m-stats-row">
                <span class="stat-pill total">{{ v.total }} visite{{ v.total > 1 ? 's' : '' }}</span>
                <span class="stat-pill green">{{ v.converties }} converti{{ v.converties > 1 ? 'es' : 'e' }}</span>
                <span class="stat-pill red"   *ngIf="v.perdues > 0">{{ v.perdues }} perdue{{ v.perdues > 1 ? 's' : '' }}</span>
                <span class="stat-pill muted" *ngIf="v.en_cours > 0">{{ v.en_cours }} en cours</span>
              </div>
              <div class="m-progress-wrap" *ngIf="v.total > 0">
                <div class="m-progress-bar">
                  <div class="m-progress-fill green" [style.width.%]="pct(v.converties, v.total)"></div>
                  <div class="m-progress-fill red"   [style.width.%]="pct(v.perdues,   v.total)"></div>
                  <div class="m-progress-fill muted" [style.width.%]="pct(v.en_cours,  v.total)"></div>
                </div>
                <span class="m-pct">{{ pct(v.converties, v.total) }}% conv.</span>
              </div>
            </div>
            <div class="m-amount" *ngIf="v.ca_converti > 0">
              <div class="m-amount-val green">{{ fmt(v.ca_converti) }}</div>
              <div class="m-amount-lbl">DH</div>
            </div>
          </div>
        </div>
      </div>

      <!-- TOURNÉES PAR LIVREUR -->
      <div class="card">
        <div class="card-h">
          <span class="ch-l">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="6" width="14" height="11" rx="1"/><path d="M15 9h4l3 3v5h-7z"/><circle cx="6" cy="19" r="1.6"/><circle cx="18" cy="19" r="1.6"/></svg>
            Tournées {{ periodLabel() }}
          </span>
          <a class="ch-r" routerLink="/delivery">Voir tout →</a>
        </div>

        <!-- empty -->
        <div class="empty-state" *ngIf="!data()?.tournees?.length">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="1" y="6" width="14" height="11" rx="1"/><path d="M15 9h4l3 3v5h-7z"/></svg>
          Aucun livreur actif
        </div>

        <div class="member-list" *ngIf="data()?.tournees?.length">
          <div class="member-row" *ngFor="let t of data()?.tournees; let i = index">
            <div class="m-av" [style.background]="avatarColor(i + 4)">{{ initials(t.name) }}</div>
            <div class="m-info">
              <div class="m-name">{{ t.name }}</div>
              <div class="m-stats-row">
                <span class="stat-pill total">{{ t.total_assigned }} assignée{{ t.total_assigned > 1 ? 's' : '' }}</span>
                <span class="stat-pill green">{{ t.delivered }} livrée{{ t.delivered > 1 ? 's' : '' }}</span>
                <span class="stat-pill amber" *ngIf="t.restantes > 0">{{ t.restantes }} restante{{ t.restantes > 1 ? 's' : '' }}</span>
                <span class="stat-pill muted" *ngIf="t.total_assigned === 0">Aucune commande</span>
              </div>
              <div class="m-progress-wrap" *ngIf="t.total_assigned > 0">
                <div class="m-progress-bar">
                  <div class="m-progress-fill green" [style.width.%]="pct(t.delivered,  t.total_assigned)"></div>
                  <div class="m-progress-fill amber" [style.width.%]="pct(t.restantes,  t.total_assigned)"></div>
                </div>
                <span class="m-pct">{{ pct(t.delivered, t.total_assigned) }}% livré</span>
              </div>
            </div>
            <div class="m-amount" *ngIf="t.ca_livre > 0">
              <div class="m-amount-val teal">{{ fmt(t.ca_livre) }}</div>
              <div class="m-amount-lbl">DH livré</div>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- ROW : Alertes Stock + Activité récente -->
    <div class="grid2">

      <!-- ALERTES STOCK -->
      <div class="card">
        <div class="card-h">
          <span class="ch-l">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            Alertes Stock
          </span>
          <a class="ch-r" routerLink="/stock">Stock →</a>
        </div>

        <div class="empty-state" *ngIf="!stockAlerts().length">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 9l9-6 9 6v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 21V12h6v9"/></svg>
          Aucune alerte de stock
        </div>

        <div class="alert-list" *ngIf="stockAlerts().length">
          <div class="alert-row" *ngFor="let a of stockAlerts()">
            <div class="alert-ico" [class.red]="a.niveau === 'critique' || a.niveau === 'rupture'" [class.amber]="a.niveau === 'faible'">
              <svg *ngIf="a.niveau === 'critique' || a.niveau === 'rupture'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <svg *ngIf="a.niveau === 'faible'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            </div>
            <div class="alert-txt">
              <div class="alert-nm">{{ a.product_name }} <span class="alert-variant">{{ a.variant_name }}</span></div>
              <div class="alert-sub" [class.red-txt]="a.niveau !== 'faible'">
                {{ a.niveau === 'rupture' ? 'Rupture de stock' : a.niveau === 'critique' ? 'Stock critique · en dessous du seuil minimum' : 'Stock faible · ' + a.quantity + ' unités restantes' }}
              </div>
              <div class="progress-bar">
                <div class="progress-fill"
                     [style.width.%]="a.pct"
                     [style.background]="a.niveau === 'faible' ? 'var(--amber)' : 'var(--red)'">
                </div>
              </div>
            </div>
            <div class="alert-val" [class.red-txt]="a.niveau !== 'faible'" [class.amber-txt]="a.niveau === 'faible'">
              {{ a.quantity }} u.
            </div>
          </div>
        </div>
      </div>

      <!-- ACTIVITÉ RÉCENTE -->
      <div class="card">
        <div class="card-h">
          <span class="ch-l">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
            Activité récente
          </span>
        </div>

        <div class="empty-state" *ngIf="!activityEvents().length">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
          Aucune activité récente
        </div>

        <div class="activity-list" *ngIf="activityEvents().length">
          <div class="act-row" *ngFor="let e of activityEvents()">
            <div class="act-ico" [class.green]="e.color === 'green'" [class.amber]="e.color === 'amber'" [class.blue]="e.color === 'blue'">
              <svg *ngIf="e.type === 'delivered'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-6"/></svg>
              <svg *ngIf="e.type === 'started'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="6" width="14" height="11" rx="1"/><path d="M15 9h4l3 3v5h-7z"/><circle cx="6" cy="19" r="1.6"/><circle cx="18" cy="19" r="1.6"/></svg>
              <svg *ngIf="e.type === 'order'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 2h9a1 1 0 0 1 1 1v18l-3-2-2 2-2-2-2 2-2-2-3 2V5a1 1 0 0 1 1-1z"/></svg>
              <svg *ngIf="e.type === 'visit'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            </div>
            <div class="act-txt">{{ e.label }}</div>
            <div class="act-time">{{ e.time | date:'HH:mm' }}</div>
          </div>
        </div>
      </div>

    </div>
  `,
  styles: [`
    :host {
      --blue:#2f6bff; --blue-soft:#e9f0ff;
      --green:#16a34a; --green-soft:#e6f6ec;
      --amber:#d97706; --amber-soft:#fdf2e3;
      --red:#e2483d; --red-soft:#fdeae9;
      --teal:#0d9488; --teal-soft:#e1f4f1;
      --border:#e7eaf0; --border2:#eef1f5;
      --card:#fff; --muted:#6b7280; --muted2:#9aa3af; --text:#1f2a37;
      --sh:0 1px 2px rgba(16,24,40,.04),0 1px 3px rgba(16,24,40,.06);
      --sh-md:0 4px 12px rgba(16,24,40,.08);
      --font:-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
      display:block;
    }

    /* ── PAGE HEAD ── */
    .phead { display:flex; align-items:flex-end; justify-content:space-between; gap:16px; margin-bottom:16px; flex-wrap:wrap; }
    .phead-l h1 { font-size:24px; font-weight:900; letter-spacing:-.02em; }
    .phead-l .sub { font-size:13.5px; color:var(--muted); margin-top:4px; }
    .phead-r { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }

    .btn-refresh {
      display:inline-flex; align-items:center; gap:7px;
      background:var(--card); border:1px solid var(--border); border-radius:10px;
      padding:8px 13px; font-size:13px; font-weight:600; color:#475569;
      box-shadow:var(--sh); cursor:pointer; transition:.13s; font-family:var(--font);
    }
    .btn-refresh:hover { border-color:#cdd9ec; background:#fafcff; }
    .btn-refresh svg { width:15px; height:15px; transition:transform .4s; }
    .btn-refresh.spinning svg { animation:spin .7s linear infinite; }
    @keyframes spin { to { transform:rotate(360deg); } }

    /* ── PERIOD BAR ── */
    .period-bar {
      display:flex; gap:4px;
      background:var(--card); border:1px solid var(--border);
      border-radius:11px; padding:4px; box-shadow:var(--sh);
    }
    .period-btn {
      padding:6px 14px; border-radius:8px; border:none; background:none;
      font-size:13px; font-weight:600; color:var(--muted);
      cursor:pointer; transition:.13s; font-family:var(--font);
    }
    .period-btn:hover { background:#f1f4f8; color:var(--text); }
    .period-btn.active { background:var(--blue); color:#fff; box-shadow:0 3px 10px rgba(47,107,255,.3); }

    /* ── KPI GRID ── */
    .kpis { display:grid; grid-template-columns:repeat(5,1fr); gap:14px; margin-bottom:18px; transition:opacity .2s; }
    .kpis.loading, .grid2.loading { opacity:.55; pointer-events:none; }

    .kpi {
      background:var(--card); border:1px solid var(--border); border-radius:14px;
      padding:16px 17px; box-shadow:var(--sh); display:flex; flex-direction:column; gap:10px; transition:.15s;
    }
    .kpi:hover { box-shadow:var(--sh-md); transform:translateY(-1px); }
    .kpi-top { display:flex; align-items:center; justify-content:space-between; }
    .kpi-ico { width:42px; height:42px; border-radius:11px; display:flex; align-items:center; justify-content:center; flex:0 0 42px; }
    .kpi-ico svg { width:20px; height:20px; }
    .kpi-trend { display:inline-flex; align-items:center; gap:4px; font-size:11.5px; font-weight:700; padding:3px 8px; border-radius:20px; }
    .kpi-trend.up   { background:#e6f6ec; color:var(--green); }
    .kpi-trend.down { background:var(--red-soft); color:var(--red); }
    .kpi-trend.neu  { background:#f1f4f8; color:var(--muted); }
    .kpi-trend svg  { width:12px; height:12px; }
    .kpi-v { font-size:26px; font-weight:900; letter-spacing:-.03em; line-height:1; font-variant-numeric:tabular-nums; }
    .kpi-l { font-size:12.5px; color:var(--muted); }
    .ki-blue   { background:var(--blue-soft);  color:var(--blue); }
    .ki-green  { background:var(--green-soft); color:var(--green); }
    .ki-amber  { background:var(--amber-soft); color:var(--amber); }
    .ki-red    { background:var(--red-soft);   color:var(--red); }
    .ki-teal   { background:var(--teal-soft);  color:var(--teal); }

    /* ── GRID 2 COL ── */
    .grid2 { display:grid; grid-template-columns:1fr 1fr; gap:18px; margin-bottom:18px; transition:opacity .2s; }

    /* ── CARD ── */
    .card { background:var(--card); border:1px solid var(--border); border-radius:14px; box-shadow:var(--sh); overflow:hidden; }
    .card-h { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:15px 18px; border-bottom:1px solid var(--border); }
    .ch-l { display:flex; align-items:center; gap:9px; font-size:15px; font-weight:800; }
    .ch-l svg { width:16px; height:16px; color:var(--blue); }
    .ch-r { font-size:12.5px; font-weight:700; color:var(--blue); cursor:pointer; text-decoration:none; transition:.13s; }
    .ch-r:hover { color:#2055e0; }

    /* ── MEMBER LIST ── */
    .member-list { display:flex; flex-direction:column; max-height:200px; overflow-y:auto; }
    .member-row {
      display:flex; align-items:flex-start; gap:13px;
      padding:14px 18px; border-bottom:1px solid var(--border2);
      transition:.13s;
    }
    .member-row:last-child { border-bottom:none; }
    .member-row:hover { background:#fafcff; }

    .m-av {
      width:40px; height:40px; border-radius:11px; flex:0 0 40px;
      display:flex; align-items:center; justify-content:center;
      font-weight:800; font-size:13px; color:#fff;
    }
    .m-info { flex:1; min-width:0; }
    .m-name { font-size:14px; font-weight:700; margin-bottom:6px; }

    /* pills */
    .m-stats-row { display:flex; flex-wrap:wrap; gap:5px; margin-bottom:8px; }
    .stat-pill {
      font-size:11.5px; font-weight:700; padding:2px 8px; border-radius:20px;
    }
    .stat-pill.total  { background:#f1f4f8; color:#475569; }
    .stat-pill.green  { background:var(--green-soft); color:var(--green); }
    .stat-pill.red    { background:var(--red-soft);   color:var(--red); }
    .stat-pill.amber  { background:var(--amber-soft); color:var(--amber); }
    .stat-pill.muted  { background:#f1f4f8; color:var(--muted2); }

    /* progress */
    .m-progress-wrap { display:flex; align-items:center; gap:10px; }
    .m-progress-bar {
      flex:1; height:5px; border-radius:99px; background:#eef1f5;
      overflow:hidden; display:flex;
    }
    .m-progress-fill { height:100%; transition:width .4s; }
    .m-progress-fill.green { background:var(--green); }
    .m-progress-fill.red   { background:var(--red); }
    .m-progress-fill.amber { background:var(--amber); }
    .m-progress-fill.muted { background:#c4c9d4; }
    .m-pct { font-size:11px; font-weight:700; color:var(--muted); white-space:nowrap; flex-shrink:0; }

    /* amount right */
    .m-amount { text-align:right; flex-shrink:0; margin-left:8px; }
    .m-amount-val { font-size:14px; font-weight:800; font-variant-numeric:tabular-nums; line-height:1.2; }
    .m-amount-val.green { color:var(--green); }
    .m-amount-val.teal  { color:var(--teal); }
    .m-amount-lbl { font-size:10.5px; color:var(--muted2); margin-top:2px; }

    /* ── ALERT LIST ── */
    .alert-list { padding:4px 0; max-height:200px; overflow-y:auto; }
    .alert-row { display:flex; align-items:center; gap:13px; padding:12px 18px; border-bottom:1px solid var(--border2); }
    .alert-row:last-child { border-bottom:none; }
    .alert-ico { width:36px; height:36px; border-radius:9px; flex:0 0 36px; display:flex; align-items:center; justify-content:center; }
    .alert-ico svg { width:17px; height:17px; }
    .alert-ico.red   { background:var(--red-soft);   color:var(--red); }
    .alert-ico.amber { background:var(--amber-soft); color:var(--amber); }
    .alert-txt { flex:1; min-width:0; }
    .alert-nm { font-size:13.5px; font-weight:700; }
    .alert-variant { font-size:11.5px; font-weight:500; color:var(--muted); margin-left:4px; }
    .alert-sub { font-size:12px; color:var(--muted); margin-top:2px; }
    .alert-sub.red-txt { color:var(--red); }
    .alert-val { font-size:13.5px; font-weight:800; font-variant-numeric:tabular-nums; white-space:nowrap; }
    .alert-val.red-txt   { color:var(--red); }
    .alert-val.amber-txt { color:var(--amber); }
    .progress-bar { height:5px; border-radius:99px; background:#eef1f5; margin-top:6px; overflow:hidden; }
    .progress-fill { height:100%; border-radius:99px; transition:.4s; }

    /* ── ACTIVITY LIST ── */
    .activity-list { padding:4px 18px; max-height:200px; overflow-y:auto; }
    .act-row { display:flex; align-items:flex-start; gap:12px; padding:10px 0; border-bottom:1px solid var(--border2); }
    .act-row:last-child { border-bottom:none; }
    .act-ico { width:32px; height:32px; border-radius:9px; flex:0 0 32px; display:flex; align-items:center; justify-content:center; }
    .act-ico svg { width:15px; height:15px; }
    .act-ico.blue  { background:var(--blue-soft);  color:var(--blue); }
    .act-ico.green { background:var(--green-soft); color:var(--green); }
    .act-ico.amber { background:var(--amber-soft); color:var(--amber); }
    .act-txt { flex:1; font-size:13px; line-height:1.5; color:var(--muted); padding-top:6px; }
    .act-time { font-size:11.5px; color:var(--muted2); white-space:nowrap; padding-top:8px; flex-shrink:0; }

    /* empty state */
    .empty-state {
      display:flex; flex-direction:column; align-items:center; justify-content:center;
      gap:10px; padding:36px; color:var(--muted2); font-size:13px; text-align:center;
    }
    .empty-state svg { width:36px; height:36px; opacity:.4; }

    @media(max-width:1200px) { .kpis { grid-template-columns:repeat(3,1fr); } }
    @media(max-width:900px)  { .grid2 { grid-template-columns:1fr; } }
    @media(max-width:800px)  { .kpis { grid-template-columns:repeat(2,1fr); } }
  `]
})
export class DashboardComponent implements OnInit {

  loading        = false;
  period         = signal<Period>('today');
  data           = signal<DashboardData | null>(null);
  stockAlerts    = signal<StockAlert[]>([]);
  activityEvents = signal<ActivityEvent[]>([]);

  periodLabel = computed(() => {
    const map: Record<Period, string> = { today: 'du jour', week: 'de la semaine', month: 'du mois', all: '' };
    return map[this.period()];
  });

  inProgressCount = computed(() => {
    const d = this.data()?.kpis?.deliveries;
    return d ? Math.max(0, d.total - d.delivered) : 0;
  });

  encaisseRate = computed(() => {
    const r = this.data()?.kpis?.revenue;
    if (!r || r.ca === 0) return 0;
    return Math.round((r.encaisse / r.ca) * 100);
  });

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.load();
    this.loadStatic();
  }

  setPeriod(p: Period) { this.period.set(p); this.load(); }

  refresh() { this.load(); this.loadStatic(); }

  load() {
    this.loading = true;
    this.api.get<DashboardData>(`/dashboard?period=${this.period()}`).subscribe({
      next: d => { this.data.set(d); this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  loadStatic() {
    this.api.get<{ alerts: StockAlert[] }>('/dashboard/stock-alerts').subscribe({
      next: r => this.stockAlerts.set(r.alerts),
      error: () => {},
    });
    this.api.get<{ events: ActivityEvent[] }>('/dashboard/activity').subscribe({
      next: r => this.activityEvents.set(r.events),
      error: () => {},
    });
  }

  fmt(val: number, space = true): string {
    if (val === null || val === undefined) return '—';
    return new Intl.NumberFormat('fr-MA', { maximumFractionDigits: 0 }).format(val);
  }

  pct(part: number, total: number): number {
    if (!total) return 0;
    return Math.round((part / total) * 100);
  }

  initials(name: string): string {
    return (name || '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  }

  avatarColor(i: number): string {
    return AVATAR_COLORS[i % AVATAR_COLORS.length];
  }
}
