import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { DrawerComponent } from '../../shared/components/drawer/drawer.component';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

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
      <div style="display:flex;gap:10px;align-items:center">
        <select class="field-select" style="width:180px" [(ngModel)]="statusFilter" (ngModelChange)="load()">
          <option value="">Tous les statuts</option>
          <option value="pending">En attente</option>
          <option value="assigned">Assignées</option>
          <option value="in_progress">En cours</option>
          <option value="delivered">Livrées</option>
        </select>
        <button class="btn-primary" (click)="openForm()" *ngIf="auth.isPreSeller || auth.isAdmin">
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
            <button class="btn-icon" (click)="openAssign(o)" *ngIf="auth.isAdmin && o.status === 'pending'" title="Assigner">
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

    <!-- DRAWER NOUVELLE COMMANDE -->
    <app-drawer [open]="showForm" title="Nouvelle commande" [saving]="saving"
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
      [showFooter]="false" (closed)="showDetail=false">
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
      </div>
    </app-drawer>

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
    .item-title { font-size:14px; font-weight:500; color:#1e293b; }
    .item-sub { font-size:12px; color:#94a3b8; max-width:200px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .order-num { font-size:14px; font-weight:700; color:#1e293b; }
    .ttc-val { font-size:14px; font-weight:700; color:#1e293b; }
    .no-total { color:#94a3b8; font-size:13px; }
    .badge { padding:3px 10px; border-radius:20px; font-size:12px; font-weight:500; }
    .badge-pending { background:#fef3c7; color:#92400e; }
    .badge-assigned { background:#dbeafe; color:#1e40af; }
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
    .btn-add-line:hover { border-color:#3b82f6; color:#3b82f6; }
    .line-row { display:flex; gap:8px; align-items:flex-end; }
    .detail-row { display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid #f1f5f9; font-size:14px; }
    .detail-row span:first-child { color:#64748b; }
    .line-detail { display:grid; grid-template-columns:1fr auto auto auto; gap:10px; align-items:center; padding:10px 12px; background:#f8fafc; border-radius:8px; font-size:13px; }
    .line-detail-name { display:flex; flex-direction:column; }
    .ln-product { font-weight:600; color:#1e293b; }
    .ln-variant { font-size:11px; color:#64748b; }
    .ln-qty { color:#64748b; white-space:nowrap; }
    .ln-price { color:#64748b; white-space:nowrap; }
    .ln-total { font-weight:700; color:#2563eb; white-space:nowrap; text-align:right; }
    .totaux-block { background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:14px 16px; margin-top:16px; display:flex; flex-direction:column; gap:6px; }
    .tot-line { display:flex; justify-content:space-between; font-size:13px; color:#64748b; }
    .tot-line.grand { font-size:16px; font-weight:700; color:#1e293b; border-top:1px solid #e2e8f0; padding-top:8px; margin-top:4px; }
    .line-subtotal { font-size:13px; font-weight:600; color:#2563eb; white-space:nowrap; align-self:center; min-width:70px; text-align:right; }
    /* Form sections */
    .form-section { background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:14px 16px; margin-bottom:14px; display:flex; flex-direction:column; gap:12px; }
    .form-section-label { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:#64748b; }
    .radio-group { display:flex; gap:8px; }
    .radio-opt { display:flex; align-items:center; gap:6px; padding:8px 16px; border:1px solid #e2e8f0; border-radius:8px; cursor:pointer; font-size:13px; font-weight:500; background:#fff; }
    .radio-opt.sel { border-color:#3b82f6; background:#eaf1fe; color:#1d4ed8; }
    .radio-opt input { display:none; }
    /* Lignes articles */
    .line-cols-head { display:flex; align-items:center; gap:6px; font-size:11px; color:#94a3b8; font-weight:600; padding:0 2px 4px; }
    .line-card { background:#fff; border:1px solid #e2e8f0; border-radius:8px; padding:10px; display:flex; flex-direction:column; gap:8px; }
    .line-select { font-size:13px; }
    .line-nums { display:flex; align-items:center; gap:6px; }
    .num-input { width:56px; text-align:center; padding:7px 6px; }
    .price-input { width:80px; text-align:right; }
    .tva-select { width:62px; font-size:12px; padding:7px 4px; }
    .line-total-ht { width:80px; text-align:right; font-size:13px; font-weight:700; color:#2563eb; }
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
  cols = ['num', 'date_cmd', 'client', 'status', 'totaux', 'payment', 'driver', 'actions'];
  showForm = false;
  showDetail = false;
  showAssign = false;
  selectedOrder: any = null;
  saving = false;
  errorMsg = '';
  orderForm: any = { client_id: '', delivery_address: '', payment_status: 'unpaid', note: '' };
  orderLines: any[] = [];
  assignForm: any = { delivery_user_id: '' };

  constructor(private api: ApiService, public auth: AuthService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.load();
    this.api.get<any[]>('/clients').subscribe(c => { this.clients = [...c]; this.cdr.detectChanges(); });
    if (this.auth.isAdmin) {
      this.api.get<any[]>('/users').subscribe(u => { this.deliveryUsers = u.filter((x: any) => x.role === 'delivery'); this.cdr.detectChanges(); });
    }
    this.api.get<any[]>('/products').subscribe((products: any[]) => {
      this.allVariants = products.flatMap((p: any) =>
        (p.variants || []).filter((v: any) => v.is_active !== false).map((v: any) => ({ ...v, product_name: p.name, tva_rate: p.tva_rate ?? 20 }))
      );
      this.cdr.detectChanges();
    });
  }

  load() {
    const qs = this.statusFilter ? `?status=${this.statusFilter}` : '';
    this.api.get<any[]>(`/orders${qs}`).subscribe(o => { this.orders = [...o]; this.cdr.detectChanges(); });
  }

  get formHT()  { return parseFloat(this.orderLines.reduce((s, l) => s + (l.quantity || 0) * (l.unit_price || 0), 0).toFixed(2)); }
  get formTVA() { return parseFloat(this.orderLines.reduce((s, l) => s + (l.quantity || 0) * (l.unit_price || 0) * ((l.tva_rate ?? 20) / 100), 0).toFixed(2)); }
  get formTTC() { return parseFloat((this.formHT + this.formTVA).toFixed(2)); }

  openForm() {
    this.orderForm = { client_id: '', delivery_address: '', payment_status: 'unpaid', note: '' };
    this.orderLines = [{ variant_id: '', quantity: 1, unit_price: 0, tva_rate: 20 }];
    this.errorMsg = ''; this.showForm = true;
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
    this.api.post('/orders', { ...this.orderForm, lines: this.orderLines }).subscribe({
      next: () => { setTimeout(() => { this.saving = false; this.showForm = false; this.cdr.detectChanges(); this.load(); }); },
      error: (err) => { setTimeout(() => { this.saving = false; this.errorMsg = err.error?.message || 'Erreur'; this.cdr.detectChanges(); }); }
    });
  }

  openDetail(o: any) { this.selectedOrder = o; this.showDetail = true; }
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
