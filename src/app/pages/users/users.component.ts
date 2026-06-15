import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ApiService } from '../../services/api.service';

const ROLES = [
  { value: 'admin', label: 'Administrateur' },
  { value: 'stock_manager', label: 'Gestionnaire Stock' },
  { value: 'pre_seller', label: 'Pré-vendeur' },
  { value: 'delivery', label: 'Livreur' },
];

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule, MatSlideToggleModule],
  template: `
    <div class="page-header">
      <div>
        <h2>Gestion de l'équipe</h2>
        <p class="subtitle">{{ users.length }} membre(s) dans votre équipe</p>
      </div>
      <button class="btn-primary" (click)="openForm()">
        <span class="material-icons">person_add</span>
        Nouveau membre
      </button>
    </div>

    <!-- TABLE -->
    <div class="card">
      <table class="data-table">
        <thead>
          <tr><th>Nom</th><th>Rôle</th><th>Statut</th><th></th></tr>
        </thead>
        <tbody>
          <tr *ngFor="let u of users" class="table-row">
            <td>
              <div class="user-cell">
                <div class="avatar">{{ u.name[0].toUpperCase() }}</div>
                <div>
                  <div class="user-name">{{ u.name }}</div>
                  <div class="user-email">{{ u.email }}</div>
                </div>
              </div>
            </td>
            <td><span class="role-badge" [class]="u.role">{{ roleLabel(u.role) }}</span></td>
            <td><span class="status-dot" [class.active]="u.is_active">{{ u.is_active ? 'Actif' : 'Inactif' }}</span></td>
            <td>
              <button class="btn-icon" (click)="openEdit(u)" title="Modifier"><span class="material-icons">edit</span></button>
              <button class="btn-icon" (click)="openResetPassword(u)" title="Reset mot de passe"><span class="material-icons">lock_reset</span></button>
              <button class="btn-icon danger" (click)="toggleActive(u)"><span class="material-icons">{{ u.is_active ? 'person_off' : 'person' }}</span></button>
            </td>
          </tr>
        </tbody>
      </table>
      <div *ngIf="!users.length" class="empty-state">
        <span class="material-icons">group_off</span>
        <p>Aucun membre dans l'équipe</p>
      </div>
    </div>

    <!-- DRAWER OVERLAY -->
    <div class="overlay" *ngIf="showForm" (click)="closeForm()"></div>

    <!-- DRAWER -->
    <div class="drawer" [class.open]="showForm">
      <div class="drawer-header">
        <h3>{{ editing ? 'Modifier le membre' : 'Nouveau membre' }}</h3>
        <button class="btn-icon" (click)="closeForm()">
          <span class="material-icons">close</span>
        </button>
      </div>

      <div class="drawer-body">
        <div class="field-group">
          <label>Nom complet *</label>
          <input class="field-input" [(ngModel)]="form.name" placeholder="Jean Dupont" />
        </div>

        <div class="field-group" *ngIf="!editing">
          <label>Email *</label>
          <input class="field-input" type="email" [(ngModel)]="form.email" placeholder="jean@example.com" />
        </div>

        <div class="field-group">
          <label>Rôle *</label>
          <select class="field-select" [(ngModel)]="form.role">
            <option *ngFor="let r of roles" [value]="r.value">{{ r.label }}</option>
          </select>
        </div>

        <div class="field-group">
          <label>Statut</label>
          <div class="toggle-row">
            <mat-slide-toggle [(ngModel)]="form.is_active" color="primary"></mat-slide-toggle>
            <span>{{ form.is_active ? 'Actif' : 'Inactif' }}</span>
          </div>
        </div>

        <div class="field-group" *ngIf="!editing">
          <label>Mot de passe *</label>
          <div class="password-wrapper">
            <input class="field-input" [type]="showPassword ? 'text' : 'password'" [(ngModel)]="form.password" placeholder="Minimum 6 caractères" />
            <button type="button" class="btn-eye" (click)="showPassword = !showPassword" tabindex="-1">
              <span class="material-icons">{{ showPassword ? 'visibility_off' : 'visibility' }}</span>
            </button>
          </div>
        </div>

        <div *ngIf="errorMsg" class="error-banner">
          <span class="material-icons">error_outline</span> {{ errorMsg }}
        </div>
      </div>

      <div class="drawer-footer">
        <button class="btn-secondary" (click)="closeForm()">Annuler</button>
        <button class="btn-primary" (click)="save()" [disabled]="saving">
          <span class="material-icons">{{ saving ? 'hourglass_top' : 'save' }}</span>
          {{ saving ? 'Enregistrement...' : 'Enregistrer' }}
        </button>
      </div>
    </div>

    <!-- RESET PASSWORD DRAWER -->
    <div class="overlay" *ngIf="showReset" (click)="showReset=false"></div>
    <div class="drawer" [class.open]="showReset">
      <div class="drawer-header">
        <h3>Reset mot de passe — {{ resetUser?.name }}</h3>
        <button class="btn-icon" (click)="showReset=false"><span class="material-icons">close</span></button>
      </div>
      <div class="drawer-body">
        <div class="field-group">
          <label>Nouveau mot de passe *</label>
          <div class="password-wrapper">
            <input class="field-input" [type]="showResetPassword ? 'text' : 'password'" [(ngModel)]="newPassword" placeholder="Minimum 6 caractères" />
            <button type="button" class="btn-eye" (click)="showResetPassword = !showResetPassword" tabindex="-1">
              <span class="material-icons">{{ showResetPassword ? 'visibility_off' : 'visibility' }}</span>
            </button>
          </div>
        </div>
        <div *ngIf="errorMsg" class="error-banner">
          <span class="material-icons">error_outline</span> {{ errorMsg }}
        </div>
      </div>
      <div class="drawer-footer">
        <button class="btn-secondary" (click)="showReset=false">Annuler</button>
        <button class="btn-primary" (click)="saveResetPassword()" [disabled]="saving">
          <span class="material-icons">lock_reset</span>
          Réinitialiser
        </button>
      </div>
    </div>
  `,
  styles: [`
    .page-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:24px; }
    .subtitle { font-size:13px; color:#64748b; margin-top:4px; }

    /* BUTTONS */
    .btn-primary {
      display:flex; align-items:center; gap:8px;
      padding:9px 18px; background:#3b82f6; color:#fff;
      border:none; border-radius:8px; cursor:pointer;
      font-size:14px; font-weight:500;
    }
    .btn-primary:hover { background:#2563eb; }
    .btn-primary:disabled { background:#93c5fd; cursor:not-allowed; }
    .btn-secondary {
      padding:9px 18px; background:#f1f5f9; color:#475569;
      border:none; border-radius:8px; cursor:pointer; font-size:14px;
    }
    .btn-icon {
      width:34px; height:34px; border:none; background:transparent;
      border-radius:6px; cursor:pointer; display:inline-flex;
      align-items:center; justify-content:center; color:#64748b;
    }
    .btn-icon:hover { background:#f1f5f9; color:#1e293b; }
    .btn-icon.danger:hover { background:#fee2e2; color:#ef4444; }
    .btn-icon .material-icons { font-size:18px; }

    /* CARD / TABLE */
    .card { background:#fff; border-radius:12px; border:1px solid #e2e8f0; overflow:hidden; }
    .full-width { width:100%; }
    .table-row:hover { background:#f8fafc; }
    .user-cell { display:flex; align-items:center; gap:12px; padding:4px 0; }
    .avatar {
      width:36px; height:36px; border-radius:50%;
      background:#3b82f6; color:#fff;
      display:flex; align-items:center; justify-content:center;
      font-weight:700; font-size:14px; flex-shrink:0;
    }
    .user-name { font-size:14px; font-weight:500; color:#1e293b; }
    .user-email { font-size:12px; color:#94a3b8; }

    /* BADGES */
    .role-badge { padding:3px 10px; border-radius:20px; font-size:12px; font-weight:500; }
    .admin { background:#fef3c7; color:#92400e; }
    .stock_manager { background:#dbeafe; color:#1e40af; }
    .pre_seller { background:#f0fdf4; color:#166534; }
    .delivery { background:#fdf4ff; color:#7e22ce; }
    .status-dot { font-size:12px; font-weight:500; }
    .status-dot.active { color:#16a34a; }
    .status-dot:not(.active) { color:#dc2626; }

    .empty-state { padding:48px; text-align:center; color:#94a3b8; }
    .empty-state .material-icons { font-size:48px; display:block; margin-bottom:8px; }

    /* DRAWER */
    .overlay { position:fixed; inset:0; background:rgba(0,0,0,0.3); z-index:200; }
    .drawer {
      position:fixed; right:-440px; top:0; width:420px; height:100vh;
      background:#fff; z-index:300; display:flex; flex-direction:column;
      box-shadow:-4px 0 20px rgba(0,0,0,0.1);
      transition:right 0.25s ease;
    }
    .drawer.open { right:0; }
    .drawer-header {
      display:flex; justify-content:space-between; align-items:center;
      padding:20px 24px; border-bottom:1px solid #e2e8f0;
    }
    .drawer-header h3 { margin:0; font-size:16px; font-weight:600; }
    .drawer-body { flex:1; overflow-y:auto; padding:24px; display:flex; flex-direction:column; gap:16px; }
    .drawer-footer {
      padding:16px 24px; border-top:1px solid #e2e8f0;
      display:flex; justify-content:flex-end; gap:8px;
    }

    /* FIELDS */
    .field-group { display:flex; flex-direction:column; gap:6px; }
    .field-group label { font-size:13px; font-weight:500; color:#374151; }
    .field-input {
      padding:10px 12px; border:1px solid #d1d5db; border-radius:8px;
      font-size:14px; outline:none; transition:border 0.15s;
    }
    .field-input:focus { border-color:#3b82f6; box-shadow:0 0 0 3px rgba(59,130,246,0.1); }
    .field-select {
      padding:10px 12px; border:1px solid #d1d5db; border-radius:8px;
      font-size:14px; background:#fff; outline:none; cursor:pointer;
    }
    .toggle-row { display:flex; align-items:center; gap:12px; font-size:14px; color:#374151; }
    .error-banner {
      display:flex; align-items:center; gap:8px;
      padding:10px 14px; background:#fee2e2; color:#dc2626;
      border-radius:8px; font-size:13px;
    }
    .password-wrapper {
      position:relative; display:flex; align-items:center;
    }
    .password-wrapper .field-input { flex:1; padding-right:42px; }
    .btn-eye {
      position:absolute; right:8px;
      background:none; border:none; cursor:pointer;
      color:#94a3b8; display:flex; align-items:center; padding:4px;
    }
    .btn-eye:hover { color:#3b82f6; }
    .btn-eye .material-icons { font-size:20px; }
  `]
})
export class UsersComponent implements OnInit {
  users: any[] = [];
  cols = ['name', 'role', 'status', 'actions'];
  roles = ROLES;
  showForm = false;
  showReset = false;
  editing: any = null;
  resetUser: any = null;
  saving = false;
  errorMsg = '';
  newPassword = '';
  showPassword = false;
  showResetPassword = false;

