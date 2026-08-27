import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { DrawerComponent } from '../../shared/components/drawer/drawer.component';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';

type InvoiceTab = 'all' | 'sale' | 'purchase';

@Component({
  selector: 'app-invoices',
  standalone: true,
  imports: [CommonModule, FormsModule, MatTableModule, DrawerComponent],
  template: `
    <div class="page-header">
      <div>
        <h2>Factures</h2>
        <p class="page-subtitle">{{ invoices.length }} facture(s)</p>
      </div>
      <div style="position:relative;display:flex;gap:10px;align-items:center;flex-wrap:wrap" *ngIf="canWriteAny">
        <button class="btn-primary" (click)="openNewMenu = !openNewMenu">
          <span class="material-icons">add</span> Nouvelle facture
        </button>
        <div class="new-menu" *ngIf="openNewMenu">
          <button *ngIf="auth.isAdmin" (click)="openNewSale()">
            <span class="material-icons">sell</span> Vente
          </button>
          <button *ngIf="auth.isAdmin || auth.isStockManager" (click)="openNewPurchase()">
            <span class="material-icons">shopping_cart</span> Achat
          </button>
        </div>
      </div>
    </div>

    <!-- COMPTEURS -->
    <div class="summary-row" *ngIf="summary">
      <div class="summary-card">
        <div class="sc-label">Factures</div>
        <div class="sc-value">{{ summary.count }}</div>
      </div>
      <div class="summary-card">
        <div class="sc-label">Total ventes TTC</div>
        <div class="sc-value sc-sale">{{ summary.total_sales_ttc | number:'1.2-2' }} DH</div>
      </div>
      <div class="summary-card">
        <div class="sc-label">Total achats TTC</div>
        <div class="sc-value sc-purchase">{{ summary.total_purchases_ttc | number:'1.2-2' }} DH</div>
      </div>
    </div>

    <!-- ONGLETS + FILTRES -->
    <div class="filters-bar">
      <div class="period-tabs">
        <button class="ptab" [class.ptab-active]="tab === 'all'"      (click)="setTab('all')">Toutes</button>
        <button class="ptab" [class.ptab-active]="tab === 'sale'"     (click)="setTab('sale')">Ventes</button>
        <button class="ptab" [class.ptab-active]="tab === 'purchase'" (click)="setTab('purchase')">Achats</button>
      </div>
      <input class="field-input" style="width:200px" placeholder="Numéro, client, fournisseur…" [(ngModel)]="q" (ngModelChange)="load()" />
      <select class="field-select" style="width:150px" [(ngModel)]="statusFilter" (ngModelChange)="load()">
        <option value="">Tous les statuts</option>
        <option value="draft">Brouillon</option>
        <option value="issued">Émise</option>
      </select>
      <select class="field-select" style="width:160px" [(ngModel)]="sourceFilter" (ngModelChange)="load()">
        <option value="">Toutes origines</option>
        <option value="order">Depuis commande</option>
        <option value="arrivage">Depuis arrivage</option>
        <option value="direct">Directe</option>
      </select>
    </div>

    <div class="card">
      <table mat-table [dataSource]="invoices" class="full-width">
        <ng-container matColumnDef="num">
          <th mat-header-cell *matHeaderCellDef>N°</th>
          <td mat-cell *matCellDef="let i">
            <div class="order-num">{{ i.number || 'Brouillon' }}</div>
            <div class="item-sub">{{ typeLabel(i.type) }}</div>
          </td>
        </ng-container>
        <ng-container matColumnDef="date">
          <th mat-header-cell *matHeaderCellDef>Date</th>
          <td mat-cell *matCellDef="let i">
            <div class="item-title">{{ (i.issue_date || i.created_at) | date:'dd/MM/yyyy' }}</div>
          </td>
        </ng-container>
        <ng-container matColumnDef="party">
          <th mat-header-cell *matHeaderCellDef>Client / Fournisseur</th>
          <td mat-cell *matCellDef="let i">
            <div class="item-title">{{ i.client_name || i.fournisseur_name || '—' }}</div>
          </td>
        </ng-container>
        <ng-container matColumnDef="origin">
          <th mat-header-cell *matHeaderCellDef>Origine</th>
          <td mat-cell *matCellDef="let i">
            <span class="origin-tag">{{ originLabel(i) }}</span>
          </td>
        </ng-container>
        <ng-container matColumnDef="totaux">
          <th mat-header-cell *matHeaderCellDef>Total TTC</th>
          <td mat-cell *matCellDef="let i">
            <div class="ttc-val">{{ i.total_ttc | number:'1.2-2' }} DH</div>
            <div class="item-sub">HT : {{ i.subtotal_ht | number:'1.2-2' }} DH</div>
          </td>
        </ng-container>
        <ng-container matColumnDef="status">
          <th mat-header-cell *matHeaderCellDef>Statut</th>
          <td mat-cell *matCellDef="let i">
            <span class="badge" [class]="'badge-' + i.status">{{ i.status === 'issued' ? 'Émise' : 'Brouillon' }}</span>
          </td>
        </ng-container>
        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef></th>
          <td mat-cell *matCellDef="let i">
            <button class="btn-icon" (click)="openDetail(i)" title="Détail"><span class="material-icons">visibility</span></button>
          </td>
        </ng-container>
        <tr mat-header-row *matHeaderRowDef="cols"></tr>
        <tr mat-row *matRowDef="let r; columns: cols" class="table-row"></tr>
      </table>
      <div *ngIf="!invoices.length" class="empty-state">
        <span class="material-icons">receipt_long</span>
        <p>Aucune facture</p>
      </div>
    </div>

    <!-- DRAWER NOUVELLE FACTURE -->
    <app-drawer [open]="showForm" [title]="formTitle" [saving]="saving"
      (closed)="showForm=false" (saved)="saveInvoice()">

      <div class="form-section" *ngIf="formType === 'sale'">
        <div class="form-section-label">Origine</div>
        <div class="radio-group">
          <label class="radio-opt" [class.sel]="formSourceType==='direct'">
            <input type="radio" [(ngModel)]="formSourceType" value="direct" (ngModelChange)="onSourceTypeChange()" /> Directe
          </label>
          <label class="radio-opt" [class.sel]="formSourceType==='order'">
            <input type="radio" [(ngModel)]="formSourceType" value="order" (ngModelChange)="onSourceTypeChange()" /> Depuis commande livrée
          </label>
        </div>
        <div class="field-group" *ngIf="formSourceType === 'order'">
          <label>Commande livrée non facturée <span class="req">*</span></label>
          <select class="field-select" [(ngModel)]="selectedOrderId" (ngModelChange)="onOrderSelected()">
            <option value="">— Sélectionner —</option>
            <option *ngFor="let o of deliveredOrders" [value]="o.id">#{{ o.order_number }} — {{ o.client_name }}</option>
          </select>
        </div>
      </div>

      <div class="form-section" *ngIf="formType === 'purchase'">
        <div class="form-section-label">Origine</div>
        <div class="radio-group">
          <label class="radio-opt" [class.sel]="formSourceType==='direct'">
            <input type="radio" [(ngModel)]="formSourceType" value="direct" (ngModelChange)="onSourceTypeChange()" /> Directe
          </label>
          <label class="radio-opt" [class.sel]="formSourceType==='arrivage'">
            <input type="radio" [(ngModel)]="formSourceType" value="arrivage" (ngModelChange)="onSourceTypeChange()" /> Depuis arrivage
          </label>
        </div>
        <div class="field-group" *ngIf="formSourceType === 'arrivage'">
          <label>Arrivage <span class="req">*</span></label>
          <select class="field-select" [(ngModel)]="selectedArrivageId" (ngModelChange)="onArrivageSelected()">
            <option value="">— Sélectionner —</option>
            <option *ngFor="let a of arrivages" [value]="a.id">{{ a.bl || ('Arrivage ' + (a.arrivage_date | date:'dd/MM/yyyy')) }} — {{ a.fournisseur_name }}</option>
          </select>
        </div>
        <div class="field-group">
          <label>N° facture fournisseur</label>
          <input class="field-input" [(ngModel)]="invoiceForm.supplier_invoice_number" placeholder="Ex : FA-2026-118" />
        </div>
      </div>

      <div class="form-section">
        <div class="form-section-label">{{ formType === 'sale' ? 'Client' : 'Fournisseur' }}</div>
        <div class="field-group">
          <select class="field-select" [(ngModel)]="invoiceForm.client_id" *ngIf="formType === 'sale'" [disabled]="formSourceType === 'order'">
            <option value="">— Sélectionner un client —</option>
            <option *ngFor="let c of clients" [value]="c.id">{{ c.name }}</option>
          </select>
          <select class="field-select" [(ngModel)]="invoiceForm.fournisseur_id" *ngIf="formType === 'purchase'" [disabled]="formSourceType === 'arrivage'">
            <option value="">— Sélectionner un fournisseur —</option>
            <option *ngFor="let f of fournisseurs" [value]="f.id">{{ f.nom }}</option>
          </select>
        </div>
      </div>

      <!-- Articles -->
      <div class="form-section">
        <div class="form-section-label" style="display:flex;justify-content:space-between;align-items:center">
          <span>Lignes <span class="req">*</span></span>
          <button class="btn-add-line" (click)="addLine()" *ngIf="formSourceType === 'direct'">
            <span class="material-icons" style="font-size:14px">add</span> Ajouter
          </button>
        </div>

        <div class="line-cols-head">
          <span style="flex:1">Désignation</span>
          <span style="width:56px;text-align:center">Qté</span>
          <span style="width:80px;text-align:right">P.U. TTC</span>
          <span style="width:52px;text-align:center">TVA</span>
          <span style="width:24px"></span>
        </div>

        <div *ngFor="let line of invoiceLines; let i=index" class="line-card">
          <select class="field-select line-select" [(ngModel)]="line.variant_id" (ngModelChange)="setLinePrice(line)" *ngIf="formSourceType === 'direct'">
            <option value="">— Produit —</option>
            <option *ngFor="let v of allVariants" [value]="v.id">{{ v.product_name }} — {{ v.name }}</option>
          </select>
          <input class="field-input line-select" *ngIf="formSourceType !== 'direct'" [value]="line.description_snapshot" disabled />
          <div class="line-nums">
            <input class="field-input num-input" type="number" [(ngModel)]="line.quantity" min="1" placeholder="1" />
            <input class="field-input num-input price-input" type="number" [(ngModel)]="line.unit_price_ttc" placeholder="0.00" step="0.01" />
            <select class="field-select tva-select" [(ngModel)]="line.tax_rate">
              <option [value]="0">0%</option>
              <option [value]="7">7%</option>
              <option [value]="10">10%</option>
              <option [value]="14">14%</option>
              <option [value]="20">20%</option>
            </select>
            <button class="btn-del-line" (click)="removeLine(i)" title="Supprimer" *ngIf="formSourceType === 'direct'">
              <span class="material-icons">close</span>
            </button>
          </div>
        </div>

        <div class="empty-lines" *ngIf="!invoiceLines.length">Aucune ligne — cliquez sur Ajouter</div>
      </div>

      <div class="totaux-recap" *ngIf="formTTC > 0">
        <div class="tr-row"><span>Total HT</span><b>{{ formHT | number:'1.2-2' }} DH</b></div>
        <div class="tr-row"><span>TVA</span><b>{{ formTVA | number:'1.2-2' }} DH</b></div>
        <div class="tr-row grand"><span>Total TTC</span><b>{{ formTTC | number:'1.2-2' }} DH</b></div>
      </div>

      <div class="field-group">
        <label>Notes</label>
        <textarea class="field-textarea" rows="2" [(ngModel)]="invoiceForm.notes"></textarea>
      </div>

      <div *ngIf="errorMsg" class="error-banner">
        <span class="material-icons">error_outline</span> {{ errorMsg }}
      </div>
    </app-drawer>

    <!-- DRAWER DETAIL -->
    <app-drawer [open]="showDetail"
      [title]="(selectedInvoice?.number || 'Brouillon') + ' — ' + (selectedInvoice?.client_name || selectedInvoice?.fournisseur_name || '')"
      [showFooter]="selectedInvoice?.status === 'draft' && canWrite(selectedInvoice)"
      saveLabel="Émettre" [saving]="issuing"
      (closed)="showDetail=false" (saved)="doIssue()">
      <div *ngIf="selectedInvoice">
        <div class="detail-row"><span>Numéro</span><b>{{ selectedInvoice.number || 'Brouillon' }}</b></div>
        <div class="detail-row"><span>Type</span><span>{{ typeLabel(selectedInvoice.type) }}</span></div>
        <div class="detail-row"><span>Origine</span><span>{{ originLabel(selectedInvoice) }}</span></div>
        <div class="detail-row"><span>Date</span><span>{{ (selectedInvoice.issue_date || selectedInvoice.created_at) | date:'dd/MM/yyyy' }}</span></div>
        <div class="detail-row"><span>Statut</span><span class="badge" [class]="'badge-' + selectedInvoice.status">{{ selectedInvoice.status === 'issued' ? 'Émise' : 'Brouillon' }}</span></div>
        <div class="detail-row"><span>{{ selectedInvoice.type === 'sale' ? 'Client' : 'Fournisseur' }}</span><span>{{ selectedInvoice.client_name || selectedInvoice.fournisseur_name || '—' }}</span></div>
        <div class="detail-row" *ngIf="selectedInvoice.supplier_invoice_number"><span>N° facture fournisseur</span><span>{{ selectedInvoice.supplier_invoice_number }}</span></div>

        <div class="lines-section" style="margin-top:20px">
          <div class="lines-header"><label>Lignes</label></div>
          <div *ngFor="let l of selectedInvoice.lines" class="line-detail">
            <div class="line-detail-name">
              <span class="ln-product">{{ l.description_snapshot }}</span>
            </div>
            <span class="ln-qty">× {{ l.quantity }}</span>
            <span class="ln-price">{{ l.unit_price_ttc | number:'1.2-2' }} DH</span>
            <span class="ln-total">{{ l.line_ttc | number:'1.2-2' }} DH</span>
          </div>
        </div>

        <div class="totaux-block">
          <div class="tot-line"><span>Total HT</span><span>{{ selectedInvoice.subtotal_ht | number:'1.2-2' }} DH</span></div>
          <div class="tot-line"><span>TVA</span><span>{{ selectedInvoice.tax_total | number:'1.2-2' }} DH</span></div>
          <div class="tot-line grand"><span>Total TTC</span><span>{{ selectedInvoice.total_ttc | number:'1.2-2' }} DH</span></div>
        </div>

        <div class="pdf-actions">
          <div class="pdf-title">Document</div>
          <div class="pdf-btns">
            <button class="pdf-btn pdf-btn-facture" (click)="viewPdf()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              Voir le PDF
            </button>
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
  `,
  styles: [`
    .period-tabs { display:flex;gap:4px;background:#f0f2f6;border-radius:10px;padding:3px }
    .ptab { padding:6px 13px;border:none;border-radius:8px;background:transparent;font-size:12.5px;font-weight:600;color:#64748b;cursor:pointer;transition:.13s;white-space:nowrap }
    .ptab:hover { color:#1e293b }
    .ptab-active { background:#fff;color:#FF3532;box-shadow:0 1px 3px rgba(16,24,40,.1) }
    .filters-bar { display:flex; gap:10px; align-items:center; flex-wrap:wrap; margin-bottom:14px; }
    .item-title { font-size:14px; font-weight:500; color:#1e293b; }
    .item-sub { font-size:12px; color:#94a3b8; }
    .order-num { font-size:14px; font-weight:700; color:#1e293b; }
    .ttc-val { font-size:14px; font-weight:700; color:#1e293b; }
    .origin-tag { font-size:12px; color:#475569; background:#f1f5f9; padding:3px 9px; border-radius:20px; }
    .badge { padding:3px 10px; border-radius:20px; font-size:12px; font-weight:500; }
    .badge-draft { background:#fef3c7; color:#92400e; }
    .badge-issued { background:#dcfce7; color:#166534; }
    .empty-state { padding:48px; text-align:center; color:#94a3b8; }
    .empty-state .material-icons { font-size:48px; display:block; margin-bottom:8px; }
    .req { color:#ef4444; }
    /* Compteurs */
    .summary-row { display:flex; gap:14px; margin-bottom:18px; flex-wrap:wrap; }
    .summary-card { flex:1; min-width:160px; background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:16px 18px; }
    .sc-label { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:#94a3b8; margin-bottom:6px; }
    .sc-value { font-size:22px; font-weight:700; color:#1e293b; }
    .sc-sale { color:#16a34a; }
    .sc-purchase { color:#0369a1; }
    /* Menu nouvelle facture */
    .new-menu { position:absolute; top:42px; right:0; background:#fff; border:1px solid #e2e8f0; border-radius:10px; box-shadow:0 8px 24px rgba(16,24,40,.12); overflow:hidden; z-index:50; display:flex; flex-direction:column; min-width:160px; }
    .new-menu button { display:flex; align-items:center; gap:8px; padding:11px 16px; border:none; background:none; text-align:left; font-size:13.5px; font-weight:500; color:#1e293b; cursor:pointer; }
    .new-menu button:hover { background:#f8fafc; }
    /* Form */
    .form-section { background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:14px 16px; margin-bottom:14px; display:flex; flex-direction:column; gap:12px; }
    .form-section-label { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:#64748b; }
    .radio-group { display:flex; gap:8px; }
    .radio-opt { display:flex; align-items:center; gap:6px; padding:8px 16px; border:1px solid #e2e8f0; border-radius:8px; cursor:pointer; font-size:13px; font-weight:500; background:#fff; }
    .radio-opt.sel { border-color:#FF3532; background:#FFF1EF; color:#E0231F; }
    .radio-opt input { display:none; }
    .line-cols-head { display:flex; align-items:center; gap:6px; font-size:11px; color:#94a3b8; font-weight:600; padding:0 2px 4px; }
    .line-card { background:#fff; border:1px solid #e2e8f0; border-radius:8px; padding:10px; display:flex; flex-direction:column; gap:8px; }
    .line-select { font-size:13px; }
    .line-nums { display:flex; align-items:center; gap:6px; }
    .num-input { width:56px; text-align:center; padding:7px 6px; }
    .price-input { width:80px; text-align:right; }
    .tva-select { width:62px; font-size:12px; padding:7px 4px; }
    .btn-add-line { display:flex; align-items:center; gap:4px; padding:5px 10px; border:1px dashed #cbd5e1; border-radius:6px; background:transparent; cursor:pointer; font-size:12px; color:#64748b; }
    .btn-add-line:hover { border-color:#FF3532; color:#FF3532; }
    .btn-del-line { width:24px; height:24px; border:none; background:none; cursor:pointer; color:#94a3b8; display:flex; align-items:center; justify-content:center; border-radius:4px; }
    .btn-del-line:hover { background:#fee2e2; color:#ef4444; }
    .btn-del-line .material-icons { font-size:16px; }
    .empty-lines { text-align:center; font-size:13px; color:#94a3b8; padding:16px 0; }
    .totaux-recap { background:#1e293b; border-radius:10px; padding:14px 18px; display:flex; flex-direction:column; gap:6px; margin-bottom:12px; }
    .tr-row { display:flex; justify-content:space-between; font-size:13px; color:#94a3b8; }
    .tr-row b { color:#e2e8f0; }
    .tr-row.grand { font-size:16px; color:#fff; border-top:1px solid rgba(255,255,255,.1); padding-top:8px; margin-top:4px; }
    .tr-row.grand b { color:#60a5fa; font-size:18px; }
    /* Detail */
    .detail-row { display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid #f1f5f9; font-size:14px; }
    .detail-row span:first-child { color:#64748b; }
    .lines-section { display:flex; flex-direction:column; gap:8px; }
    .lines-header { display:flex; justify-content:space-between; align-items:center; }
    .line-detail { display:grid; grid-template-columns:1fr auto auto auto; gap:10px; align-items:center; padding:10px 12px; background:#f8fafc; border-radius:8px; font-size:13px; }
    .line-detail-name { display:flex; flex-direction:column; }
    .ln-product { font-weight:600; color:#1e293b; }
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
    .pdf-btn svg { width:15px; height:15px; }
    .pdf-btn-facture { border-color:#16a34a; color:#16a34a; }
    .pdf-btn-facture:hover { background:#f0fdf4; border-color:#15803d; color:#15803d; }
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
  `]
})
export class InvoicesComponent implements OnInit {
  invoices: any[] = [];
  summary: any = null;
  clients: any[] = [];
  fournisseurs: any[] = [];
  allVariants: any[] = [];
  deliveredOrders: any[] = [];
  arrivages: any[] = [];

