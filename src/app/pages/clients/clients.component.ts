import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DrawerComponent } from '../../shared/components/drawer/drawer.component';
import { ApiService } from '../../services/api.service';

const CATEGORY_LABELS: Record<string, string> = {
  hanout:           'Hanout',
  supermarche:      'Supermarché',
  mini_supermarche: 'Mini supermarché',
  epicerie:         'Épicerie',
  laiterie:         'Laiterie',
  restaurant:       'Restaurant',
  cafe:             'Café',
};

@Component({
  selector: 'app-clients',
  standalone: true,
  imports: [CommonModule, FormsModule, DrawerComponent],
  template: `
    <!-- HEADER -->
    <div class="page-header">
      <div>
        <h2>Clients</h2>
        <p class="page-subtitle">{{ clients.length }} client(s) enregistré(s)</p>
      </div>
      <button class="btn-primary" (click)="openForm()">
        <span class="material-icons">person_add</span> Nouveau client
      </button>
    </div>

    <!-- TABLE -->
    <div class="card table-card">
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Nom / Raison sociale</th>
              <th>Type</th>
              <th>Catégorie</th>
              <th>Téléphone</th>
              <th>Ville</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let c of clients" class="table-row"
                [class.selected]="selected?.id === c.id"
                (click)="selectClient(c)">
              <td>
                <div class="item-title">{{ c.name }}</div>
                <div class="item-sub" *ngIf="c.second_name">{{ c.second_name }}</div>
              </td>
              <td>
                <span class="badge" [class.badge-entreprise]="c.type==='entreprise'"
                                    [class.badge-particulier]="c.type==='particulier'">
                  {{ c.type === 'entreprise' ? 'Entreprise' : 'Particulier' }}
                </span>
              </td>
              <td>{{ categoryLabel(c.category) }}</td>
              <td>{{ c.phone || '—' }}</td>
              <td>{{ c.city || '—' }}</td>
              <td class="actions-cell" (click)="$event.stopPropagation()">
                <button class="btn-icon" title="Modifier" (click)="openEdit(c)">
                  <span class="material-icons">edit</span>
                </button>
              </td>
            </tr>
            <tr *ngIf="!clients.length">
              <td colspan="6" class="empty-state">
                <span class="material-icons">people_outline</span>
                <p>Aucun client enregistré</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- PANNEAU DETAIL (droite) -->
    <div class="detail-overlay" *ngIf="selected && !showDrawer" (click)="selected=null"></div>
    <div class="detail-panel" [class.open]="selected && !showDrawer">
      <ng-container *ngIf="selected">
        <div class="detail-header">
          <div>
            <div class="detail-name">{{ selected.name }}</div>
            <div class="detail-sub" *ngIf="selected.second_name">{{ selected.second_name }}</div>
          </div>
          <div class="detail-header-actions">
            <button class="btn-icon" title="Modifier" (click)="openEdit(selected)">
              <span class="material-icons">edit</span>
            </button>
            <button class="btn-icon" (click)="selected=null">
              <span class="material-icons">close</span>
            </button>
          </div>
        </div>

        <div class="detail-body">
          <!-- Section principale -->
          <div class="detail-section">
            <div class="section-title">Informations principales</div>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-label">Type</span>
                <span class="badge" [class.badge-entreprise]="selected.type==='entreprise'"
                                    [class.badge-particulier]="selected.type==='particulier'">
                  {{ selected.type === 'entreprise' ? 'Entreprise' : 'Particulier' }}
                </span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Catégorie</span>
                <span class="detail-value">{{ categoryLabel(selected.category) || '—' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Téléphone</span>
                <span class="detail-value">{{ selected.phone || '—' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Ville</span>
                <span class="detail-value">{{ selected.city || '—' }}</span>
              </div>
              <div class="detail-item" *ngIf="selected.email">
                <span class="detail-label">Email</span>
                <span class="detail-value">{{ selected.email }}</span>
              </div>
            </div>
          </div>

          <!-- Section légale -->
          <div class="detail-section" *ngIf="selected.patente || selected.rc || selected.ice || selected.if_fiscal">
            <div class="section-title">Informations légales</div>
            <div class="detail-grid">
              <div class="detail-item" *ngIf="selected.patente">
                <span class="detail-label">Patente</span>
                <span class="detail-value mono">{{ selected.patente }}</span>
              </div>
              <div class="detail-item" *ngIf="selected.rc">
                <span class="detail-label">RC</span>
                <span class="detail-value mono">{{ selected.rc }}</span>
              </div>
              <div class="detail-item" *ngIf="selected.ice">
                <span class="detail-label">ICE</span>
                <span class="detail-value mono">{{ selected.ice }}</span>
              </div>
              <div class="detail-item" *ngIf="selected.if_fiscal">
                <span class="detail-label">IF</span>
                <span class="detail-value mono">{{ selected.if_fiscal }}</span>
              </div>
            </div>
          </div>
        </div>
      </ng-container>
    </div>

    <!-- DRAWER FORMULAIRE -->
    <app-drawer [open]="showDrawer" [title]="editing ? 'Modifier le client' : 'Nouveau client'"
      [saving]="saving" (closed)="showDrawer=false" (saved)="save()">

      <div class="form-section-title">Informations principales</div>

      <div class="field-group">
        <label>Raison sociale / Nom <span class="req">*</span></label>
        <input class="field-input" [(ngModel)]="form.name" placeholder="Épicerie Hassan" />
      </div>

      <div class="field-group">
        <label>Type <span class="req">*</span></label>
        <select class="field-input" [(ngModel)]="form.type">
          <option value="particulier">Particulier</option>
          <option value="entreprise">Entreprise</option>
        </select>
      </div>

      <div class="field-group">
        <label>Catégorie</label>
        <select class="field-input" [(ngModel)]="form.category">
          <option value="">— Sélectionner —</option>
          <option *ngFor="let cat of categories" [value]="cat.value">{{ cat.label }}</option>
        </select>
      </div>

      <div class="field-group">
        <label>Téléphone</label>
        <input class="field-input" [(ngModel)]="form.phone" placeholder="0612345678" />
      </div>

      <div class="field-group">
        <label>Ville</label>
        <input class="field-input" [(ngModel)]="form.city" placeholder="Casablanca" />
      </div>

      <div class="field-group">
        <label>Adresse</label>
        <textarea class="field-textarea" [(ngModel)]="form.address" placeholder="12 Rue des Fleurs, Casablanca"></textarea>
      </div>

      <div class="form-section-title secondary">Informations secondaires</div>

      <div class="field-row">
        <div class="field-group">
          <label>Deuxième nom</label>
          <input class="field-input" [(ngModel)]="form.second_name" placeholder="Nom alternatif" />
        </div>
        <div class="field-group">
          <label>Email</label>
          <input class="field-input" [(ngModel)]="form.email" placeholder="contact@exemple.ma" />
        </div>
      </div>

      <div class="field-row">
        <div class="field-group">
          <label>Patente</label>
          <input class="field-input" [(ngModel)]="form.patente" placeholder="12345678" />
        </div>
        <div class="field-group">
          <label>RC</label>
          <input class="field-input" [(ngModel)]="form.rc" placeholder="RC-12345" />
        </div>
      </div>

      <div class="field-row">
        <div class="field-group">
          <label>ICE</label>
          <input class="field-input" [(ngModel)]="form.ice" placeholder="001234567890123" />
        </div>
        <div class="field-group">
          <label>IF</label>
          <input class="field-input" [(ngModel)]="form.if_fiscal" placeholder="12345678" />
        </div>
      </div>

      <div *ngIf="errorMsg" class="error-banner">
        <span class="material-icons">error_outline</span> {{ errorMsg }}
      </div>
    </app-drawer>
  `,
  styles: [`
    /* TABLE */
    .table-card { padding: 0; overflow: hidden; }
    .table-wrap { overflow-x: auto; }
    .data-table { width: 100%; border-collapse: collapse; font-size: 14px; }
    .data-table th {
      padding: 12px 16px; text-align: left;
      font-size: 11px; font-weight: 600; text-transform: uppercase;
      letter-spacing: 0.05em; color: #64748b;
      background: #f8fafc; border-bottom: 1px solid #e2e8f0;
    }
    .data-table td { padding: 12px 16px; border-bottom: 1px solid #f1f5f9; color: #334155; }
    .table-row { cursor: pointer; transition: background 0.1s; }
    .table-row:hover { background: #f8fafc; }
    .table-row.selected { background: #eff6ff; }
    .item-title { font-weight: 500; color: #1e293b; }
    .item-sub { font-size: 12px; color: #94a3b8; margin-top: 2px; }
    .actions-cell { width: 48px; text-align: center; }
    .empty-state { text-align: center; padding: 48px; color: #94a3b8; }
    .empty-state .material-icons { font-size: 48px; display: block; margin-bottom: 8px; }

    /* BADGES */
    .badge {
      display: inline-block; padding: 3px 10px; border-radius: 20px;
      font-size: 11px; font-weight: 600;
    }
    .badge-entreprise { background: #FFF1EF; color: #E0231F; }
    .badge-particulier { background: #f0fdf4; color: #15803d; }

    /* DETAIL PANEL */
    .detail-overlay {
      position: fixed; inset: 0; z-index: 200;
    }
    .detail-panel {
      position: fixed; right: -420px; top: 0; width: 400px; height: 100vh;
      background: #fff; z-index: 300;
      display: flex; flex-direction: column;
      box-shadow: -4px 0 24px rgba(0,0,0,0.10);
      transition: right 0.25s ease;
    }
    .detail-panel.open { right: 0; }
    .detail-header {
      display: flex; justify-content: space-between; align-items: flex-start;
      padding: 20px 20px 16px; border-bottom: 1px solid #e2e8f0; flex-shrink: 0;
    }
    .detail-header-actions { display: flex; gap: 4px; }
    .detail-name { font-size: 16px; font-weight: 600; color: #1e293b; }
    .detail-sub { font-size: 12px; color: #94a3b8; margin-top: 4px; }
    .detail-body { flex: 1; overflow-y: auto; padding: 16px 20px; display: flex; flex-direction: column; gap: 20px; }
    .detail-section { display: flex; flex-direction: column; gap: 12px; }
    .section-title {
      font-size: 11px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.06em; color: #94a3b8;
      padding-bottom: 6px; border-bottom: 1px solid #f1f5f9;
    }
    .detail-grid { display: flex; flex-direction: column; gap: 10px; }
    .detail-item { display: flex; justify-content: space-between; align-items: center; }
    .detail-label { font-size: 12px; color: #64748b; }
    .detail-value { font-size: 13px; color: #1e293b; font-weight: 500; }
    .detail-value.mono { font-family: monospace; font-size: 12px; }

    /* FORM */
    .form-section-title {
      font-size: 11px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.06em; color: #FF3532;
      padding-bottom: 6px; border-bottom: 2px solid #FFF1EF;
      margin-bottom: -4px;
    }
    .form-section-title.secondary { color: #94a3b8; border-bottom-color: #f1f5f9; }
    .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .req { color: #ef4444; }
    .error-banner {
      display: flex; align-items: center; gap: 8px;
      padding: 10px 14px; background: #fef2f2; border-radius: 8px;
      color: #dc2626; font-size: 13px;
    }

    /* ICONS */
    .btn-icon {
      width: 34px; height: 34px; border: none; background: transparent;
      border-radius: 6px; cursor: pointer; display: inline-flex;
      align-items: center; justify-content: center; color: #64748b;
    }
    .btn-icon:hover { background: #f1f5f9; }
    .btn-icon .material-icons { font-size: 20px; }
  `]
})
export class ClientsComponent implements OnInit {
  clients: any[] = [];
  selected: any = null;
  showDrawer = false;
  editing: any = null;
  saving = false;
  errorMsg = '';