  form: any = { name: '', email: '', role: 'pre_seller', password: '', is_active: true };

  constructor(private api: ApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit() { this.load(); }

  load() {
    this.api.get<any[]>('/users').subscribe(u => { this.users = [...u]; this.cdr.detectChanges(); });
  }

  openForm() {
    this.editing = null;
    this.form = { name: '', email: '', role: 'pre_seller', password: '', is_active: true };
    this.errorMsg = '';
    this.showPassword = false;
    this.showForm = true;
  }

  openEdit(user: any) {
    this.editing = user;
    this.form = { name: user.name, email: user.email, role: user.role, is_active: user.is_active };
    this.errorMsg = '';
    this.showForm = true;
  }

  closeForm() { this.showForm = false; this.errorMsg = ''; }

  save() {
    this.errorMsg = '';
    if (!this.form.name || !this.form.role) { this.errorMsg = 'Nom et rôle obligatoires'; return; }
    if (!this.editing && (!this.form.email || !this.form.password)) { this.errorMsg = 'Email et mot de passe obligatoires'; return; }

    setTimeout(() => { this.saving = true; this.cdr.detectChanges(); });
    const obs = this.editing
      ? this.api.put(`/users/${this.editing.id}`, { name: this.form.name, role: this.form.role, is_active: this.form.is_active })
      : this.api.post('/users', this.form);

    obs.subscribe({
      next: () => { setTimeout(() => { this.saving = false; this.cdr.detectChanges(); this.closeForm(); this.load(); }); },
      error: (err) => { setTimeout(() => { this.saving = false; this.errorMsg = err.error?.message || 'Erreur'; this.cdr.detectChanges(); }); }
    });
  }

  toggleActive(user: any) {
    this.api.put(`/users/${user.id}`, { name: user.name, role: user.role, is_active: !user.is_active })
      .subscribe(() => this.load());
  }

  openResetPassword(user: any) {
    this.resetUser = user;
    this.newPassword = '';
    this.errorMsg = '';
    this.showResetPassword = false;
    this.showReset = true;
  }

  saveResetPassword() {
    if (!this.newPassword || this.newPassword.length < 6) { this.errorMsg = 'Minimum 6 caractères'; return; }
    setTimeout(() => { this.saving = true; this.cdr.detectChanges(); });
    this.api.post(`/users/${this.resetUser.id}/reset-password`, { password: this.newPassword }).subscribe({
      next: () => { setTimeout(() => { this.saving = false; this.showReset = false; this.cdr.detectChanges(); }); },
      error: (err) => { setTimeout(() => { this.saving = false; this.errorMsg = err.error?.message || 'Erreur'; this.cdr.detectChanges(); }); }
    });
  }

  roleLabel(r: string): string {
    return ROLES.find(x => x.value === r)?.label || r;
  }
}