  tab: InvoiceTab = 'all';
  q = '';
  statusFilter = '';
  sourceFilter = '';
  cols = ['num', 'date', 'party', 'origin', 'totaux', 'status', 'actions'];

  openNewMenu = false;
  showForm = false;
  showDetail = false;
  saving = false;
  issuing = false;
  errorMsg = '';

  formType: 'sale' | 'purchase' = 'sale';
  formSourceType: 'direct' | 'order' | 'arrivage' = 'direct';
  selectedOrderId = '';
  selectedArrivageId = '';
  invoiceForm: any = { client_id: '', fournisseur_id: '', supplier_invoice_number: '', notes: '' };
  invoiceLines: any[] = [];

  selectedInvoice: any = null;
  pdfViewerUrl: SafeResourceUrl | null = null;
  pdfViewerTitle = '';

  constructor(private api: ApiService, public auth: AuthService, private cdr: ChangeDetectorRef, private sanitizer: DomSanitizer) {}

  ngOnInit() {
    this.load();
    this.loadSummary();
    this.api.get<any[]>('/clients').subscribe(c => { this.clients = [...c]; this.cdr.detectChanges(); });
    this.api.get<any[]>('/fournisseurs').subscribe(f => { this.fournisseurs = [...f]; this.cdr.detectChanges(); });
    this.api.get<any[]>('/products').subscribe((products: any[]) => {
      this.allVariants = products.flatMap((p: any) =>
        (p.variants || []).filter((v: any) => v.is_active !== false).map((v: any) => ({ ...v, product_name: p.name, tva_rate: p.tva_rate ?? 20 }))
      );
      this.cdr.detectChanges();
    });
  }

