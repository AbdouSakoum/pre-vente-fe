import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { DrawerComponent } from '../../shared/components/drawer/drawer.component';
import { ApiService } from '../../services/api.service';
import { environment } from '../../../environments/environment';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-stock',
  standalone: true,
  imports: [CommonModule, FormsModule, MatTableModule, MatTabsModule, DrawerComponent],
  template: `
    <!-- PAGE HEADER -->
    <div class="page-header">
      <div>
        <h2>Gestion des Stocks</h2>
        <p class="page-sub">Entrepôt, arrivages, charges livreurs et mouvements</p>
      </div>
      <div style="display:flex;gap:10px">
        <button class="btn-ghost" (click)="openFournisseurDrawer()">
          <span class="material-icons">business</span> Fournisseurs
        </button>
        <button class="btn-primary" (click)="openArrivalDrawer()">
          <span class="material-icons">add_box</span> Nouvel arrivage
        </button>
      </div>
    </div>

    <!-- KPIs -->
    <div class="kpi-row">
      <div class="kpi-card kpi-blue">
        <span class="material-icons">inventory_2</span>
        <div>
          <div class="kpi-val">{{ fmtDH(kpiValeur) }}</div>
          <div class="kpi-lbl">Valeur du stock</div>
        </div>
      </div>
      <div class="kpi-card kpi-teal">
        <span class="material-icons">label</span>
        <div>
          <div class="kpi-val">{{ warehouseStock.length }}</div>
          <div class="kpi-lbl">Références</div>
        </div>
      </div>
      <div class="kpi-card kpi-amber">
        <span class="material-icons">warning</span>
        <div>
          <div class="kpi-val">{{ kpiAlertes }}</div>
          <div class="kpi-lbl">Alertes stock bas</div>
        </div>
      </div>
      <div class="kpi-card kpi-purple">
        <span class="material-icons">local_shipping</span>
        <div>
          <div class="kpi-val">{{ kpiChargesEnCours }}</div>
          <div class="kpi-lbl">Charges en cours</div>
        </div>
      </div>
    </div>

    <!-- TABS -->
    <mat-tab-group (selectedTabChange)="onTabChange($event)">

      <!-- ===== ENTREPÔT ===== -->
      <mat-tab>
        <ng-template mat-tab-label>
          <span class="material-icons tab-icon">warehouse</span> Entrepôt
        </ng-template>
        <div class="tab-body">
          <div class="toolbar-row">
            <div class="search-box">
              <span class="material-icons">search</span>
              <input placeholder="Produit, SKU…" [(ngModel)]="searchQuery" (ngModelChange)="applyFilter()" />
            </div>
            <div class="seg-ctrl">
              <button [class.active]="stockFilter==='all'" (click)="setFilter('all')">Tous</button>
              <button [class.active]="stockFilter==='low'" (click)="setFilter('low')">Stock bas</button>
              <button [class.active]="stockFilter==='out'" (click)="setFilter('out')">Rupture</button>
            </div>
          </div>
          <div class="card">
            <table mat-table [dataSource]="filteredStock" class="full-width">
              <ng-container matColumnDef="product">
                <th mat-header-cell *matHeaderCellDef>Produit</th>
                <td mat-cell *matCellDef="let s">
                  <div class="item-title">{{ s.product_name }}</div>
                  <div class="item-sub">{{ s.variant_name }}</div>
                </td>
              </ng-container>
              <ng-container matColumnDef="sku">
                <th mat-header-cell *matHeaderCellDef>SKU</th>
                <td mat-cell *matCellDef="let s"><span class="sku">{{ s.sku || '—' }}</span></td>
              </ng-container>
              <ng-container matColumnDef="qty">
                <th mat-header-cell *matHeaderCellDef>Stock</th>
                <td mat-cell *matCellDef="let s">
                  <div class="qty-wrap">
                    <span class="qty-val">{{ fmt(s.quantity) }}</span>
                    <div class="bar-wrap"><div class="bar-fill" [style.width.%]="barPct(s)" [class]="barClass(s)"></div></div>
                  </div>
                </td>
              </ng-container>
              <ng-container matColumnDef="seuil">
                <th mat-header-cell *matHeaderCellDef>Seuil</th>
                <td mat-cell *matCellDef="let s">{{ s.seuil_alerte || 0 }}</td>
              </ng-container>
              <ng-container matColumnDef="statut">
                <th mat-header-cell *matHeaderCellDef>Statut</th>
                <td mat-cell *matCellDef="let s">
                  <span class="badge" [class]="statusClass(s)">{{ statusLabel(s) }}</span>
                </td>
              </ng-container>
              <ng-container matColumnDef="valeur">
                <th mat-header-cell *matHeaderCellDef style="text-align:right">Valeur</th>
                <td mat-cell *matCellDef="let s" style="text-align:right">{{ fmtDH(s.quantity * variantPrice(s.variant_id)) }}</td>
              </ng-container>
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef></th>
                <td mat-cell *matCellDef="let s">
                  <button class="btn-row" (click)="openAdjustDrawer(s)">
                    <span class="material-icons">tune</span> Ajuster
                  </button>
                </td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="colsStock"></tr>
              <tr mat-row *matRowDef="let r; columns: colsStock" class="table-row"></tr>
            </table>
            <div *ngIf="!filteredStock.length" class="empty-state">
              <span class="material-icons">inventory</span><p>Aucun produit</p>
            </div>
          </div>
        </div>
      </mat-tab>

      <!-- ===== ARRIVAGES ===== -->
      <mat-tab>
        <ng-template mat-tab-label>
          <span class="material-icons tab-icon">move_to_inbox</span> Arrivages
        </ng-template>
        <div class="tab-body">
          <div class="card">
            <table mat-table [dataSource]="arrivages" class="full-width">
              <ng-container matColumnDef="bl">
                <th mat-header-cell *matHeaderCellDef>Bon de livraison</th>
                <td mat-cell *matCellDef="let a">
                  <div class="item-title">{{ a.bl || 'Sans BL' }}</div>
                  <div class="item-sub">{{ fmtDate(a.arrivage_date) }}</div>
                </td>
              </ng-container>
              <ng-container matColumnDef="fournisseur">
                <th mat-header-cell *matHeaderCellDef>Fournisseur</th>
                <td mat-cell *matCellDef="let a">{{ a.fournisseur_nom || '—' }}</td>
              </ng-container>
              <ng-container matColumnDef="contenu">
                <th mat-header-cell *matHeaderCellDef>Contenu</th>
                <td mat-cell *matCellDef="let a">{{ (a.lines||[]).length }} réf. · {{ fmt(totalQtyArrivage(a)) }} u.</td>
              </ng-container>
              <ng-container matColumnDef="statut">
                <th mat-header-cell *matHeaderCellDef>Statut</th>
                <td mat-cell *matCellDef="let a"><span class="badge badge-green">Reçu</span></td>
              </ng-container>
              <ng-container matColumnDef="valeur">
                <th mat-header-cell *matHeaderCellDef style="text-align:right">Valeur</th>
                <td mat-cell *matCellDef="let a" style="text-align:right">{{ fmtDH(totalValArrivage(a)) }}</td>
              </ng-container>
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef></th>
                <td mat-cell *matCellDef="let a">
                  <button class="btn-row" (click)="openArrivageDetail(a)">
                    <span class="material-icons">visibility</span> Détail
                  </button>
                </td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="colsArrivages"></tr>
              <tr mat-row *matRowDef="let r; columns: colsArrivages" class="table-row"></tr>
            </table>
            <div *ngIf="!arrivages.length" class="empty-state">
              <span class="material-icons">move_to_inbox</span><p>Aucun arrivage</p>
            </div>
          </div>
        </div>
      </mat-tab>

      <!-- ===== CHARGES LIVREURS ===== -->
      <mat-tab>
        <ng-template mat-tab-label>
          <span class="material-icons tab-icon">local_shipping</span> Charges livreurs
          <span class="tab-count" *ngIf="kpiChargesEnCours > 0">{{ kpiChargesEnCours }}</span>
        </ng-template>
        <div class="tab-body">
          <div style="display:flex;justify-content:flex-end;margin-bottom:14px">
            <button class="btn-primary" (click)="openChargeDrawer()" [disabled]="deliveryUsers.length===0">
              <span class="material-icons">add</span> Nouvelle charge
            </button>
          </div>
          <div *ngIf="deliveryUsers.length===0" class="info-banner">
            <span class="material-icons">info</span>
            Aucun livreur actif. Créez d'abord un utilisateur avec le rôle "delivery".
          </div>
          <div class="charge-grid">
            <div class="charge-card" *ngFor="let c of charges">
              <div class="charge-head">
                <div>
                  <div class="item-title">{{ c.livreur_name }}</div>
                  <div class="item-sub">{{ fmtDate(c.charge_date) }}</div>
                </div>
                <span class="badge" [class]="chargeClass(c.statut)">{{ chargeLabel(c.statut) }}</span>
              </div>
              <div class="charge-stats">
                <div class="cstat"><div class="cstat-val">{{ chargeTotal(c) }}</div><div class="cstat-lbl">Chargé</div></div>
                <div class="cstat"><div class="cstat-val text-green">{{ chargeSold(c) }}</div><div class="cstat-lbl">Vendu</div></div>
                <div class="cstat"><div class="cstat-val" [class.text-red]="chargeManquant(c)>0">{{ chargeManquant(c) }}</div><div class="cstat-lbl">Manquant</div></div>
              </div>
              <div class="charge-foot">
                <button class="btn-primary" style="width:100%" *ngIf="c.statut!=='cloture'" (click)="openCloseDrawer(c)">
                  {{ c.statut==='a_regler' ? 'Régler' : 'Clôturer' }}
                </button>
                <button class="btn-ghost" style="width:100%" *ngIf="c.statut==='cloture'" (click)="openCloseDrawer(c, true)">
                  Voir détail
                </button>
              </div>
            </div>
          </div>
          <div *ngIf="!charges.length" class="empty-state">
            <span class="material-icons">local_shipping</span><p>Aucune charge</p>
          </div>
        </div>
      </mat-tab>

      <!-- ===== RETOURS ===== -->
      <mat-tab>
        <ng-template mat-tab-label>
          <span class="material-icons tab-icon">keyboard_return</span> Retours
        </ng-template>
        <div class="tab-body">
          <div class="card">
            <table mat-table [dataSource]="retours" class="full-width">
              <ng-container matColumnDef="date">
                <th mat-header-cell *matHeaderCellDef>Date</th>
                <td mat-cell *matCellDef="let m">{{ m.created_at | date:'dd/MM/yy HH:mm' }}</td>
              </ng-container>
              <ng-container matColumnDef="product">
                <th mat-header-cell *matHeaderCellDef>Produit</th>
                <td mat-cell *matCellDef="let m">
                  <div class="item-title">{{ m.product_name }}</div>
                  <div class="item-sub">{{ m.variant_name }}</div>
                </td>
              </ng-container>
              <ng-container matColumnDef="ref">
                <th mat-header-cell *matHeaderCellDef>Référence</th>
                <td mat-cell *matCellDef="let m">{{ m.note || '—' }}</td>
              </ng-container>
              <ng-container matColumnDef="qty">
                <th mat-header-cell *matHeaderCellDef style="text-align:right">Qté réintégrée</th>
                <td mat-cell *matCellDef="let m" style="text-align:right">
                  <span class="text-green">+{{ m.quantity }}</span>
                </td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="['date','product','ref','qty']"></tr>
              <tr mat-row *matRowDef="let r; columns: ['date','product','ref','qty']" class="table-row"></tr>
            </table>
            <div *ngIf="!retours.length" class="empty-state">
              <span class="material-icons">keyboard_return</span>
              <p>Aucun retour</p>
              <small>Les retours apparaissent après clôture d'une charge livreur</small>
            </div>
          </div>
        </div>
      </mat-tab>

      <!-- ===== MOUVEMENTS ===== -->
      <mat-tab>
        <ng-template mat-tab-label>
          <span class="material-icons tab-icon">history</span> Mouvements
        </ng-template>
        <div class="tab-body">
          <div class="card">
            <table mat-table [dataSource]="movements" class="full-width">
              <ng-container matColumnDef="date">
                <th mat-header-cell *matHeaderCellDef>Date</th>
                <td mat-cell *matCellDef="let m">{{ m.created_at | date:'dd/MM/yy HH:mm' }}</td>
              </ng-container>
              <ng-container matColumnDef="type">
                <th mat-header-cell *matHeaderCellDef>Type</th>
                <td mat-cell *matCellDef="let m">
                  <span class="badge" [class]="movClass(m.movement_type)">{{ movLabel(m.movement_type) }}</span>
                </td>
              </ng-container>
              <ng-container matColumnDef="product">
                <th mat-header-cell *matHeaderCellDef>Produit</th>
                <td mat-cell *matCellDef="let m">
                  <div class="item-title">{{ m.product_name }}</div>
                  <div class="item-sub">{{ m.variant_name }}</div>
                </td>
              </ng-container>
              <ng-container matColumnDef="ref">
                <th mat-header-cell *matHeaderCellDef>Référence</th>
                <td mat-cell *matCellDef="let m">{{ m.note || '—' }}</td>
              </ng-container>
              <ng-container matColumnDef="qty">
                <th mat-header-cell *matHeaderCellDef style="text-align:right">Mouvement</th>
                <td mat-cell *matCellDef="let m" style="text-align:right">
                  <span [class.text-green]="m.quantity>0" [class.text-red]="m.quantity<0">
                    {{ m.quantity > 0 ? '+' : '' }}{{ m.quantity }}
                  </span>
                </td>
              </ng-container>
              <ng-container matColumnDef="by">
                <th mat-header-cell *matHeaderCellDef>Par</th>
                <td mat-cell *matCellDef="let m">{{ m.created_by_name || '—' }}</td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="colsMouvements"></tr>
              <tr mat-row *matRowDef="let r; columns: colsMouvements" class="table-row"></tr>
            </table>
            <div *ngIf="!movements.length" class="empty-state">
              <span class="material-icons">history</span><p>Aucun mouvement</p>
            </div>
          </div>
        </div>
      </mat-tab>

    </mat-tab-group>

    <!-- ===== DRAWER ARRIVAGE ===== -->
    <app-drawer [open]="showArrivalDrawer" title="Nouvel arrivage"
      [saving]="saving" saveLabel="Réceptionner"
      (closed)="showArrivalDrawer=false" (saved)="saveArrival()">
      <div class="field-group">
        <label>Fournisseur</label>
        <select class="field-select" [(ngModel)]="arrivalForm.fournisseur_id">
          <option value="">Sans fournisseur</option>
          <option *ngFor="let f of fournisseurs" [value]="f.id">{{ f.nom }}</option>
        </select>
      </div>
      <div class="field-row">
        <div class="field-group">
          <label>N° BL</label>
          <input class="field-input" [(ngModel)]="arrivalForm.bl" placeholder="BL-…" />
        </div>
        <div class="field-group">
          <label>Date</label>
          <input class="field-input" type="date" [(ngModel)]="arrivalForm.arrivage_date" />
        </div>
      </div>
      <div class="lines-section">
        <div class="lines-label">Produits reçus</div>
        <div class="lines-head">
          <span>Produit</span><span>Qté</span><span>Prix U.</span><span></span>
        </div>
        <div class="line-row" *ngFor="let l of arrivalLines; let i=index">
          <select class="field-select sm" [(ngModel)]="l.variant_id">
            <option value="">Produit…</option>
            <option *ngFor="let v of allVariants" [value]="v.id">{{ v.product_name }} — {{ v.name }}</option>
          </select>
          <input class="field-input sm" type="number" [(ngModel)]="l.quantite" placeholder="Qté" min="0" />
          <input class="field-input sm" type="number" [(ngModel)]="l.prix_unitaire" placeholder="P.U." min="0" />
          <button class="btn-del" (click)="removeArrivalLine(i)"><span class="material-icons">delete</span></button>
        </div>
        <button class="btn-add-line" (click)="addArrivalLine()">
          <span class="material-icons">add</span> Ajouter une ligne
        </button>
        <div class="total-box">
          <span>Valeur totale</span><strong>{{ fmtDH(arrivalTotal()) }}</strong>
        </div>
      </div>
      <div *ngIf="errorMsg" class="error-banner"><span class="material-icons">error_outline</span> {{ errorMsg }}</div>
    </app-drawer>

    <!-- ===== DRAWER DÉTAIL ARRIVAGE ===== -->
    <app-drawer [open]="showArrivageDetail" [title]="selectedArrivage?.bl || 'Arrivage'"
      [showFooter]="false" (closed)="showArrivageDetail=false">
      <div *ngIf="selectedArrivage">
        <p class="drawer-meta">{{ selectedArrivage.fournisseur_nom || '—' }} · {{ fmtDate(selectedArrivage.arrivage_date) }}</p>
        <table class="detail-table">
          <thead><tr><th>Produit</th><th>Qté</th><th>P.U.</th><th>Total</th></tr></thead>
          <tbody>
            <tr *ngFor="let l of selectedArrivage.lines">
              <td><div class="item-title">{{ l.product_name }}</div><div class="item-sub">{{ l.variant_name }}</div></td>
              <td>{{ fmt(l.quantite) }}</td>
              <td>{{ fmtDH(l.prix_unitaire) }}</td>
              <td>{{ fmtDH(l.quantite * l.prix_unitaire) }}</td>
            </tr>
          </tbody>
        </table>
        <div class="total-box" style="margin-top:16px">
          <span>Total arrivage</span><strong>{{ fmtDH(totalValArrivage(selectedArrivage)) }}</strong>
        </div>
        <!-- Bon de réception -->
        <div class="pdf-actions" style="margin-top:18px;padding-top:14px;border-top:1px solid #f1f5f9">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;margin-bottom:10px">Documents</div>
          <button class="pdf-btn-stock" (click)="viewBonReception()" [disabled]="brLoading">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            Bon de réception
          </button>
          <div *ngIf="brLoading" style="margin-top:8px;font-size:12px;color:#6b7280;display:flex;align-items:center;gap:6px">
            <span class="br-spinner"></span> Génération…
          </div>
        </div>
      </div>
    </app-drawer>

    <!-- PDF VIEWER MODAL -->
    <div class="pdf-overlay-stock" *ngIf="pdfViewerUrl" (click)="closePdfViewer()">
      <div class="pdf-modal-stock" (click)="$event.stopPropagation()">
        <div class="pdf-modal-bar">
          <span style="font-size:14px;font-weight:700;color:#fff">{{ pdfViewerTitle }}</span>
          <div style="display:flex;gap:8px">
            <a [href]="pdfViewerUrl" [download]="pdfViewerTitle" class="pdf-action-btn-stock">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Télécharger
            </a>
            <button class="pdf-action-btn-stock pdf-close-stock" (click)="closePdfViewer()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              Fermer
            </button>
          </div>
        </div>
        <iframe [src]="pdfViewerUrl" style="flex:1;border:none;width:100%;background:#fff"></iframe>
      </div>
    </div>

    <!-- ===== DRAWER NOUVELLE CHARGE ===== -->
    <app-drawer [open]="showChargeDrawer" title="Nouvelle charge livreur"
      [saving]="saving" saveLabel="Valider la charge"
      (closed)="showChargeDrawer=false" (saved)="saveCharge()">
      <div class="field-row">
        <div class="field-group">
          <label>Livreur <span class="req">*</span></label>
          <select class="field-select" [(ngModel)]="chargeForm.delivery_user_id" (ngModelChange)="onLivreurChange($event)">
            <option value="">Sélectionner…</option>
            <option *ngFor="let u of deliveryUsers" [value]="u.id">{{ u.name }}</option>
          </select>
        </div>
        <div class="field-group">
          <label>Date</label>
          <input class="field-input" type="date" [(ngModel)]="chargeForm.charge_date" />
        </div>
      </div>
      <div *ngIf="suggestedOrders.length" class="info-banner">
        <span class="material-icons">info</span>
        {{ suggestedOrders.length }} commande(s) assignée(s) pré-remplies —
        <span *ngFor="let o of suggestedOrders; let last=last">Cmd #{{ o.order_number }}{{ !last ? ', ' : '' }}</span>
      </div>
      <div class="lines-section">
        <div class="lines-label">Produits à charger</div>
        <div class="lines-head"><span>Produit</span><span>Qté</span><span></span></div>
        <div *ngFor="let l of chargeLines; let i=index">
          <div class="line-row">
            <select class="field-select sm" [(ngModel)]="l.variant_id">
              <option value="">Produit…</option>
              <option *ngFor="let v of allVariants" [value]="v.id">{{ v.product_name }} — {{ v.name }}</option>
            </select>
            <input class="field-input sm" type="number" [(ngModel)]="l.qty_charged" placeholder="Qté" min="0"
              [class.field-error]="l.variant_id && l.qty_charged > stockFor(l.variant_id)" />
            <button class="btn-del" (click)="removeChargeLine(i)"><span class="material-icons">delete</span></button>
          </div>
          <div class="stock-hint" *ngIf="l.variant_id">
            Stock dispo : <strong>{{ stockFor(l.variant_id) }}</strong>
            <span class="text-red" *ngIf="+l.qty_charged > stockFor(l.variant_id)"> — Insuffisant</span>
          </div>
        </div>
        <button class="btn-add-line" (click)="addChargeLine()">
          <span class="material-icons">add</span> Ajouter une ligne
        </button>
        <div class="total-box">
          <span>Valeur chargée</span><strong>{{ fmtDH(chargeValeur()) }}</strong>
        </div>
      </div>
      <div *ngIf="errorMsg" class="error-banner"><span class="material-icons">error_outline</span> {{ errorMsg }}</div>
    </app-drawer>

    <!-- ===== DRAWER CLÔTURE CHARGE ===== -->
    <app-drawer [open]="showCloseDrawer" [title]="closeReadonly ? 'Détail charge' : 'Clôture de tournée'"
      [saving]="saving" [saveLabel]="'Clôturer la tournée'" [showFooter]="!closeReadonly"
      (closed)="showCloseDrawer=false" (saved)="submitClose()">
      <div *ngIf="selectedCharge">
        <p class="drawer-meta">{{ selectedCharge.livreur_name }} · {{ fmtDate(selectedCharge.charge_date) }}</p>
        <p class="drawer-hint" *ngIf="!closeReadonly">Saisis le <strong>vendu</strong> et le <strong>retour</strong> par produit.</p>
        <div class="close-head">
          <span>Produit</span><span>Chargé</span><span>Vendu</span><span>Retour</span><span>Manq.</span>
        </div>
        <div class="close-row" *ngFor="let l of closeLines">
          <div><div class="item-title">{{ l.product_name }}</div><div class="item-sub">{{ l.sku }}</div></div>
          <div class="text-center">{{ l.qty_charged }}</div>
          <input class="field-input sm" type="number" [(ngModel)]="l.qty_sold" min="0" [max]="l.qty_charged" [disabled]="closeReadonly" />
          <input class="field-input sm" type="number" [(ngModel)]="l.qty_returned" min="0" [max]="l.qty_charged" [disabled]="closeReadonly" />
          <div class="text-center" [class.text-red]="lineManquant(l)>0">{{ lineManquant(l) }}</div>
        </div>
        <div class="close-summary">
          <div class="csum"><div class="csum-val text-green">{{ closeTotalSold() }}</div><div class="csum-lbl">Vendu</div></div>
          <div class="csum"><div class="csum-val">{{ closeTotalReturned() }}</div><div class="csum-lbl">Retour</div></div>
          <div class="csum"><div class="csum-val text-red">{{ closeTotalManquant() }}</div><div class="csum-lbl">Manquant</div></div>
        </div>
      </div>
      <div *ngIf="errorMsg" class="error-banner"><span class="material-icons">error_outline</span> {{ errorMsg }}</div>
    </app-drawer>

    <!-- ===== DRAWER AJUSTEMENT ===== -->
    <app-drawer [open]="showAdjustDrawer" title="Ajuster le stock"
      [saving]="saving" saveLabel="Enregistrer"
      (closed)="showAdjustDrawer=false" (saved)="saveAdjust()">
      <div *ngIf="adjustTarget">
        <p class="drawer-meta">{{ adjustTarget.product_name }} — {{ adjustTarget.variant_name }}</p>
        <div class="field-group">
          <label>Stock actuel</label>
          <input class="field-input" [value]="adjustTarget.quantity" disabled />
        </div>
        <div class="field-group">
          <label>Nouveau stock réel <span class="req">*</span></label>
          <input class="field-input" type="number" [(ngModel)]="adjustQty" min="0" />
        </div>
        <div class="field-group">
          <label>Motif</label>
          <select class="field-select" [(ngModel)]="adjustMotif">
            <option *ngFor="let m of adjustMotifs" [value]="m">{{ m }}</option>
          </select>
        </div>
      </div>
      <div *ngIf="errorMsg" class="error-banner"><span class="material-icons">error_outline</span> {{ errorMsg }}</div>
    </app-drawer>

    <!-- ===== DRAWER FOURNISSEURS ===== -->
    <app-drawer [open]="showFournisseurDrawer" title="Fournisseurs" [showFooter]="false"
      (closed)="showFournisseurDrawer=false">
      <div style="display:flex;justify-content:flex-end;margin-bottom:12px">
        <button class="btn-primary" (click)="startAddFournisseur()">
          <span class="material-icons">add</span> Nouveau
        </button>
      </div>
      <div *ngIf="showFournisseurForm" class="fournisseur-form">
        <div class="field-group">
          <label>Nom <span class="req">*</span></label>
          <input class="field-input" [(ngModel)]="fournisseurForm.nom" placeholder="Nom du fournisseur" />
        </div>
        <div class="field-group">
          <label>Téléphone</label>
          <input class="field-input" [(ngModel)]="fournisseurForm.telephone" placeholder="06…" />
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end">
          <button class="btn-ghost sm" (click)="cancelFournisseur()">Annuler</button>
          <button class="btn-primary sm" (click)="saveFournisseur()" [disabled]="saving">
            {{ editingFournisseur ? 'Modifier' : 'Créer' }}
          </button>
        </div>
      </div>
      <table class="detail-table" style="margin-top:8px">
        <thead><tr><th>Nom</th><th>Téléphone</th><th></th></tr></thead>
        <tbody>
          <tr *ngFor="let f of fournisseurs">
            <td><strong>{{ f.nom }}</strong></td>
            <td>{{ f.telephone || '—' }}</td>
            <td>
              <button class="btn-row" (click)="editFournisseur(f)"><span class="material-icons">edit</span></button>
              <button class="btn-row text-red" (click)="deleteFournisseur(f)"><span class="material-icons">delete</span></button>
            </td>
          </tr>
        </tbody>
      </table>
      <div *ngIf="!fournisseurs.length" class="empty-state" style="padding:24px">
        <span class="material-icons">business</span><p>Aucun fournisseur</p>
      </div>
    </app-drawer>
  `,
  styles: [`
    .page-sub { font-size:13px; color:#94a3b8; margin:2px 0 0; }
    /* KPIs */
    .kpi-row { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:20px; }
    .kpi-card { border-radius:12px; padding:14px 16px; display:flex; align-items:center; gap:12px; color:#fff; }
    .kpi-card .material-icons { font-size:28px; opacity:.85; }
    .kpi-val { font-size:20px; font-weight:800; line-height:1.1; }
    .kpi-lbl { font-size:12px; opacity:.85; margin-top:2px; }
    .kpi-blue { background:#2f6bff; }
    .kpi-teal { background:#0d9488; }
    .kpi-amber { background:#d97706; }
    .kpi-purple { background:#7c3aed; }
    /* Tabs */
    .tab-body { padding:16px 0; }
    .tab-icon { font-size:17px; vertical-align:middle; margin-right:5px; }
    .tab-count { background:#f59e0b; color:#fff; border-radius:20px; padding:1px 7px; font-size:11px; font-weight:700; margin-left:5px; }
    /* Toolbar */
    .toolbar-row { display:flex; align-items:center; gap:12px; margin-bottom:14px; flex-wrap:wrap; }
    .search-box { flex:1; min-width:200px; display:flex; align-items:center; gap:8px; background:#fff; border:1px solid #e2e8f0; border-radius:9px; padding:8px 12px; }
    .search-box .material-icons { font-size:18px; color:#94a3b8; }
    .search-box input { border:none; outline:none; font-size:14px; width:100%; }
    .seg-ctrl { display:flex; background:#fff; border:1px solid #e2e8f0; border-radius:8px; padding:3px; gap:2px; }
    .seg-ctrl button { padding:6px 13px; border-radius:6px; border:none; font-size:13px; font-weight:500; color:#64748b; cursor:pointer; background:transparent; }
    .seg-ctrl button.active { background:#eff6ff; color:#2563eb; font-weight:700; }
    /* Table */
    .item-title { font-size:14px; font-weight:500; color:#1e293b; }
    .item-sub { font-size:12px; color:#94a3b8; margin-top:1px; }
    .sku { font-family:ui-monospace,monospace; font-size:12px; color:#94a3b8; }
    .qty-wrap { display:flex; flex-direction:column; gap:4px; }
    .qty-val { font-size:15px; font-weight:700; }
    .bar-wrap { height:5px; background:#f1f5f9; border-radius:4px; overflow:hidden; width:80px; }
    .bar-fill { height:100%; border-radius:4px; }
    .bar-ok { background:#22c55e; } .bar-low { background:#f59e0b; } .bar-out { background:#ef4444; }
    /* Badges */
    .badge { display:inline-block; padding:3px 10px; border-radius:20px; font-size:12px; font-weight:600; }
    .badge-green { background:#dcfce7; color:#166534; }
    .badge-blue { background:#dbeafe; color:#1e40af; }
    .badge-amber { background:#fef3c7; color:#92400e; }
    .badge-grey { background:#f1f5f9; color:#475569; }
    .badge-red { background:#fee2e2; color:#dc2626; }
    .badge-purple { background:#ede9fe; color:#5b21b6; }
    .badge-teal { background:#ccfbf1; color:#0f766e; }
    /* Charge cards */
    .charge-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(320px,1fr)); gap:16px; }
    .charge-card { background:#fff; border:1px solid #e2e8f0; border-radius:14px; padding:16px; }
    .charge-head { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:14px; }
    .charge-stats { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-bottom:14px; }
    .cstat { background:#f8fafc; border-radius:9px; padding:9px; text-align:center; }
    .cstat-val { font-size:18px; font-weight:800; }
    .cstat-lbl { font-size:10px; color:#94a3b8; text-transform:uppercase; margin-top:2px; }
    .charge-foot { border-top:1px solid #f1f5f9; padding-top:12px; }
    /* Info banner */
    .info-banner { background:#fef3c7; color:#92400e; border-radius:10px; padding:12px 16px; font-size:13px; display:flex; align-items:center; gap:8px; margin-bottom:14px; }
    /* Couleurs */
    .text-green { color:#16a34a !important; } .text-red { color:#dc2626 !important; }
    .text-center { text-align:center; }
    /* Btn row */
    .btn-row { display:inline-flex; align-items:center; gap:4px; font-size:12px; font-weight:600; color:#3b82f6; padding:5px 9px; border-radius:6px; border:none; background:transparent; cursor:pointer; }
    .btn-row:hover { background:#eff6ff; }
    .btn-row .material-icons { font-size:15px; }
    .btn-ghost { display:inline-flex; align-items:center; gap:6px; padding:9px 16px; background:#f1f5f9; color:#475569; border:none; border-radius:8px; cursor:pointer; font-size:13px; font-weight:500; }
    .btn-ghost:hover { background:#e2e8f0; }
    .btn-ghost.sm { padding:7px 12px; font-size:12px; }
    /* Empty state */
    .empty-state { padding:48px 20px; text-align:center; color:#94a3b8; }
    .empty-state .material-icons { font-size:42px; display:block; margin:0 auto 10px; color:#cbd5e1; }
    .empty-state p { font-size:15px; font-weight:600; color:#64748b; margin:0; }
    .empty-state small { font-size:12px; }
    /* Drawer forms */
    .field-group { display:flex; flex-direction:column; gap:5px; }
    .field-row { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
    .field-input { padding:9px 12px; border:1px solid #e2e8f0; border-radius:8px; font-size:14px; outline:none; }
    .field-input:focus { border-color:#3b82f6; box-shadow:0 0 0 3px rgba(59,130,246,.12); }
    .field-input.sm { padding:7px 9px; font-size:13px; }
    .field-input.field-error { border-color:#ef4444; }
    .field-input:disabled { background:#f8fafc; color:#94a3b8; }
    .field-select { padding:9px 12px; border:1px solid #e2e8f0; border-radius:8px; font-size:14px; outline:none; background:#fff; }
    .field-select.sm { padding:7px 9px; font-size:13px; }
    label { font-size:12.5px; font-weight:600; color:#475569; }
    .req { color:#ef4444; }
    /* Lines */
    .lines-section { display:flex; flex-direction:column; gap:8px; }
    .lines-label { font-size:12.5px; font-weight:600; color:#475569; }
    .lines-head { display:grid; grid-template-columns:1fr 80px 80px 36px; gap:6px; font-size:11px; font-weight:700; text-transform:uppercase; color:#94a3b8; padding:0 2px; }
    .line-row { display:grid; grid-template-columns:1fr 80px 80px 36px; gap:6px; align-items:center; }
    .btn-del { width:32px; height:32px; border:none; background:transparent; border-radius:6px; cursor:pointer; display:flex; align-items:center; justify-content:center; color:#ef4444; }
    .btn-del:hover { background:#fee2e2; }
    .btn-del .material-icons { font-size:17px; }
    .btn-add-line { display:flex; align-items:center; gap:6px; font-size:13px; font-weight:600; color:#3b82f6; padding:8px 0; border:none; background:transparent; cursor:pointer; }
    .btn-add-line:hover { color:#2563eb; }
    .total-box { display:flex; justify-content:space-between; align-items:center; padding:12px 14px; background:#f8fafc; border-radius:9px; font-size:14px; color:#64748b; }
    .total-box strong { font-size:17px; color:#1e293b; }
    .stock-hint { font-size:12px; color:#94a3b8; padding:2px 0 6px 2px; }
    /* Clôture */
    .close-head { display:grid; grid-template-columns:1fr 60px 80px 80px 60px; gap:6px; font-size:11px; font-weight:700; text-transform:uppercase; color:#94a3b8; padding:8px 2px; border-bottom:1px solid #e2e8f0; margin-bottom:4px; }
    .close-row { display:grid; grid-template-columns:1fr 60px 80px 80px 60px; gap:6px; align-items:center; padding:8px 2px; border-bottom:1px solid #f1f5f9; }
    .close-summary { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-top:14px; }
    .csum { background:#f8fafc; border-radius:9px; padding:10px; text-align:center; }
    .csum-val { font-size:18px; font-weight:800; }
    .csum-lbl { font-size:10px; color:#94a3b8; text-transform:uppercase; margin-top:2px; }
    /* Fournisseur form */
    .fournisseur-form { background:#f8fafc; border-radius:10px; padding:14px; display:flex; flex-direction:column; gap:12px; margin-bottom:16px; }
    /* Detail table */
    .detail-table { width:100%; border-collapse:collapse; font-size:13.5px; }
    .detail-table th { background:#f8fafc; font-size:11px; font-weight:700; text-transform:uppercase; color:#94a3b8; padding:9px 10px; text-align:left; border-bottom:1px solid #e2e8f0; }
    .detail-table td { padding:10px; border-bottom:1px solid #f1f5f9; vertical-align:middle; }
    .detail-table tr:last-child td { border-bottom:none; }
    .drawer-meta { font-size:13px; color:#94a3b8; margin-bottom:14px; }
    .pdf-btn-stock { display:inline-flex; align-items:center; gap:7px; padding:9px 16px; border:1px solid #e2e8f0; border-radius:9px; background:#fff; font-size:13px; font-weight:600; color:#2f6bff; border-color:#2f6bff; cursor:pointer; transition:.13s; }
    .pdf-btn-stock:hover:not(:disabled) { background:#f0f4ff; }
    .pdf-btn-stock:disabled { opacity:.5; cursor:not-allowed; }
    .pdf-btn-stock svg { width:15px; height:15px; }
    .br-spinner { display:inline-block; width:12px; height:12px; border:2px solid #e2e8f0; border-top-color:#2f6bff; border-radius:50%; animation:spin .7s linear infinite; }
    @keyframes spin { to { transform:rotate(360deg); } }
    .pdf-overlay-stock { position:fixed; inset:0; background:rgba(0,0,0,.7); z-index:1000; display:flex; align-items:center; justify-content:center; padding:24px; }
    .pdf-modal-stock { display:flex; flex-direction:column; width:100%; max-width:900px; height:90vh; background:#1e2533; border-radius:14px; overflow:hidden; box-shadow:0 24px 80px rgba(0,0,0,.5); }
    .pdf-modal-bar { display:flex; align-items:center; justify-content:space-between; padding:12px 18px; background:#151b27; border-bottom:1px solid rgba(255,255,255,.08); }
    .pdf-action-btn-stock { display:inline-flex; align-items:center; gap:6px; padding:7px 14px; border-radius:8px; border:1px solid rgba(255,255,255,.15); background:rgba(255,255,255,.07); color:#e2e8f0; font-size:13px; font-weight:600; cursor:pointer; text-decoration:none; transition:.13s; }
    .pdf-action-btn-stock:hover { background:rgba(255,255,255,.14); }
    .pdf-action-btn-stock svg { width:14px; height:14px; }
    .pdf-close-stock { border-color:rgba(226,72,61,.4); color:#fca5a5; }
    .pdf-close-stock:hover { background:rgba(226,72,61,.15); }
    .drawer-hint { font-size:13px; color:#64748b; margin-bottom:12px; }
    .error-banner { display:flex; align-items:center; gap:8px; padding:10px 14px; background:#fee2e2; color:#dc2626; border-radius:8px; font-size:13px; }
    .error-banner .material-icons { font-size:18px; }
    .btn-primary.sm { padding:7px 12px; font-size:12px; }
  `]
})
export class StockComponent implements OnInit {
  // Données
  warehouseStock: any[] = [];
  filteredStock: any[] = [];
  arrivages: any[] = [];
  charges: any[] = [];
  movements: any[] = [];
  deliveryUsers: any[] = [];
  fournisseurs: any[] = [];
  allVariants: any[] = [];

