import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatExpansionModule } from '@angular/material/expansion';
import { DrawerComponent } from '../../shared/components/drawer/drawer.component';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

interface VariantDraft {
  id?: string;
  name: string;
  price: number | null;
  imageFile: File | null;
  imagePreview: string | null;
}

interface CartLine {
  variantId: string;
  variantName: string;
  productName: string;
  price: number;
  quantity: number;
  stockWarehouse: number;
}

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatExpansionModule, DrawerComponent],
  template: `
    <!-- ===== HEADER ===== -->
    <div class="page-header">
      <div>
        <h2>Catalogue Produits</h2>
        <p class="page-subtitle">{{ orderMode ? 'Mode commande' : products.length + ' produit(s)' }}</p>
      </div>
      <div class="header-actions">
        <!-- Toggle mode commande (prévendeur uniquement) -->
        <div class="mode-toggle" *ngIf="auth.isPreSeller || auth.isAdmin || auth.isStockManager">
          <span class="mode-label" [class.active]="!orderMode">Catalogue</span>
          <button class="toggle-btn" [class.on]="orderMode" (click)="toggleOrderMode()">
            <span class="toggle-knob"></span>
          </button>
          <span class="mode-label" [class.active]="orderMode">Commande</span>
        </div>

        <button class="btn-primary" (click)="openProductForm()" *ngIf="!orderMode && (auth.isAdmin || auth.isStockManager)">
          <span class="material-icons">add</span> Nouveau produit
        </button>

        <!-- Bouton panier -->
        <button class="btn-cart" *ngIf="orderMode" (click)="showCartDrawer=true">
          <span class="material-icons">shopping_cart</span>
          <span *ngIf="cartCount > 0" class="cart-badge">{{ cartCount }}</span>
        </button>
      </div>
    </div>

    <!-- ===== GRID PRODUITS — MODE CATALOGUE ===== -->
    <div class="products-grid" *ngIf="!orderMode">
      <div *ngFor="let p of products" class="product-card">
        <div class="product-img-wrap">
          <img *ngIf="p.image_url" [src]="p.image_url" class="product-img" />
          <div *ngIf="!p.image_url" class="product-img-placeholder">
            <span class="material-icons">inventory_2</span>
          </div>
          <div class="product-actions-overlay" *ngIf="auth.isAdmin || auth.isStockManager">
            <button class="btn-icon" (click)="openProductForm(p)"><span class="material-icons">edit</span></button>
            <button class="btn-icon danger" (click)="deleteProduct(p.id)"><span class="material-icons">delete</span></button>
          </div>
        </div>
        <div class="product-body">
          <div class="product-name">{{ p.name }}</div>
          <div class="product-cat">{{ p.category_name || 'Sans catégorie' }}</div>
          <p *ngIf="p.description" class="product-desc">{{ p.description }}</p>
          <mat-expansion-panel class="variants-panel">
            <mat-expansion-panel-header>
              <mat-panel-title>
                <span class="material-icons" style="font-size:16px;margin-right:6px">layers</span>
                {{ p.variants?.length || 0 }} variante(s)
              </mat-panel-title>
            </mat-expansion-panel-header>
            <div class="variants-list">
              <div *ngFor="let v of p.variants" class="variant-row">
                <img *ngIf="v.image_url" [src]="v.image_url" class="variant-img" />
                <div *ngIf="!v.image_url" class="variant-img-placeholder"><span class="material-icons">image</span></div>
                <div class="variant-info">
                  <span class="variant-name">{{ v.name }}</span>
                  <span *ngIf="v.sku" class="variant-sku">{{ v.sku }}</span>
                </div>
                <span class="variant-price">{{ v.price | number:'1.2-2' }} DH</span>
                <button class="btn-icon danger" (click)="deleteVariant(v.id)" *ngIf="auth.isAdmin || auth.isStockManager">
                  <span class="material-icons">delete</span>
                </button>
              </div>
              <button class="btn-add-variant" (click)="openVariantForm(p)" *ngIf="auth.isAdmin || auth.isStockManager">
                <span class="material-icons">add</span> Ajouter une variante
              </button>
            </div>
          </mat-expansion-panel>
        </div>
      </div>
      <div *ngIf="!products.length" class="empty-state">
        <span class="material-icons">inventory_2</span>
        <p>Aucun produit dans le catalogue</p>
      </div>
    </div>

    <!-- ===== GRID PRODUITS — MODE COMMANDE ===== -->
    <div class="products-grid" *ngIf="orderMode">
      <div *ngFor="let p of orderProducts" class="product-card order-card">
        <div class="product-img-wrap">
          <img *ngIf="p.image_url" [src]="p.image_url" class="product-img" />
          <div *ngIf="!p.image_url" class="product-img-placeholder">
            <span class="material-icons">inventory_2</span>
          </div>
        </div>
        <div class="product-body">
          <div class="product-name">{{ p.name }}</div>
          <div class="product-cat">{{ p.category_name || 'Sans catégorie' }}</div>

          <!-- Variantes en mode commande -->
          <div class="order-variants">
            <div *ngFor="let v of p.variants"
              class="order-variant-row"
              [class.out-of-stock]="v.stock_available === 0">

              <div class="ov-img-wrap">
                <img *ngIf="v.image_url" [src]="v.image_url" class="variant-img" />
                <div *ngIf="!v.image_url" class="variant-img-placeholder"><span class="material-icons">image</span></div>
              </div>

              <div class="ov-info">
                <span class="variant-name">{{ v.name }}</span>
                <span class="variant-price">{{ v.price | number:'1.2-2' }} DH</span>
                <div class="stock-badges">
                  <span class="stock-badge warehouse" title="Entrepôt">
                    <span class="material-icons">warehouse</span> {{ v.stock_available ?? v.stock_warehouse }}
                  </span>
                </div>
              </div>

              <div class="ov-qty" *ngIf="v.stock_available > 0">
                <button class="qty-btn" (click)="removeFromCart(v.id)" [disabled]="getQty(v.id) === 0">−</button>
                <span class="qty-val">{{ getQty(v.id) }}</span>
                <button class="qty-btn" (click)="addToCart(p, v)">+</button>
              </div>
              <div class="out-label" *ngIf="v.stock_available === 0">Rupture</div>
            </div>
          </div>
        </div>
      </div>
      <div *ngIf="!orderProducts.length" class="empty-state">
        <span class="material-icons">inventory_2</span>
        <p>Aucun produit disponible</p>
      </div>
    </div>

    <!-- ===== DRAWER PANIER ===== -->
    <app-drawer [open]="showCartDrawer" title="Panier" [saving]="savingOrder"
      saveLabel="Valider la commande" (closed)="showCartDrawer=false" (saved)="goToConfirm()">

      <div *ngIf="cart.length === 0" class="empty-cart">
        <span class="material-icons">shopping_cart</span>
        <p>Panier vide</p>
      </div>

      <div *ngFor="let line of cart; let i = index" class="cart-line">
        <div class="cart-line-info">
          <span class="cart-pname">{{ line.productName }}</span>
          <span class="cart-vname">{{ line.variantName }}</span>
        </div>
        <div class="cart-line-right">
          <div class="ov-qty">
            <button class="qty-btn" (click)="removeFromCart(line.variantId)">−</button>
            <span class="qty-val">{{ line.quantity }}</span>
            <button class="qty-btn" (click)="addFromCart(line)">+</button>
          </div>
          <span class="cart-line-total">{{ (line.price * line.quantity) | number:'1.2-2' }} DH</span>
          <button class="btn-icon danger" (click)="removeLineFromCart(i)"><span class="material-icons">close</span></button>
        </div>
      </div>

      <div class="cart-total" *ngIf="cart.length > 0">
        <span>Total</span>
        <span class="total-amount">{{ cartTotal | number:'1.2-2' }} DH</span>
      </div>
    </app-drawer>

    <!-- ===== DRAWER CONFIRMATION COMMANDE ===== -->
    <app-drawer [open]="showConfirmDrawer" title="Confirmer la commande" [saving]="savingOrder"
      saveLabel="Créer la commande" (closed)="showConfirmDrawer=false" (saved)="submitOrder()">

      <div class="order-summary">
        <div class="summary-row" *ngFor="let line of cart">
          <span>{{ line.variantName }} × {{ line.quantity }}</span>
          <span>{{ (line.price * line.quantity) | number:'1.2-2' }} DH</span>
        </div>
        <div class="summary-total">
          <span>Total</span>
          <span>{{ cartTotal | number:'1.2-2' }} DH</span>
        </div>
      </div>

      <div class="field-group" style="margin-top:20px">
        <div class="client-label-row">
          <label>Client <span class="req">*</span></label>
          <button class="btn-new-client" type="button" (click)="toggleNewClientForm()">
            <span class="material-icons">{{ showNewClientForm ? 'close' : 'person_add' }}</span>
            {{ showNewClientForm ? 'Annuler' : 'Nouveau client' }}
          </button>
        </div>

        <!-- Formulaire rapide nouveau client -->
        <div class="new-client-form" *ngIf="showNewClientForm">
          <input class="field-input" [(ngModel)]="newClient.name" placeholder="Nom *" />
          <input class="field-input" [(ngModel)]="newClient.phone" placeholder="Téléphone" />
          <input class="field-input" [(ngModel)]="newClient.address" placeholder="Adresse" />
          <button class="btn-save-client" (click)="quickCreateClient()" [disabled]="creatingClient">
            <span class="material-icons">{{ creatingClient ? 'hourglass_empty' : 'check' }}</span>
            {{ creatingClient ? 'Enregistrement...' : 'Créer et sélectionner' }}
          </button>
          <div *ngIf="newClientError" class="error-banner" style="margin-top:8px">
            <span class="material-icons">error_outline</span> {{ newClientError }}
          </div>
        </div>

        <select class="field-input" [(ngModel)]="orderClientId" *ngIf="!showNewClientForm">
          <option value="">Sélectionner un client</option>
          <option *ngFor="let cl of clients" [value]="cl.id">{{ cl.name }}{{ cl.phone ? ' — ' + cl.phone : '' }}</option>
        </select>
      </div>

      <div class="field-group">
        <label>Note</label>
        <textarea class="field-textarea" [(ngModel)]="orderNote" rows="2" placeholder="Note optionnelle..."></textarea>
      </div>

      <div *ngIf="orderError" class="error-banner">
        <span class="material-icons">error_outline</span> {{ orderError }}
      </div>
    </app-drawer>

    <!-- ===== DRAWER PRODUIT (admin/stock) ===== -->
    <app-drawer [open]="showProductDrawer" [title]="editingProduct ? 'Modifier le produit' : 'Nouveau produit'"
      [saving]="saving" (closed)="showProductDrawer=false" (saved)="saveProduct()">

      <div class="form-section-title">Informations produit</div>
      <div class="field-group">
        <label>Nom du produit <span class="req">*</span></label>
        <input class="field-input" [(ngModel)]="productForm.name" placeholder="Eau minérale" (ngModelChange)="onProductNameChange()" />
      </div>
      <div class="field-group">
        <label>Catégorie</label>
        <select class="field-input" [(ngModel)]="productForm.category_id">
          <option value="">Sans catégorie</option>
          <option *ngFor="let cat of categories" [value]="cat.id">{{ cat.name }}</option>
        </select>
      </div>
      <div class="field-group">
        <label>Taux TVA</label>
        <select class="field-input" [(ngModel)]="productForm.tva_rate">
          <option *ngFor="let t of tvaTaux" [value]="t">{{ t }}%</option>
        </select>
      </div>
      <div class="field-group">
        <label>Description</label>
        <textarea class="field-textarea" [(ngModel)]="productForm.description" rows="3" placeholder="Description du produit..."></textarea>
      </div>
      <div class="field-group">
        <label>Image principale</label>
        <div class="file-upload" (click)="productImageInput.click()">
          <span class="material-icons">{{ productImagePreview ? 'check_circle' : 'cloud_upload' }}</span>
          <span>{{ productImageFile ? productImageFile.name : 'Choisir une image produit' }}</span>
        </div>
        <img *ngIf="productImagePreview" [src]="productImagePreview" class="img-preview" />
        <input #productImageInput type="file" accept="image/*" (change)="onProductImageChange($event)" style="display:none" />
      </div>

      <div class="form-section-title" style="margin-top:24px">
        Variantes <span class="variant-count-badge">{{ variants.length }}</span>
      </div>
      <div *ngFor="let v of variants; let i = index" class="variant-block">
        <div class="variant-block-header">
          <span class="variant-block-label">{{ variants.length === 1 ? 'Variante principale' : 'Variante ' + (i + 1) }}</span>
          <button *ngIf="variants.length > 1" class="btn-icon danger" type="button" (click)="removeVariant(i)">
            <span class="material-icons">close</span>
          </button>
        </div>
        <div class="field-group" *ngIf="variants.length > 1">
          <label>Nom de la variante <span class="req">*</span></label>
          <input class="field-input" [(ngModel)]="v.name" placeholder="ex: 50cl, 1L, Rouge..." />
          <div class="field-hint">Affiché comme : {{ productForm.name || 'Produit' }}{{ v.name ? ' - ' + v.name : '' }}</div>
        </div>
        <div class="field-row">
          <div class="field-group">
            <label>Prix <span class="req">*</span></label>
            <input class="field-input" type="number" min="0" step="0.01" [(ngModel)]="v.price" placeholder="0.00" />
          </div>
          <div class="field-group">
            <label>SKU</label>
            <input class="field-input" value="Auto-généré" disabled style="background:#f1f5f9;color:#94a3b8;" />
          </div>
        </div>
        <div class="field-group">
          <label>Image spécifique <span class="field-optional">(optionnel)</span></label>
          <div class="file-upload" (click)="triggerVariantImageInput(i)">
            <span class="material-icons">{{ v.imagePreview ? 'check_circle' : 'photo' }}</span>
            <span>{{ v.imageFile ? v.imageFile.name : 'Image spécifique à cette variante' }}</span>
          </div>
          <img *ngIf="v.imagePreview" [src]="v.imagePreview" class="img-preview" />
          <input class="variant-img-input" type="file" accept="image/*" (change)="onVariantImageChange($event, i)" style="display:none" [attr.data-index]="i" />
        </div>
      </div>
      <button class="btn-add-variant" type="button" (click)="addVariant()">
        <span class="material-icons">add</span> Ajouter une variante
      </button>
      <div *ngIf="errorMsg" class="error-banner" style="margin-top:16px">
        <span class="material-icons">error_outline</span> {{ errorMsg }}
      </div>
    </app-drawer>

    <!-- ===== DRAWER VARIANTE ===== -->
    <app-drawer [open]="showVariantDrawer" [title]="'Nouvelle variante — ' + (selectedProduct?.name || '')"
      [saving]="saving" (closed)="showVariantDrawer=false" (saved)="saveVariant()">
      <div class="field-group">
        <label>Nom de la variante <span class="req">*</span></label>
        <input class="field-input" [(ngModel)]="variantForm.name" placeholder="50cl, 1L, Rouge..." />
      </div>
      <div class="field-row">
        <div class="field-group">
          <label>Prix <span class="req">*</span></label>
          <input class="field-input" type="number" [(ngModel)]="variantForm.price" placeholder="0.00" />
        </div>
        <div class="field-group">
          <label>SKU</label>
          <input class="field-input" [(ngModel)]="variantForm.sku" placeholder="REF-001" />
        </div>
      </div>
      <div class="field-group">
        <label>Image</label>
        <div class="file-upload" (click)="fileInput.click()">
          <span class="material-icons">cloud_upload</span>
          <span>{{ selectedFile ? selectedFile.name : 'Cliquer pour choisir une image' }}</span>
        </div>
        <input #fileInput type="file" (change)="onFileChange($event)" accept="image/*" style="display:none" />
      </div>
      <div *ngIf="errorMsg" class="error-banner">
        <span class="material-icons">error_outline</span> {{ errorMsg }}
      </div>
    </app-drawer>
  `,
  styles: [`
    /* Layout */
    .header-actions { display:flex; align-items:center; gap:12px; }
    .products-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:16px; }

    /* Toggle mode */
    .mode-toggle { display:flex; align-items:center; gap:8px; }
    .mode-label { font-size:13px; color:#94a3b8; transition:color .2s; }
    .mode-label.active { color:#1e293b; font-weight:600; }
    .toggle-btn {
      position:relative; width:44px; height:24px; border-radius:999px;
      background:#e2e8f0; border:none; cursor:pointer; transition:background .2s; padding:0;
    }
    .toggle-btn.on { background:#3b82f6; }
    .toggle-knob {
      position:absolute; top:3px; left:3px; width:18px; height:18px;
      border-radius:50%; background:#fff; transition:transform .2s;
      box-shadow:0 1px 3px rgba(0,0,0,.2);
    }
    .toggle-btn.on .toggle-knob { transform:translateX(20px); }

    /* Bouton panier */
    .btn-cart {
      position:relative; background:#3b82f6; color:#fff; border:none;
      border-radius:10px; width:42px; height:42px; display:flex; align-items:center;
      justify-content:center; cursor:pointer;
    }
    .btn-cart .material-icons { font-size:22px; }
    .cart-badge {
      position:absolute; top:-6px; right:-6px; background:#ef4444; color:#fff;
      border-radius:999px; font-size:11px; font-weight:700; min-width:18px;
      height:18px; display:flex; align-items:center; justify-content:center; padding:0 4px;
    }

    /* Cartes produit */
    .product-card { background:#fff; border-radius:12px; border:1px solid #e2e8f0; overflow:hidden; display:flex; flex-direction:column; }
    .product-img-wrap { position:relative; height:160px; overflow:hidden; flex-shrink:0; }
    .product-img { width:100%; height:100%; object-fit:cover; display:block; }
    .product-img-placeholder { width:100%; height:100%; background:#f1f5f9; display:flex; align-items:center; justify-content:center; }
    .product-img-placeholder .material-icons { font-size:48px; color:#cbd5e1; }
    .product-actions-overlay { position:absolute; top:8px; right:8px; display:flex; gap:4px; opacity:0; transition:opacity .15s; }
    .product-img-wrap:hover .product-actions-overlay { opacity:1; }
    .product-actions-overlay .btn-icon { background:rgba(255,255,255,.92); box-shadow:0 1px 4px rgba(0,0,0,.15); }
    .product-body { padding:14px; display:flex; flex-direction:column; flex:1; }
    .product-name { font-size:15px; font-weight:600; color:#1e293b; }
    .product-cat { font-size:12px; color:#3b82f6; margin-top:2px; margin-bottom:6px; }
    .product-desc { font-size:13px; color:#64748b; margin-bottom:12px; }

    /* Variantes catalogue */
    .variants-panel { box-shadow:none !important; border:1px solid #e2e8f0; border-radius:8px !important; margin-top:auto; }
    .variants-list { display:flex; flex-direction:column; gap:8px; padding:4px 0; }
    .variant-row { display:flex; align-items:center; gap:10px; padding:6px; background:#f8fafc; border-radius:6px; }
    .variant-img { width:40px; height:40px; object-fit:cover; border-radius:6px; flex-shrink:0; }
    .variant-img-placeholder { width:40px; height:40px; border-radius:6px; background:#e2e8f0; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .variant-img-placeholder .material-icons { font-size:20px; color:#94a3b8; }
    .variant-info { flex:1; display:flex; flex-direction:column; }
    .variant-name { font-size:13px; font-weight:500; color:#1e293b; }
    .variant-sku { font-size:11px; color:#94a3b8; }
    .variant-price { font-size:13px; font-weight:600; color:#3b82f6; white-space:nowrap; }
    .btn-add-variant {
      display:flex; align-items:center; gap:6px; padding:8px 12px;
      background:transparent; border:1px dashed #cbd5e1; border-radius:6px;
      color:#64748b; cursor:pointer; font-size:13px; margin-top:4px; width:100%;
    }
    .btn-add-variant:hover { border-color:#3b82f6; color:#3b82f6; background:#eff6ff; }
    .btn-add-variant .material-icons { font-size:16px; }

    /* Variantes mode commande */
    .order-variants { display:flex; flex-direction:column; gap:8px; margin-top:10px; }
    .order-variant-row {
      display:flex; align-items:center; gap:10px; padding:8px 10px;
      background:#f8fafc; border-radius:8px; border:1px solid #e2e8f0;
    }
    .order-variant-row.out-of-stock { opacity:.5; }
    .ov-img-wrap { flex-shrink:0; }
    .ov-info { flex:1; display:flex; flex-direction:column; gap:2px; }
    .stock-badges { display:flex; gap:6px; margin-top:4px; }
    .stock-badge {
      display:inline-flex; align-items:center; gap:3px; font-size:11px;
      font-weight:600; padding:2px 6px; border-radius:6px;
    }
    .stock-badge .material-icons { font-size:12px; }
    .stock-badge.warehouse { background:#dbeafe; color:#1d4ed8; }
    .out-label { font-size:12px; color:#ef4444; font-weight:600; white-space:nowrap; }

    /* Contrôle quantité */
    .ov-qty { display:flex; align-items:center; gap:6px; }
    .qty-btn {
      width:28px; height:28px; border-radius:6px; border:1px solid #e2e8f0;
      background:#fff; font-size:16px; font-weight:700; cursor:pointer;
      display:flex; align-items:center; justify-content:center; color:#1e293b;
      transition:all .15s;
    }
    .qty-btn:hover:not(:disabled) { background:#3b82f6; color:#fff; border-color:#3b82f6; }
    .qty-btn:disabled { opacity:.3; cursor:not-allowed; }
    .qty-val { min-width:24px; text-align:center; font-size:14px; font-weight:600; color:#1e293b; }

    /* Panier drawer */
    .empty-cart { text-align:center; padding:32px; color:#94a3b8; }
    .empty-cart .material-icons { font-size:40px; display:block; margin-bottom:8px; }
    .cart-line {
      display:flex; align-items:center; justify-content:space-between;
      padding:10px 0; border-bottom:1px solid #f1f5f9; gap:8px;
    }
    .cart-line-info { display:flex; flex-direction:column; flex:1; min-width:0; }
    .cart-pname { font-size:13px; font-weight:600; color:#1e293b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .cart-vname { font-size:11px; color:#64748b; }
    .cart-line-right { display:flex; align-items:center; gap:8px; }
    .cart-line-total { font-size:13px; font-weight:600; color:#3b82f6; white-space:nowrap; }
    .cart-total {
      display:flex; justify-content:space-between; align-items:center;
      margin-top:16px; padding-top:14px; border-top:2px solid #e2e8f0;
      font-size:15px; font-weight:700; color:#1e293b;
    }
    .total-amount { color:#3b82f6; font-size:18px; }

    /* Création rapide client */
    .client-label-row { display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; }
    .client-label-row label { margin-bottom:0; }
    .btn-new-client {
      display:inline-flex; align-items:center; gap:4px; font-size:12px; font-weight:500;
      color:#3b82f6; background:transparent; border:1px solid #bfdbfe; border-radius:6px;
      padding:4px 10px; cursor:pointer; transition:all .15s;
    }
    .btn-new-client:hover { background:#eff6ff; }
    .btn-new-client .material-icons { font-size:14px; }
    .new-client-form { display:flex; flex-direction:column; gap:8px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:12px; margin-bottom:8px; }
    .btn-save-client {
      display:flex; align-items:center; justify-content:center; gap:6px;
      background:#3b82f6; color:#fff; border:none; border-radius:8px;
      padding:10px; font-size:13px; font-weight:600; cursor:pointer; transition:opacity .15s;
    }
    .btn-save-client:disabled { opacity:.6; cursor:not-allowed; }
    .btn-save-client .material-icons { font-size:16px; }

    /* Résumé commande */
    .order-summary { background:#f8fafc; border-radius:10px; padding:14px; border:1px solid #e2e8f0; }
    .summary-row { display:flex; justify-content:space-between; font-size:13px; color:#475569; padding:4px 0; }
    .summary-total { display:flex; justify-content:space-between; font-size:15px; font-weight:700; color:#1e293b; border-top:1px solid #e2e8f0; margin-top:8px; padding-top:8px; }

    /* Divers */
    .empty-state { padding:48px; text-align:center; color:#94a3b8; }
    .empty-state .material-icons { font-size:48px; display:block; margin-bottom:8px; }
    .field-row { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
    .req { color:#ef4444; }
    .field-optional { color:#94a3b8; font-size:11px; font-weight:400; }
    .field-hint { font-size:11px; color:#64748b; margin-top:4px; font-style:italic; }
    .file-upload { display:flex; align-items:center; gap:10px; padding:12px; border:1px dashed #cbd5e1; border-radius:8px; cursor:pointer; color:#64748b; font-size:13px; }
    .file-upload:hover { border-color:#3b82f6; color:#3b82f6; background:#eff6ff; }
    .file-upload .material-icons { font-size:20px; }
    .img-preview { width:100%; max-height:120px; object-fit:cover; border-radius:8px; margin-top:8px; }
    .form-section-title { font-size:13px; font-weight:600; color:#1e293b; text-transform:uppercase; letter-spacing:.05em; display:flex; align-items:center; gap:8px; padding-bottom:8px; border-bottom:1px solid #e2e8f0; margin-bottom:16px; }
    .variant-count-badge { background:#3b82f6; color:#fff; border-radius:999px; font-size:11px; padding:1px 7px; font-weight:600; }
    .variant-block { border:1px solid #e2e8f0; border-radius:10px; padding:14px; margin-bottom:12px; background:#f8fafc; }
    .variant-block-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; }
    .variant-block-label { font-size:13px; font-weight:600; color:#475569; }
  `]
})
export class CatalogComponent implements OnInit {
  // Catalogue
  products: any[] = [];
  categories: any[] = [];

