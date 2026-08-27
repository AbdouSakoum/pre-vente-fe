import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { DrawerComponent } from '../../shared/components/drawer/drawer.component';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, FormsModule, MatTableModule, DrawerComponent],
  template: `
    <div class="page-header">
      <div>
        <h2>Commandes</h2>
        <p class="page-subtitle">{{ orders.length }} commande(s)</p>
      </div>
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
        <div class="period-tabs">
          <button class="ptab" [class.ptab-active]="periodFilter === 'today'"  (click)="setPeriod('today')">Aujourd'hui</button>
          <button class="ptab" [class.ptab-active]="periodFilter === 'week'"   (click)="setPeriod('week')">Cette semaine</button>
          <button class="ptab" [class.ptab-active]="periodFilter === 'month'"  (click)="setPeriod('month')">Ce mois</button>
          <button class="ptab" [class.ptab-active]="periodFilter === 'all'"    (click)="setPeriod('all')">Tous</button>
        </div>
        <select class="field-select" style="width:160px" [(ngModel)]="statusFilter" (ngModelChange)="load()">
          <option value="">Tous les statuts</option>
          <option value="pending">En attente</option>
          <option value="assigned">Assignées</option>
          <option value="in_progress">En cours</option>
          <option value="delivered">Livrées</option>
        </select>
        <button class="btn-primary" (click)="openForm()" *ngIf="auth.isPreSeller || auth.isAdmin || auth.isStockManager">
          <span class="material-icons">add</span> Nouvelle commande
        </button>
      </div>
    </div>

    <div class="card">
      <table mat-table [dataSource]="orders" class="full-width">
        <ng-container matColumnDef="num">
          <th mat-header-cell *matHeaderCellDef>N°</th>
          <td mat-cell *matCellDef="let o">
            <div class="order-num">#{{ o.order_number || '—' }}</div>
          </td>
        </ng-container>
        <ng-container matColumnDef="date_cmd">
          <th mat-header-cell *matHeaderCellDef>Date commande</th>
          <td mat-cell *matCellDef="let o">
            <div class="item-title">{{ o.created_at | date:'dd/MM/yyyy' }}</div>
            <div class="item-sub">{{ o.created_at | date:'HH:mm' }}</div>
          </td>
        </ng-container>
        <ng-container matColumnDef="client">
          <th mat-header-cell *matHeaderCellDef>Client</th>
          <td mat-cell *matCellDef="let o">
            <div class="item-title">{{ o.client_name }}</div>
            <div class="item-sub">{{ o.pre_seller_name || '—' }}</div>
          </td>
        </ng-container>
        <ng-container matColumnDef="status">
          <th mat-header-cell *matHeaderCellDef>Statut</th>
          <td mat-cell *matCellDef="let o">
            <span class="badge" [class]="'badge-' + o.status">{{ statusLabel(o.status) }}</span>
          </td>
        </ng-container>
        <ng-container matColumnDef="totaux">
          <th mat-header-cell *matHeaderCellDef>Montant TTC</th>
          <td mat-cell *matCellDef="let o">
            <div class="ttc-val" *ngIf="o.total_ttc">{{ o.total_ttc | number:'1.2-2' }} DH</div>
            <div class="item-sub" *ngIf="o.total_ht">HT : {{ o.total_ht | number:'1.2-2' }} DH</div>
            <div class="no-total" *ngIf="!o.total_ttc">—</div>
          </td>
        </ng-container>
        <ng-container matColumnDef="payment">
          <th mat-header-cell *matHeaderCellDef>Paiement</th>
          <td mat-cell *matCellDef="let o">
            <span [class]="o.payment_status === 'paid' ? 'paid' : 'unpaid'">
              {{ o.payment_status === 'paid' ? 'Payé' : 'Non payé' }}
            </span>
          </td>
        </ng-container>
        <ng-container matColumnDef="driver">
          <th mat-header-cell *matHeaderCellDef>Livreur</th>
          <td mat-cell *matCellDef="let o">{{ o.delivery_name || '—' }}</td>
        </ng-container>
        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef></th>
          <td mat-cell *matCellDef="let o">
            <button class="btn-icon" (click)="openDetail(o)" title="Détail"><span class="material-icons">visibility</span></button>
            <button class="btn-icon" (click)="openAssign(o)" *ngIf="(auth.isAdmin || auth.isStockManager) && o.status === 'pending'" title="Assigner">
              <span class="material-icons">person_add</span>
            </button>
          </td>
        </ng-container>
        <tr mat-header-row *matHeaderRowDef="cols"></tr>
        <tr mat-row *matRowDef="let r; columns: cols" class="table-row"></tr>
      </table>
      <div *ngIf="!orders.length" class="empty-state">
        <span class="material-icons">receipt_long</span>
        <p>Aucune commande</p>
      </div>
    </div>

    <!-- DRAWER NOUVELLE / MODIFICATION COMMANDE -->
    <app-drawer [open]="showForm" [title]="editingOrderId ? 'Modifier la commande' : 'Nouvelle commande'" [saving]="saving"
      (closed)="showForm=false" (saved)="saveOrder()">

      <!-- Client -->
      <div class="form-section">
        <div class="form-section-label">Informations générales</div>
        <div class="field-group">
          <label>Client <span class="req">*</span></label>
          <select class="field-select" [(ngModel)]="orderForm.client_id">
            <option value="">— Sélectionner un client —</option>
            <option *ngFor="let c of clients" [value]="c.id">{{ c.name }}</option>
          </select>
        </div>
        <div class="field-group">
          <label>Paiement</label>
          <div class="radio-group">
            <label class="radio-opt" [class.sel]="orderForm.payment_status==='unpaid'">
              <input type="radio" [(ngModel)]="orderForm.payment_status" value="unpaid" /> Non payé
            </label>
            <label class="radio-opt" [class.sel]="orderForm.payment_status==='paid'">
              <input type="radio" [(ngModel)]="orderForm.payment_status" value="paid" /> Payé
            </label>
          </div>
        </div>
        <div class="field-group">
          <label>Adresse de livraison</label>
          <textarea class="field-textarea" rows="2" [(ngModel)]="orderForm.delivery_address" placeholder="Rue, quartier, ville…"></textarea>
        </div>
        <div class="field-group">
          <label>Note</label>
          <textarea class="field-textarea" rows="2" [(ngModel)]="orderForm.note" placeholder="Instructions, remarques…"></textarea>
        </div>
      </div>

      <!-- Articles -->
      <div class="form-section">
        <div class="form-section-label" style="display:flex;justify-content:space-between;align-items:center">
          <span>Articles <span class="req">*</span></span>
          <button class="btn-add-line" (click)="addLine()">
            <span class="material-icons" style="font-size:14px">add</span> Ajouter
          </button>
        </div>

        <!-- En-tête colonnes -->
        <div class="line-cols-head">
          <span style="flex:1">Produit</span>
          <span style="width:56px;text-align:center">Qté</span>
          <span style="width:80px;text-align:right">P.U. HT</span>
          <span style="width:52px;text-align:center">TVA</span>
          <span style="width:80px;text-align:right">Total HT</span>
          <span style="width:24px"></span>
        </div>

        <div *ngFor="let line of orderLines; let i=index" class="line-card">
          <select class="field-select line-select" [(ngModel)]="line.variant_id" (ngModelChange)="setPrice(line)">
            <option value="">— Produit —</option>
            <option *ngFor="let v of allVariants" [value]="v.id">{{ v.product_name }} — {{ v.name }}</option>
          </select>
          <div class="line-nums">
            <input class="field-input num-input" type="number" [(ngModel)]="line.quantity" min="1" placeholder="1" />
            <input class="field-input num-input price-input" type="number" [(ngModel)]="line.unit_price" placeholder="0.00" step="0.01" />
            <select class="field-select tva-select" [(ngModel)]="line.tva_rate">
              <option [value]="0">0%</option>
              <option [value]="7">7%</option>
              <option [value]="10">10%</option>
              <option [value]="14">14%</option>
              <option [value]="20">20%</option>
            </select>
            <div class="line-total-ht">{{ line.quantity * line.unit_price | number:'1.2-2' }}</div>
            <button class="btn-del-line" (click)="removeLine(i)" title="Supprimer">
              <span class="material-icons">close</span>
            </button>
          </div>
        </div>

        <div class="empty-lines" *ngIf="!orderLines.length">Aucun article — cliquez sur Ajouter</div>
      </div>

      <!-- Récap totaux -->
      <div class="totaux-recap" *ngIf="formHT > 0">
        <div class="tr-row"><span>Total HT</span><b>{{ formHT | number:'1.2-2' }} DH</b></div>
        <div class="tr-row"><span>TVA</span><b>{{ formTVA | number:'1.2-2' }} DH</b></div>
        <div class="tr-row grand"><span>Total TTC</span><b>{{ formTTC | number:'1.2-2' }} DH</b></div>
      </div>

      <div *ngIf="errorMsg" class="error-banner">
        <span class="material-icons">error_outline</span> {{ errorMsg }}
      </div>
    </app-drawer>

    <!-- DRAWER DETAIL -->
    <app-drawer [open]="showDetail"
      [title]="(selectedOrder?.order_number ? '#' + selectedOrder.order_number + ' — ' : '') + (selectedOrder?.client_name || '')"
      [showFooter]="selectedOrder?.payment_status !== 'paid'"
      saveLabel="Modifier" [saving]="false"
      (closed)="showDetail=false" (saved)="openEdit(selectedOrder)">
      <div *ngIf="selectedOrder">
        <!-- Infos générales -->
        <div class="detail-row"><span>N° commande</span><b>#{{ selectedOrder.order_number || '—' }}</b></div>
        <div class="detail-row"><span>Date</span><span>{{ selectedOrder.created_at | date:'dd/MM/yyyy HH:mm' }}</span></div>
        <div class="detail-row"><span>Statut</span><span class="badge" [class]="'badge-' + selectedOrder.status">{{ statusLabel(selectedOrder.status) }}</span></div>
        <div class="detail-row"><span>Paiement</span><span [class]="selectedOrder.payment_status === 'paid' ? 'paid' : 'unpaid'">{{ selectedOrder.payment_status === 'paid' ? 'Payé' : 'Non payé' }}</span></div>
        <div class="detail-row"><span>Pré-vendeur</span><span>{{ selectedOrder.pre_seller_name || '—' }}</span></div>
        <div class="detail-row"><span>Livreur</span><span>{{ selectedOrder.delivery_name || '—' }}</span></div>
        <div class="detail-row" *ngIf="selectedOrder.delivery_address"><span>Adresse</span><span>{{ selectedOrder.delivery_address }}</span></div>

        <!-- Articles -->
        <div class="lines-section" style="margin-top:20px">
          <div class="lines-header"><label>Articles</label></div>
          <div *ngFor="let l of validLines(selectedOrder.lines)" class="line-detail">
            <div class="line-detail-name">
              <span class="ln-product">{{ l.product_name }}</span>
              <span class="ln-variant">{{ l.variant_name }}</span>
            </div>
            <span class="ln-qty">× {{ l.quantity }}</span>
            <span class="ln-price">{{ l.unit_price | number:'1.2-2' }} DH</span>
            <span class="ln-total">{{ l.quantity * l.unit_price | number:'1.2-2' }} DH</span>
          </div>
        </div>

        <!-- Totaux -->
        <div class="totaux-block" *ngIf="selectedOrder.total_ht">
          <div class="tot-line"><span>Total HT</span><span>{{ selectedOrder.total_ht | number:'1.2-2' }} DH</span></div>
          <div class="tot-line"><span>TVA (20%)</span><span>{{ selectedOrder.total_tva | number:'1.2-2' }} DH</span></div>
          <div class="tot-line grand"><span>Total TTC</span><span>{{ selectedOrder.total_ttc | number:'1.2-2' }} DH</span></div>
        </div>

        <!-- Actions PDF -->
        <div class="pdf-actions">
          <div class="pdf-title">Documents</div>
          <div class="pdf-btns">
            <button class="pdf-btn" (click)="viewPdf('bon-commande')" [disabled]="pdfLoading">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              Bon de commande
            </button>
            <button class="pdf-btn" (click)="viewPdf('bon-livraison')" [disabled]="pdfLoading" *ngIf="selectedOrder.status === 'delivered'">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"/><path d="M16 8h4l3 5v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
              Bon de livraison
            </button>
            <button class="pdf-btn pdf-btn-facture" (click)="viewPdf('facture')" [disabled]="pdfLoading" *ngIf="selectedOrder.status === 'delivered'">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              Facture
            </button>
          </div>
          <div *ngIf="pdfLoading" style="margin-top:10px;font-size:12px;color:#6b7280;display:flex;align-items:center;gap:6px">
            <span class="pdf-spinner"></span> Génération en cours…
          </div>
        </div>
      </div>
    </app-drawer>

    <!-- PDF VIEWER MODAL -->
    <div class="pdf-overlay" *ngIf="pdfViewerUrl" (click)="closePdfViewer()">
      <div class="pdf-modal" (click)="$event.stopPropagation()">
        <div class="pdf-modal-bar">
          <span class="pdf-modal-title">{{ pdfViewerTitle }}</span>
          <div class="pdf-modal-actions">
            <a [href]="pdfViewerUrl" [download]="pdfViewerTitle + '.pdf'" class="pdf-action-btn" title="Télécharger">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Télécharger
            </a>
            <button class="pdf-action-btn pdf-close" (click)="closePdfViewer()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              Fermer
            </button>
          </div>
        </div>
        <iframe [src]="pdfViewerUrl" class="pdf-iframe"></iframe>
      </div>
    </div>

    <!-- DRAWER ASSIGNATION -->
    <app-drawer [open]="showAssign" title="Assigner la commande" [saving]="saving"
      saveLabel="Assigner" (closed)="showAssign=false" (saved)="doAssign()">
      <div class="field-group">
        <label>Livreur <span class="req">*</span></label>
        <select class="field-select" [(ngModel)]="assignForm.delivery_user_id">
          <option value="">Sélectionner un livreur</option>
          <option *ngFor="let u of deliveryUsers" [value]="u.id">{{ u.name }}</option>
        </select>
      </div>
      <div *ngIf="errorMsg" class="error-banner">
        <span class="material-icons">error_outline</span> {{ errorMsg }}
      </div>
    </app-drawer>
  `,
  styles: [`
    .period-tabs { display:flex;gap:4px;background:#f0f2f6;border-radius:10px;padding:3px }
    .ptab { padding:6px 13px;border:none;border-radius:8px;background:transparent;font-size:12.5px;font-weight:600;color:#64748b;cursor:pointer;transition:.13s;white-space:nowrap }
    .ptab:hover { color:#1e293b }
    .ptab-active { background:#fff;color:#FF3532;box-shadow:0 1px 3px rgba(16,24,40,.1) }
    .item-title { font-size:14px; font-weight:500; color:#1e293b; }
    .item-sub { font-size:12px; color:#94a3b8; max-width:200px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .order-num { font-size:14px; font-weight:700; color:#1e293b; }
    .ttc-val { font-size:14px; font-weight:700; color:#1e293b; }
    .no-total { color:#94a3b8; font-size:13px; }
    .badge { padding:3px 10px; border-radius:20px; font-size:12px; font-weight:500; }
    .badge-pending { background:#fef3c7; color:#92400e; }
    .badge-assigned { background:#FFF1EF; color:#1e40af; }
    .badge-in_progress { background:#ede9fe; color:#5b21b6; }
    .badge-delivered { background:#dcfce7; color:#166534; }
    .badge-cancelled { background:#fee2e2; color:#991b1b; }
    .paid { color:#16a34a; font-weight:500; font-size:13px; }
    .unpaid { color:#dc2626; font-weight:500; font-size:13px; }
    .empty-state { padding:48px; text-align:center; color:#94a3b8; }
    .empty-state .material-icons { font-size:48px; display:block; margin-bottom:8px; }
    .field-row { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
    .req { color:#ef4444; }
    .lines-section { display:flex; flex-direction:column; gap:8px; }
    .lines-header { display:flex; justify-content:space-between; align-items:center; }
    .btn-add-line { display:flex; align-items:center; gap:4px; padding:5px 10px; border:1px dashed #cbd5e1; border-radius:6px; background:transparent; cursor:pointer; font-size:12px; color:#64748b; }
    .btn-add-line:hover { border-color:#FF3532; color:#FF3532; }
    .line-row { display:flex; gap:8px; align-items:flex-end; }
    .detail-row { display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid #f1f5f9; font-size:14px; }
    .detail-row span:first-child { color:#64748b; }
    .line-detail { display:grid; grid-template-columns:1fr auto auto auto; gap:10px; align-items:center; padding:10px 12px; background:#f8fafc; border-radius:8px; font-size:13px; }
    .line-detail-name { display:flex; flex-direction:column; }
    .ln-product { font-weight:600; color:#1e293b; }
    .ln-variant { font-size:11px; color:#64748b; }
    .ln-qty { color:#64748b; white-space:nowrap; }
    .ln-price { color:#64748b; white-space:nowrap; }
    .ln-total { font-weight:700; color:#E0231F; white-space:nowrap; text-align:right; }
    .totaux-block { background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:14px 16px; margin-top:16px; display:flex; flex-direction:column; gap:6px; }
    .tot-line { display:flex; justify-content:space-between; font-size:13px; color:#64748b; }
    .tot-line.grand { font-size:16px; font-weight:700; color:#1e293b; border-top:1px solid #e2e8f0; padding-top:8px; margin-top:4px; }
    .pdf-actions { margin-top:18px; padding-top:14px; border-top:1px solid #f1f5f9; }
    .pdf-title { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:#94a3b8; margin-bottom:10px; }
    .pdf-btns { display:flex; flex-wrap:wrap; gap:8px; }
    .pdf-btn { display:inline-flex; align-items:center; gap:7px; padding:8px 14px; border:1px solid #e2e8f0; border-radius:9px; background:#fff; font-size:13px; font-weight:600; color:#374151; cursor:pointer; transition:.13s; }
    .pdf-btn:hover { border-color:#FF3532; color:#FF3532; background:#FFF1EF; }
    .pdf-btn svg { width:15px; height:15px; }
    .pdf-btn-facture { border-color:#16a34a; color:#16a34a; }
    .pdf-btn-facture:hover { background:#f0fdf4; border-color:#15803d; color:#15803d; }
    .pdf-btn:disabled { opacity:.5; cursor:not-allowed; }
    .pdf-spinner { display:inline-block; width:13px; height:13px; border:2px solid #e2e8f0; border-top-color:#FF3532; border-radius:50%; animation:spin .7s linear infinite; }
    @keyframes spin { to { transform:rotate(360deg); } }
    /* PDF Viewer */
    .pdf-overlay { position:fixed; inset:0; background:rgba(0,0,0,.7); z-index:1000; display:flex; align-items:center; justify-content:center; padding:24px; }
    .pdf-modal { display:flex; flex-direction:column; width:100%; max-width:900px; height:90vh; background:#1e2533; border-radius:14px; overflow:hidden; box-shadow:0 24px 80px rgba(0,0,0,.5); }
    .pdf-modal-bar { display:flex; align-items:center; justify-content:space-between; padding:12px 18px; background:#151b27; border-bottom:1px solid rgba(255,255,255,.08); }
    .pdf-modal-title { font-size:14px; font-weight:700; color:#fff; }
    .pdf-modal-actions { display:flex; align-items:center; gap:8px; }
    .pdf-action-btn { display:inline-flex; align-items:center; gap:6px; padding:7px 14px; border-radius:8px; border:1px solid rgba(255,255,255,.15); background:rgba(255,255,255,.07); color:#e2e8f0; font-size:13px; font-weight:600; cursor:pointer; text-decoration:none; transition:.13s; }
    .pdf-action-btn:hover { background:rgba(255,255,255,.14); }
    .pdf-action-btn svg { width:14px; height:14px; }
    .pdf-close { border-color:rgba(226,72,61,.4); color:#fca5a5; }
    .pdf-close:hover { background:rgba(226,72,61,.15); }
    .pdf-iframe { flex:1; border:none; width:100%; background:#fff; }
    .line-subtotal { font-size:13px; font-weight:600; color:#E0231F; white-space:nowrap; align-self:center; min-width:70px; text-align:right; }
    /* Form sections */
    .form-section { background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:14px 16px; margin-bottom:14px; display:flex; flex-direction:column; gap:12px; }
    .form-section-label { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:#64748b; }
    .radio-group { display:flex; gap:8px; }
    .radio-opt { display:flex; align-items:center; gap:6px; padding:8px 16px; border:1px solid #e2e8f0; border-radius:8px; cursor:pointer; font-size:13px; font-weight:500; background:#fff; }
    .radio-opt.sel { border-color:#FF3532; background:#FFF1EF; color:#E0231F; }
    .radio-opt input { display:none; }
    /* Lignes articles */
    .line-cols-head { display:flex; align-items:center; gap:6px; font-size:11px; color:#94a3b8; font-weight:600; padding:0 2px 4px; }
    .line-card { background:#fff; border:1px solid #e2e8f0; border-radius:8px; padding:10px; display:flex; flex-direction:column; gap:8px; }
    .line-select { font-size:13px; }
    .line-nums { display:flex; align-items:center; gap:6px; }
    .num-input { width:56px; text-align:center; padding:7px 6px; }
    .price-input { width:80px; text-align:right; }
    .tva-select { width:62px; font-size:12px; padding:7px 4px; }
    .line-total-ht { width:80px; text-align:right; font-size:13px; font-weight:700; color:#E0231F; }
    .btn-del-line { width:24px; height:24px; border:none; background:none; cursor:pointer; color:#94a3b8; display:flex; align-items:center; justify-content:center; border-radius:4px; }
    .btn-del-line:hover { background:#fee2e2; color:#ef4444; }
    .btn-del-line .material-icons { font-size:16px; }
    .empty-lines { text-align:center; font-size:13px; color:#94a3b8; padding:16px 0; }
    /* Récap totaux form */
    .totaux-recap { background:#1e293b; border-radius:10px; padding:14px 18px; display:flex; flex-direction:column; gap:6px; margin-bottom:12px; }
    .tr-row { display:flex; justify-content:space-between; font-size:13px; color:#94a3b8; }
    .tr-row b { color:#e2e8f0; }
    .tr-row.grand { font-size:16px; color:#fff; border-top:1px solid rgba(255,255,255,.1); padding-top:8px; margin-top:4px; }
    .tr-row.grand b { color:#60a5fa; font-size:18px; }
  `]
})
export class OrdersComponent implements OnInit {
  orders: any[] = [];
  clients: any[] = [];
  deliveryUsers: any[] = [];
  allVariants: any[] = [];
  statusFilter = '';
  periodFilter: 'today' | 'week' | 'month' | 'all' = 'all';
  cols = ['num', 'date_cmd', 'client', 'status', 'totaux', 'payment', 'driver', 'actions'];
  showForm = false;
  showDetail = false;
  showAssign = false;
  selectedOrder: any = null;
  saving = false;
  errorMsg = '';
  editingOrderId: string | null = null;
  orderForm: any = { client_id: '', delivery_address: '', payment_status: 'unpaid', note: '' };
  orderLines: any[] = [];
  assignForm: any = { delivery_user_id: '' };