  get canWriteAny(): boolean { return this.auth.isAdmin || this.auth.isStockManager; }
  canWrite(invoice: any): boolean {
    if (!invoice) return false;
    if (this.auth.isAdmin) return true;
    return this.auth.isStockManager && invoice.type === 'purchase';
  }

  setTab(t: InvoiceTab) { this.tab = t; this.load(); }

  load() {
    const params: string[] = [];
    if (this.tab !== 'all') params.push(`type=${this.tab}`);
    if (this.statusFilter) params.push(`status=${this.statusFilter}`);
    if (this.sourceFilter) params.push(`source_type=${this.sourceFilter}`);
    if (this.q) params.push(`q=${encodeURIComponent(this.q)}`);
    const qs = params.length ? `?${params.join('&')}` : '';
    this.api.get<any[]>(`/invoices${qs}`).subscribe(rows => { this.invoices = [...rows]; this.cdr.detectChanges(); });
  }

  loadSummary() {
    this.api.get<any>('/invoices/summary').subscribe(s => { this.summary = s; this.cdr.detectChanges(); });
  }

  typeLabel(t: string): string { return t === 'sale' ? 'Vente' : 'Achat'; }
  originLabel(i: any): string {
    if (i.source_type === 'order') return `Commande #${i.order_number || ''}`;
    if (i.source_type === 'arrivage') return i.arrivage_bl ? `Arrivage ${i.arrivage_bl}` : 'Arrivage';
    return 'Directe';
  }

