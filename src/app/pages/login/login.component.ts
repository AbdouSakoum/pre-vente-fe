import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { TenantService, TenantInfo } from '../../services/tenant.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatProgressSpinnerModule],
  template: `
    <!-- Chargement initial -->
    <div *ngIf="checking" class="login-container">
      <mat-spinner diameter="40"></mat-spinner>
    </div>

    <!-- Tenant introuvable -->
    <div *ngIf="!checking && !tenant" class="notfound-container">
      <span class="material-icons notfound-icon">domain_disabled</span>
      <h1>Entreprise introuvable</h1>
      <p>Le sous-domaine <strong>{{ subdomain }}</strong> ne correspond à aucune entreprise.</p>
    </div>

    <!-- Login -->
    <div *ngIf="!checking && tenant" class="login-container">
      <div class="login-card">
        <div class="login-brand">
          <img *ngIf="tenant.logo_url" [src]="tenant.logo_url" class="brand-logo" />
          <span *ngIf="!tenant.logo_url" class="material-icons brand-icon">storefront</span>
          <h2 class="brand-name">{{ tenant.name }}</h2>
        </div>

        <form (ngSubmit)="onLogin()">
          <div class="field-group">
            <label>Email</label>
            <input class="field-input" type="email" [(ngModel)]="email" name="email" placeholder="votre@email.com" />
          </div>
          <div class="field-group">
            <label>Mot de passe</label>
            <input class="field-input" type="password" [(ngModel)]="password" name="password" placeholder="••••••••" />
          </div>
          <div *ngIf="error" class="error-banner">
            <span class="material-icons">error_outline</span> {{ error }}
          </div>
          <button type="submit" class="btn-login" [disabled]="loading">
            <mat-spinner *ngIf="loading" diameter="18"></mat-spinner>
            <span *ngIf="!loading">Se connecter</span>
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .login-container { display:flex; justify-content:center; align-items:center; height:100vh; background:#f1f5f9; }

    /* NOT FOUND */
    .notfound-container { display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; background:#f1f5f9; gap:12px; color:#475569; text-align:center; padding:24px; }
    .notfound-icon { font-size:64px; color:#cbd5e1; }
    .notfound-container h1 { margin:0; font-size:22px; color:#1e293b; }
    .notfound-container p { margin:0; font-size:15px; }

    /* CARD */
    .login-card { background:#fff; border-radius:16px; padding:36px 32px; width:100%; max-width:400px; box-shadow:0 4px 24px rgba(0,0,0,0.08); display:flex; flex-direction:column; gap:20px; }

    /* BRAND */
    .login-brand { display:flex; flex-direction:column; align-items:center; gap:10px; margin-bottom:4px; }
    .brand-logo { max-height:72px; max-width:200px; object-fit:contain; }
    .brand-icon { font-size:52px; color:#94a3b8; }
    .brand-name { margin:0; font-size:20px; font-weight:700; color:#1e293b; text-align:center; }

    /* FORM */
    .field-group { display:flex; flex-direction:column; gap:6px; }
    .field-group label { font-size:13px; font-weight:500; color:#475569; }
    .field-input { border:1px solid #e2e8f0; border-radius:8px; padding:10px 14px; font-size:14px; width:100%; box-sizing:border-box; outline:none; transition:border-color 0.2s; }
    .field-input:focus { border-color:#3b82f6; }
    .error-banner { display:flex; align-items:center; gap:8px; background:#fee2e2; color:#991b1b; border:1px solid #fecaca; border-radius:8px; padding:10px 14px; font-size:13px; }
    .error-banner .material-icons { font-size:16px; flex-shrink:0; }
    .btn-login { width:100%; padding:11px; background:#3b82f6; color:#fff; border:none; border-radius:8px; font-size:15px; font-weight:600; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; transition:background 0.2s; }
    .btn-login:hover:not(:disabled) { background:#2563eb; }
    .btn-login:disabled { opacity:0.6; cursor:default; }
  `]
})
export class LoginComponent implements OnInit {
  email = '';
  password = '';
  loading = false;
  error = '';
  checking = true;
  tenant: TenantInfo | null = null;
  subdomain = '';

  constructor(
    private auth: AuthService,
    private tenantService: TenantService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.subdomain = this.tenantService.getSubdomain();
    this.tenantService.getInfo(this.subdomain).subscribe({
      next: (info) => { this.tenant = info; this.checking = false; this.cdr.detectChanges(); },
      error: () => { this.tenant = null; this.checking = false; this.cdr.detectChanges(); }
    });
  }

  onLogin() {
    this.loading = true;
    this.error = '';
    this.auth.login(this.email, this.password).subscribe({
      next: () => {
        this.loading = false;
        if (this.auth.mustChangePassword) {
          this.router.navigate(['/change-password']);
        } else {
          this.router.navigate(['/']);
        }
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.message || 'Identifiants incorrects ou serveur indisponible';
        this.cdr.detectChanges();
      }
    });
  }
}