  // Filtres entrepôt
  searchQuery = '';
  stockFilter: 'all' | 'low' | 'out' = 'all';

  // Colonnes tables
  colsStock = ['product', 'sku', 'qty', 'seuil', 'statut', 'valeur', 'actions'];
  colsArrivages = ['bl', 'fournisseur', 'contenu', 'statut', 'valeur', 'actions'];
  colsMouvements = ['date', 'type', 'product', 'ref', 'qty', 'by'];

  // Drawers
  saving = false;
  errorMsg = '';
  showArrivalDrawer = false;
  showArrivageDetail = false;
  showChargeDrawer = false;
  showCloseDrawer = false;
  showAdjustDrawer = false;
  showFournisseurDrawer = false;

  // Arrivage form
  arrivalForm: any = {};
  arrivalLines: any[] = [];
  selectedArrivage: any = null;
  brLoading = false;
  pdfViewerUrl: SafeResourceUrl | null = null;
  pdfViewerTitle = '';

  // Charge form
  chargeForm: any = {};
  chargeLines: any[] = [];
  suggestedOrders: any[] = [];

  // Clôture
  selectedCharge: any = null;
  closeLines: any[] = [];
  closeReadonly = false;

  // Ajustement
  adjustTarget: any = null;
  adjustQty: number | null = null;
  adjustMotif = 'Inventaire';
  readonly adjustMotifs = ['Inventaire', 'Casse / perte', 'Péremption', 'Correction de saisie'];