  // ── Nouvelle facture ────────────────────────────────────────────
  openNewSale() {
    this.openNewMenu = false;
    this.formType = 'sale';
    this.formSourceType = 'direct';
    this.selectedOrderId = '';
    this.invoiceForm = { client_id: '', supplier_invoice_number: '', notes: '' };
    this.invoiceLines = [{ variant_id: '', quantity: 1, unit_price_ttc: 0, tax_rate: 20 }];
    this.errorMsg = '';
    this.api.get<any[]>('/orders?status=delivered').subscribe(orders => {
      this.deliveredOrders = orders.filter((o: any) => !o.facture_num);
      this.cdr.detectChanges();
    });
    this.showForm = true;
  }

  openNewPurchase() {
    this.openNewMenu = false;
    this.formType = 'purchase';
    this.formSourceType = 'direct';
    this.selectedArrivageId = '';
    this.invoiceForm = { fournisseur_id: '', supplier_invoice_number: '', notes: '' };
    this.invoiceLines = [{ variant_id: '', quantity: 1, unit_price_ttc: 0, tax_rate: 20 }];
    this.errorMsg = '';
    this.api.get<any[]>('/stock/arrivages').subscribe(arr => { this.arrivages = arr; this.cdr.detectChanges(); });
    this.showForm = true;
  }

