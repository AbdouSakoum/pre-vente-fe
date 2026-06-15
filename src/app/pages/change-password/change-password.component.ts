import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="cp-page">
      <div class="cp-card">
        <div class="cp-icon">
          <span class="material-icons">lock_reset</span>
        </div>
        <h2>Changement de mot de passe</h2>
        <p class="cp-subtitle">Pour des raisons de sécurité, vous devez définir un nouveau mot de passe avant de continuer.</p>

        <div class="field-group">
          <label>Nouveau mot de passe <span class="req">*</span></label>
          <div class="input-wrapper">
            <input class="field-input" [type]="showPwd ? 'text' : 'password'"
              [(ngModel)]="newPassword" placeholder="Minimum 6 caractères" />
            <button class="toggle-eye" type="button" (click)="showPwd=!showPwd">
              <span class="material-icons">{{ showPwd ? 'visibility_off' : 'visibility' }}</span>
            </button>
          </div>
          <div class="strength-bar" *ngIf="newPassword">
            <div class="strength-fill" [class]="strengthClass()"></div>
          </div>
          <span class="field-hint" *ngIf="newPassword">{{ strengthLabel() }}</span>
        </div>

        <div class="field-group">
          <label>Confirmer le mot de passe <span class="req">*</span></label>
          <div class="input-wrapper">
            <input class="field-input" [type]="showConfirm ? 'text' : 'password'"
              [(ngModel)]="confirmPassword" placeholder="Répéter le mot de passe" />
            <button class="toggle-eye" type="button" (click)="showConfirm=!showConfirm">
              <span class="material-icons">{{ showConfirm ? 'visibility_off' : 'visibility' }}</span>
            </button>
          </div>
          <span class="match-hint" *ngIf="confirmPassword" [class.ok]="newPassword===confirmPassword" [class.ko]="newPassword!==confirmPassword">
            <span class="material-icons">{{ newPassword===confirmPassword ? 'check_circle' : 'cancel' }}</span>
            {{ newPassword===confirmPassword ? 'Les mots de passe correspondent' : 'Les mots de passe ne correspondent pas' }}
          </span>
        </div>

        <div *ngIf="errorMsg" class="error-banner">
          <span class="material-icons">error_outline</span> {{ errorMsg }}
        </div>

        <button class="btn-primary" style="width:100%;justify-content:center" (click)="submit()" [disabled]="loading">
          <span class="material-icons">{{ loading ? 'hourglass_top' : 'check' }}</span>
          {{ loading ? 'Enregistrement...' : 'Valider le nouveau mot de passe' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .cp-page { min-height:100vh; display:flex; align-items:center; justify-content:center; background:#f8fafc; }
    .cp-card {
      background:#fff; border-radius:16px; border:1px solid #e2e8f0;
      padding:40px; width:420px; display:flex; flex-direction:column; gap:20px;
      box-shadow:0 4px 24px rgba(0,0,0,0.08);
    }
    .cp-icon { text-align:center; }
    .cp-icon .material-icons { font-size:48px; color:#3b82f6; }
    h2 { text-align:center; margin:0; font-size:20px; color:#1e293b; }
    .cp-subtitle { text-align:center; font-size:13px; color:#64748b; margin:0; line-height:1.5; }
    .input-wrapper { position:relative; }
    .input-wrapper .field-input { padding-right:44px; }
    .toggle-eye { position:absolute; right:10px; top:50%; transform:translateY(-50%); background:none; border:none; cursor:pointer; color:#94a3b8; padding:0; }
    .toggle-eye .material-icons { font-size:20px; }
    .strength-bar { height:4px; background:#e2e8f0; border-radius:2px; margin-top:6px; }
    .strength-fill { height:100%; border-radius:2px; transition:width 0.3s, background 0.3s; }
    .strength-fill.weak { width:33%; background:#ef4444; }
    .strength-fill.medium { width:66%; background:#f59e0b; }
    .strength-fill.strong { width:100%; background:#22c55e; }
    .match-hint { display:flex; align-items:center; gap:4px; font-size:12px; margin-top:4px; }
    .match-hint.ok { color:#16a34a; }
    .match-hint.ko { color:#dc2626; }
    .match-hint .material-icons { font-size:14px; }
    .req { color:#ef4444; }
  `]
})
export class ChangePasswordComponent {
  newPassword = '';
  confirmPassword = '';
  showPwd = false;
  showConfirm = false;
  loading = false;
  errorMsg = '';

  constructor(private api: ApiService, private router: Router) {}

  strengthClass(): string {
    const len = this.newPassword.length;
    if (len < 6) return 'weak';
    if (len < 10) return 'medium';
    return 'strong';
  }

  strengthLabel(): string {
    const c = this.strengthClass();
    return c === 'weak' ? 'Faible' : c === 'medium' ? 'Moyen' : 'Fort';
  }

  submit() {
    if (!this.newPassword || this.newPassword.length < 6) { this.errorMsg = 'Minimum 6 caractères'; return; }
    if (this.newPassword !== this.confirmPassword) { this.errorMsg = 'Les mots de passe ne correspondent pas'; return; }
    this.loading = true;
    this.api.post('/auth/change-password', { new_password: this.newPassword }).subscribe({
      next: () => {
        localStorage.removeItem('must_change_password');
        this.router.navigate(['/']);
      },
      error: (err) => { this.loading = false; this.errorMsg = err.error?.message || 'Erreur'; }
    });
  }
}