  // Fournisseur
  showFournisseurForm = false;
  editingFournisseur: any = null;
  fournisseurForm = { nom: '', telephone: '' };

  constructor(private api: ApiService, private cdr: ChangeDetectorRef, private sanitizer: DomSanitizer) {}

  ngOnInit() { this.loadAll(); }

  loadAll() {
    forkJoin({
      stock: this.api.get<any[]>('/stock/warehouse'),
      movements: this.api.get<any[]>('/stock/movements'),
      charges: this.api.get<any[]>('/stock/charges'),
      arrivages: this.api.get<any[]>('/stock/arrivages'),
      users: this.api.get<any[]>('/stock/delivery-users'),
      fournisseurs: this.api.get<any[]>('/fournisseurs'),
      products: this.api.get<any[]>('/products'),
    }).subscribe({
      next: (d) => {
        this.warehouseStock = d.stock;
        this.movements = d.movements;
        this.charges = d.charges;
        this.arrivages = d.arrivages;
        this.deliveryUsers = d.users;
        this.fournisseurs = d.fournisseurs;
        this.allVariants = d.products.flatMap((p: any) =>
          (p.variants || []).filter((v: any) => v.is_active !== false).map((v: any) => ({ ...v, product_name: p.name }))
        );
        this.applyFilter();
        this.cdr.detectChanges();
      },
      error: () => this.cdr.detectChanges(),
    });
  }