  // PDF Viewer
  pdfLoading    = false;
  pdfViewerUrl: SafeResourceUrl | null = null;
  pdfViewerTitle = '';

  constructor(private api: ApiService, public auth: AuthService, private cdr: ChangeDetectorRef, private sanitizer: DomSanitizer) {}

  ngOnInit() {
    this.load();
    this.api.get<any[]>('/clients').subscribe(c => { this.clients = [...c]; this.cdr.detectChanges(); });
    if (this.auth.isAdmin || this.auth.isStockManager) {
      this.api.get<any[]>('/users/deliverers').subscribe(u => { this.deliveryUsers = u; this.cdr.detectChanges(); });
    }
    this.api.get<any[]>('/products').subscribe((products: any[]) => {
      this.allVariants = products.flatMap((p: any) =>
        (p.variants || []).filter((v: any) => v.is_active !== false).map((v: any) => ({ ...v, product_name: p.name, tva_rate: p.tva_rate ?? 20 }))
      );
      this.cdr.detectChanges();
    });
  }

  setPeriod(p: 'today' | 'week' | 'month' | 'all') { this.periodFilter = p; this.load(); }

  load() {
    const params: string[] = [];
    if (this.statusFilter) params.push(`status=${this.statusFilter}`);
    const now = new Date();
    if (this.periodFilter === 'today') {
      params.push(`date_from=${now.toISOString().slice(0,10)}`);
      params.push(`date_to=${now.toISOString().slice(0,10)}`);
    } else if (this.periodFilter === 'week') {
      const mon = new Date(now); mon.setDate(mon.getDate() - ((mon.getDay() + 6) % 7)); mon.setHours(0,0,0,0);
      params.push(`date_from=${mon.toISOString().slice(0,10)}`);
    } else if (this.periodFilter === 'month') {
      params.push(`date_from=${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`);
    }
    const qs = params.length ? `?${params.join('&')}` : '';
    this.api.get<any[]>(`/orders${qs}`).subscribe(o => { this.orders = [...o]; this.cdr.detectChanges(); });
  }