  // Mode commande
  orderMode = false;
  orderProducts: any[] = [];
  cart: CartLine[] = [];
  clients: any[] = [];
  orderClientId = '';
  orderNote = '';
  orderError = '';
  savingOrder = false;
  showNewClientForm = false;
  newClient = { name: '', phone: '', address: '' };
  newClientError = '';
  creatingClient = false;

  // Drawers
  showProductDrawer = false;
  showVariantDrawer = false;
  showCartDrawer = false;
  showConfirmDrawer = false;

  // Form produit
  editingProduct: any = null;
  selectedProduct: any = null;
  selectedFile: File | null = null;
  saving = false;
  errorMsg = '';
  productForm = { name: '', description: '', category_id: '', tva_rate: 20 };
  tvaTaux = [0, 7, 10, 14, 20];
  productImageFile: File | null = null;
  productImagePreview: string | null = null;
  variants: VariantDraft[] = [];
  variantImageInputs: HTMLInputElement[] = [];
  variantForm = { name: '', price: 0, sku: '' };

  constructor(private api: ApiService, public auth: AuthService, private cdr: ChangeDetectorRef) {}

  ngOnInit() { this.load(); this.loadCategories(); }

  load() { this.api.get<any[]>('/products').subscribe(p => { this.products = [...p]; this.cdr.detectChanges(); }); }
  loadCategories() { this.api.get<any[]>('/categories').subscribe(c => { this.categories = c; this.cdr.detectChanges(); }); }