  get formTitle(): string {
    return this.formType === 'sale' ? 'Nouvelle facture de vente' : 'Nouvelle facture d\'achat';
  }

  onSourceTypeChange() {
    this.selectedOrderId = '';
    this.selectedArrivageId = '';
    this.invoiceLines = [{ variant_id: '', quantity: 1, unit_price_ttc: 0, tax_rate: 20 }];
    if (this.formType === 'sale') this.invoiceForm.client_id = '';
    else this.invoiceForm.fournisseur_id = '';
  }

  onOrderSelected() {
    const o = this.deliveredOrders.find(x => x.id === this.selectedOrderId);
    if (!o) return;
    this.invoiceForm.client_id = o.client_id;
    this.invoiceLines = (o.lines || []).filter((l: any) => l?.variant_id).map((l: any) => ({
      variant_id: l.variant_id,
      description_snapshot: `${l.product_name || ''}${l.variant_name ? ' - ' + l.variant_name : ''}`,
      quantity: l.quantity, unit_price_ttc: l.unit_price, tax_rate: l.tva_rate ?? 20,
    }));
  }

  onArrivageSelected() {
    const a = this.arrivages.find(x => x.id === this.selectedArrivageId);
    if (!a) return;
    this.invoiceForm.fournisseur_id = a.fournisseur_id;
    this.invoiceLines = (a.lines || []).filter((l: any) => l?.variant_id).map((l: any) => ({
      variant_id: l.variant_id,
      description_snapshot: `${l.product_name || ''}${l.variant_name ? ' - ' + l.variant_name : ''}`,
      quantity: l.quantite ?? l.quantity, unit_price_ttc: l.prix_unitaire ?? l.unit_price, tax_rate: 20,
    }));
  }