  get formTTC() { return parseFloat(this.orderLines.reduce((s, l) => s + (l.quantity || 0) * (l.unit_price || 0), 0).toFixed(2)); }
  get formTVA() { return parseFloat((this.formTTC - this.formTTC / 1.20).toFixed(2)); }
  get formHT()  { return parseFloat((this.formTTC - this.formTVA).toFixed(2)); }

  openForm() {
    this.editingOrderId = null;
    this.orderForm = { client_id: '', delivery_address: '', payment_status: 'unpaid', note: '' };
    this.orderLines = [{ variant_id: '', quantity: 1, unit_price: 0, tva_rate: 20 }];
    this.errorMsg = ''; this.showForm = true;
  }

  openEdit(o: any) {
    this.editingOrderId = o.id;
    this.orderForm = { client_id: o.client_id, delivery_address: o.delivery_address || '', payment_status: o.payment_status, note: o.note || '' };
    this.orderLines = (o.lines || []).filter((l: any) => l?.variant_id).map((l: any) => ({
      variant_id: l.variant_id, quantity: l.quantity, unit_price: l.unit_price, tva_rate: l.tva_rate ?? 20
    }));
    if (!this.orderLines.length) this.orderLines = [{ variant_id: '', quantity: 1, unit_price: 0, tva_rate: 20 }];
    this.errorMsg = '';
    this.showDetail = false;
    this.showForm = true;
  }
  addLine() { this.orderLines.push({ variant_id: '', quantity: 1, unit_price: 0, tva_rate: 20 }); }
  removeLine(i: number) { this.orderLines.splice(i, 1); }
  setPrice(line: any) {
    const v = this.allVariants.find(x => x.id === line.variant_id);
    if (v) {
      line.unit_price = v.price;
      line.tva_rate = v.tva_rate ?? 20;
    }
  }
  saveOrder() {
    if (!this.orderForm.client_id) { this.errorMsg = 'Sélectionnez un client'; return; }
    if (!this.orderLines.length || !this.orderLines[0].variant_id) { this.errorMsg = 'Ajoutez au moins une ligne'; return; }
    setTimeout(() => { this.saving = true; this.cdr.detectChanges(); });
    const payload = { ...this.orderForm, lines: this.orderLines };
    const req$ = this.editingOrderId
      ? this.api.put(`/orders/${this.editingOrderId}`, payload)
      : this.api.post('/orders', payload);
    req$.subscribe({
      next: () => { setTimeout(() => { this.saving = false; this.showForm = false; this.editingOrderId = null; this.cdr.detectChanges(); this.load(); }); },
      error: (err) => { setTimeout(() => { this.saving = false; this.errorMsg = err.error?.message || 'Erreur'; this.cdr.detectChanges(); }); }
    });
  }

