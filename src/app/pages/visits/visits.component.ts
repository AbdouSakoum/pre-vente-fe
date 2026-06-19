import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';

const CLOSE_REASONS = [
  { id: 'm1', label: 'Client absent' },
  { id: 'm2', label: 'Point de vente fermé' },
  { id: 'm3', label: 'Stock client suffisant' },
  { id: 'm4', label: 'Refus / pas de besoin' },
  { id: 'm5', label: 'Problème de paiement / impayé' },
];

const CATEGORY_LABELS: Record<string, string> = {
  hanout: 'Hanout', supermarche: 'Supermarché', mini_supermarche: 'Mini supermarché',
  epicerie: 'Épicerie', laiterie: 'Laiterie', restaurant: 'Restaurant', cafe: 'Café',
};

const AVATAR_COLORS = ['#3b82f6','#16a34a','#d97706','#7c3aed','#0ea5e9','#db2777','#059669','#ca8a04'];

type View = 'list' | 'step1' | 'step2' | 'done_order' | 'done_closed';
type Step1Mode = 'pick' | 'add';
type ClientFilter = 'near' | 'all';

@Component({
  selector: 'app-visits',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- PAGE HEADER -->
    <div class="page-header">
      <div>
        <button class="back-link" *ngIf="view !== 'list'" (click)="backToList()">
          <span class="material-icons">arrow_back</span> Mes visites
        </button>
        <div class="page-title">{{ view === 'list' ? 'Mes visites' : view === 'step1' ? 'Nouvelle visite' : view === 'step2' ? 'Préparer la commande' : 'Visite terminée' }}</div>
        <div class="page-sub">{{ todayLabel }}{{ view === 'step1' ? ' · Étape 1 — Identifier le point de vente' : view === 'step2' ? ' · Étape 2 — Catalogue produits' : ' · Tournée du jour' }}</div>
      </div>
      <div class="ph-right">
        <div class="stepper" *ngIf="view === 'step1' || view === 'step2'">
          <div class="step" [class.active]="view==='step1'" [class.done]="view==='step2'">
            <span class="snum">1</span> Client
          </div>
          <div class="step-line"></div>
          <div class="step" [class.active]="view==='step2'">
            <span class="snum">2</span> Commande
          </div>
        </div>
        <div class="period-tabs" *ngIf="view === 'list'">
          <button class="ptab" [class.ptab-active]="period === 'today'"  (click)="setPeriod('today')">Aujourd'hui</button>
          <button class="ptab" [class.ptab-active]="period === 'week'"   (click)="setPeriod('week')">Cette semaine</button>
          <button class="ptab" [class.ptab-active]="period === 'month'"  (click)="setPeriod('month')">Ce mois</button>
          <button class="ptab" [class.ptab-active]="period === 'all'"    (click)="setPeriod('all')">Tous</button>
        </div>
        <button class="btn btn-primary" *ngIf="view === 'list'" (click)="startVisit()">
          <span class="material-icons">add_location_alt</span> Nouvelle visite
        </button>
      </div>
    </div>

    <!-- ===== VUE LISTE ===== -->
    <div class="list-outer" *ngIf="view === 'list'">
      <div class="stats">
        <div class="stat-card">
          <div class="si"><span class="material-icons">location_on</span></div>
          <div><b>{{ visits.length }}</b><span>Visites du jour</span></div>
        </div>
        <div class="stat-card green">
          <div class="si"><span class="material-icons">receipt_long</span></div>
          <div><b>{{ orderedCount }}</b><span>Commandes créées</span></div>
        </div>
        <div class="stat-card amber">
          <div class="si"><span class="material-icons">cancel</span></div>
          <div><b>{{ closedCount }}</b><span>Sans achat</span></div>
        </div>
      </div>
      <div class="card">
        <div class="list-head">
          <h3>{{ periodLabel }}</h3>
          <span class="cnt">{{ visits.length }} visite(s)</span>
        </div>
        <div *ngFor="let v of visits" class="visit-row">
          <div class="v-av" [style.background]="avatarColor(v.client_name)">{{ initials(v.client_name) }}</div>
          <div class="v-main">
            <div class="vn">{{ v.client_name }}</div>
            <div class="vm">{{ v.client_city }}{{ v.client_city && v.client_phone ? ' · ' : '' }}{{ v.client_phone }}</div>
          </div>
          <div class="v-right">
            <span class="pill pill-ok" *ngIf="v.status==='ordered'">Commande créée</span>
            <span class="pill pill-warn" *ngIf="v.status==='closed'">Sans achat</span>
            <ng-container *ngIf="v.status==='in_progress'">
              <span class="pill pill-info">En cours</span>
              <button class="btn-resume" (click)="resumeVisit(v)">
                <span class="material-icons">play_arrow</span> Reprendre
              </button>
            </ng-container>
            <div class="v-motif" *ngIf="v.close_reason">{{ v.close_reason }}</div>
          </div>
        </div>
        <div *ngIf="!visits.length" class="empty-state">
          <span class="material-icons">location_off</span>
          <p>Aucune visite aujourd'hui</p>
        </div>
      </div>
    </div>

    <!-- ===== STEP 1 ===== -->
    <div class="step1-outer" *ngIf="view === 'step1'">
      <div class="step1-grid">

        <!-- COLONNE GAUCHE -->
        <div class="left-col">

          <!-- GEO LOADER -->
          <div class="card geo-loader" *ngIf="geoLoading">
            <div class="geo-radar">
              <div class="ring"></div><div class="ring"></div><div class="ring"></div>
              <div class="geo-pin"><span class="material-icons">location_on</span></div>
            </div>
            <h3>Recherche du client le plus proche…</h3>
            <p>Géolocalisation en cours · analyse des points de vente à proximité</p>
            <div class="geo-progress"><span></span></div>
          </div>

          <!-- SELECT AREA (après géoloc) -->
          <div *ngIf="!geoLoading">

            <!-- Erreur géoloc -->
            <div class="geo-error-bar" *ngIf="geoError">
              <span class="material-icons">location_off</span>
              {{ geoError }}
              <button class="btn-retry" (click)="geolocate()">
                <span class="material-icons">refresh</span> Relancer
              </button>
            </div>

            <!-- Bannière client suggéré -->
            <div class="suggest-banner" *ngIf="suggestedClient && !selectedClient">
              <div class="s-av" [style.background]="avatarColor(suggestedClient.name)">{{ initials(suggestedClient.name) }}</div>
              <div class="s-body">
                <div class="s-tag">
                  <span class="material-icons">near_me</span>
                  Le plus proche · {{ formatDistance(suggestedClient._distance) }}
                </div>
                <div class="s-name">{{ suggestedClient.name }}</div>
                <div class="s-meta">{{ suggestedClient.address || suggestedClient.city || '—' }}{{ suggestedClient.phone ? ' · ' + suggestedClient.phone : '' }}</div>
              </div>
              <button class="btn btn-primary" (click)="confirmSuggested()">Sélectionner</button>
            </div>

            <!-- Card principale -->
            <div class="card" style="padding:20px;margin-top:20px">
              <!-- Segmented control -->
              <div class="seg">
                <button [class.active]="step1Mode==='pick'" (click)="setMode('pick')">Choisir un client</button>
                <button [class.active]="step1Mode==='add'" (click)="setMode('add')">Ajouter un client</button>
              </div>

              <!-- MODE PICK -->
              <div *ngIf="step1Mode==='pick'">
                <div class="search-wrap">
                  <span class="material-icons search-icon">search</span>
                  <input class="input" [(ngModel)]="clientSearch" (ngModelChange)="filterClients()" placeholder="Rechercher par nom, secteur…" />
                </div>
                <!-- Filtres -->
                <div class="fchips" *ngIf="!clientSearch">
                  <button class="fchip" [class.active]="clientFilter==='near'" (click)="setFilter('near')">
                    <span class="material-icons" style="font-size:14px">near_me</span>
                    À proximité <span class="cc">{{ nearbyClients.length }}</span>
                  </button>
                  <button class="fchip" [class.active]="clientFilter==='all'" (click)="setFilter('all')">
                    <span class="material-icons" style="font-size:14px">people</span>
                    Tous les clients <span class="cc">{{ clients.length }}</span>
                  </button>
                </div>
                <!-- Liste -->
                <div class="client-list">
                  <button *ngFor="let c of filteredClients" class="client-row"
                          [class.sel]="selectedClient?.id === c.id"
                          (click)="pickClient(c)">
                    <div class="c-av" [style.background]="avatarColor(c.name)">{{ initials(c.name) }}</div>
                    <div class="c-body">
                      <div class="c-name">{{ c.name }}</div>
                      <div class="c-meta">{{ c.address || c.city || '—' }}</div>
                    </div>
                    <div class="c-dist" *ngIf="c._distance != null">
                      <b>{{ formatDistance(c._distance) }}</b><span>distance</span>
                    </div>
                    <div class="c-dist" *ngIf="c._distance == null">
                      <b style="color:#94a3b8">—</b><span>pas de GPS</span>
                    </div>
                  </button>
                  <div *ngIf="!filteredClients.length" class="empty-state">
                    <span class="material-icons">people_outline</span><p>Aucun client trouvé</p>
                  </div>
                </div>
              </div>

              <!-- MODE ADD -->
              <div *ngIf="step1Mode==='add'">
                <div class="field">
                  <label>Nom du point de vente <span class="req">*</span></label>
                  <input class="input" [(ngModel)]="newClient.name" placeholder="Ex : Épicerie Atlas" [class.err]="newClientError && !newClient.name" />
                </div>
                <div class="field-row2">
                  <div class="field">
                    <label>Téléphone</label>
                    <input class="input" [(ngModel)]="newClient.phone" placeholder="06 00 00 00 00" />
                  </div>
                  <div class="field">
                    <label>Type</label>
                    <select class="input" [(ngModel)]="newClient.category">
                      <option value="">— Sélectionner —</option>
                      <option value="hanout">Hanout</option>
                      <option value="supermarche">Supermarché</option>
                      <option value="mini_supermarche">Mini supermarché</option>
                      <option value="epicerie">Épicerie</option>
                      <option value="laiterie">Laiterie</option>
                      <option value="restaurant">Restaurant</option>
                      <option value="cafe">Café</option>
                    </select>
                  </div>
                </div>
                <div class="field">
                  <label>Adresse</label>
                  <input class="input" [(ngModel)]="newClient.address" placeholder="Rue, quartier, ville" />
                </div>
                <div class="field">
                  <label>Position GPS</label>
                  <div class="gps-row">
                    <input class="input" [value]="newClient.latitude ? (newClient.latitude | number:'1.4-4') + ', ' + (newClient.longitude | number:'1.4-4') : ''"
                           placeholder="33.5731, -7.5898" readonly />
                    <button class="btn btn-ghost gps-btn" (click)="captureGeoForNewClient()" [disabled]="geoCapturing">
                      <span class="material-icons" [class.spin]="geoCapturing">{{ geoCapturing ? 'sync' : 'my_location' }}</span>
                      Capturer
                    </button>
                  </div>
                </div>
                <div *ngIf="newClientError" class="error-bar">
                  <span class="material-icons">error_outline</span> {{ newClientError }}
                </div>
                <button class="btn btn-primary" style="width:100%;margin-top:8px" (click)="createAndContinue()" [disabled]="savingNewClient">
                  {{ savingNewClient ? 'Création…' : 'Ajouter et sélectionner' }}
                </button>
              </div>
            </div>

            <!-- Bouton relancer -->
            <button class="btn btn-ghost" style="margin-top:16px" (click)="geolocate()">
              <span class="material-icons">refresh</span> Relancer la détection
            </button>
          </div>
        </div>

        <!-- COLONNE DROITE : détail client sélectionné -->
        <div class="right-col" *ngIf="selectedClient">
          <div class="card" style="padding:22px">
            <div class="cd-head">
              <div class="c-av lg" [style.background]="avatarColor(selectedClient.name)">{{ initials(selectedClient.name) }}</div>
              <div>
                <div class="cd-name">{{ selectedClient.name }}</div>
                <div class="cd-meta">{{ selectedClient.address || selectedClient.city || '—' }}{{ selectedClient.phone ? ' · ' + selectedClient.phone : '' }}</div>
              </div>
            </div>
            <div class="cd-stats">
              <div class="cd-stat">
                <div class="cds-label">Catégorie</div>
                <div class="cds-val">{{ selectedClient.category ? categoryLabel(selectedClient.category) : '—' }}</div>
              </div>
              <div class="cd-stat" *ngIf="selectedClient._distance != null">
                <div class="cds-label">Distance</div>
                <div class="cds-val green">{{ formatDistance(selectedClient._distance) }}</div>
              </div>
            </div>
          </div>

          <!-- Historique visites -->
          <div class="card" style="margin-top:20px" *ngIf="clientHistory.length">
            <div class="hist-header">
              <span class="material-icons">history</span>
              <span>{{ clientHistory.length }} dernière(s) visite(s)</span>
            </div>
            <div *ngFor="let h of clientHistory; let last=last" class="hist-block" [class.last]="last">

              <!-- En-tête visite -->
              <div class="hist-row-head">
                <div class="hist-date-badge">{{ h.visited_at | date:'dd/MM/yy' }}</div>
                <div class="hist-info">
                  <span class="pill pill-ok" *ngIf="h.status==='ordered'">
                    <span class="material-icons" style="font-size:11px">check</span>
                    Commande #{{ h.order_number || '—' }}
                  </span>
                  <span class="pill pill-warn" *ngIf="h.status==='closed'">
                    <span class="material-icons" style="font-size:11px">close</span>
                    Sans achat
                  </span>
                  <span class="pill pill-info" *ngIf="h.status==='in_progress'">
                    <span class="material-icons" style="font-size:11px">pending</span>
                    En cours
                  </span>
                </div>
                <div class="hist-ttc" *ngIf="h.total_ttc">{{ h.total_ttc | number:'1.2-2' }} DH</div>
                <button class="eye-btn" (click)="openDetail(h)" title="Voir le détail">
                  <span class="material-icons">visibility</span>
                </button>
              </div>

              <!-- Motif clôture -->
              <div class="hist-motif" *ngIf="h.status==='closed' && h.close_reason">
                {{ h.close_reason }}
              </div>

            </div>
          </div>

          <button class="btn btn-primary btn-lg" style="width:100%;margin-top:20px" (click)="goStep2()" [disabled]="saving">
            {{ saving ? 'Chargement…' : 'Suivante — Préparer la commande' }}
            <span class="material-icons">arrow_forward</span>
          </button>
        </div>

        <!-- Placeholder droite -->
        <div class="card right-placeholder" *ngIf="!selectedClient">
          <span class="material-icons">person_pin</span>
          <p>Sélectionnez un client pour voir son historique</p>
        </div>

      </div>
    </div>

    <!-- ===== STEP 2 ===== -->
    <div class="step2-outer" *ngIf="view === 'step2'">
      <div class="step2-shell">
        <div class="step2-body">
          <!-- Catalogue -->
          <div class="step2-catalogue">
            <div class="search-wrap" style="margin-bottom:18px">
              <span class="material-icons search-icon">search</span>
              <input class="input" [(ngModel)]="productSearch" (ngModelChange)="filterProducts()" placeholder="Rechercher un produit…" />
            </div>
            <div class="prod-grid">
              <div *ngFor="let p of filteredProducts" class="prod-card">
                <div class="prod-img">
                  <img *ngIf="p._selectedVariant?.image_url || p.image_url; else noImg"
                    [src]="p._selectedVariant?.image_url || p.image_url" [alt]="p.name" />
                  <ng-template #noImg><span class="material-icons">inventory_2</span></ng-template>
                </div>
                <div class="prod-body">
                  <div class="prod-name">{{ p.name }}</div>
                  <div class="prod-cat">{{ p.category_name }}</div>
                  <select class="input prod-select" [(ngModel)]="p._selectedVariant">
                    <option *ngFor="let v of p.variants" [ngValue]="v">{{ v.name }} — {{ v.price | number:'1.2-2' }} DH</option>
                  </select>
                  <div class="prod-price">{{ (p._selectedVariant?.price || 0) | number:'1.2-2' }} DH <span>/ unité</span></div>
                  <div class="prod-foot">
                    <div class="qty-ctrl">
                      <button (click)="bump(p,-1)">−</button>
                      <input type="number" [(ngModel)]="p._qty" min="1" />
                      <button (click)="bump(p,1)">+</button>
                    </div>
                    <button class="add-btn" (click)="addToCart(p)">
                      <span class="material-icons">add</span> Ajouter
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Panier -->
          <div class="card cart-panel">
            <div class="cart-head">
              <span class="material-icons ci">shopping_cart</span>
              <h3>Commande</h3>
              <span class="cart-count">{{ cartQty }}</span>
            </div>
            <div class="cart-body">
              <div *ngIf="!cart.length" class="cart-empty">
                <span class="material-icons">remove_shopping_cart</span>
                <p>Aucun produit ajouté</p>
              </div>
              <div *ngFor="let item of cart" class="ci-row">
                <div class="ci-info">
                  <div class="cn">{{ item.name }}</div>
                  <div class="cm">{{ item.variant }}</div>
                  <div class="cqty">{{ item.qty }} × {{ item.price | number:'1.2-2' }} DH</div>
                </div>
                <div class="cp">{{ item.qty * item.price | number:'1.2-2' }} DH</div>
                <button class="crm" (click)="removeFromCart(item)">
                  <span class="material-icons">close</span>
                </button>
              </div>
            </div>
            <div class="cart-foot" *ngIf="cart.length">
              <div class="tot-row"><span>Sous-total HT</span><span>{{ subTotal / 1.2 | number:'1.2-2' }} DH</span></div>
              <div class="tot-row"><span>TVA (20%)</span><span>{{ subTotal - subTotal / 1.2 | number:'1.2-2' }} DH</span></div>
              <div class="tot-row grand"><span>Total TTC</span><span>{{ subTotal | number:'1.2-2' }} DH</span></div>
            </div>
          </div>
        </div>

        <!-- Footer fixe -->
        <div class="step2-footer">
          <button class="btn btn-ghost btn-lg" (click)="view='step1'">
            <span class="material-icons">arrow_back</span> Retour
          </button>
          <div class="step2-actions-right">
            <button class="btn btn-danger btn-lg" (click)="showCloseDrawer=true">
              <span class="material-icons">cancel</span> Clôturer sans achat
            </button>
            <button class="btn btn-primary btn-lg" [disabled]="!cart.length || saving" (click)="createOrder()">
              <span class="material-icons">check</span>
              {{ saving ? 'Enregistrement…' : 'Créer la commande' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== DONE : COMMANDE ===== -->
    <div class="confirm-outer" *ngIf="view === 'done_order'">
      <div class="card confirm ok">
        <div class="ci-big"><span class="material-icons">check_circle</span></div>
        <h2>Commande créée</h2>
        <div class="sub">La visite a été clôturée avec une commande.</div>
        <div class="recap">
          <div class="recap-row" *ngIf="createdOrder?.order_number"><span>N° commande</span><b>#{{ createdOrder.order_number }}</b></div>
          <div class="recap-row"><span>Client</span><b>{{ selectedClient?.name }}</b></div>
          <div class="recap-row"><span>Articles</span><b>{{ cartQty }} unité(s) · {{ cart.length }} réf.</b></div>
          <div class="recap-row"><span>HT</span><b>{{ createdOrder?.total_ht ?? (subTotal / 1.2) | number:'1.2-2' }} DH</b></div>
          <div class="recap-row"><span>TVA 20%</span><b>{{ createdOrder?.total_tva ?? (subTotal - subTotal / 1.2) | number:'1.2-2' }} DH</b></div>
          <div class="recap-row tot"><span>Total TTC</span><b>{{ createdOrder?.total_ttc ?? subTotal | number:'1.2-2' }} DH</b></div>
        </div>
        <div class="confirm-actions">
          <button class="btn btn-ghost btn-lg" (click)="backToList()"><span class="material-icons">arrow_back</span> Retour aux visites</button>
          <button class="btn btn-pdf btn-lg" (click)="viewBonCommande()" *ngIf="createdOrder?.id">
            <span class="material-icons">picture_as_pdf</span> Bon de commande
          </button>
          <button class="btn btn-primary btn-lg" (click)="startVisit()"><span class="material-icons">add_location_alt</span> Nouvelle visite</button>
        </div>
      </div>
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

    <!-- ===== DONE : SANS ACHAT ===== -->
    <div class="confirm-outer" *ngIf="view === 'done_closed'">
      <div class="card confirm closed">
        <div class="ci-big warn"><span class="material-icons">info</span></div>
        <h2>Visite clôturée sans achat</h2>
        <div class="sub">Le motif a été enregistré pour le reporting terrain.</div>
        <div class="recap">
          <div class="recap-row"><span>Client</span><b>{{ selectedClient?.name }}</b></div>
          <div class="recap-row"><span>Motif</span><b>{{ closeReasonFinal }}</b></div>
        </div>
        <div class="confirm-actions">
          <button class="btn btn-ghost btn-lg" (click)="backToList()"><span class="material-icons">arrow_back</span> Retour aux visites</button>
          <button class="btn btn-primary btn-lg" (click)="startVisit()"><span class="material-icons">add_location_alt</span> Nouvelle visite</button>
        </div>
      </div>
    </div>

    <!-- MODAL DETAIL VISITE -->
    <div class="overlay" [class.show]="showDetailModal" (click)="closeDetail()">
      <div class="modal modal-detail" (click)="$event.stopPropagation()" *ngIf="detailVisit">
        <div class="modal-head">
          <div class="detail-title-row">
            <span class="material-icons detail-icon" [style.color]="detailVisit.status==='ordered' ? '#16a34a' : detailVisit.status==='closed' ? '#d97706' : '#3b82f6'">
              {{ detailVisit.status==='ordered' ? 'receipt_long' : detailVisit.status==='closed' ? 'cancel' : 'pending' }}
            </span>
            <div>
              <h2>{{ detailVisit.status==='ordered' ? 'Détail commande' : detailVisit.status==='closed' ? 'Détail visite' : 'Visite en cours' }}</h2>
              <p>{{ detailVisit.visited_at | date:'dd/MM/yyyy' }}</p>
            </div>
            <button class="modal-close" (click)="closeDetail()"><span class="material-icons">close</span></button>
          </div>
        </div>

        <!-- Infos générales -->
        <div class="modal-body">
          <div class="detail-info-row">
            <span class="detail-label">Client</span>
            <span class="detail-val">{{ detailVisit.client_name }}</span>
          </div>
          <div class="detail-info-row">
            <span class="detail-label">Statut</span>
            <span class="pill pill-ok" *ngIf="detailVisit.status==='ordered'">Commande #{{ detailVisit.order_number || '—' }}</span>
            <span class="pill pill-warn" *ngIf="detailVisit.status==='closed'">Sans achat</span>
            <span class="pill pill-info" *ngIf="detailVisit.status==='in_progress'">En cours</span>
          </div>
        </div>

        <!-- CAS COMMANDE -->
        <ng-container *ngIf="detailVisit.status==='ordered'">
          <div class="modal-section-title">Articles commandés</div>
          <div class="modal-body" style="padding-top:0">
            <div *ngIf="detailVisit.order_lines?.length; else noLines">
              <div *ngFor="let l of detailVisit.order_lines" class="detail-line">
                <div class="dl-name">{{ l.product_name }} <span class="dl-var">{{ l.variant_name }}</span></div>
                <div class="dl-qty">{{ l.quantity }} × {{ l.unit_price | number:'1.2-2' }} DH</div>
                <div class="dl-total">{{ l.line_total | number:'1.2-2' }} DH</div>
              </div>
            </div>
            <ng-template #noLines>
              <p style="color:#94a3b8;font-size:13px;padding:8px 0">Détail articles non disponible</p>
            </ng-template>
          </div>
          <div class="modal-totals" *ngIf="detailVisit.total_ttc">
            <div class="tot-detail-row"><span>Sous-total HT</span><span>{{ detailVisit.total_ht | number:'1.2-2' }} DH</span></div>
            <div class="tot-detail-row"><span>TVA 20%</span><span>{{ detailVisit.total_tva | number:'1.2-2' }} DH</span></div>
            <div class="tot-detail-row grand"><span>Total TTC</span><span>{{ detailVisit.total_ttc | number:'1.2-2' }} DH</span></div>
          </div>
        </ng-container>

        <!-- CAS SANS ACHAT -->
        <ng-container *ngIf="detailVisit.status==='closed'">
          <div class="modal-section-title">Motif</div>
          <div class="modal-body" style="padding-top:0">
            <div class="motif-detail">
              <span class="material-icons" style="color:#d97706;font-size:18px">info</span>
              {{ detailVisit.close_reason || 'Motif non renseigné' }}
            </div>
          </div>
        </ng-container>

        <div class="modal-foot">
          <button class="btn btn-ghost" (click)="closeDetail()">Fermer</button>
        </div>
      </div>
    </div>

    <!-- MODAL CLOTURE SANS ACHAT -->
    <div class="overlay" [class.show]="showCloseDrawer" (click)="showCloseDrawer=false">
      <div class="modal" (click)="$event.stopPropagation()">
        <div class="modal-head">
          <h2>Clôturer sans achat</h2>
          <p>Sélectionnez le motif de la visite sans commande.</p>
        </div>
        <div class="modal-body">
          <button *ngFor="let m of reasons" class="motif-btn" [class.sel]="selectedMotif===m.id" (click)="pickMotif(m.id)">
            <span class="radio"></span>
            <span class="mt">{{ m.label }}</span>
          </button>
        </div>
        <div class="modal-body" style="padding-top:0">
          <div class="field">
            <label>Note (optionnel)</label>
            <input class="input" [(ngModel)]="closeNote" placeholder="Précision…" />
          </div>
        </div>
        <div class="modal-foot">
          <button class="btn btn-ghost" (click)="showCloseDrawer=false">Annuler</button>
          <button class="btn btn-primary" [disabled]="!selectedMotif || saving" (click)="confirmClose()">
            Confirmer la clôture
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display:flex; flex-direction:column; height:100%; overflow:hidden; }

    /* ===== HEADER ===== */
    .back-link { display:inline-flex; align-items:center; gap:6px; color:#64748b; font-size:13px; font-weight:600; margin-bottom:6px; background:none; border:none; cursor:pointer; padding:0; }
    .back-link:hover { color:#3b82f6; }
    .back-link .material-icons { font-size:16px; }
    .page-title { font-size:26px; font-weight:700; }
    .page-sub { font-size:14px; color:#6b7280; margin-top:3px; }
    .ph-right { display:flex; align-items:center; gap:14px; }
    .period-tabs { display:flex;gap:4px;background:#f0f2f6;border-radius:10px;padding:3px }
    .ptab { padding:6px 13px;border:none;border-radius:8px;background:transparent;font-size:12.5px;font-weight:600;color:#6b7280;cursor:pointer;transition:.13s;white-space:nowrap }
    .ptab:hover { color:#1f2a37 }
    .ptab-active { background:#fff;color:#3b82f6;box-shadow:0 1px 3px rgba(16,24,40,.1) }

    /* ===== STEPPER ===== */
    .stepper { display:flex; align-items:center; background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:6px; }
    .step { display:flex; align-items:center; gap:10px; padding:10px 18px; border-radius:9px; color:#94a3b8; font-size:14px; font-weight:600; }
    .snum { width:25px; height:25px; border-radius:50%; background:#eef1f5; color:#94a3b8; display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:700; }
    .step.active { color:#3b82f6; }
    .step.active .snum { background:#3b82f6; color:#fff; }
    .step.done { color:#16a34a; }
    .step.done .snum { background:#dcfce7; color:#16a34a; }
    .step-line { width:30px; height:2px; background:#e2e8f0; margin:0 2px; }

    /* ===== LISTE ===== */
    .list-outer { flex:1; overflow-y:auto; }
    .stats { display:grid; grid-template-columns:repeat(3,1fr); gap:18px; margin-bottom:24px; }
    .stat-card { background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:22px 24px; display:flex; align-items:center; gap:16px; }
    .si { width:46px; height:46px; border-radius:11px; background:#fff; border:1px solid #e2e8f0; display:flex; align-items:center; justify-content:center; color:#3b82f6; flex-shrink:0; }
    .si .material-icons { font-size:22px; }
    .stat-card.green .si { color:#16a34a; }
    .stat-card.amber .si { color:#d97706; }
    .stat-card b { font-size:28px; font-weight:800; display:block; }
    .stat-card span { font-size:13px; color:#6b7280; display:block; margin-top:4px; }
    .list-head { padding:18px 24px; border-bottom:1px solid #f1f5f9; display:flex; align-items:center; }
    .list-head h3 { font-size:16px; font-weight:700; }
    .cnt { margin-left:auto; font-size:13px; color:#6b7280; }
    .visit-row { display:flex; align-items:center; gap:14px; padding:16px 24px; border-bottom:1px solid #f8fafc; }
    .visit-row:last-child { border-bottom:none; }
    .v-av { width:42px; height:42px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:14px; color:#fff; flex-shrink:0; }
    .v-main { flex:1; }
    .vn { font-weight:600; font-size:15px; }
    .vm { font-size:12px; color:#94a3b8; margin-top:2px; }
    .v-right { text-align:right; display:flex; flex-direction:column; align-items:flex-end; gap:6px; }
    .btn-resume { display:inline-flex; align-items:center; gap:4px; padding:5px 12px; border-radius:8px; border:none; background:#2f6bff; color:#fff; font-size:13px; font-weight:600; cursor:pointer; }
    .btn-resume .material-icons { font-size:16px; }
    .v-motif { font-size:12px; color:#94a3b8; margin-top:4px; }
    .pill { font-size:11px; font-weight:600; padding:3px 10px; border-radius:20px; display:inline-block; }
    .pill-ok { background:#dcfce7; color:#15803d; }
    .pill-warn { background:#fef3c7; color:#d97706; }
    .pill-info { background:#dbeafe; color:#1d4ed8; }

    /* ===== STEP 1 ===== */
    .step1-outer { flex:1; overflow-y:auto; }
    .step1-grid { display:grid; grid-template-columns:1.15fr .85fr; gap:22px; align-items:start; }

    /* Geo loader */
    .geo-loader { padding:46px 40px; text-align:center; }
    .geo-radar { width:120px; height:120px; margin:0 auto 26px; position:relative; }
    .ring { position:absolute; inset:0; border-radius:50%; border:2px solid #3b82f6; opacity:0; animation:radar 2s ease-out infinite; }
    .ring:nth-child(2) { animation-delay:.6s; }
    .ring:nth-child(3) { animation-delay:1.2s; }
    @keyframes radar { 0%{transform:scale(.3);opacity:.55} 100%{transform:scale(1);opacity:0} }
    .geo-pin { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; }
    .geo-pin .material-icons { font-size:40px; color:#3b82f6; animation:bob 1.6s ease-in-out infinite; }
    @keyframes bob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
    .geo-loader h3 { font-size:18px; font-weight:700; margin-bottom:7px; }
    .geo-loader p { color:#6b7280; font-size:14px; }
    .geo-progress { height:6px; background:#eef1f5; border-radius:6px; margin:24px auto 0; max-width:320px; overflow:hidden; }
    .geo-progress span { display:block; height:100%; width:0; background:#3b82f6; border-radius:6px; animation:fill 2.4s ease forwards; }
    @keyframes fill { to{width:100%} }

    /* Erreur géoloc */
    .geo-error-bar { display:flex; align-items:center; gap:10px; padding:12px 16px; background:#fef2f2; border:1px solid #fecaca; border-radius:10px; color:#dc2626; font-size:13px; }
    .geo-error-bar .material-icons { font-size:18px; }
    .btn-retry { margin-left:auto; display:flex; align-items:center; gap:6px; padding:6px 12px; border-radius:7px; background:#fff; border:1px solid #fca5a5; color:#dc2626; font-size:12px; font-weight:600; cursor:pointer; }

    /* Bannière suggestion */
    .suggest-banner { display:flex; align-items:center; gap:18px; padding:20px 22px; background:linear-gradient(0deg,#f6faff,#fff); border:1px solid #cfe0fb; border-radius:12px; }
    .s-av { width:54px; height:54px; border-radius:12px; flex-shrink:0; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:18px; color:#fff; }
    .s-body { flex:1; }
    .s-tag { display:inline-flex; align-items:center; gap:5px; background:#eaf1fe; color:#2563eb; font-size:12px; font-weight:700; padding:4px 10px; border-radius:20px; margin-bottom:6px; }
    .s-tag .material-icons { font-size:13px; }
    .s-name { font-size:16px; font-weight:700; }
    .s-meta { font-size:13px; color:#6b7280; margin-top:2px; }

    /* Segmented control */
    .seg { display:flex; gap:8px; background:#f1f4f8; padding:5px; border-radius:10px; margin-bottom:18px; }
    .seg button { flex:1; padding:9px; border-radius:7px; font-size:13px; font-weight:600; color:#6b7280; background:none; border:none; cursor:pointer; transition:.15s; }
    .seg button.active { background:#fff; color:#3b82f6; box-shadow:0 1px 3px rgba(0,0,0,.08); }

    /* Filtres chips */
    .fchips { display:flex; gap:8px; margin-bottom:14px; }
    .fchip { display:flex; align-items:center; gap:7px; padding:7px 15px; border:1px solid #e2e8f0; border-radius:20px; font-size:13px; font-weight:600; color:#6b7280; background:#fff; cursor:pointer; transition:.15s; }
    .fchip:hover { border-color:#bcd2f8; }
    .fchip.active { background:#eaf1fe; color:#2563eb; border-color:#bcd2f8; }
    .cc { background:#eef1f5; color:#6b7280; font-size:11px; font-weight:700; border-radius:20px; padding:1px 7px; }
    .fchip.active .cc { background:#fff; color:#2563eb; }

    /* Search */
    .search-wrap { position:relative; margin-bottom:14px; }
    .search-wrap .search-icon { position:absolute; left:12px; top:50%; transform:translateY(-50%); color:#94a3b8; font-size:18px; pointer-events:none; z-index:1; }
    .input { width:100%; padding:11px 13px; border:1px solid #e2e8f0; border-radius:9px; font-size:14px; font-family:inherit; background:#fff; transition:.15s; box-sizing:border-box; }
    .input:focus { outline:none; border-color:#3b82f6; box-shadow:0 0 0 3px rgba(59,130,246,.12); }
    .input.err { border-color:#ef4444; }
    .search-wrap .input { padding-left:40px; }

    /* Client list */
    .client-list { display:flex; flex-direction:column; gap:10px; }
    .client-row { display:flex; align-items:center; gap:14px; padding:14px 16px; border:1px solid #e2e8f0; border-radius:10px; background:#fff; cursor:pointer; text-align:left; width:100%; transition:.15s; }
    .client-row:hover { border-color:#bcd2f8; background:#fafcff; }
    .client-row.sel { border-color:#3b82f6; background:#f4f8ff; box-shadow:0 0 0 3px rgba(59,130,246,.12); }
    .c-av { width:44px; height:44px; border-radius:10px; flex-shrink:0; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:15px; color:#fff; }
    .c-av.lg { width:52px; height:52px; font-size:18px; border-radius:12px; }
    .c-body { flex:1; }
    .c-name { font-weight:600; font-size:15px; }
    .c-meta { font-size:13px; color:#6b7280; margin-top:2px; }
    .c-dist { text-align:right; flex-shrink:0; }
    .c-dist b { display:block; font-size:14px; color:#2563eb; }
    .c-dist span { font-size:11px; color:#94a3b8; }

    /* Formulaire nouveau client */
    .field { margin-bottom:14px; }
    .field label { display:block; font-size:13px; font-weight:600; color:#4b5563; margin-bottom:6px; }
    .req { color:#ef4444; }
    .field-row2 { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
    .gps-row { display:flex; gap:10px; }
    .gps-row .input { flex:1; }
    .gps-btn { display:flex; align-items:center; gap:6px; white-space:nowrap; }
    .error-bar { display:flex; align-items:center; gap:8px; padding:10px 14px; background:#fef2f2; border-radius:8px; color:#dc2626; font-size:13px; margin-bottom:10px; }

    /* Right col */
    .right-col { display:flex; flex-direction:column; }
    .right-placeholder { padding:48px 28px; text-align:center; color:#94a3b8; }
    .right-placeholder .material-icons { font-size:46px; display:block; margin-bottom:14px; opacity:.6; }
    .cd-head { display:flex; align-items:center; gap:14px; }
    .cd-name { font-size:17px; font-weight:700; }
    .cd-meta { font-size:13px; color:#6b7280; }
    .cd-stats { display:flex; gap:10px; margin-top:16px; }
    .cd-stat { flex:1; background:#f7f9fc; border:1px solid #e2e8f0; border-radius:10px; padding:12px 14px; }
    .cds-label { font-size:12px; color:#6b7280; }
    .cds-val { font-size:15px; font-weight:700; margin-top:4px; }
    .cds-val.green { color:#16a34a; }
    .sec-title { font-size:13px; font-weight:700; letter-spacing:.04em; color:#6b7280; text-transform:uppercase; margin-bottom:14px; }

    /* Historique détaillé */
    .hist-header { display:flex; align-items:center; gap:8px; padding:14px 20px; border-bottom:1px solid #f1f5f9; font-size:13px; font-weight:700; color:#6b7280; text-transform:uppercase; letter-spacing:.04em; }
    .hist-header .material-icons { font-size:16px; color:#94a3b8; }
    .hist-block { padding:16px 20px; border-bottom:1px solid #f1f5f9; }
    .hist-block.last { border-bottom:none; }
    .hist-row-head { display:flex; align-items:center; gap:10px; margin-bottom:8px; }
    .hist-date-badge { background:#f1f5f9; color:#475569; font-size:12px; font-weight:700; padding:4px 10px; border-radius:20px; white-space:nowrap; flex-shrink:0; }
    .hist-info { flex:1; }
    .hist-ttc { font-size:15px; font-weight:700; color:#1f2a37; white-space:nowrap; }
    .hist-motif { font-size:12px; color:#d97706; background:#fef3c7; padding:5px 10px; border-radius:6px; margin-bottom:4px; }
    .hist-totals { background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:10px 12px; margin-bottom:10px; display:flex; flex-direction:column; gap:4px; }
    .ht-row { display:flex; justify-content:space-between; font-size:12px; color:#6b7280; }
    .ht-row.bold { font-size:13px; font-weight:700; color:#1f2a37; border-top:1px solid #e2e8f0; margin-top:4px; padding-top:4px; }
    .hist-lines { display:flex; flex-direction:column; gap:5px; }
    .hist-line { display:flex; align-items:baseline; gap:6px; padding:5px 8px; background:#f8fafc; border-radius:7px; }
    .hl-name { flex:1; font-size:13px; font-weight:600; color:#1f2a37; }
    .hl-var { font-size:11px; color:#6b7280; font-weight:400; }
    .hl-qty { font-size:12px; color:#6b7280; white-space:nowrap; }
    .hl-total { font-size:12px; font-weight:700; color:#2563eb; white-space:nowrap; }

    /* ===== STEP 2 ===== */
    .step2-outer { flex:1; min-height:0; display:flex; flex-direction:column; overflow:hidden; }
    .step2-shell { display:flex; flex-direction:column; flex:1; min-height:0; }
    .step2-body { flex:1; min-height:0; display:grid; grid-template-columns:1fr 360px; gap:22px; overflow:hidden; }
    .step2-catalogue { overflow-y:auto; padding-right:4px; }
    .prod-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(230px,1fr)); gap:18px; }
    .prod-card { background:#fff; border:1px solid #e2e8f0; border-radius:12px; overflow:hidden; display:flex; flex-direction:column; }
    .prod-img { height:100px; background:repeating-linear-gradient(45deg,#f1f4f8,#f1f4f8 10px,#eaeef3 10px,#eaeef3 20px); display:flex; align-items:center; justify-content:center; color:#b7c0cc; overflow:hidden; }
    .prod-img img { width:100%; height:100%; object-fit:cover; }
    .prod-img .material-icons { font-size:34px; }
    .prod-body { padding:14px; display:flex; flex-direction:column; gap:6px; flex:1; }
    .prod-name { font-weight:700; font-size:15px; }
    .prod-cat { font-size:12px; color:#3b82f6; font-weight:600; }
    .prod-select { font-size:13px; }
    .prod-price { font-size:15px; font-weight:700; }
    .prod-price span { font-size:12px; color:#6b7280; font-weight:500; }
    .prod-foot { display:flex; gap:8px; align-items:center; margin-top:auto; }
    .qty-ctrl { display:flex; align-items:center; border:1px solid #e2e8f0; border-radius:8px; overflow:hidden; }
    .qty-ctrl button { width:34px; height:34px; font-size:18px; color:#6b7280; background:#f7f9fc; border:none; cursor:pointer; }
    .qty-ctrl button:hover { background:#eef2f7; }
    .qty-ctrl input { flex:1; border:none; text-align:center; font-size:14px; font-weight:600; width:40px; }
    .add-btn { flex:1; background:#eaf1fe; color:#1d4ed8; font-weight:600; font-size:13px; padding:9px; border-radius:8px; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:7px; }
    .add-btn:hover { background:#dbe8fd; }

    /* Cart */
    .cart-panel { display:flex; flex-direction:column; overflow:hidden; }
    .cart-head { display:flex; align-items:center; gap:10px; padding:16px 20px; border-bottom:1px solid #f1f5f9; flex-shrink:0; }
    .cart-head .ci { color:#3b82f6; font-size:20px; }
    .cart-head h3 { font-size:16px; font-weight:700; flex:1; }
    .cart-count { background:#3b82f6; color:#fff; font-size:12px; font-weight:700; border-radius:20px; padding:2px 9px; }
    .cart-body { flex:1; min-height:0; padding:8px 20px; overflow-y:auto; }
    .cart-empty { padding:40px 20px; text-align:center; color:#94a3b8; }
    .cart-empty .material-icons { font-size:42px; display:block; margin-bottom:12px; opacity:.5; }
    .ci-row { display:flex; align-items:center; gap:12px; padding:12px 0; border-bottom:1px solid #f8fafc; }
    .ci-row:last-child { border-bottom:none; }
    .ci-info { flex:1; }
    .cn { font-weight:600; font-size:14px; }
    .cm { font-size:12px; color:#6b7280; margin-top:2px; }
    .cqty { font-size:13px; color:#6b7280; margin-top:3px; }
    .cp { margin-left:auto; font-weight:600; font-size:14px; white-space:nowrap; }
    .crm { width:24px; height:24px; border-radius:6px; display:flex; align-items:center; justify-content:center; flex-shrink:0; border:none; background:none; cursor:pointer; color:#94a3b8; }
    .crm:hover { background:#fef2f2; color:#ef4444; }
    .crm .material-icons { font-size:16px; }
    .cart-foot { padding:16px 20px; border-top:1px solid #e2e8f0; flex-shrink:0; }
    .tot-row { display:flex; justify-content:space-between; font-size:14px; color:#6b7280; margin-bottom:8px; }
    .tot-row.grand { font-size:18px; font-weight:700; color:#1f2a37; margin-top:12px; margin-bottom:0; }
    .step2-footer { flex-shrink:0; display:flex; justify-content:space-between; align-items:center; padding:14px 0 0; border-top:1px solid #e2e8f0; margin-top:16px; background:#f8fafc; }
    .step2-actions-right { display:flex; gap:12px; }

    /* ===== CONFIRM ===== */
    .confirm-outer { flex:1; overflow-y:auto; display:flex; align-items:center; justify-content:center; }
    .confirm { max-width:620px; width:100%; margin:0 auto; padding:48px 40px; text-align:center; }
    .ci-big { width:88px; height:88px; border-radius:50%; background:#dcfce7; color:#16a34a; display:flex; align-items:center; justify-content:center; margin:0 auto 24px; }
    .ci-big.warn { background:#fef3c7; color:#d97706; }
    .ci-big .material-icons { font-size:44px; }
    .confirm h2 { font-size:26px; font-weight:700; margin-bottom:8px; }
    .sub { color:#6b7280; font-size:15px; margin-bottom:28px; }
    .recap { background:#f7f9fc; border:1px solid #e2e8f0; border-radius:12px; padding:22px 24px; text-align:left; margin-bottom:28px; }
    .recap-row { display:flex; justify-content:space-between; padding:9px 0; font-size:14px; border-bottom:1px dashed #e3e8ef; }
    .recap-row:last-child { border-bottom:none; }
    .recap-row span { color:#6b7280; }
    .recap-row.tot b { color:#2563eb; font-size:18px; }
    .confirm-actions { display:flex; gap:12px; justify-content:center; flex-wrap:wrap; }

    /* ===== MODAL CLOTURE ===== */
    .overlay { position:fixed; inset:0; background:rgba(16,24,40,.5); display:none; align-items:center; justify-content:center; z-index:100; padding:24px; backdrop-filter:blur(2px); }
    .overlay.show { display:flex; }
    .modal { background:#fff; border-radius:16px; max-width:520px; width:100%; box-shadow:0 10px 30px rgba(16,24,40,.15); overflow:hidden; animation:pop .2s ease; }
    @keyframes pop { from{transform:scale(.96);opacity:0} to{transform:scale(1);opacity:1} }
    .modal-head { padding:22px 24px 0; }
    .modal-head h2 { font-size:20px; font-weight:700; }
    .modal-head p { color:#6b7280; font-size:14px; margin-top:4px; }
    .modal-body { padding:18px 24px; display:flex; flex-direction:column; gap:10px; }
    .motif-btn { display:flex; align-items:center; gap:13px; padding:14px 16px; border:1px solid #e2e8f0; border-radius:10px; background:#fff; cursor:pointer; text-align:left; width:100%; transition:.15s; }
    .motif-btn:hover { border-color:#bcd2f8; background:#fafcff; }
    .motif-btn.sel { border-color:#3b82f6; background:#f4f8ff; box-shadow:0 0 0 3px rgba(59,130,246,.1); }
    .radio { width:20px; height:20px; border-radius:50%; border:2px solid #cbd3de; flex-shrink:0; display:flex; align-items:center; justify-content:center; transition:.15s; }
    .motif-btn.sel .radio { border-color:#3b82f6; }
    .motif-btn.sel .radio::after { content:""; width:10px; height:10px; border-radius:50%; background:#3b82f6; }
    .mt { font-weight:600; font-size:14px; }
    .modal-foot { padding:16px 24px; border-top:1px solid #e2e8f0; display:flex; gap:12px; justify-content:flex-end; background:#fafbfc; }

    /* ===== EYE BTN ===== */
    .eye-btn { width:28px; height:28px; border-radius:7px; border:1px solid #e2e8f0; background:#f7f9fc; display:flex; align-items:center; justify-content:center; cursor:pointer; color:#64748b; flex-shrink:0; margin-left:8px; }
    .eye-btn:hover { background:#eaf1fe; color:#2563eb; border-color:#bcd2f8; }
    .eye-btn .material-icons { font-size:16px; }

    /* ===== MODAL DETAIL ===== */
    .modal-detail { max-width:580px; }
    .detail-title-row { display:flex; align-items:flex-start; gap:14px; }
    .detail-icon { font-size:28px; margin-top:2px; flex-shrink:0; }
    .detail-title-row h2 { font-size:19px; font-weight:700; margin:0; }
    .detail-title-row p { color:#6b7280; font-size:13px; margin:3px 0 0; }
    .modal-close { margin-left:auto; width:32px; height:32px; border-radius:8px; border:1px solid #e2e8f0; background:#f7f9fc; display:flex; align-items:center; justify-content:center; cursor:pointer; color:#64748b; flex-shrink:0; }
    .modal-close:hover { background:#fef2f2; color:#ef4444; }
    .modal-close .material-icons { font-size:18px; }
    .detail-info-row { display:flex; align-items:center; justify-content:space-between; padding:10px 0; border-bottom:1px solid #f1f5f9; }
    .detail-info-row:last-child { border-bottom:none; }
    .detail-label { font-size:13px; color:#6b7280; }
    .detail-val { font-size:14px; font-weight:600; }
    .modal-section-title { padding:0 24px 8px; font-size:12px; font-weight:700; letter-spacing:.05em; text-transform:uppercase; color:#6b7280; border-bottom:1px solid #f1f5f9; }
    .detail-line { display:flex; align-items:baseline; gap:8px; padding:9px 0; border-bottom:1px solid #f8fafc; }
    .detail-line:last-child { border-bottom:none; }
    .dl-name { flex:1; font-size:14px; font-weight:600; }
    .dl-var { font-size:12px; color:#6b7280; font-weight:400; }
    .dl-qty { font-size:12px; color:#6b7280; white-space:nowrap; }
    .dl-total { font-size:13px; font-weight:700; color:#2563eb; white-space:nowrap; }
    .modal-totals { padding:14px 24px; background:#f7f9fc; border-top:1px solid #e2e8f0; }
    .tot-detail-row { display:flex; justify-content:space-between; font-size:13px; color:#6b7280; margin-bottom:6px; }
    .tot-detail-row.grand { font-size:17px; font-weight:700; color:#1f2a37; border-top:1px solid #e2e8f0; padding-top:10px; margin-top:6px; margin-bottom:0; }
    .motif-detail { display:flex; align-items:center; gap:10px; padding:12px 14px; background:#fef3c7; border-radius:9px; font-size:14px; font-weight:500; color:#92400e; }

    /* ===== BOUTONS GLOBALS ===== */
    .btn { display:inline-flex; align-items:center; justify-content:center; gap:9px; padding:12px 22px; border-radius:9px; font-size:15px; font-weight:600; transition:.15s; border:none; cursor:pointer; font-family:inherit; }
    .btn .material-icons { font-size:18px; }
    .btn-primary { background:#3b82f6; color:#fff; box-shadow:0 4px 12px rgba(59,130,246,.3); }
    .btn-primary:hover { background:#2563eb; }
    .btn-primary:disabled { background:#c3d4f5; box-shadow:none; cursor:not-allowed; }
    .btn-ghost { background:#fff; color:#1f2a37; border:1px solid #e2e8f0; }
    .btn-ghost:hover { background:#f7f9fc; border-color:#d6dce5; }
    .btn-ghost:disabled { opacity:.5; cursor:not-allowed; }
    .btn-pdf { background:#f0f4ff; color:#2f6bff; border:1px solid #c7d8ff; }
    .btn-pdf:hover { background:#e0ebff; }
    .btn-pdf .material-icons { font-size:17px; }
    .btn-danger { background:#fff; color:#ef4444; border:1px solid #f3c9c9; }
    .btn-danger:hover { background:#fde8e8; }
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
    .btn-lg { padding:14px 26px; font-size:15px; }

    /* ===== MISC ===== */
    .card { background:#fff; border:1px solid #e2e8f0; border-radius:12px; box-shadow:0 1px 3px rgba(16,24,40,.06); }
    .empty-state { padding:48px; text-align:center; color:#94a3b8; }
    .empty-state .material-icons { font-size:44px; display:block; margin-bottom:8px; }
    @keyframes spin { to{transform:rotate(360deg)} }
    .spin { animation:spin 1s linear infinite; }

    /* ===== RESPONSIVE ===== */
    @media (max-width: 1024px) {
      .step1-grid { grid-template-columns: 1fr; }
      .right-col, .right-placeholder { display:none; }
      .step2-body { grid-template-columns: 1fr; }
      .cart-panel { max-height: 340px; }
    }
    @media (max-width: 768px) {
      .page-header { flex-direction:column; align-items:flex-start; gap:12px; }
      .stats { grid-template-columns: 1fr 1fr; }
      .stats .stat-card:last-child { grid-column: span 2; }
      .stepper { display:none; }
      .field-row2 { grid-template-columns: 1fr; }
      .step2-footer { flex-wrap:wrap; gap:10px; }
      .step2-actions-right { width:100%; }
      .step2-actions-right .btn { flex:1; }
      .prod-grid { grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); }
      .confirm-actions { flex-direction:column; }
      .confirm-actions .btn { width:100%; }
      .suggest-banner { flex-wrap:wrap; }
      .suggest-banner .btn { width:100%; margin-top:8px; }
    }
    @media (max-width: 480px) {
      .stats { grid-template-columns: 1fr; }
      .stats .stat-card:last-child { grid-column: span 1; }
      .fchips { flex-wrap:wrap; }
      .prod-grid { grid-template-columns: 1fr; }
      .modal { margin:12px; border-radius:14px; }
    }
  `]
})
export class VisitsComponent implements OnInit {
  view: View = 'list';

  // Données
  visits: any[] = [];
  period: 'today' | 'week' | 'month' | 'all' = 'today';
  clients: any[] = [];
  filteredClients: any[] = [];
  nearbyClients: any[] = [];
  products: any[] = [];
  filteredProducts: any[] = [];
  clientHistory: any[] = [];

  // Sélection
  selectedClient: any = null;
  suggestedClient: any = null;
  cart: any[] = [];

  // Filtres / recherche
  clientSearch = '';
  productSearch = '';
  clientFilter: ClientFilter = 'near';
  step1Mode: Step1Mode = 'pick';

  // Géoloc
  geoLoading = false;
  geoReady = false;
  geoError = '';
  private userLat: number | null = null;
  private userLng: number | null = null;

  // Nouveau client
  newClient: any = this.emptyNewClient();
  savingNewClient = false;
  newClientError = '';
  geoCapturing = false;

  // Clôture
  showCloseDrawer = false;
  selectedMotif = '';
  closeNote = '';
  closeReasonFinal = '';
  reasons = CLOSE_REASONS;

  // Flags
  saving = false;
  currentVisitId: string | null = null;
  createdOrder: any = null;

  showDetailModal = false;
  detailVisit: any = null;

  pdfViewerUrl: SafeResourceUrl | null = null;
  pdfViewerTitle = '';

  constructor(private api: ApiService, public auth: AuthService, private cdr: ChangeDetectorRef, private sanitizer: DomSanitizer) {}

  viewBonCommande() {
    if (!this.createdOrder?.id) return;
    const token = localStorage.getItem('token') ?? '';
    const url = `${environment.apiUrl}/pdf/orders/${this.createdOrder.id}/bon-commande?token=${token}&t=${Date.now()}`;
    this.pdfViewerTitle = `Bon de commande - CMD-${this.createdOrder.order_number}`;
    this.pdfViewerUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  closePdfViewer() { this.pdfViewerUrl = null; }

  ngOnInit() { this.loadVisits(); }

  get todayLabel() {
    return new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  }
  get orderedCount() { return this.visits.filter(v => v.status === 'ordered').length; }
  get closedCount()  { return this.visits.filter(v => v.status === 'closed').length; }
  get cartQty()      { return this.cart.reduce((s,i) => s + i.qty, 0); }
  get subTotal()     { return this.cart.reduce((s,i) => s + i.qty * i.price, 0); }

  initials(name: string) { return (name||'?').split(' ').slice(0,2).map((w:string)=>w[0]).join('').toUpperCase(); }
  categoryLabel(v: string) { return CATEGORY_LABELS[v] || v; }
  avatarColor(name: string) { return AVATAR_COLORS[(name||'').charCodeAt(0) % AVATAR_COLORS.length]; }
  formatDistance(m: number | null) {
    if (m == null) return '';
    return m < 1000 ? `${Math.round(m)} m` : `${(m/1000).toFixed(1)} km`;
  }

  get periodLabel(): string {
    return { today: 'Tournée du jour', week: 'Cette semaine', month: 'Ce mois', all: 'Toutes les visites' }[this.period];
  }

  setPeriod(p: 'today' | 'week' | 'month' | 'all') {
    this.period = p;
    this.loadVisits();
  }

  // ——— Chargement ———
  loadVisits() {
    let qs = '';
    const now = new Date();
    if (this.period === 'today') {
      qs = `?date=${now.toISOString().slice(0, 10)}`;
    } else if (this.period === 'week') {
      const mon = new Date(now); mon.setDate(mon.getDate() - ((mon.getDay() + 6) % 7)); mon.setHours(0,0,0,0);
      qs = `?date_from=${mon.toISOString().slice(0,10)}`;
    } else if (this.period === 'month') {
      qs = `?date_from=${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;
    }
    this.api.get<any[]>(`/visits/my${qs}`).subscribe(v => { this.visits = v; this.cdr.detectChanges(); });
  }

  loadClients() {
    this.api.get<any[]>('/clients').subscribe(c => {
      this.clients = c;
      this.sortClientsByDistance();
      this.cdr.detectChanges();
    });
  }

  loadProducts() {
    this.api.get<any[]>('/products').subscribe(prods => {
      this.products = prods.map((p:any) => ({ ...p, _qty:1, _selectedVariant: p.variants?.[0] || null }));
      this.filteredProducts = [...this.products];
      this.cdr.detectChanges();
    });
  }

  loadClientHistory(clientId: string) {
    this.api.get<any[]>(`/visits/my?client_id=${clientId}`).subscribe({
      next: h => { this.clientHistory = h.slice(0, 3); this.cdr.detectChanges(); },
      error: () => { this.clientHistory = []; }
    });
  }

  // ——— Géolocalisation ———
  geolocate() {
    if (!navigator.geolocation) {
      this.geoLoading = false;
      this.geoError = 'Géolocalisation non supportée';
      this.sortClientsByDistance();
      this.cdr.detectChanges();
      return;
    }
    this.geoLoading = true; this.geoReady = false; this.geoError = '';
    this.cdr.detectChanges();

    // Fallback : si pas de réponse dans 5s on affiche quand même les clients
    const fallback = setTimeout(() => {
      if (!this.geoLoading) return;
      this.geoLoading = false;
      this.geoError = 'Position non disponible (HTTP non sécurisé ou refus)';
      this.sortClientsByDistance();
      this.cdr.detectChanges();
    }, 5000);

    navigator.geolocation.getCurrentPosition(
      pos => {
        clearTimeout(fallback);
        this.userLat = pos.coords.latitude;
        this.userLng = pos.coords.longitude;
        this.geoLoading = false; this.geoReady = true;
        this.sortClientsByDistance();
        this.cdr.detectChanges();
      },
      err => {
        clearTimeout(fallback);
        this.geoLoading = false;
        this.geoError = err.code === 1 ? 'Accès à la position refusé' : 'Impossible d\'obtenir la position';
        this.sortClientsByDistance();
        this.cdr.detectChanges();
      },
      { timeout: 4000, maximumAge: 60000 }
    );
  }

  private haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
    const R = 6371000;
    const dLat = (lat2-lat1)*Math.PI/180;
    const dLng = (lng2-lng1)*Math.PI/180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }

  private sortClientsByDistance() {
    this.clients = this.clients.map(c => ({
      ...c,
      _distance: (this.userLat != null && c.latitude != null && c.longitude != null)
        ? this.haversine(this.userLat!, this.userLng!, +c.latitude, +c.longitude)
        : null
    })).sort((a,b) => {
      if (a._distance == null && b._distance == null) return 0;
      if (a._distance == null) return 1;
      if (b._distance == null) return -1;
      return a._distance - b._distance;
    });
    this.nearbyClients = this.clients.filter(c => c._distance != null);
    this.suggestedClient = this.nearbyClients[0] || null;
    // Auto-bascule si aucun client géolocalisé
    if (this.nearbyClients.length === 0) this.clientFilter = 'all';
    this.applyFilter();
  }

  private applyFilter() {
    // Si filtre "près" mais aucun client GPS → bascule auto sur "tous"
    const base = (this.clientFilter === 'near' && this.nearbyClients.length > 0)
      ? this.nearbyClients
      : this.clients;
    const f = this.clientSearch.trim().toLowerCase();
    if (f) {
      // La recherche texte cherche toujours dans TOUS les clients
      this.filteredClients = this.clients.filter(c =>
        c.name.toLowerCase().includes(f) ||
        (c.city||'').toLowerCase().includes(f) ||
        (c.address||'').toLowerCase().includes(f) ||
        (c.phone||'').toLowerCase().includes(f)
      );
    } else {
      this.filteredClients = [...base];
    }
  }

  openDetail(h: any) { this.detailVisit = h; this.showDetailModal = true; this.cdr.detectChanges(); }
  closeDetail() { this.showDetailModal = false; this.detailVisit = null; this.cdr.detectChanges(); }

  setFilter(f: ClientFilter) { this.clientFilter = f; this.applyFilter(); }
  filterClients() { this.applyFilter(); }
  filterProducts() {
    const f = this.productSearch.toLowerCase();
    this.filteredProducts = f ? this.products.filter(p => p.name.toLowerCase().includes(f) || (p.category_name||'').toLowerCase().includes(f)) : [...this.products];
  }
  setMode(m: Step1Mode) { this.step1Mode = m; this.selectedClient = null; }

  captureGeoForNewClient() {
    if (!navigator.geolocation) return;
    this.geoCapturing = true;
    navigator.geolocation.getCurrentPosition(
      pos => { this.newClient.latitude = pos.coords.latitude; this.newClient.longitude = pos.coords.longitude; this.geoCapturing = false; this.cdr.detectChanges(); },
      () => { this.geoCapturing = false; this.cdr.detectChanges(); },
      { timeout:10000 }
    );
  }

  // ——— Sélection client ———
  pickClient(c: any) {
    this.selectedClient = c;
    this.loadClientHistory(c.id);
  }

  confirmSuggested() {
    this.pickClient(this.suggestedClient);
  }

  // ——— Nouveau client ———
  emptyNewClient() { return { name:'', phone:'', category:'', address:'', latitude:null, longitude:null }; }

  createAndContinue() {
    if (!this.newClient.name) { this.newClientError = 'Le nom est obligatoire'; return; }
    this.savingNewClient = true; this.newClientError = '';
    const payload: any = { name: this.newClient.name, type: 'particulier', phone: this.newClient.phone || null, address: this.newClient.address || null };
    if (this.newClient.category) payload.category = this.newClient.category;
    if (this.newClient.latitude) { payload.latitude = this.newClient.latitude; payload.longitude = this.newClient.longitude; }
    this.api.post<any>('/clients', payload).subscribe({
      next: client => {
        if (this.userLat != null && client.latitude != null) client._distance = this.haversine(this.userLat!, this.userLng!, +client.latitude, +client.longitude);
        this.clients.unshift(client);
        this.savingNewClient = false;
        this.selectedClient = client;
        this.clientHistory = [];
        this.goStep2();
      },
      error: err => { this.savingNewClient = false; this.newClientError = err?.error?.message || 'Erreur lors de la création'; this.cdr.detectChanges(); }
    });
  }

  // ——— Navigation ———
  startVisit() {
    this.selectedClient = null; this.suggestedClient = null; this.cart = [];
    this.clientSearch = ''; this.productSearch = ''; this.clientFilter = 'near';
    this.step1Mode = 'pick'; this.newClient = this.emptyNewClient();
    this.newClientError = ''; this.currentVisitId = null;
    this.userLat = null; this.userLng = null; this.geoReady = false; this.geoError = '';
    this.clientHistory = []; this.createdOrder = null;
    this.loadClients();
    this.view = 'step1';
    this.geolocate();
  }

  resumeVisit(v: any) {
    this.cart = [];
    this.productSearch = '';
    this.createdOrder = null;
    this.showCloseDrawer = false;
    this.selectedMotif = '';
    this.closeNote = '';
    this.saving = false;
    this.currentVisitId = v.id;
    this.selectedClient = {
      id: v.client_id,
      name: v.client_name,
      phone: v.client_phone,
      city: v.client_city,
      address: v.client_address ?? ''
    };
    this.loadProducts();
    this.view = 'step2';
    this.cdr.detectChanges();
  }

  goStep2() {
    if (!this.selectedClient) return;
    this.saving = true;
    this.api.post('/visits', { client_id: this.selectedClient.id }).subscribe({
      next: (v:any) => { this.currentVisitId = v.id; this.saving = false; this.loadProducts(); this.view = 'step2'; this.cdr.detectChanges(); },
      error: () => { this.saving = false; this.cdr.detectChanges(); }
    });
  }

  backToList() { this.view = 'list'; this.loadVisits(); }

  // ——— Panier ———
  bump(p:any, d:number) { p._qty = Math.max(1,(p._qty||1)+d); }

  addToCart(p:any) {
    const v = p._selectedVariant; if (!v) return;
    const key = p.id+'||'+v.id;
    const ex = this.cart.find(i=>i.key===key);
    if (ex) { ex.qty += p._qty; } else { this.cart.push({ key, variantId: v.id, name:p.name, variant:v.name, price:v.price, qty:p._qty }); }
    p._qty = 1;
  }

  removeFromCart(item:any) { this.cart = this.cart.filter(i=>i.key!==item.key); }

  // ——— Commande ———
  createOrder() {
    if (!this.cart.length || !this.currentVisitId) return;
    this.saving = true;
    const lines = this.cart.map(i => ({ variant_id: i.variantId, quantity: i.qty, unit_price: i.price }));
    this.api.post('/orders', { client_id: this.selectedClient.id, lines }).subscribe({
      next: (order:any) => {
        this.createdOrder = order;
        this.api.patch(`/visits/${this.currentVisitId}/close`, { status:'ordered', order_id:order.id }).subscribe({
          next: () => { this.saving = false; this.loadVisits(); setTimeout(() => { this.view = 'done_order'; this.cdr.detectChanges(); }, 0); },
          error: () => { this.saving = false; this.cdr.detectChanges(); }
        });
      },
      error: () => { this.saving = false; this.cdr.detectChanges(); }
    });
  }

  // ——— Clôture sans achat ———
  pickMotif(id: string) { this.selectedMotif = id; }

  confirmClose() {
    const m = this.reasons.find(r=>r.id===this.selectedMotif);
    if (!m) return;
    const reason = this.closeNote ? `${m.label} — ${this.closeNote}` : m.label;
    this.saving = true;
    this.api.patch(`/visits/${this.currentVisitId}/close`, { status:'closed', close_reason: reason }).subscribe({
      next: () => {
        this.closeReasonFinal = reason;
        this.saving = false;
        this.showCloseDrawer = false;
        this.loadVisits();
        setTimeout(() => { this.view = 'done_closed'; this.cdr.detectChanges(); }, 0);
      },
      error: () => { this.saving = false; this.cdr.detectChanges(); }
    });
  }
}
