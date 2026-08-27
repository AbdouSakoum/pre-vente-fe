import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';
import { forkJoin } from 'rxjs';

interface DeliveryOrder {
  id: string;
  order_number: number;
  client_name: string;
  client_phone: string;
  delivery_address: string;
  delivery_latitude: number | null;
  delivery_longitude: number | null;
  desired_delivery_date: string;
  status: 'assigned' | 'in_progress' | 'delivered';
  payment_status: 'unpaid' | 'partial' | 'paid';
  paid_amount: number;
  payment_method: 'especes' | 'cheque' | 'virement' | null;
  total_ttc: number;
  started_at: string | null;
  delivered_at: string | null;
  delivery_name: string;
  delivery_user_id: string;
  lines: { id: string; product_name: string; variant_name: string; quantity: number; unit_price: number; tva_rate: number }[];
}

interface Driver { id: string; name: string; }

const COLS = [
  { id: 'assigned',    label: 'À prendre en charge', color: '#FF3532', soft: '#FFF1EF', textColor: '#E0231F' },
  { id: 'in_progress', label: 'En cours',             color: '#d97706', soft: '#fdf2e3', textColor: '#a8620a' },
  { id: 'delivered',   label: 'Livré',                color: '#16a34a', soft: '#e6f6ec', textColor: '#117a39' },
];