  categories = [
    { value: 'hanout',           label: 'Hanout' },
    { value: 'supermarche',      label: 'Supermarché' },
    { value: 'mini_supermarche', label: 'Mini supermarché' },
    { value: 'epicerie',         label: 'Épicerie' },
    { value: 'laiterie',         label: 'Laiterie' },
    { value: 'restaurant',       label: 'Restaurant' },
    { value: 'cafe',             label: 'Café' },
  ];

  form: any = this.emptyForm();

  constructor(private api: ApiService, private cdr: ChangeDetectorRef) {}
  ngOnInit() { this.load(); }

  load() {
    this.api.get<any[]>('/clients').subscribe(c => {
      this.clients = [...c];
      if (this.selected) {
        this.selected = this.clients.find(x => x.id === this.selected.id) ?? null;
      }
      this.cdr.detectChanges();
    });
  }

  categoryLabel(val: string) { return CATEGORY_LABELS[val] || val || '—'; }

  selectClient(c: any) {
    this.selected = this.selected?.id === c.id ? null : c;
  }

  openForm() {
    this.editing = null;
    this.form = this.emptyForm();
    this.errorMsg = '';
    this.showDrawer = true;
  }

  openEdit(c: any) {
    this.editing = c;
    this.form = {
      name:       c.name        || '',
      second_name:c.second_name || '',
      type:       c.type        || 'particulier',
      category:   c.category    || '',
      phone:      c.phone       || '',
      city:       c.city        || '',
      address:    c.address     || '',
      email:      c.email       || '',
      patente:    c.patente     || '',
      rc:         c.rc          || '',
      ice:        c.ice         || '',
      if_fiscal:  c.if_fiscal   || '',
    };
    this.errorMsg = '';
    this.showDrawer = true;
  }

  save() {
    if (!this.form.name) { this.errorMsg = 'Le nom est obligatoire'; return; }
    setTimeout(() => { this.saving = true; this.cdr.detectChanges(); });
    const payload = { ...this.form, category: this.form.category || null };
    const obs = this.editing
      ? this.api.put(`/clients/${this.editing.id}`, payload)
      : this.api.post('/clients', payload);
    obs.subscribe({
      next: () => {
        setTimeout(() => {
          this.saving = false; this.showDrawer = false;
          this.cdr.detectChanges(); this.load();
        });
      },
      error: (err) => {
        setTimeout(() => {
          this.saving = false;
          this.errorMsg = err.error?.message || 'Erreur';
          this.cdr.detectChanges();
        });
      }
    });
  }

  private emptyForm() {
    return {
      name: '', second_name: '', type: 'particulier', category: '',
      phone: '', city: '', address: '', email: '',
      patente: '', rc: '', ice: '', if_fiscal: '',
    };
  }
}