  // ===== MODE COMMANDE =====
  toggleOrderMode() {
    this.orderMode = !this.orderMode;
    if (this.orderMode) {
      this.cart = [];
      this.api.get<any[]>('/products/order-view').subscribe(p => { this.orderProducts = p; this.cdr.detectChanges(); });
      this.api.get<any[]>('/clients').subscribe(c => { this.clients = c; this.cdr.detectChanges(); });
    }
  }

  get cartCount(): number { return this.cart.reduce((s, l) => s + l.quantity, 0); }
  get cartTotal(): number { return this.cart.reduce((s, l) => s + l.price * l.quantity, 0); }

  getQty(variantId: string): number {
    return this.cart.find(l => l.variantId === variantId)?.quantity || 0;
  }

  addToCart(product: any, variant: any) {
    const existing = this.cart.find(l => l.variantId === variant.id);
    if (existing) {
      existing.quantity++;
    } else {
      this.cart = [...this.cart, {
        variantId: variant.id,
        variantName: variant.name,
        productName: product.name,
        price: variant.price,
        quantity: 1,
        stockWarehouse: variant.stock_warehouse
      }];
    }
    this.cdr.detectChanges();
  }

  removeFromCart(variantId: string) {
    const existing = this.cart.find(l => l.variantId === variantId);
    if (!existing) return;
    if (existing.quantity > 1) { existing.quantity--; }
    else { this.cart = this.cart.filter(l => l.variantId !== variantId); }
    this.cdr.detectChanges();
  }