@Component({
  selector: 'app-delivery',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
<!-- ══════════════════════════════════════════════════
     PAGE HEAD
══════════════════════════════════════════════════ -->
<div class="phead">
  <div>
    <h1>Espace Livreur — Kanban</h1>
    <p class="phead-sub">Tournée du jour · les commandes avancent de gauche à droite</p>
  </div>
  <div class="phead-right">
    <span class="day-pill">
      <span class="material-icons" style="font-size:16px;color:#9aa3af">calendar_today</span>
      {{ todayLabel }}
    </span>
    <div class="period-tabs">
      <button class="ptab" [class.ptab-active]="period === 'today'"   (click)="setPeriod('today')">Aujourd'hui</button>
      <button class="ptab" [class.ptab-active]="period === 'week'"    (click)="setPeriod('week')">Cette semaine</button>
      <button class="ptab" [class.ptab-active]="period === 'month'"   (click)="setPeriod('month')">Ce mois</button>
      <button class="ptab" [class.ptab-active]="period === 'all'"     (click)="setPeriod('all')">Tous</button>
    </div>
    <!-- Switcher livreur (admin seulement) -->
    <div class="driver-chip" *ngIf="auth.isAdmin && drivers().length">
      <div class="drv-av" [style.background]="'#FF3532'">{{ initials(currentDriverName()) }}</div>
      <div>
        <div class="drv-name">{{ currentDriverName() }}</div>
        <div class="drv-sub">Livreur</div>
      </div>
      <select class="drv-select" [ngModel]="selectedDriverId()" (ngModelChange)="onDriverChange($event)">
        <option value="">Tous les livreurs</option>
        <option *ngFor="let d of drivers()" [value]="d.id">{{ d.name }}</option>
      </select>
    </div>
  </div>
</div>

<!-- ══════════════════════════════════════════════════
     KPIs
══════════════════════════════════════════════════ -->
<div class="kpis">
  <div class="kpi">
    <div class="ki ki-blue"><span class="material-icons">inventory_2</span></div>
    <div><div class="kv">{{ allOrders().length }}</div><div class="kl">Commandes assignées</div></div>
  </div>
  <div class="kpi">
    <div class="ki ki-amber"><span class="material-icons">local_shipping</span></div>
    <div><div class="kv">{{ byStatus('in_progress').length }}</div><div class="kl">En cours</div></div>
  </div>
  <div class="kpi">
    <div class="ki ki-green"><span class="material-icons">check_circle</span></div>
    <div><div class="kv">{{ byStatus('delivered').length }}/{{ allOrders().length }}</div><div class="kl">Livrées</div></div>
  </div>
  <div class="kpi">
    <div class="ki ki-red"><span class="material-icons">payments</span></div>
    <div><div class="kv">{{ fmtDH(totalDue()) }}</div><div class="kl">Reste à encaisser</div></div>
  </div>
  <div class="kpi">
    <div class="ki ki-teal"><span class="material-icons">done_all</span></div>
    <div><div class="kv">{{ fmtDH(totalPaid()) }}</div><div class="kl">Encaissé aujourd'hui</div></div>
  </div>
</div>

<!-- ══════════════════════════════════════════════════
     KANBAN
══════════════════════════════════════════════════ -->
<div class="board" *ngIf="!loading()">
  <div class="col" *ngFor="let col of COLS">
    <div class="col-h" [style.background]="col.soft" [style.color]="col.textColor">
      <div class="col-h-left">
        <span class="col-dot" [style.background]="col.color"></span>
        {{ col.label }}
        <span class="col-cnt">{{ byStatus(col.id).length }}</span>
      </div>
      <span class="col-sum">{{ fmtDH(sumByStatus(col.id)) }}</span>
    </div>
    <div class="col-body">
      <!-- Cartes commandes -->
      <div class="dcard" *ngFor="let o of byStatus(col.id)"
           [class.dcard-doing]="o.status === 'in_progress'"
           [class.dcard-done]="o.status === 'delivered'"
           (click)="openDrawer(o)">

        <div class="dc-top">
          <div class="dc-av" [style.background]="avatarColor(o.client_name)">{{ initials(o.client_name) }}</div>
          <div>
            <div class="dc-name">{{ o.client_name }}</div>
            <div class="dc-ref">CMD-{{ o.order_number }}</div>
          </div>
          <span class="material-icons dc-grip" style="margin-left:auto;color:#cbd3de;font-size:17px">drag_indicator</span>
        </div>

        <div class="dc-addr" *ngIf="o.delivery_address">
          <span class="material-icons" style="font-size:14px;flex-shrink:0;margin-top:1px">location_on</span>
          {{ o.delivery_address }}
        </div>

        <div class="dc-meta">
          <span class="chip" *ngIf="o.desired_delivery_date">
            <span class="material-icons" style="font-size:12px">schedule</span>
            {{ o.desired_delivery_date | date:'dd/MM' }}
          </span>
          <span class="chip" *ngIf="o.delivery_name">{{ o.delivery_name }}</span>
        </div>

        <div class="dc-foot">
          <div>
            <div class="dc-amt">{{ fmtDH(getTotal(o)) }}</div>
            <div class="dc-amt-sub">Total TTC</div>
          </div>
          <span class="pay-badge" [class]="'pay-' + o.payment_status">
            <span class="pay-dot"></span>
            {{ payLabel(o) }}
          </span>
        </div>

        <!-- Actions -->
        <div class="dc-actions" (click)="$event.stopPropagation()">
          <!-- Admin : nom du livreur -->
          <ng-container *ngIf="auth.isAdmin">
            <div class="driver-row">
              <span class="material-icons" style="font-size:15px;color:#9aa3af">person</span>
              {{ o.delivery_name || 'Non assigné' }}
              <span class="status-chip chip-{{o.status}}">{{ statusLabel(o) }}</span>
            </div>
          </ng-container>
          <!-- Livreur : CTA -->
          <ng-container *ngIf="!auth.isAdmin">
            <button class="act act-primary" *ngIf="o.status === 'assigned'" (click)="startDelivery(o)">
              <span class="material-icons">local_shipping</span> Démarrer
            </button>
            <button class="act act-ghost" *ngIf="o.status === 'in_progress'" (click)="openCod(o)">
              <span class="material-icons">payments</span> Livrer &amp; encaisser
            </button>
            <div class="done-row" *ngIf="o.status === 'delivered'">
              <span class="material-icons" style="color:#16a34a">check_circle</span>
              Livré{{ o.payment_status === 'paid' ? ' · encaissé' : '' }}
              <span class="done-time">{{ o.delivered_at | date:'HH:mm' }}</span>
            </div>
          </ng-container>
        </div>
      </div>

      <!-- Colonne vide -->
      <div class="col-empty" *ngIf="!byStatus(col.id).length">
        <span class="material-icons" style="font-size:32px;opacity:.4">inbox</span>
        <div>Aucune commande</div>
      </div>
    </div>
  </div>
</div>

<div class="board-loading" *ngIf="loading()">
  <div class="skel-col" *ngFor="let i of [1,2,3]"></div>
</div>

<!-- ══════════════════════════════════════════════════
     DRAWER DÉTAIL
══════════════════════════════════════════════════ -->
<div class="scrim" [class.scrim-show]="drawerOpen()" (click)="closeDrawer()"></div>
<aside class="drawer" [class.drawer-open]="drawerOpen()">
  <ng-container *ngIf="drawerOrder() as o">

    <!-- Header drawer -->
    <div class="dh">
      <div class="dh-av" [style.background]="avatarColor(o.client_name)">{{ initials(o.client_name) }}</div>
      <div style="flex:1;min-width:0">
        <div class="dh-name">{{ o.client_name }}</div>
        <div class="dh-ref">CMD-{{ o.order_number }} · {{ o.delivery_name || 'Non assigné' }}</div>
      </div>
      <button class="btn-icon" (click)="closeDrawer()">
        <span class="material-icons">close</span>
      </button>
    </div>

    <!-- Corps drawer -->
    <div class="db">
      <!-- Statut -->
      <span class="status-line" [class]="'sl-' + o.status">{{ statusLabel(o) }}</span>

      <!-- Boutons contact -->
      <div class="contact-grid" style="grid-template-columns:1fr">
        <a [href]="'tel:' + o.client_phone" class="cbtn cbtn-call">
          <div class="cbtn-ic"><span class="material-icons">call</span></div>
          <div><div class="cbtn-l">Appeler</div><div class="cbtn-v">{{ o.client_phone }}</div></div>
        </a>
      </div>

      <!-- Navigation GPS -->
      <div class="sec-label" style="display:flex;align-items:center;gap:8px">
        Itinéraire
        <span *ngIf="hasCoords(o)" style="display:inline-flex;align-items:center;gap:3px;font-size:10px;font-weight:700;background:#FFF1EF;color:#FF3532;border-radius:20px;padding:2px 8px;text-transform:none;letter-spacing:0">
          <span class="material-icons" style="font-size:11px">my_location</span> GPS précis
        </span>
      </div>
      <div class="nav-apps">
        <button class="nav-app-btn" (click)="openGoogleMaps(o)">
          <div class="nav-logo nav-google">G</div>
          <span>Google Maps</span>
        </button>
        <button class="nav-app-btn" (click)="openWaze(o)">
          <div class="nav-logo nav-waze">W</div>
          <span>Waze</span>
        </button>
        <button class="nav-app-btn" (click)="openBingMaps(o)">
          <div class="nav-logo nav-bing"><span class="material-icons" style="font-size:18px">map</span></div>
          <span>Maps</span>
        </button>
      </div>
      <div class="coords-info" *ngIf="hasCoords(o)">
        <span class="material-icons" style="font-size:13px;color:#FF3532">location_on</span>
        {{ o.delivery_latitude }}, {{ o.delivery_longitude }}
      </div>
      <div class="coords-info coords-fallback" *ngIf="!hasCoords(o)">
        <span class="material-icons" style="font-size:13px">warning</span>
        Pas de GPS · navigation par adresse texte
      </div>

      <!-- Adresse -->
      <div class="sec-label">Adresse</div>
      <div class="addr-box">
        <span class="material-icons" style="color:#FF3532;font-size:18px;flex-shrink:0;margin-top:1px">location_on</span>
        <div>
          <div class="addr-main">{{ o.delivery_address }}</div>
          <div class="addr-sub" *ngIf="o.desired_delivery_date">Créneau · {{ o.desired_delivery_date | date:'dd/MM/yyyy' }}</div>
        </div>
      </div>

      <!-- Articles -->
      <div class="sec-label">Articles ({{ getTotalQty(o) }} unités)</div>
      <div class="lines-box">
        <div class="lrow" *ngFor="let l of o.lines">
          <div>
            <div class="l-name">{{ l.product_name }} <span class="l-var">{{ l.variant_name }}</span></div>
            <div class="l-qty">{{ l.quantity }} × {{ fmtDH(l.unit_price) }}</div>
          </div>
          <div class="l-tot">{{ fmtDH(l.quantity * l.unit_price) }}</div>
        </div>
      </div>

      <!-- Totaux -->
      <div class="totbox">
        <div class="tot-row"><span class="tot-l">Sous-total</span><span class="tot-v">{{ fmtDH(getTotal(o)) }}</span></div>
        <div class="tot-row" *ngIf="o.paid_amount > 0">
          <span class="tot-l">Déjà encaissé</span>
          <span class="tot-v" style="color:#16a34a">− {{ fmtDH(o.paid_amount) }}</span>
        </div>
        <div class="tot-row tot-grand">
          <span class="tot-l-g">{{ o.payment_status === 'paid' ? 'Total réglé' : 'À encaisser' }}</span>
          <span class="tot-v-g">{{ fmtDH(o.payment_status === 'paid' ? getTotal(o) : getDue(o)) }}</span>
        </div>
      </div>

      <!-- Note COD -->
      <div class="cod-note" [class.cod-note-ok]="o.payment_status === 'paid'" [class.cod-note-due]="o.payment_status !== 'paid'">
        <span class="material-icons">{{ o.payment_status === 'paid' ? 'check_circle' : 'payments' }}</span>
        <span *ngIf="o.payment_status === 'paid'">Encaissé · {{ fmtDH(o.paid_amount) }} reçu</span>
        <span *ngIf="o.payment_status === 'partial'">Paiement partiel · reste {{ fmtDH(getDue(o)) }}</span>
        <span *ngIf="o.payment_status === 'unpaid'">Paiement à la livraison · {{ fmtDH(getTotal(o)) }}</span>
      </div>
    </div>

    <!-- Footer actions -->
    <div class="df">
      <!-- Admin : info livreur -->
      <ng-container *ngIf="auth.isAdmin">
        <div class="driver-banner">
          <span class="material-icons" style="font-size:28px;color:#FF3532">account_circle</span>
          <div>
            <div style="font-size:14px;font-weight:700">{{ o.delivery_name || 'Non assigné' }}</div>
            <div style="font-size:12px;color:#6b7280;margin-top:2px">{{ statusLabel(o) }}</div>
          </div>
        </div>
      </ng-container>
      <!-- Livreur : CTA -->
      <ng-container *ngIf="!auth.isAdmin">
        <button class="act act-full act-primary" *ngIf="o.status === 'assigned'" (click)="startDelivery(o); closeDrawer()">
          <span class="material-icons">local_shipping</span> Démarrer la livraison
        </button>
        <button class="act act-full act-go" *ngIf="o.status === 'in_progress'" (click)="openCod(o)">
          <span class="material-icons">check_circle</span> Livrer &amp; encaisser
        </button>
        <div class="done-banner" *ngIf="o.status === 'delivered'">
          <span class="material-icons">check_circle</span>
          Livré à {{ o.delivered_at | date:'HH:mm' }}
        </div>
        <button class="act act-pdf" *ngIf="o.status === 'delivered'" (click)="viewBonLivraison(o)" [disabled]="pdfLoadingId === o.id">
          <span class="material-icons">picture_as_pdf</span>
          {{ pdfLoadingId === o.id ? 'Génération…' : 'Bon de livraison' }}
        </button>
      </ng-container>
    </div>

  </ng-container>
</aside>

<!-- ══════════════════════════════════════════════════
     MODAL COD
══════════════════════════════════════════════════ -->
<div class="ov" [class.ov-show]="codOpen()" (click)="closeCod()">
  <div class="modal" (click)="$event.stopPropagation()" *ngIf="codOrder() as o">

    <div class="mh">
      <div>
        <h2 class="mh-title">Encaisser</h2>
        <p class="mh-sub">{{ o.client_name }} · CMD-{{ o.order_number }}</p>
      </div>
      <button class="btn-icon" (click)="closeCod()"><span class="material-icons">close</span></button>
    </div>

    <div class="mb">
      <!-- Montant dû -->
      <div class="due-card">
        <div>
          <div class="due-lbl">Montant à encaisser</div>
          <div class="due-val">{{ fmtDH(codDue) }}</div>
        </div>
        <div class="due-mode">
          <span class="material-icons">{{ paymentMethodIcon(codMethod()) }}</span>
          <span>{{ paymentMethodLabel(codMethod()) }}</span>
        </div>
      </div>

      <!-- Mode de paiement -->
      <label class="field-label">Mode de paiement</label>
      <div class="method-row">
        <button class="method-btn" [class.method-active]="codMethod() === 'especes'" (click)="codMethod.set('especes')">
          <span class="material-icons">payments</span>
          Espèces
        </button>
        <button class="method-btn" [class.method-active]="codMethod() === 'cheque'" (click)="codMethod.set('cheque')">
          <span class="material-icons">description</span>
          Chèque
        </button>
        <button class="method-btn" [class.method-active]="codMethod() === 'virement'" (click)="codMethod.set('virement')">
          <span class="material-icons">swap_horiz</span>
          Virement
        </button>
      </div>

      <!-- Input -->
      <label class="field-label">Montant reçu du client</label>
      <input class="field-input" type="number" [ngModel]="codAmount()" (ngModelChange)="codAmount.set($event)" />

      <!-- Raccourcis billets -->
      <div class="quick-btns">
        <button class="qbtn" *ngFor="let v of codQuickAmounts" [class.qbtn-active]="codAmount() === v" (click)="codAmount.set(v)">
          {{ fmtDH(v) }}
        </button>
      </div>

      <!-- Rendu / reste -->
      <div class="calc-row" [class.calc-green]="!codIsShort" [class.calc-red]="codIsShort">
        <span>{{ codIsShort ? 'Reste dû' : 'Rendu monnaie' }}</span>
        <span class="calc-val">{{ fmtDH(codIsShort ? codReste : codRendu) }}</span>
      </div>

      <!-- Partiel -->
      <label class="partial-toggle">
        <input type="checkbox" [ngModel]="codPartial()" (ngModelChange)="codPartial.set($event)" />
        Encaissement partiel (le reste sera dû)
      </label>
    </div>

    <div class="mf">
      <button class="act act-full act-secondary" (click)="closeCod()">Annuler</button>
      <button class="act act-full act-go" (click)="confirmCod()">
        <span class="material-icons">check_circle</span>
        {{ codIsShort ? (codAmount() <= 0 ? 'Livrer sans encaisser' : 'Livrer · partiel') : 'Confirmer · payé' }}
      </button>
    </div>
  </div>
</div>

<!-- Toast -->
<div class="toast" [class.toast-show]="toastMsg()">
  <span class="material-icons" style="color:#4ade80">check_circle</span>
  {{ toastMsg() }}
</div>

<!-- PDF Viewer -->
<div class="pdf-ov" *ngIf="pdfViewerUrl" (click)="closePdfViewer()">
  <div class="pdf-box" (click)="$event.stopPropagation()">
    <div class="pdf-bar">
      <span class="pdf-bar-title">{{ pdfViewerTitle }}</span>
      <div class="pdf-bar-actions">
        <a [href]="pdfViewerUrl" [download]="pdfViewerTitle" class="pdf-bar-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Télécharger
        </a>
        <button class="pdf-bar-btn pdf-bar-close" (click)="closePdfViewer()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          Fermer
        </button>
      </div>
    </div>
    <iframe [src]="pdfViewerUrl" class="pdf-iframe"></iframe>
  </div>
</div>
  `,
  styles: [`
    /* ── Variables ───────────────────────────────────────── */
    :host {
      --red:#FF3532; --red-d:#E0231F; --red-soft:#FFF1EF;
      --green:#16a34a; --green-soft:#e6f6ec;
      --amber:#d97706; --amber-soft:#fdf2e3;
      --red:#e2483d; --red-soft:#fdeae9;
      --teal:#0d9488; --teal-soft:#e1f4f1;
      --border:#e7eaf0; --border2:#eef1f5;
      --card:#fff; --bg:#f6f7fa;
      --text:#1f2a37; --muted:#6b7280; --muted2:#9aa3af;
      --radius:12px;
      --shadow:0 1px 2px rgba(16,24,40,.04),0 1px 3px rgba(16,24,40,.06);
      display:block;
    }

    /* ── Page head ───────────────────────────────────────── */
    .phead { display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:20px;flex-wrap:wrap }
    h1 { font-size:22px;font-weight:800;letter-spacing:-.01em;margin:0 }
    .phead-sub { font-size:13px;color:var(--muted);margin:4px 0 0 }
    .phead-right { display:flex;align-items:center;gap:12px;flex-wrap:wrap }

    .day-pill { display:inline-flex;align-items:center;gap:7px;background:var(--card);border:1px solid var(--border);border-radius:10px;padding:8px 12px;font-size:13px;font-weight:600;color:#475569;box-shadow:var(--shadow) }

    .driver-chip { display:flex;align-items:center;gap:10px;background:var(--card);border:1px solid var(--border);border-radius:11px;padding:8px 12px 8px 8px;box-shadow:var(--shadow) }
    .drv-av { width:36px;height:36px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;color:#fff;flex-shrink:0 }
    .drv-name { font-size:13.5px;font-weight:700 }
    .drv-sub  { font-size:11.5px;color:var(--muted) }
    .drv-select { border:none;background:#f4f6fa;border-radius:8px;font-size:13px;font-weight:600;padding:6px 8px;color:var(--text);cursor:pointer }
    .drv-select:focus { outline:none }

    .period-tabs { display:flex;gap:4px;background:#f0f2f6;border-radius:10px;padding:3px }
    .ptab { padding:6px 13px;border:none;border-radius:8px;background:transparent;font-size:12.5px;font-weight:600;color:var(--muted);cursor:pointer;transition:.13s;white-space:nowrap }
    .ptab:hover { color:var(--text) }
    .ptab-active { background:#fff;color:var(--red);box-shadow:0 1px 3px rgba(16,24,40,.1) }

    /* ── KPIs ────────────────────────────────────────────── */
    .kpis { display:grid;grid-template-columns:repeat(5,1fr);gap:13px;margin-bottom:22px }
    .kpi { background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:14px 16px;box-shadow:var(--shadow);display:flex;align-items:center;gap:12px }
    .ki { width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0 }
    .ki .material-icons { font-size:20px }
    .ki-blue  { background:var(--red-soft);color:var(--red) }
    .ki-amber { background:var(--amber-soft);color:var(--amber) }
    .ki-green { background:var(--green-soft);color:var(--green) }
    .ki-red   { background:var(--red-soft);color:var(--red) }
    .ki-teal  { background:var(--teal-soft);color:var(--teal) }
    .kv { font-size:20px;font-weight:800;letter-spacing:-.02em;line-height:1.1 }
    .kl { font-size:12px;color:var(--muted);margin-top:2px }

    /* ── Board ───────────────────────────────────────────── */
    .board { display:grid;grid-template-columns:repeat(3,1fr);gap:16px;align-items:start }
    .board-loading { display:grid;grid-template-columns:repeat(3,1fr);gap:16px }
    .skel-col { height:380px;background:#e9ecf0;border-radius:14px;animation:pulse 1.4s ease-in-out infinite }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }

    .col { background:#f0f2f6;border:1px solid var(--border);border-radius:14px;display:flex;flex-direction:column;min-height:340px }
    .col-h { display:flex;align-items:center;justify-content:space-between;padding:13px 15px;border-bottom:1px solid var(--border);border-radius:14px 14px 0 0;font-size:14px;font-weight:700 }
    .col-h-left { display:flex;align-items:center;gap:8px }
    .col-dot { width:8px;height:8px;border-radius:50%;flex-shrink:0 }
    .col-cnt { font-size:12px;font-weight:700;padding:1px 8px;border-radius:20px;background:rgba(0,0,0,.08) }
    .col-sum { font-size:12px;font-weight:700 }
    .col-body { padding:12px;display:flex;flex-direction:column;gap:10px;flex:1 }
    .col-empty { margin:auto;text-align:center;color:var(--muted2);font-size:13px;padding:24px 10px;display:flex;flex-direction:column;align-items:center;gap:6px }

    /* ── Delivery card ───────────────────────────────────── */
    .dcard { background:var(--card);border:1px solid var(--border);border-radius:12px;padding:13px 14px;cursor:pointer;border-left:3px solid var(--red);transition:.13s;box-shadow:var(--shadow) }
    .dcard:hover { box-shadow:0 6px 20px rgba(16,24,40,.09);transform:translateY(-1px) }
    .dcard-doing { border-left-color:var(--amber) }
    .dcard-done  { border-left-color:var(--green) }

    .dc-top { display:flex;align-items:center;gap:10px;margin-bottom:9px }
    .dc-av { width:36px;height:36px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;color:#fff;flex-shrink:0 }
    .dc-name { font-size:14px;font-weight:700;line-height:1.2 }
    .dc-ref  { font-size:11px;color:var(--muted2);margin-top:1px;font-family:ui-monospace,monospace }

    .dc-addr { display:flex;align-items:flex-start;gap:6px;font-size:12px;color:var(--muted);line-height:1.35;margin-bottom:8px }
    .dc-meta { display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px }
    .chip { display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:600;padding:2px 8px;border-radius:20px;background:#eef1f6;color:#5b6473 }

    .dc-foot { display:flex;align-items:center;justify-content:space-between;border-top:1px solid var(--border2);padding-top:9px;margin-bottom:8px }
    .dc-amt { font-size:14px;font-weight:800 }
    .dc-amt-sub { font-size:10.5px;color:var(--muted);margin-top:1px }

    .pay-badge { display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:700;padding:2px 8px;border-radius:20px }
    .pay-dot { width:6px;height:6px;border-radius:50% }
    .pay-unpaid  { background:var(--red-soft);color:var(--red) }   .pay-unpaid  .pay-dot { background:var(--red) }
    .pay-partial { background:var(--amber-soft);color:var(--amber) } .pay-partial .pay-dot { background:var(--amber) }
    .pay-paid    { background:var(--green-soft);color:var(--green) } .pay-paid    .pay-dot { background:var(--green) }

    .dc-actions { display:flex;gap:7px }
    .driver-row { display:flex;align-items:center;gap:7px;font-size:12.5px;font-weight:600;color:var(--text);padding:4px 0;width:100% }
    .status-chip { margin-left:auto;font-size:11px;font-weight:700;padding:2px 8px;border-radius:20px }
    .chip-assigned    { background:var(--red-soft);color:var(--red-d) }
    .chip-in_progress { background:var(--amber-soft);color:#a8620a }
    .chip-delivered   { background:var(--green-soft);color:#117a39 }
    .driver-banner { display:flex;align-items:center;gap:12px;flex:1;padding:6px 0 }
    .done-row { display:flex;align-items:center;gap:6px;font-size:12.5px;font-weight:600;color:var(--green);padding:4px 0 }
    .done-time { margin-left:auto;color:var(--muted2);font-weight:400;font-size:11px }

    /* ── Buttons ─────────────────────────────────────────── */
    .act { display:inline-flex;align-items:center;justify-content:center;gap:6px;font-size:13px;font-weight:700;padding:8px 13px;border-radius:9px;border:none;cursor:pointer;transition:.13s }
    .act .material-icons { font-size:15px }
    .act-full { flex:1;padding:12px }
    .act-primary { background:linear-gradient(90deg, #FF3532, #FF7A30);color:#fff;box-shadow:0 4px 12px rgba(255,53,45,.28) }
    .act-primary:hover { background:var(--red-d) }
    .act-go { background:var(--green);color:#fff;box-shadow:0 4px 12px rgba(22,163,74,.26) }
    .act-go:hover { filter:brightness(.95) }
    .act-ghost { background:var(--card);border:1px solid var(--border);color:#475569;flex:1 }
    .act-ghost:hover { border-color:#cdd6e4;background:#fbfcfe }
    .act-secondary { background:#f1f5f9;color:#475569;border:1px solid var(--border) }
    .btn-icon { width:32px;height:32px;border:none;background:transparent;border-radius:6px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;color:var(--muted) }
    .btn-icon:hover { background:#f1f4f8 }
    .btn-icon .material-icons { font-size:19px }

    /* ── Drawer ──────────────────────────────────────────── */
    .scrim { position:fixed;inset:0;background:rgba(16,24,40,.4);backdrop-filter:blur(2px);opacity:0;visibility:hidden;transition:.2s;z-index:70 }
    .scrim-show { opacity:1;visibility:visible }
    .drawer { position:fixed;top:0;right:0;height:100%;width:440px;max-width:92vw;background:var(--card);box-shadow:-16px 0 48px rgba(16,24,40,.16);transform:translateX(100%);transition:transform .27s cubic-bezier(.4,0,.2,1);z-index:75;display:flex;flex-direction:column }
    .drawer-open { transform:translateX(0) }

    .dh { display:flex;align-items:flex-start;gap:12px;padding:18px 20px;border-bottom:1px solid var(--border);flex-shrink:0 }
    .dh-av { width:46px;height:46px;border-radius:11px;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:800;color:#fff;flex-shrink:0 }
    .dh-name { font-size:17px;font-weight:800 }
    .dh-ref  { font-size:12px;color:var(--muted);margin-top:2px;font-family:ui-monospace,monospace }

    .db { flex:1;overflow-y:auto;padding:16px 20px 20px }

    .status-line { display:inline-flex;align-items:center;font-size:12px;font-weight:700;padding:4px 10px;border-radius:20px;margin-bottom:16px }
    .sl-assigned   { background:var(--red-soft);color:var(--red-d) }
    .sl-in_progress { background:var(--amber-soft);color:#a8620a }
    .sl-delivered   { background:var(--green-soft);color:#117a39 }

    .contact-grid { display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-bottom:16px }
    .cbtn { display:flex;align-items:center;gap:10px;border:1px solid var(--border);border-radius:11px;padding:11px 12px;text-decoration:none;color:inherit;background:#fff;transition:.13s }
    .cbtn:hover { border-color:#cdd9ec;background:#fafcff }
    .cbtn-ic { width:34px;height:34px;border-radius:8px;display:flex;align-items:center;justify-content:center;background:var(--green-soft);color:var(--green) }
    .cbtn-ic .material-icons { font-size:17px }
    .cbtn-ic-blue { background:var(--red-soft);color:var(--red) }
    .cbtn-l { font-size:10.5px;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:.03em }
    .cbtn-v { font-size:13px;font-weight:700;margin-top:1px }

    .sec-label { font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--muted);margin:16px 0 8px }

    .addr-box { display:flex;align-items:flex-start;gap:10px;background:#f8f9fb;border:1px solid var(--border2);border-radius:11px;padding:12px 13px }
    .addr-main { font-size:13.5px;font-weight:600;line-height:1.4 }
    .addr-sub  { font-size:11.5px;color:var(--muted);margin-top:3px }

    .lines-box { border:1px solid var(--border);border-radius:11px;overflow:hidden;margin-top:6px }
    .lrow { display:flex;align-items:center;justify-content:space-between;padding:10px 13px;border-bottom:1px solid var(--border2);font-size:13px }
    .lrow:last-child { border-bottom:none }
    .l-name { font-weight:600 }
    .l-var  { font-weight:400;color:var(--muted) }
    .l-qty  { font-size:12px;color:var(--muted);margin-top:2px }
    .l-tot  { font-weight:700 }

    .totbox { margin-top:13px;border:1px solid var(--border);border-radius:11px;overflow:hidden }
    .tot-row { display:flex;justify-content:space-between;padding:9px 14px;font-size:13px;border-bottom:1px solid var(--border2) }
    .tot-row:last-child { border-bottom:none }
    .tot-grand { background:#f8f9fb;padding:12px 14px }
    .tot-l { color:var(--muted) } .tot-v { font-weight:700 }
    .tot-l-g { font-size:13.5px;font-weight:700 } .tot-v-g { font-size:17px;font-weight:800 }

    .cod-note { display:flex;align-items:center;gap:8px;margin-top:12px;padding:10px 13px;border-radius:10px;font-size:13px;font-weight:600 }
    .cod-note .material-icons { font-size:17px;flex-shrink:0 }
    .cod-note-ok  { background:var(--green-soft);color:var(--green) }
    .cod-note-due { background:var(--red-soft);color:var(--red) }

    .nav-apps { display:flex;gap:9px;margin-bottom:8px }
    .nav-app-btn { flex:1;display:flex;flex-direction:column;align-items:center;gap:7px;padding:11px 8px;border:1px solid var(--border);border-radius:12px;background:#fff;cursor:pointer;font-size:12px;font-weight:600;color:var(--text);transition:.13s }
    .nav-app-btn:hover { border-color:#cdd9ec;background:#fafcff;transform:translateY(-1px) }
    .nav-logo { width:38px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:800 }
    .nav-google { background:#fff;border:1.5px solid #e0e0e0;color:#4285f4 }
    .nav-waze { background:#33ccff;color:#fff }
    .nav-bing { background:#00809d;color:#fff }
    .coords-info { display:flex;align-items:center;gap:6px;font-size:11.5px;color:var(--muted);background:#f8f9fb;border-radius:9px;padding:7px 10px;margin-bottom:4px }
    .coords-fallback { color:#d97706 }

    .df { display:flex;gap:9px;padding:14px 20px;border-top:1px solid var(--border);flex-shrink:0 }
    .done-banner { flex:1;display:flex;align-items:center;justify-content:center;gap:8px;font-size:14px;font-weight:700;color:var(--green);padding:12px }
    .done-banner .material-icons { font-size:20px }
    .act-pdf { flex:1;padding:10px;background:#FFF1EF;color:#FF3532;border:1px solid #ffcfc9;font-size:13px;font-weight:700;border-radius:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;transition:.13s }
    .act-pdf:hover:not(:disabled) { background:#e0ebff }
    .act-pdf:disabled { opacity:.5;cursor:not-allowed }
    .act-pdf .material-icons { font-size:17px }
    /* PDF Viewer */
    .pdf-ov { position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:2000;display:flex;align-items:center;justify-content:center;padding:20px }
    .pdf-box { display:flex;flex-direction:column;width:100%;max-width:900px;height:90vh;background:#1e2533;border-radius:14px;overflow:hidden }
    .pdf-bar { display:flex;align-items:center;justify-content:space-between;padding:12px 18px;background:#151b27;border-bottom:1px solid rgba(255,255,255,.08) }
    .pdf-bar-title { font-size:14px;font-weight:700;color:#fff }
    .pdf-bar-actions { display:flex;gap:8px }
    .pdf-bar-btn { display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border-radius:8px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.07);color:#e2e8f0;font-size:13px;font-weight:600;cursor:pointer;text-decoration:none;transition:.13s }
    .pdf-bar-btn:hover { background:rgba(255,255,255,.14) }
    .pdf-bar-btn svg { width:14px;height:14px }
    .pdf-bar-close { border-color:rgba(226,72,61,.4);color:#fca5a5 }
    .pdf-bar-close:hover { background:rgba(226,72,61,.15) }
    .pdf-iframe { flex:1;border:none;width:100%;background:#fff }

    /* ── Modal COD ───────────────────────────────────────── */
    .ov { position:fixed;inset:0;background:rgba(16,24,40,.5);backdrop-filter:blur(2px);display:none;align-items:center;justify-content:center;z-index:90;padding:24px }
    .ov-show { display:flex }
    .modal { background:var(--card);border-radius:16px;box-shadow:0 14px 40px rgba(16,24,40,.18);width:100%;max-width:440px;display:flex;flex-direction:column;overflow:hidden }
    .mh { display:flex;align-items:flex-start;justify-content:space-between;padding:20px 22px 0 }
    .mh-title { font-size:18px;font-weight:800;margin:0 }
    .mh-sub { font-size:13px;color:var(--muted);margin:3px 0 0 }
    .mb { padding:16px 22px 4px }
    .mf { display:flex;gap:9px;padding:16px 22px 20px }

    .due-card { background:#0e1626;color:#fff;border-radius:13px;padding:15px 17px;display:flex;align-items:center;justify-content:space-between;margin-bottom:16px }
    .due-lbl { font-size:12px;color:#9aa9c0;font-weight:600 }
    .due-val { font-size:26px;font-weight:800;margin-top:2px }
    .due-mode { background:rgba(255,255,255,.1);border-radius:10px;padding:9px 11px;text-align:center;color:#7fb0ff }
    .due-mode .material-icons { font-size:20px;display:block }
    .due-mode span { font-size:10px;color:#9aa9c0;display:block;margin-top:3px;font-weight:600 }

    .field-label { display:block;font-size:12.5px;font-weight:600;color:#475569;margin-bottom:6px }
    .field-input { width:100%;padding:12px 14px;border:1px solid var(--border);border-radius:10px;font-size:20px;font-weight:800;color:var(--text);box-sizing:border-box;outline:none }
    .field-input:focus { border-color:var(--red);box-shadow:0 0 0 3px rgba(255,53,45,.12) }

    .method-row { display:flex;gap:8px;margin-bottom:16px }
    .method-btn { flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px 4px;border-radius:10px;border:1.5px solid var(--border);background:#fff;color:#64748b;font-size:11.5px;font-weight:600;cursor:pointer;transition:.12s }
    .method-btn .material-icons { font-size:19px }
    .method-btn:hover { border-color:var(--red);color:var(--red) }
    .method-active { background:var(--red-soft);color:var(--red);border-color:var(--red) }

    .quick-btns { display:flex;gap:7px;margin-top:9px;flex-wrap:wrap }
    .qbtn { flex:1 0 auto;font-size:12.5px;font-weight:700;padding:7px 0;border-radius:8px;border:1px solid var(--border);color:#475569;background:#fff;cursor:pointer;transition:.12s }
    .qbtn:hover { border-color:var(--red);color:var(--red) }
    .qbtn-active { background:var(--red-soft);color:var(--red);border-color:var(--red) }

    .calc-row { display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-radius:10px;background:#f8f9fb;font-size:14px;font-weight:700;margin-top:13px }
    .calc-green .calc-val { color:var(--green);font-size:16px }
    .calc-red   .calc-val { color:var(--red);font-size:16px }

    .partial-toggle { display:flex;align-items:center;gap:8px;font-size:13px;color:var(--muted);margin:12px 2px 16px;cursor:pointer }
    .partial-toggle input { width:17px;height:17px;cursor:pointer }

    /* ── Toast ───────────────────────────────────────────── */
    .toast { position:fixed;bottom:22px;left:50%;transform:translateX(-50%) translateY(70px);background:#0e1626;color:#fff;padding:12px 18px;border-radius:11px;font-size:14px;font-weight:600;box-shadow:0 14px 40px rgba(16,24,40,.22);display:flex;align-items:center;gap:9px;z-index:120;opacity:0;transition:.3s;pointer-events:none }
    .toast .material-icons { font-size:17px }
    .toast-show { transform:translateX(-50%) translateY(0);opacity:1 }

    /* ── Responsive ──────────────────────────────────────── */
    @media(max-width:1100px) { .kpis { grid-template-columns:repeat(3,1fr) } }
    @media(max-width:900px) { .board { grid-template-columns:1fr } .kpis { grid-template-columns:repeat(2,1fr) } }
  `]
})
export class DeliveryComponent implements OnInit {
  readonly COLS = COLS;

  orders = signal<DeliveryOrder[]>([]);
  drivers = signal<Driver[]>([]);
  selectedDriverId = signal<string>('');
  loading = signal(true);

  drawerOpen = signal(false);
  drawerOrder = signal<DeliveryOrder | null>(null);

  codOpen = signal(false);
  codOrder = signal<DeliveryOrder | null>(null);
  codAmount = signal(0);
  codPartial = signal(false);
  codMethod = signal<'especes' | 'cheque' | 'virement'>('especes');

  toastMsg = signal('');
  private toastTimer: any;

  pdfLoadingId: string | null = null;
  pdfViewerUrl: SafeResourceUrl | null = null;
  pdfViewerTitle = '';

  period: 'today' | 'week' | 'month' | 'all' = 'today';
  readonly todayLabel = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  private readonly COLORS = ['#FF3532','#0d9488','#7c3aed','#d97706','#e2483d','#16a34a'];

  constructor(private api: ApiService, public auth: AuthService, private sanitizer: DomSanitizer) {}

  ngOnInit() {
    if (this.auth.isAdmin) this.loadDrivers();
    this.loadOrders();
  }

  loadDrivers() {
    this.api.get<any[]>('/users?role=delivery').subscribe({
      next: (users) => this.drivers.set(users.map(u => ({ id: u.id, name: u.name }))),
      error: () => {}
    });
  }

  loadOrders() {
    this.loading.set(true);
    const driverId = this.selectedDriverId();
    const base = '/orders?status=assigned&status=in_progress&status=delivered';
    const suffix = driverId ? `&delivery_user_id=${driverId}` : (this.auth.isDelivery ? `&delivery_user_id=${this.auth.currentUser()?.id}` : '');

    // Charger les 3 statuts en parallèle
    forkJoin([
      this.api.get<DeliveryOrder[]>(`/orders?status=assigned${suffix}`),
      this.api.get<DeliveryOrder[]>(`/orders?status=in_progress${suffix}`),
      this.api.get<DeliveryOrder[]>(`/orders?status=delivered${suffix}`),
    ]).subscribe({
      next: ([assigned, inProgress, delivered]) => {
        this.orders.set([...assigned, ...inProgress, ...delivered.slice(0, 15)]);
        this.loading.set(false);
      },
      error: () => { this.loading.set(false); this.flash('Erreur de chargement'); }
    });
  }

  onDriverChange(id: string) {
    this.selectedDriverId.set(id);
    this.loadOrders();
  }

  setPeriod(p: 'today' | 'week' | 'month' | 'all') { this.period = p; }

  // ── Computed ─────────────────────────────────────────────

  private periodStart(): Date | null {
    const now = new Date();
    if (this.period === 'today') {
      const d = new Date(now); d.setHours(0, 0, 0, 0); return d;
    }
    if (this.period === 'week') {
      const d = new Date(now); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); d.setHours(0, 0, 0, 0); return d;
    }
    if (this.period === 'month') {
      return new Date(now.getFullYear(), now.getMonth(), 1);
    }
    return null;
  }

  filteredOrders(): DeliveryOrder[] {
    const start = this.periodStart();
    if (!start) return this.orders();
    return this.orders().filter(o => {
      const ref = o.delivered_at || o.started_at || (o as any).created_at;
      return ref ? new Date(ref) >= start : true;
    });
  }

  allOrders() { return this.filteredOrders(); }

  byStatus(status: string): DeliveryOrder[] {
    return this.filteredOrders().filter(o => o.status === status);
  }

  sumByStatus(status: string): number {
    return this.byStatus(status).reduce((s, o) => s + this.getTotal(o), 0);
  }

  totalDue(): number {
    return this.orders()
      .filter(o => o.status !== 'delivered' || o.payment_status !== 'paid')
      .reduce((s, o) => s + (+(this.getDue(o)) || 0), 0);
  }

  totalPaid(): number {
    const today = new Date().toDateString();
    return this.orders()
      .filter(o => o.status === 'delivered' && o.delivered_at && new Date(o.delivered_at).toDateString() === today)
      .reduce((s, o) => s + (+(o.paid_amount) || 0), 0);
  }

  currentDriverName(): string {
    const id = this.selectedDriverId();
    if (!id) return 'Tous';
    return this.drivers().find(d => d.id === id)?.name ?? '—';
  }

  // ── Drawer ───────────────────────────────────────────────

  openDrawer(o: DeliveryOrder) { this.drawerOrder.set(o); this.drawerOpen.set(true); }
  closeDrawer() { this.drawerOpen.set(false); }

  // ── Actions ──────────────────────────────────────────────

  startDelivery(o: DeliveryOrder) {
    this.api.patch(`/orders/${o.id}/start`, {}).subscribe({
      next: (updated: any) => { this.patchOrder(o.id, updated); this.flash('Livraison démarrée'); },
      error: () => this.flash('Erreur'),
    });
  }

  openCod(o: DeliveryOrder) {
    this.codOrder.set(o);
    this.codAmount.set(this.getDue(o));
    this.codPartial.set(false);
    this.codMethod.set('especes');
    this.codOpen.set(true);
    this.drawerOpen.set(false);
  }

  closeCod() { this.codOpen.set(false); }

  confirmCod() {
    const o = this.codOrder();
    if (!o) return;
    this.api.post<any>(`/orders/${o.id}/deliver`, { paid_amount: this.codAmount(), payment_method: this.codMethod() }).subscribe({
      next: (res) => {
        this.codOpen.set(false);
        this.patchOrder(o.id, res.order);
        const paid = this.codAmount();
        const due = this.getDue(o);
        const reste = Math.max(0, due - paid);
        const msg = reste <= 0 ? `${o.client_name} livré · ${this.fmtDH(paid)} encaissé`
          : paid > 0 ? `${o.client_name} livré · reste ${this.fmtDH(reste)}`
          : `${o.client_name} livré · non encaissé`;
        this.flash(msg);
      },
      error: () => this.flash('Erreur lors de la livraison'),
    });
  }

  // ── Helpers ──────────────────────────────────────────────

  getTotal(o: DeliveryOrder): number {
    return +(o.total_ttc) || o.lines?.reduce((s, l) => s + (+l.quantity) * (+l.unit_price), 0) || 0;
  }

  getDue(o: DeliveryOrder): number {
    return Math.max(0, this.getTotal(o) - (+(o.paid_amount) || 0));
  }

  getTotalQty(o: DeliveryOrder): number {
    return o.lines?.reduce((s, l) => s + l.quantity, 0) ?? 0;
  }

  get codDue(): number { return this.codOrder() ? this.getDue(this.codOrder()!) : 0; }
  get codRendu(): number { return Math.max(0, this.codAmount() - this.codDue); }
  get codReste(): number { return Math.max(0, this.codDue - this.codAmount()); }
  get codIsShort(): boolean { return this.codPartial() || this.codAmount() < this.codDue; }

  get codQuickAmounts(): number[] {
    const due = this.codDue;
    const notes = [due];
    [50, 100, 200].forEach(b => { const v = Math.ceil(due / b) * b; if (v > due && !notes.includes(v)) notes.push(v); });
    return notes.slice(0, 4);
  }

  fmtDH(n: number): string { return Number(n ?? 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' DH'; }

  payLabel(o: DeliveryOrder): string {
    if (o.payment_status === 'paid') {
      return o.payment_method ? `Payé · ${this.paymentMethodLabel(o.payment_method)}` : 'Payé';
    }
    if (o.payment_status === 'partial') return `Partiel · reste ${this.fmtDH(this.getDue(o))}`;
    return 'Non payé';
  }

  paymentMethodLabel(method: 'especes' | 'cheque' | 'virement' | null): string {
    const map: Record<string, string> = { especes: 'Espèces', cheque: 'Chèque', virement: 'Virement' };
    return method ? map[method] : 'Espèces';
  }

  paymentMethodIcon(method: 'especes' | 'cheque' | 'virement' | null): string {
    const map: Record<string, string> = { especes: 'payments', cheque: 'description', virement: 'swap_horiz' };
    return method ? map[method] : 'payments';
  }

  statusLabel(o: DeliveryOrder): string {
    if (o.status === 'in_progress') return 'En cours';
    if (o.status === 'delivered') return 'Livré';
    return 'À livrer';
  }

  initials(name: string): string {
    return (name || '').split(' ').map((x: string) => x[0]).slice(0, 2).join('').toUpperCase();
  }

  // ── Navigation GPS ───────────────────────────────────────

  hasCoords(o: DeliveryOrder): boolean {
    return !!(o.delivery_latitude && o.delivery_longitude);
  }

  openGoogleMaps(o: DeliveryOrder) {
    const url = this.hasCoords(o)
      ? `https://www.google.com/maps/dir/?api=1&destination=${o.delivery_latitude},${o.delivery_longitude}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(o.delivery_address || '')}`;
    window.open(url, '_blank');
  }

  openWaze(o: DeliveryOrder) {
    const url = this.hasCoords(o)
      ? `https://waze.com/ul?ll=${o.delivery_latitude},${o.delivery_longitude}&navigate=yes`
      : `https://waze.com/ul?q=${encodeURIComponent(o.delivery_address || '')}&navigate=yes`;
    window.open(url, '_blank');
  }

  openBingMaps(o: DeliveryOrder) {
    const url = this.hasCoords(o)
      ? `https://bing.com/maps/default.aspx?rtp=~pos.${o.delivery_latitude}_${o.delivery_longitude}`
      : `https://bing.com/maps/default.aspx?q=${encodeURIComponent(o.delivery_address || '')}`;
    window.open(url, '_blank');
  }

  avatarColor(name: string): string {
    const idx = (name || '').charCodeAt(0) % this.COLORS.length;
    return this.COLORS[idx];
  }

  viewBonLivraison(o: DeliveryOrder) {
    if (this.pdfLoadingId) return;
    const token = localStorage.getItem('token') ?? '';
    const apiBase = environment.apiUrl;
    const url = `${apiBase}/pdf/orders/${o.id}/bon-livraison?token=${token}&t=${Date.now()}`;
    this.pdfViewerTitle = `Bon de livraison - CMD-${o.order_number}`;
    this.pdfViewerUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  closePdfViewer() { this.pdfViewerUrl = null; }

  private patchOrder(id: string, patch: Partial<DeliveryOrder>) {
    this.orders.update(list => list.map(o => o.id === id ? { ...o, ...patch } : o));
    if (this.drawerOrder()?.id === id) {
      this.drawerOrder.update(o => o ? { ...o, ...patch } : o);
    }
  }

  private flash(msg: string) {
    this.toastMsg.set(msg);
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toastMsg.set(''), 2600);
  }
}