  get formHT()  { return parseFloat(this.invoiceLines.reduce((s, l) => s + ((l.quantity || 0) * (l.unit_price_ttc || 0)) / (1 + (l.tax_rate ?? 20) / 100), 0).toFixed(2)); }
  get formTTC() { return parseFloat(this.invoiceLines.reduce((s, l) => s + (l.quantity || 0) * (l.unit_price_ttc || 0), 0).toFixed(2)); }
  get formTVA() { return parseFloat((this.formTTC - this.formHT).toFixed(2)); }

  addLine() { this.invoiceLines.push({ variant_id: '', quantity: 1, unit_price_ttc: 0, tax_rate: 20 }); }
  removeLine(i: number) { this.invoiceLines.splice(i, 1); }
  setLinePrice(line: any) {
    const v = this.allVariants.find(x => x.id === line.variant_id);
    if (v) {
      line.description_snapshot = `${v.product_name} - ${v.name}`;
      line.unit_price_ttc = v.price;
      line.tax_rate = v.tva_rate ?? 20;
    }
  }

  saveInvoice() {
    if (this.formType === 'sale' && this.formSourceType === 'order' && !this.selectedOrderId) {
      this.errorMsg = 'Sélectionnez une commande'; return;
    }
    if (this.formType === 'purchase' && this.formSourceType === 'arrivage' && !this.selectedArrivageId) {
      this.errorMsg = 'Sélectionnez un arrivage'; return;
    }
    if (this.formType === 'sale' && this.formSourceType === 'direct' && !this.invoiceForm.client_id) {
      this.errorMsg = 'Sélectionnez un client'; return;
    }
    if (this.formType === 'purchase' && this.formSourceType === 'direct' && !this.invoiceForm.fournisseur_id) {
      this.errorMsg = 'Sélectionnez un fournisseur'; return;
    }
    if (!this.invoiceLines.length || (this.formSourceType === 'direct' && !this.invoiceLines[0].variant_id)) {
      this.errorMsg = 'Ajoutez au moins une ligne'; return;
    }

    const lines = this.invoiceLines.map(l => ({
      variant_id: l.variant_id || null,
      description_snapshot: l.description_snapshot,
      quantity: l.quantity, unit_price_ttc: l.unit_price_ttc, tax_rate: l.tax_rate,
    }));

    let req$;
    if (this.formType === 'sale' && this.formSourceType === 'order') {
      req$ = this.api.post(`/invoices/sales/from-order/${this.selectedOrderId}`, { ...this.invoiceForm, lines });
    } else if (this.formType === 'sale') {
      req$ = this.api.post('/invoices/sales', { ...this.invoiceForm, lines });
    } else if (this.formType === 'purchase' && this.formSourceType === 'arrivage') {
      req$ = this.api.post(`/invoices/purchases/from-arrivage/${this.selectedArrivageId}`, { ...this.invoiceForm, lines });
    } else {
      req$ = this.api.post('/invoices/purchases', { ...this.invoiceForm, lines });
    }

    setTimeout(() => { this.saving = true; this.cdr.detectChanges(); });
    req$.subscribe({
      next: () => { setTimeout(() => { this.saving = false; this.showForm = false; this.cdr.detectChanges(); this.load(); this.loadSummary(); }); },
      error: (err: any) => { setTimeout(() => { this.saving = false; this.errorMsg = err.error?.message || 'Erreur'; this.cdr.detectChanges(); }); }
    });
  }