  openDetail(o: any) { this.selectedOrder = o; this.showDetail = true; }

  viewPdf(type: 'bon-commande' | 'bon-livraison' | 'facture') {
    if (!this.selectedOrder) return;
    const id    = this.selectedOrder.id;
    const token = localStorage.getItem('token');
    const base  = environment.apiUrl.replace('/api', '');

    const labels: Record<string, string> = {
      'bon-commande':  'Bon de commande',
      'bon-livraison': 'Bon de livraison',
      'facture':       'Facture',
    };
    this.pdfViewerTitle = `${labels[type]} — #${this.selectedOrder.order_number || id.slice(0,8)}`;

    if (type === 'bon-commande') {
      // Toujours régénérer pour avoir logo/cachet à jour
      this.pdfLoading = true;
      this.cdr.detectChanges();
      this.api.post<{ url: string }>(`/pdf/orders/${id}/generate`, {}).subscribe({
        next: (r) => {
          this.pdfLoading = false;
          const url = `${base}${r.url}?t=${Date.now()}&token=${token}`;
          this.pdfViewerUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
          this.cdr.detectChanges();
        },
        error: () => { this.pdfLoading = false; this.cdr.detectChanges(); },
      });
    } else {
      // Bon de livraison / facture : généré à la volée
      const url = `${base}/api/pdf/orders/${id}/${type}?token=${token}`;
      this.pdfViewerUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
      this.cdr.detectChanges();
    }
  }

  closePdfViewer() {
    this.pdfViewerUrl = null;
    this.cdr.detectChanges();
  }
  openAssign(o: any) { this.selectedOrder = o; this.assignForm = { delivery_user_id: '' }; this.errorMsg = ''; this.showAssign = true; }
  doAssign() {
    if (!this.assignForm.delivery_user_id) { this.errorMsg = 'Sélectionnez un livreur'; return; }
    setTimeout(() => { this.saving = true; this.cdr.detectChanges(); });
    this.api.post(`/orders/${this.selectedOrder.id}/assign`, this.assignForm).subscribe({
      next: () => { setTimeout(() => { this.saving = false; this.showAssign = false; this.cdr.detectChanges(); this.load(); }); },
      error: (err) => { setTimeout(() => { this.saving = false; this.errorMsg = err.error?.message || 'Erreur'; this.cdr.detectChanges(); }); }
    });
  }

  statusLabel(s: string): string {
    const map: any = { pending: 'En attente', assigned: 'Assignée', in_progress: 'En cours', delivered: 'Livrée', cancelled: 'Annulée' };
    return map[s] || s;
  }

  validLines(lines: any[]): any[] {
    if (!lines) return [];
    return lines.filter(l => l && l.variant_id);
  }
}