  addFromCart(line: CartLine) {
    line.quantity++;
    this.cdr.detectChanges();
  }

  removeLineFromCart(i: number) {
    this.cart = this.cart.filter((_, idx) => idx !== i);
    this.cdr.detectChanges();
  }

  goToConfirm() {
    if (!this.cart.length) return;
    this.showCartDrawer = false;
    this.orderClientId = '';
    this.orderNote = '';
    this.orderError = '';
    this.showNewClientForm = false;
    this.newClient = { name: '', phone: '', address: '' };
    this.newClientError = '';
    setTimeout(() => { this.showConfirmDrawer = true; this.cdr.detectChanges(); }, 200);
  }

  toggleNewClientForm() {
    this.showNewClientForm = !this.showNewClientForm;
    this.newClient = { name: '', phone: '', address: '' };
    this.newClientError = '';
  }

  quickCreateClient() {
    if (!this.newClient.name.trim()) { this.newClientError = 'Nom obligatoire'; return; }
    this.creatingClient = true;
    this.newClientError = '';
    this.api.post<any>('/clients', this.newClient).subscribe({
      next: (client) => {
        setTimeout(() => {
          this.clients = [...this.clients, client].sort((a, b) => a.name.localeCompare(b.name));
          this.orderClientId = client.id;
          this.showNewClientForm = false;
          this.creatingClient = false;
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        setTimeout(() => {
          this.creatingClient = false;
          this.newClientError = err.error?.message || 'Erreur lors de la création';
          this.cdr.detectChanges();
        });
      }
    });
  }

  submitOrder() {
    if (!this.orderClientId) { this.orderError = 'Veuillez sélectionner un client'; return; }
    this.savingOrder = true;
    const body = {
      client_id: this.orderClientId,
      note: this.orderNote || null,
      lines: this.cart.map(l => ({ variant_id: l.variantId, quantity: l.quantity, unit_price: l.price }))
    };
    this.api.post<any>('/orders', body).subscribe({
      next: () => {
        this.savingOrder = false;
        this.showConfirmDrawer = false;
        this.cart = [];
        this.orderMode = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.savingOrder = false;
        this.orderError = err.error?.message || 'Erreur lors de la création';
        this.cdr.detectChanges();
      }
    });
  }

  // ===== FORM PRODUIT =====
  openProductForm(p?: any) {
    this.editingProduct = p || null;
    this.productForm = { name: p?.name || '', description: p?.description || '', category_id: p?.category_id || '', tva_rate: p?.tva_rate ?? 20 };
    this.productImageFile = null;
    this.productImagePreview = p?.image_url ? p.image_url : null;
    this.variantImageInputs = [];
    this.errorMsg = '';
    if (p?.variants && p.variants.length > 0 && p.variants[0] !== null) {
      this.variants = p.variants.map((v: any) => ({
        id: v.id, name: v.name || '', price: v.price,
        imageFile: null, imagePreview: v.image_url ? v.image_url : null
      }));
    } else {
      this.variants = [this.emptyVariant()];
    }
    this.showProductDrawer = true;
  }

  emptyVariant(): VariantDraft { return { name: '', price: null, imageFile: null, imagePreview: null }; }
  onProductNameChange() { this.cdr.detectChanges(); }
  addVariant() { this.variants = [...this.variants, this.emptyVariant()]; this.cdr.detectChanges(); }
  removeVariant(i: number) { this.variants = this.variants.filter((_, idx) => idx !== i); this.cdr.detectChanges(); }

  onProductImageChange(e: any) {
    const file: File = e.target.files[0]; if (!file) return;
    this.productImageFile = file;
    const reader = new FileReader();
    reader.onload = (ev) => { this.productImagePreview = ev.target?.result as string; this.cdr.detectChanges(); };
    reader.readAsDataURL(file);
  }

  triggerVariantImageInput(i: number) {
    const inputs = document.querySelectorAll<HTMLInputElement>('.variant-img-input');
    inputs[i]?.click();
  }

  onVariantImageChange(e: any, i: number) {
    const file: File = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      this.variants[i].imageFile = file;
      this.variants[i].imagePreview = ev.target?.result as string;
      this.variants = [...this.variants]; this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);
  }

  saveProduct() {
    if (!this.productForm.name) { this.errorMsg = 'Nom du produit obligatoire'; return; }
    for (let i = 0; i < this.variants.length; i++) {
      if (this.variants[i].price === null) { this.errorMsg = `Prix obligatoire pour la variante ${i + 1}`; return; }
      if (this.variants.length > 1 && !this.variants[i].name) { this.errorMsg = `Nom obligatoire pour la variante ${i + 1}`; return; }
    }
    setTimeout(() => { this.saving = true; this.cdr.detectChanges(); });

    const form = new FormData();
    form.append('name', this.productForm.name);
    form.append('description', this.productForm.description || '');
    form.append('category_id', this.productForm.category_id || '');
    form.append('tva_rate', String(this.productForm.tva_rate ?? 20));
    if (this.productImageFile) form.append('product_image', this.productImageFile);
    const variantsPayload = this.variants.map((v: any) => ({ id: v.id, name: v.name, price: v.price }));
    form.append('variants', JSON.stringify(variantsPayload));
    this.variants.forEach((v, i) => { if (v.imageFile) form.append(`variant_image_${i}`, v.imageFile); });

    const obs = this.editingProduct
      ? this.api.putForm<any>(`/products/${this.editingProduct.id}`, form)
      : this.api.postForm<any>('/products', form);

    obs.subscribe({
      next: () => { setTimeout(() => { this.saving = false; this.showProductDrawer = false; this.cdr.detectChanges(); this.load(); }); },
      error: (err) => { setTimeout(() => { this.saving = false; this.errorMsg = err.error?.message || 'Erreur'; this.cdr.detectChanges(); }); }
    });
  }

  deleteProduct(id: string) {
    if (confirm('Supprimer ce produit ?')) this.api.delete(`/products/${id}`).subscribe(() => this.load());
  }

  openVariantForm(p: any) {
    this.selectedProduct = p; this.variantForm = { name: '', price: 0, sku: '' };
    this.selectedFile = null; this.errorMsg = ''; this.showVariantDrawer = true;
  }
  onFileChange(e: any) { this.selectedFile = e.target.files[0] || null; }
  saveVariant() {
    if (!this.variantForm.name) { this.errorMsg = 'Nom obligatoire'; return; }
    setTimeout(() => { this.saving = true; this.cdr.detectChanges(); });
    const form = new FormData();
    form.append('name', this.variantForm.name);
    form.append('price', String(this.variantForm.price));
    form.append('sku', this.variantForm.sku);
    if (this.selectedFile) form.append('image', this.selectedFile);
    this.api.postForm(`/products/${this.selectedProduct.id}/variants`, form).subscribe({
      next: () => { setTimeout(() => { this.saving = false; this.showVariantDrawer = false; this.cdr.detectChanges(); this.load(); }); },
      error: (err) => { setTimeout(() => { this.saving = false; this.errorMsg = err.error?.message || 'Erreur'; this.cdr.detectChanges(); }); }
    });
  }
  deleteVariant(id: string) {
    if (confirm('Supprimer cette variante ?')) this.api.delete(`/variants/${id}`).subscribe(() => this.load());
  }
}