  // ── Détail / émission / PDF ─────────────────────────────────────
  openDetail(i: any) {
    this.api.get<any>(`/invoices/${i.id}`).subscribe(full => {
      this.selectedInvoice = full;
      this.showDetail = true;
      this.cdr.detectChanges();
    });
  }

  doIssue() {
    if (!this.selectedInvoice) return;
    setTimeout(() => { this.issuing = true; this.cdr.detectChanges(); });
    this.api.post(`/invoices/${this.selectedInvoice.id}/issue`, {}).subscribe({
      next: (updated: any) => { setTimeout(() => { this.issuing = false; this.selectedInvoice = updated; this.cdr.detectChanges(); this.load(); this.loadSummary(); }); },
      error: (err: any) => { setTimeout(() => { this.issuing = false; this.errorMsg = err.error?.message || 'Erreur'; this.cdr.detectChanges(); }); }
    });
  }

  viewPdf() {
    if (!this.selectedInvoice) return;
    const token = localStorage.getItem('token');
    const base = environment.apiUrl.replace('/api', '');
    this.pdfViewerTitle = `Facture — ${this.selectedInvoice.number || 'brouillon'}`;
    const url = `${base}/api/invoices/${this.selectedInvoice.id}/pdf?token=${token}`;
    this.pdfViewerUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    this.cdr.detectChanges();
  }

  closePdfViewer() { this.pdfViewerUrl = null; this.cdr.detectChanges(); }
}