  onTabChange(_e: any) { this.cdr.detectChanges(); }

  // ===== ENTREPÔT =====
  applyFilter() {
    let items = [...this.warehouseStock];
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      items = items.filter(p => (p.product_name + p.variant_name + p.sku).toLowerCase().includes(q));
    }
    if (this.stockFilter === 'low') items = items.filter(p => p.quantity > 0 && p.quantity <= (p.seuil_alerte || 0));
    if (this.stockFilter === 'out') items = items.filter(p => p.quantity <= 0);
    this.filteredStock = [...items];
    this.cdr.detectChanges();
  }

  setFilter(f: 'all' | 'low' | 'out') { this.stockFilter = f; this.applyFilter(); }

  variantPrice(variantId: string): number {
    return this.allVariants.find(v => v.id === variantId)?.price || 0;
  }
  get kpiValeur() { return this.warehouseStock.reduce((s, p) => s + p.quantity * this.variantPrice(p.variant_id), 0); }
  get kpiAlertes() { return this.warehouseStock.filter(p => p.quantity > 0 && p.quantity <= (p.seuil_alerte || 0)).length; }
  get kpiChargesEnCours() { return this.charges.filter(c => c.statut !== 'cloture').length; }
  get retours() { return this.movements.filter(m => m.movement_type === 'return_from_charge'); }

  statusLabel(p: any) { if (p.quantity <= 0) return 'Rupture'; if (p.seuil_alerte > 0 && p.quantity <= p.seuil_alerte) return 'Stock bas'; return 'Disponible'; }
  statusClass(p: any) { if (p.quantity <= 0) return 'badge badge-red'; if (p.seuil_alerte > 0 && p.quantity <= p.seuil_alerte) return 'badge badge-amber'; return 'badge badge-green'; }
  barPct(p: any) { return Math.min(100, Math.round((p.quantity / ((p.seuil_alerte || 10) * 2.2)) * 100)); }
  barClass(p: any) { if (p.quantity <= 0) return 'bar-fill bar-out'; if (p.seuil_alerte > 0 && p.quantity <= p.seuil_alerte) return 'bar-fill bar-low'; return 'bar-fill bar-ok'; }

  openAdjustDrawer(p: any) { this.adjustTarget = p; this.adjustQty = p.quantity; this.adjustMotif = 'Inventaire'; this.errorMsg = ''; this.showAdjustDrawer = true; }

  saveAdjust() {
    if (this.adjustQty === null || this.adjustQty < 0) { this.errorMsg = 'Quantité invalide'; return; }
    this.saving = true;
    this.api.post('/stock/adjust', { variant_id: this.adjustTarget.variant_id, new_quantity: this.adjustQty, motif: this.adjustMotif }).subscribe({
      next: () => { this.saving = false; this.showAdjustDrawer = false; this.loadAll(); },
      error: (e) => { this.saving = false; this.errorMsg = e?.error?.message || 'Erreur'; this.cdr.detectChanges(); },
    });
  }

  // ===== ARRIVAGES =====
  openArrivalDrawer() {
    this.arrivalForm = { fournisseur_id: '', bl: 'BL-' + Math.floor(40000 + Math.random() * 9999), arrivage_date: new Date().toISOString().slice(0, 10) };
    this.arrivalLines = [{ variant_id: '', quantite: null, prix_unitaire: null }];
    this.errorMsg = ''; this.showArrivalDrawer = true;
  }
  addArrivalLine() { this.arrivalLines.push({ variant_id: '', quantite: null, prix_unitaire: null }); }
  removeArrivalLine(i: number) { if (this.arrivalLines.length > 1) this.arrivalLines.splice(i, 1); }
  arrivalTotal() { return this.arrivalLines.reduce((s, l) => s + (Number(l.quantite) || 0) * (Number(l.prix_unitaire) || 0), 0); }
  totalQtyArrivage(a: any) { return (a.lines || []).reduce((s: number, l: any) => s + l.quantite, 0); }
  totalValArrivage(a: any) { return (a.lines || []).reduce((s: number, l: any) => s + l.quantite * l.prix_unitaire, 0); }
  openArrivageDetail(a: any) { this.selectedArrivage = a; this.showArrivageDetail = true; this.pdfViewerUrl = null; }

  viewBonReception() {
    if (!this.selectedArrivage) return;
    const id    = this.selectedArrivage.id;
    const token = localStorage.getItem('token');
    const base  = environment.apiUrl.replace('/api', '');
    this.pdfViewerTitle = `Bon de reception - ${this.selectedArrivage.bl || id.slice(0, 8)}`;

    const stored = this.selectedArrivage.bon_reception_url;
    if (stored) {
      this.pdfViewerUrl = this.sanitizer.bypassSecurityTrustResourceUrl(`${base}${stored}?t=${Date.now()}&token=${token}`);
      this.cdr.detectChanges();
      return;
    }

    // Pas encore genere → appel backend pour generer
    this.brLoading = true;
    this.cdr.detectChanges();
    this.api.post<{ url: string }>(`/pdf/stock/arrivages/${id}/generate`, {}).subscribe({
      next: (r) => {
        this.brLoading = false;
        this.selectedArrivage.bon_reception_url = r.url;
        this.pdfViewerUrl = this.sanitizer.bypassSecurityTrustResourceUrl(`${base}${r.url}?t=${Date.now()}&token=${token}`);
        this.cdr.detectChanges();
      },
      error: () => { this.brLoading = false; this.cdr.detectChanges(); },
    });
  }

  closePdfViewer() { this.pdfViewerUrl = null; this.cdr.detectChanges(); }

  saveArrival() {
    const valid = this.arrivalLines.filter(l => l.variant_id && Number(l.quantite) > 0);
    if (!valid.length) { this.errorMsg = 'Ajoute au moins une ligne avec une quantité'; return; }
    this.saving = true;
    this.api.post('/stock/arrivages', {
      ...this.arrivalForm,
      fournisseur_id: this.arrivalForm.fournisseur_id || null,
      lines: valid.map(l => ({ variant_id: l.variant_id, quantite: Number(l.quantite), prix_unitaire: Number(l.prix_unitaire) || 0 })),
    }).subscribe({
      next: () => { this.saving = false; this.showArrivalDrawer = false; this.loadAll(); },
      error: (e) => { this.saving = false; this.errorMsg = e?.error?.message || 'Erreur'; this.cdr.detectChanges(); },
    });
  }

  // ===== CHARGES =====
  openChargeDrawer() {
    this.suggestedOrders = [];
    this.chargeForm = { delivery_user_id: '', charge_date: new Date().toISOString().slice(0, 10) };
    this.chargeLines = [{ variant_id: '', qty_charged: null }];
    this.errorMsg = ''; this.showChargeDrawer = true;
    // Si un seul livreur, le pré-sélectionner et charger ses commandes
    if (this.deliveryUsers.length === 1) {
      this.chargeForm.delivery_user_id = this.deliveryUsers[0].id;
      this.onLivreurChange(this.deliveryUsers[0].id);
    }
  }

  onLivreurChange(userId: string) {
    this.suggestedOrders = [];
    if (!userId) { this.chargeLines = [{ variant_id: '', qty_charged: null }]; return; }
    this.api.get<any>(`/stock/orders-for-delivery?delivery_user_id=${userId}`).subscribe({
      next: (data) => {
        this.suggestedOrders = data.orders || [];
        if (data.suggested_lines?.length) {
          this.chargeLines = data.suggested_lines.map((l: any) => ({
            variant_id: l.variant_id,
            qty_charged: l.qty_charged,
          }));
        } else {
          this.chargeLines = [{ variant_id: '', qty_charged: null }];
        }
        this.cdr.detectChanges();
      },
      error: () => { this.chargeLines = [{ variant_id: '', qty_charged: null }]; }
    });
  }

  addChargeLine() { this.chargeLines.push({ variant_id: '', qty_charged: null }); }
  removeChargeLine(i: number) { if (this.chargeLines.length > 1) this.chargeLines.splice(i, 1); }
  stockFor(variantId: string) { return this.warehouseStock.find(p => p.variant_id === variantId)?.quantity ?? 0; }
  chargeValeur() {
    return this.chargeLines.reduce((s, l) => {
      const v = this.allVariants.find(x => x.id === l.variant_id);
      const prix = v?.price || 0;
      return s + (Number(l.qty_charged) || 0) * prix;
    }, 0);
  }
  chargeTotal(c: any) { return (c.lines || []).reduce((s: number, l: any) => s + l.qty_charged, 0); }
  chargeSold(c: any) { return (c.lines || []).reduce((s: number, l: any) => s + (l.qty_sold || 0), 0); }
  chargeManquant(c: any) { return (c.lines || []).reduce((s: number, l: any) => s + Math.max(0, l.qty_charged - (l.qty_sold || 0) - (l.qty_returned || 0)), 0); }
  chargeLabel(s: string) { return { en_cours: 'En cours', a_regler: 'À régler', cloture: 'Clôturé' }[s] || s; }
  chargeClass(s: string) { return { en_cours: 'badge badge-blue', a_regler: 'badge badge-amber', cloture: 'badge badge-grey' }[s] || 'badge badge-grey'; }

  saveCharge() {
    const valid = this.chargeLines.filter(l => l.variant_id && Number(l.qty_charged) > 0);
    if (!valid.length) { this.errorMsg = 'Indique au moins une quantité'; return; }
    if (!this.chargeForm.delivery_user_id) { this.errorMsg = 'Sélectionne un livreur'; return; }
    const over = valid.find(l => Number(l.qty_charged) > this.stockFor(l.variant_id));
    if (over) { this.errorMsg = 'Stock insuffisant pour un des produits'; return; }
    this.saving = true;
    this.api.post('/stock/charges', {
      ...this.chargeForm,
      lines: valid.map(l => ({ variant_id: l.variant_id, qty_charged: Number(l.qty_charged) })),
    }).subscribe({
      next: () => { this.saving = false; this.showChargeDrawer = false; this.loadAll(); },
      error: (e) => { this.saving = false; this.errorMsg = e?.error?.message || 'Erreur'; this.cdr.detectChanges(); },
    });
  }

  // ===== CLÔTURE =====
  openCloseDrawer(charge: any, readonly = false) {
    this.selectedCharge = charge;
    this.closeLines = (charge.lines || []).map((l: any) => ({ ...l, qty_sold: l.qty_sold || 0, qty_returned: l.qty_returned || 0 }));
    this.closeReadonly = readonly;
    this.errorMsg = ''; this.showCloseDrawer = true;
  }
  lineManquant(l: any) { return l.qty_charged - (Number(l.qty_sold) || 0) - (Number(l.qty_returned) || 0); }
  closeTotalSold() { return this.closeLines.reduce((s, l) => s + (Number(l.qty_sold) || 0), 0); }
  closeTotalReturned() { return this.closeLines.reduce((s, l) => s + (Number(l.qty_returned) || 0), 0); }
  closeTotalManquant() { return this.closeLines.reduce((s, l) => s + Math.max(0, this.lineManquant(l)), 0); }

  submitClose() {
    const bad = this.closeLines.find(l => (Number(l.qty_sold) + Number(l.qty_returned)) > l.qty_charged);
    if (bad) { this.errorMsg = 'Vendu + retour > chargé'; return; }
    this.saving = true;
    this.api.put(`/stock/charges/${this.selectedCharge.id}/close`, { lines: this.closeLines }).subscribe({
      next: () => { this.saving = false; this.showCloseDrawer = false; this.loadAll(); },
      error: (e) => { this.saving = false; this.errorMsg = e?.error?.message || 'Erreur'; this.cdr.detectChanges(); },
    });
  }

  // ===== FOURNISSEURS =====
  openFournisseurDrawer() { this.showFournisseurForm = false; this.editingFournisseur = null; this.showFournisseurDrawer = true; }
  startAddFournisseur() { this.editingFournisseur = null; this.fournisseurForm = { nom: '', telephone: '' }; this.showFournisseurForm = true; }
  editFournisseur(f: any) { this.editingFournisseur = f; this.fournisseurForm = { nom: f.nom, telephone: f.telephone || '' }; this.showFournisseurForm = true; }
  cancelFournisseur() { this.showFournisseurForm = false; this.editingFournisseur = null; }

  saveFournisseur() {
    if (!this.fournisseurForm.nom.trim()) return;
    this.saving = true;
    const call = this.editingFournisseur
      ? this.api.put(`/fournisseurs/${this.editingFournisseur.id}`, this.fournisseurForm)
      : this.api.post('/fournisseurs', this.fournisseurForm);
    call.subscribe({
      next: () => { this.saving = false; this.showFournisseurForm = false; this.api.get<any[]>('/fournisseurs').subscribe(f => { this.fournisseurs = f; this.cdr.detectChanges(); }); },
      error: () => { this.saving = false; this.cdr.detectChanges(); },
    });
  }

  deleteFournisseur(f: any) {
    this.api.delete(`/fournisseurs/${f.id}`).subscribe({
      next: () => { this.api.get<any[]>('/fournisseurs').subscribe(d => { this.fournisseurs = d; this.cdr.detectChanges(); }); },
    });
  }

  // ===== MOUVEMENTS =====
  movLabel(t: string) { return { arrival: 'Entrée', charge: 'Charge', return_from_charge: 'Retour', adjustment: 'Ajustement', delivery_out: 'Sortie' }[t] || t; }
  movClass(t: string) { return { arrival: 'badge badge-green', charge: 'badge badge-purple', return_from_charge: 'badge badge-teal', adjustment: 'badge badge-amber', delivery_out: 'badge badge-blue' }[t] || 'badge badge-grey'; }

  // ===== UTILS =====
  fmt(n: number) { return Number(n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  fmtDH(n: number) { return this.fmt(n || 0) + ' DH'; }
  fmtDate(d: string) { if (!d) return '—'; return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }); }
}
