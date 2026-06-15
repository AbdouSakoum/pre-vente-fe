import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';

const BASE = `${environment.apiUrl}/superadmin`;
const SECRET = environment.superadminSecret;

@Component({
  selector: 'app-superadmin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- LOGIN SUPER ADMIN -->
    <div *ngIf="!authenticated" class="sa-login">
      <div class="sa-login-card">
        <div class="sa-logo">
          <span class="material-icons">admin_panel_settings</span>
          <h2>Super Admin</h2>
        </div>
        <div class="field-group">
          <label>Clé d'accès</label>
          <input class="field-input" type="password" [(ngModel)]="inputSecret"
            placeholder="Entrez la clé super admin" (keydown.enter)="authenticate()" />
        </div>
        <div *ngIf="authError" class="error-banner">
          <span class="material-icons">error_outline</span> {{ authError }}
        </div>
        <button class="btn-primary" style="width:100%;justify-content:center" (click)="authenticate()">
          <span class="material-icons">login</span> Accéder
        </button>
      </div>
    </div>

    <!-- DASHBOARD SUPER ADMIN -->
    <div *ngIf="authenticated" class="sa-layout">
      <div class="sa-header">
        <div class="sa-header-left">
          <span class="material-icons">admin_panel_settings</span>
          <h1>Super Admin</h1>
        </div>
        <button class="btn-secondary" (click)="authenticated=false">
          <span class="material-icons">logout</span> Déconnexion
        </button>
      </div>

      <div class="sa-body">
        <!-- STATS -->
        <div class="stats-row">
          <div class="stat-box">
            <div class="stat-num">{{ stats.active_tenants }}</div>
            <div class="stat-lbl">Tenants actifs</div>
          </div>
          <div class="stat-box">
            <div class="stat-num">{{ stats.total_users }}</div>
            <div class="stat-lbl">Utilisateurs total</div>
          </div>
          <div class="stat-box">
            <div class="stat-num">{{ stats.total_orders }}</div>
            <div class="stat-lbl">Commandes total</div>
          </div>
        </div>

        <!-- HEADER TENANTS -->
        <div class="section-header">
          <h2>Entreprises</h2>
          <button class="btn-primary" (click)="openForm()">
            <span class="material-icons">add_business</span> Nouvelle entreprise
          </button>
        </div>

        <!-- TABLE TENANTS -->
        <div class="card">
          <table class="data-table">
            <thead>
              <tr>
                <th>Entreprise</th>
                <th>Sous-domaine</th>
                <th>Utilisateurs</th>
                <th>Commandes</th>
                <th>Créé le</th>
                <th>Statut</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let t of tenants">
                <td><strong>{{ t.name }}</strong></td>
                <td><span class="subdomain-badge">{{ t.subdomain }}</span></td>
                <td>{{ t.user_count }}</td>
                <td>{{ t.order_count }}</td>
                <td>{{ t.created_at | date:'dd/MM/yyyy' }}</td>
                <td>
                  <span class="status-badge" [class.active]="t.is_active" [class.inactive]="!t.is_active">
                    {{ t.is_active ? 'Actif' : 'Désactivé' }}
                  </span>
                </td>
                <td style="display:flex;gap:6px;align-items:center">
                  <button class="btn-toggle" (click)="openEdit(t)">
                    <span class="material-icons">edit</span> Modifier
                  </button>
                  <button class="btn-toggle" [class.deactivate]="t.is_active" (click)="toggleTenant(t)">
                    <span class="material-icons">{{ t.is_active ? 'block' : 'check_circle' }}</span>
                    {{ t.is_active ? 'Désactiver' : 'Activer' }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
          <div *ngIf="!tenants.length" class="empty-state" style="padding:40px;text-align:center;color:#94a3b8">
            <span class="material-icons" style="font-size:48px;display:block;margin-bottom:8px">business</span>
            Aucune entreprise
          </div>
        </div>
      </div>
    </div>

    <!-- DRAWER MODIFIER TENANT -->
    <div class="overlay" *ngIf="showEdit" (click)="showEdit=false"></div>
    <div class="drawer" [class.open]="showEdit">
      <div class="drawer-header">
        <h3>Modifier l'entreprise</h3>
        <button class="btn-icon" (click)="showEdit=false"><span class="material-icons">close</span></button>
      </div>
      <div class="drawer-body">
        <div class="field-group">
          <label>Nom de l'entreprise <span class="req">*</span></label>
          <input class="field-input" [(ngModel)]="editForm.name" placeholder="Société ABC" />
        </div>
        <div class="field-group">
          <label>Logo</label>
          <div class="logo-upload-area" (click)="editLogoInput.click()">
            <img *ngIf="editLogoPreview" [src]="editLogoPreview" class="logo-preview" />
            <div *ngIf="!editLogoPreview" class="logo-placeholder">
              <span class="material-icons">add_photo_alternate</span>
              <span>Cliquer pour changer le logo</span>
            </div>
          </div>
          <input #editLogoInput type="file" accept="image/jpeg,image/png,image/webp" style="display:none" (change)="onEditLogoChange($event)" />
          <span class="field-hint">PNG, JPG ou WEBP · max 10 Mo</span>
        </div>
        <div *ngIf="editErrorMsg" class="error-banner">
          <span class="material-icons">error_outline</span> {{ editErrorMsg }}
        </div>
        <div *ngIf="editSuccessMsg" class="success-banner">
          <span class="material-icons">check_circle</span> {{ editSuccessMsg }}
        </div>
      </div>
      <div class="drawer-footer">
        <button class="btn-secondary" (click)="showEdit=false">Annuler</button>
        <button class="btn-primary" (click)="saveTenant()" [disabled]="editSaving">
          <span class="material-icons">{{ editSaving ? 'hourglass_top' : 'save' }}</span>
          <span>{{ editSaving ? 'Enregistrement...' : 'Enregistrer' }}</span>
        </button>
      </div>
    </div>

    <!-- DRAWER NOUVEAU TENANT -->
    <div class="overlay" *ngIf="showForm" (click)="showForm=false"></div>
    <div class="drawer" [class.open]="showForm">
      <div class="drawer-header">
        <h3>Nouvelle entreprise</h3>
        <button class="btn-icon" (click)="showForm=false"><span class="material-icons">close</span></button>
      </div>
      <div class="drawer-body">
        <div style="font-size:12px;font-weight:600;color:#94a3b8;text-transform:uppercase;margin-bottom:12px">Informations entreprise</div>
        <div class="field-group">
          <label>Nom de l'entreprise <span class="req">*</span></label>
          <input class="field-input" [(ngModel)]="form.name" placeholder="Société ABC" />
        </div>
        <div class="field-group">
          <label>Sous-domaine <span class="req">*</span></label>
          <input class="field-input" [(ngModel)]="form.subdomain" placeholder="societe-abc"
            (input)="form.subdomain = sanitizeSubdomain(form.subdomain)" />
          <span class="field-hint">Accès via : {{ form.subdomain || 'sous-domaine' }}.monapp.com</span>
        </div>
        <div class="field-group">
          <label>Logo de l'entreprise</label>
          <div class="logo-upload-area" (click)="logoInput.click()">
            <img *ngIf="logoPreview" [src]="logoPreview" class="logo-preview" />
            <div *ngIf="!logoPreview" class="logo-placeholder">
              <span class="material-icons">add_photo_alternate</span>
              <span>Cliquer pour ajouter un logo</span>
            </div>
          </div>
          <input #logoInput type="file" accept="image/jpeg,image/png,image/webp" style="display:none" (change)="onLogoChange($event)" />
          <span class="field-hint">PNG, JPG ou WEBP · max 10 Mo</span>
        </div>

        <div style="font-size:12px;font-weight:600;color:#94a3b8;text-transform:uppercase;margin:16px 0 12px">Compte administrateur</div>
        <div class="field-group">
          <label>Nom de l'admin <span class="req">*</span></label>
          <input class="field-input" [(ngModel)]="form.admin_name" placeholder="Nom Prénom" />
        </div>
        <div class="field-group">
          <label>Email <span class="req">*</span></label>
          <input class="field-input" type="email" [(ngModel)]="form.admin_email" placeholder="admin@societe.com" />
        </div>
        <div class="field-group">
          <label>Mot de passe <span class="req">*</span></label>
          <div class="password-wrapper">
            <input class="field-input" [type]="showPassword ? 'text' : 'password'" [(ngModel)]="form.admin_password" placeholder="Minimum 8 caractères" />
            <button type="button" class="toggle-pw" (click)="showPassword=!showPassword">
              <span class="material-icons">{{ showPassword ? 'visibility_off' : 'visibility' }}</span>
            </button>
          </div>
        </div>

        <div *ngIf="errorMsg" class="error-banner">
          <span class="material-icons">error_outline</span> {{ errorMsg }}
        </div>
        <div *ngIf="successMsg" class="success-banner">
          <span class="material-icons">check_circle</span> {{ successMsg }}
        </div>
      </div>
      <div class="drawer-footer">
        <button class="btn-secondary" (click)="showForm=false">Annuler</button>
        <button class="btn-primary" (click)="createTenant()" [disabled]="saving">
          <span class="material-icons">{{ saving ? 'hourglass_top' : 'add_business' }}</span>
          <span>{{ saving ? 'Création...' : "Créer l'entreprise" }}</span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    /* LOGIN */
    .sa-login { min-height:100vh; display:flex; align-items:center; justify-content:center; background:#0f172a; }
    .sa-login-card { background:#1e293b; border-radius:16px; padding:40px; width:360px; display:flex; flex-direction:column; gap:20px; }
    .sa-logo { display:flex; align-items:center; gap:12px; margin-bottom:8px; }
    .sa-logo .material-icons { font-size:36px; color:#3b82f6; }
    .sa-logo h2 { color:#f1f5f9; margin:0; font-size:22px; }
    .sa-login-card .field-group label { color:#94a3b8; }
    .sa-login-card .field-input { background:#0f172a; border-color:#334155; color:#f1f5f9; }
    .sa-login-card .field-input::placeholder { color:#475569; }

    /* LAYOUT */
    .sa-layout { min-height:100vh; background:#f8fafc; }
    .sa-header {
      display:flex; justify-content:space-between; align-items:center;
      padding:16px 32px; background:#0f172a; color:#fff;
    }
    .sa-header-left { display:flex; align-items:center; gap:12px; }
    .sa-header-left .material-icons { font-size:28px; color:#3b82f6; }
    .sa-header-left h1 { margin:0; font-size:20px; color:#f1f5f9; font-weight:600; }
    .sa-body { padding:32px; max-width:1200px; margin:0 auto; }

    /* STATS */
    .stats-row { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; margin-bottom:32px; }
    .stat-box { background:#fff; border-radius:12px; border:1px solid #e2e8f0; padding:24px; text-align:center; }
    .stat-num { font-size:40px; font-weight:700; color:#3b82f6; }
    .stat-lbl { font-size:13px; color:#64748b; margin-top:4px; }

    /* SECTION */
    .section-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; }
    .section-header h2 { margin:0; font-size:18px; font-weight:600; color:#1e293b; }

    /* TABLE */
    .subdomain-badge { background:#eff6ff; color:#1d4ed8; padding:3px 10px; border-radius:20px; font-size:12px; font-weight:600; }
    .status-badge { padding:3px 10px; border-radius:20px; font-size:12px; font-weight:500; }
    .status-badge.active { background:#dcfce7; color:#166534; }
    .status-badge.inactive { background:#fee2e2; color:#991b1b; }
    .btn-toggle { display:inline-flex; align-items:center; gap:4px; padding:5px 12px; border-radius:6px; cursor:pointer; font-size:12px; border:1px solid #e2e8f0; background:#f8fafc; color:#475569; }
    .btn-toggle.deactivate { border-color:#fecaca; background:#fff5f5; color:#dc2626; }
    .btn-toggle .material-icons { font-size:14px; }

    /* DRAWER */
    .overlay { position:fixed; inset:0; background:rgba(0,0,0,0.4); z-index:200; }
    .drawer { position:fixed; right:-480px; top:0; width:460px; height:100vh; background:#fff; z-index:300; display:flex; flex-direction:column; box-shadow:-4px 0 24px rgba(0,0,0,0.15); transition:right 0.25s ease; }
    .drawer.open { right:0; }
    .drawer-header { display:flex; justify-content:space-between; align-items:center; padding:20px 24px; border-bottom:1px solid #e2e8f0; }
    .drawer-header h3 { margin:0; font-size:16px; font-weight:600; color:#1e293b; }
    .drawer-body { flex:1; overflow-y:auto; padding:24px; display:flex; flex-direction:column; gap:16px; }
    .drawer-footer { padding:16px 24px; border-top:1px solid #e2e8f0; display:flex; justify-content:flex-end; gap:10px; }
    .req { color:#ef4444; }
    .password-wrapper { position:relative; display:flex; align-items:center; }
    .password-wrapper .field-input { flex:1; padding-right:40px; }
    .toggle-pw { position:absolute; right:8px; background:none; border:none; cursor:pointer; color:#64748b; display:flex; align-items:center; padding:0; }
    .toggle-pw:hover { color:#1e293b; }
    .toggle-pw .material-icons { font-size:20px; }

    /* LOGO UPLOAD */
    .logo-upload-area { border:2px dashed #cbd5e1; border-radius:10px; cursor:pointer; overflow:hidden; display:flex; align-items:center; justify-content:center; min-height:100px; transition:border-color 0.2s; }
    .logo-upload-area:hover { border-color:#3b82f6; }
    .logo-placeholder { display:flex; flex-direction:column; align-items:center; gap:6px; color:#94a3b8; padding:20px; }
    .logo-placeholder .material-icons { font-size:32px; }
    .logo-placeholder span { font-size:13px; }
    .logo-preview { max-height:120px; max-width:100%; object-fit:contain; padding:8px; }
  `]
})
export class SuperadminComponent implements OnInit {
  authenticated = false;
  inputSecret = '';
  authError = '';
  tenants: any[] = [];
  stats = { active_tenants: 0, total_users: 0, total_orders: 0 };
  showForm = false;
  saving = false;
  errorMsg = '';
  successMsg = '';
  form = { name: '', subdomain: '', admin_name: '', admin_email: '', admin_password: '' };
  showPassword = false;
  logoFile: File | null = null;
  logoPreview: string | null = null;

  showEdit = false;
  editSaving = false;
  editErrorMsg = '';
  editSuccessMsg = '';
  editForm = { id: '', name: '' };
  editLogoFile: File | null = null;
  editLogoPreview: string | null = null;

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    const saved = sessionStorage.getItem('sa_auth');
    if (saved === SECRET) { this.authenticated = true; this.load(); }
  }

  authenticate() {
    if (this.inputSecret === SECRET) {
      sessionStorage.setItem('sa_auth', this.inputSecret);
      this.authenticated = true;
      this.authError = '';
      this.load();
    } else {
      this.authError = 'Clé incorrecte';
    }
  }

  private headers() {
    return new HttpHeaders({ 'x-superadmin-token': SECRET });
  }

  load() {
    this.http.get<any[]>(`${BASE}/tenants`, { headers: this.headers() }).subscribe(t => {
      this.tenants = t; this.cdr.detectChanges();
    });
    this.http.get<any>(`${BASE}/stats`, { headers: this.headers() }).subscribe(s => {
      this.stats = s; this.cdr.detectChanges();
    });
  }

  openForm() {
    this.form = { name: '', subdomain: '', admin_name: '', admin_email: '', admin_password: '' };
    this.logoFile = null;
    this.logoPreview = null;
    this.errorMsg = ''; this.successMsg = ''; this.showForm = true;
  }

  openEdit(t: any) {
    this.editForm = { id: t.id, name: t.name };
    this.editLogoFile = null;
    this.editLogoPreview = t.logo_url || null;
    this.editErrorMsg = ''; this.editSuccessMsg = '';
    this.showEdit = true;
  }

  onEditLogoChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.editLogoFile = file;
    const reader = new FileReader();
    reader.onload = (e) => { this.editLogoPreview = e.target?.result as string; this.cdr.detectChanges(); };
    reader.readAsDataURL(file);
  }

  saveTenant() {
    if (!this.editForm.name) { this.editErrorMsg = 'Le nom est obligatoire'; return; }
    this.editSaving = true;
    const fd = new FormData();
    fd.append('name', this.editForm.name);
    if (this.editLogoFile) fd.append('logo', this.editLogoFile);
    this.http.patch(`${BASE}/tenants/${this.editForm.id}`, fd, { headers: this.headers() }).subscribe({
      next: () => {
        this.editSaving = false;
        this.editSuccessMsg = 'Entreprise mise à jour !';
        this.cdr.detectChanges();
        this.load();
        setTimeout(() => { this.showEdit = false; this.editSuccessMsg = ''; }, 1500);
      },
      error: (err) => {
        this.editSaving = false;
        this.editErrorMsg = err.error?.message || 'Erreur';
        this.cdr.detectChanges();
      }
    });
  }

  onLogoChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.logoFile = file;
    const reader = new FileReader();
    reader.onload = (e) => { this.logoPreview = e.target?.result as string; this.cdr.detectChanges(); };
    reader.readAsDataURL(file);
  }

  sanitizeSubdomain(val: string): string {
    return val.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/--+/g, '-');
  }

  createTenant() {
    if (!this.form.name || !this.form.subdomain || !this.form.admin_email || !this.form.admin_password) {
      this.errorMsg = 'Tous les champs obligatoires doivent être remplis'; return;
    }
    if (this.form.admin_password.length < 8) { this.errorMsg = 'Mot de passe minimum 8 caractères'; return; }
    setTimeout(() => { this.saving = true; this.cdr.detectChanges(); });
    const fd = new FormData();
    fd.append('name', this.form.name);
    fd.append('subdomain', this.form.subdomain);
    fd.append('admin_name', this.form.admin_name);
    fd.append('admin_email', this.form.admin_email);
    fd.append('admin_password', this.form.admin_password);
    if (this.logoFile) fd.append('logo', this.logoFile);
    this.http.post(`${BASE}/tenants`, fd, { headers: this.headers() }).subscribe({
      next: () => {
        setTimeout(() => {
          this.saving = false;
          this.successMsg = `Entreprise "${this.form.name}" créée avec succès !`;
          this.cdr.detectChanges();
          this.load();
          setTimeout(() => { this.showForm = false; this.successMsg = ''; }, 1500);
        });
      },
      error: (err) => {
        setTimeout(() => { this.saving = false; this.errorMsg = err.error?.message || 'Erreur'; this.cdr.detectChanges(); });
      }
    });
  }

  toggleTenant(t: any) {
    const action = t.is_active ? 'désactiver' : 'activer';
    if (!confirm(`Voulez-vous ${action} "${t.name}" ?`)) return;
    this.http.patch(`${BASE}/tenants/${t.id}/toggle`, {}, { headers: this.headers() }).subscribe(updated => {
      const idx = this.tenants.findIndex(x => x.id === t.id);
      if (idx >= 0) { this.tenants[idx] = { ...this.tenants[idx], ...(updated as any) }; }
      this.load();
    });
  }
}
