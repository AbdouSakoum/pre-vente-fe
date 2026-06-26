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
    <div *ngIf="checking" class="splash">
      <mat-spinner diameter="40"></mat-spinner>
    </div>

    <!-- Tenant introuvable (sous-domaine URL invalide) -->
    <div *ngIf="!checking && step === 'not-found'" class="notfound-container">
      <span class="material-icons notfound-icon">domain_disabled</span>
      <h1>Entreprise introuvable</h1>
      <p>Le sous-domaine <strong>{{ subdomain }}</strong> ne correspond à aucune entreprise.</p>
    </div>

    <!-- Login (split layout) -->
    <div *ngIf="!checking && (step === 'login' || step === 'pick-tenant')" class="layout">

      <!-- LEFT PANEL -->
      <aside class="left">
        <div class="brand">
          <div class="brand-logo">
            <img src="assets/logo.svg" class="brand-img" alt="KeepOn" />
          </div>
        </div>

        <div class="left-body">
          <h1>Pilotez votre<br><em>force de vente</em><br>sur le terrain.</h1>
          <p class="left-desc">Suivez vos commerciaux, gérez les commandes, les tournées et le stock en temps réel — depuis un seul espace de travail.</p>

          <div class="features">
            <div class="feat">
              <div class="feat-ico blue">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0"/>
                  <path d="M16 6a3 3 0 0 1 0 6M21 20a6 6 0 0 0-3-5"/>
                </svg>
              </div>
              <div class="feat-text"><div class="ft">Équipe commerciale</div><div class="fs">Suivi des visites, objectifs et performances</div></div>
            </div>
            <div class="feat">
              <div class="feat-ico green">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="1" y="6" width="14" height="11" rx="1"/><path d="M15 9h4l3 3v5h-7z"/>
                  <circle cx="6" cy="19" r="1.6"/><circle cx="18" cy="19" r="1.6"/>
                </svg>
              </div>
              <div class="feat-text"><div class="ft">Livraisons</div><div class="fs">Tournées, encaissement et preuve de livraison</div></div>
            </div>
            <div class="feat">
              <div class="feat-ico amber">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M9 2h9a1 1 0 0 1 1 1v18l-3-2-2 2-2-2-2 2-2-2-3 2V5a1 1 0 0 1 1-1z"/>
                  <line x1="9" y1="8" x2="15" y2="8"/><line x1="9" y1="12" x2="15" y2="12"/>
                </svg>
              </div>
              <div class="feat-text"><div class="ft">Commandes &amp; Stock</div><div class="fs">Bons de commande, niveaux et alertes de stock</div></div>
            </div>
          </div>
        </div>

        <div class="left-foot">© 2026 KeepOn{{ tenant ? ' · ' + tenant.name : '' }}</div>
      </aside>

      <!-- RIGHT PANEL -->
      <main class="right">
        <div class="form-card">
          <div class="form-head">
            <div class="fh-ico">
              <img src="assets/logo.svg" alt="KeepOn" class="fh-logo-img" />
            </div>
            <h2>Connexion</h2>
            <p>{{ tenant ? 'Bienvenue sur KeepOn · ' + tenant.name : 'Accédez à votre espace de travail' }}</p>
          </div>

          <form (ngSubmit)="onLogin()" autocomplete="off">

            <!-- Champ entreprise : visible uniquement si pas de sous-domaine -->
            <div class="field" *ngIf="step === 'pick-tenant'">
              <label for="tenant-input">Nom d'entreprise</label>
              <div class="field-wrap">
                <span class="fi">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
                  </svg>
                </span>
                <input type="text" id="tenant-input" name="tenantInput" [(ngModel)]="tenantInput"
                  placeholder="ex : monentreprise" autocomplete="off" (blur)="onTenantInputBlur()" />
                <button type="button" class="field-eye" *ngIf="checkingTenant">
                  <mat-spinner diameter="16"></mat-spinner>
                </button>
                <span *ngIf="tenant" style="position:absolute;right:13px;top:50%;transform:translateY(-50%);color:#16a34a;display:flex">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:17px;height:17px"><path d="M20 6 9 17l-5-5"/></svg>
                </span>
              </div>
              <div class="tenant-found" *ngIf="tenant">{{ tenant.name }}</div>
              <div *ngIf="tenantError" class="tenant-error">{{ tenantError }}</div>
            </div>

            <div class="field">
              <label for="email">Email</label>
              <div class="field-wrap">
                <span class="fi">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 7 10-7"/>
                  </svg>
                </span>
                <input type="email" id="email" name="email" [(ngModel)]="email" placeholder="exemple@societe.ma" autocomplete="email" />
              </div>
            </div>

            <div class="field">
              <label for="password">Mot de passe</label>
              <div class="field-wrap">
                <span class="fi">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </span>
                <input [type]="showPwd ? 'text' : 'password'" id="password" name="password" [(ngModel)]="password" placeholder="••••••••" />
                <button type="button" class="field-eye" (click)="showPwd=!showPwd" aria-label="Afficher le mot de passe">
                  <svg *ngIf="!showPwd" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                  </svg>
                  <svg *ngIf="showPwd" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M17.9 17.9A10 10 0 0 1 12 20c-7 0-11-8-11-8a18.5 18.5 0 0 1 5.1-6.1M9.9 4.2A9.8 9.8 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.2 3.2M1 1l22 22"/>
                  </svg>
                </button>
              </div>
            </div>

            <div class="forgot"><a href="#">Mot de passe oublié ?</a></div>

            <div *ngIf="error" class="error-banner">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;flex-shrink:0">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {{ error }}
            </div>

            <button type="submit" class="btn-submit" [disabled]="loading || (step === 'pick-tenant' && !tenant)">
              <mat-spinner *ngIf="loading" diameter="18"></mat-spinner>
              <ng-container *ngIf="!loading">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"/>
                </svg>
                Se connecter
              </ng-container>
            </button>
          </form>

          <div class="form-foot">
            <div class="status-dot"></div>
            <div class="form-foot-txt">Environnement sécurisé{{ tenant ? ' · ' + tenant.name : '' }} · Session chiffrée TLS</div>
          </div>
        </div>
      </main>
    </div>
  `,
  styles: [`
    :host { display:block; height:100vh; }

    /* SPLASH / NOT FOUND */
    .splash { display:flex; justify-content:center; align-items:center; height:100vh; background:#f4f5f8; }
    .notfound-container { display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; background:#f4f5f8; gap:12px; color:#475569; text-align:center; padding:24px; }
    .notfound-icon { font-size:64px; color:#cbd5e1; }
    .notfound-container h1 { margin:0; font-size:22px; color:#1e293b; }
    .notfound-container p { margin:0; font-size:15px; }
    .tenant-found { font-size:12.5px; font-weight:700; color:#16a34a; margin-top:5px; display:flex; align-items:center; gap:4px; }
    .tenant-error { font-size:12.5px; color:#dc2626; margin-top:5px; }

    /* LAYOUT */
    .layout { display:flex; width:100%; min-height:100vh; }

    /* LEFT */
    .left { flex:0 0 480px; background:#0e1626; display:flex; flex-direction:column; padding:44px 48px; position:relative; overflow:hidden; }
    .left::before { content:''; position:absolute; inset:0; background: radial-gradient(ellipse 600px 600px at -10% 110%, rgba(47,107,255,.22) 0%, transparent 70%), radial-gradient(ellipse 400px 400px at 110% -10%, rgba(47,107,255,.14) 0%, transparent 70%); pointer-events:none; }
    .left > * { position:relative; }

    .brand { display:flex; align-items:center; gap:13px; }
    .brand-logo { width:120px; height:46px; border-radius:13px; display:flex; align-items:center; justify-content:center; flex-shrink:0; overflow:hidden; }
    .brand-img { width:120px; object-fit:contain; }
    .brand-name { font-size:20px; font-weight:800; color:#fff; letter-spacing:-.01em; }
    .brand-sub { font-size:12.5px; color:#7c879a; margin-top:2px; }

    .left-body { flex:1; display:flex; flex-direction:column; justify-content:flex-start; padding:20px 0; }
    .left-tag { display:inline-flex; align-items:center; gap:7px; background:rgba(47,107,255,.18); color:#7fb0ff; font-size:12px; font-weight:700; letter-spacing:.04em; text-transform:uppercase; padding:6px 12px; border-radius:20px; margin-bottom:22px; width:fit-content; }
    .left-tag span { width:6px; height:6px; border-radius:99px; background:#4d8bff; }
    .left h1 { font-size:36px; font-weight:900; color:#fff; letter-spacing:-.02em; line-height:1.1; margin-bottom:16px; }
    .left h1 em { color:#5b86ff; font-style:normal; }
    .left-desc { font-size:15.5px; color:#8695a9; line-height:1.6; max-width:340px; margin-bottom:36px; }

    .features { display:flex; flex-direction:column; gap:14px; }
    .feat { display:flex; align-items:center; gap:13px; background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.07); border-radius:13px; padding:14px 16px; }
    .feat-ico { width:38px; height:38px; border-radius:10px; flex:0 0 38px; display:flex; align-items:center; justify-content:center; }
    .feat-ico svg { width:18px; height:18px; }
    .feat-ico.blue { background:rgba(47,107,255,.22); color:#5b86ff; }
    .feat-ico.green { background:rgba(22,163,74,.22); color:#4ade80; }
    .feat-ico.amber { background:rgba(217,119,6,.22); color:#fbbf24; }
    .feat-text .ft { font-size:14px; font-weight:700; color:#e2e8f0; }
    .feat-text .fs { font-size:12px; color:#7c879a; margin-top:2px; }
    .left-foot { font-size:12px; color:#3f4d5e; }

    /* RIGHT */
    .right { flex:1; display:flex; align-items:center; justify-content:center; padding:40px 32px; background:#f4f5f8; }
    .form-card { width:100%; max-width:420px; background:#fff; border-radius:22px; box-shadow:0 4px 6px rgba(16,24,40,.04), 0 10px 40px rgba(16,24,40,.10); border:1px solid #e7eaf0; padding:36px 36px 32px; }

    .form-head { margin-bottom:30px; }
    .fh-ico { width:120px; display:flex; align-items:center; justify-content:center; margin-bottom:18px; overflow:hidden; }
    .fh-logo-img { width:120px; object-fit:contain; }
    .form-head h2 { font-size:24px; font-weight:900; letter-spacing:-.02em; color:#1f2a37; }
    .form-head p { font-size:14px; color:#6b7280; margin-top:5px; line-height:1.5; }

    /* FIELDS */
    .field { margin-bottom:18px; }
    .field label { display:block; font-size:13px; font-weight:700; color:#374151; margin-bottom:7px; }
    .field-wrap { position:relative; }
    .fi { position:absolute; left:13px; top:50%; transform:translateY(-50%); color:#9ca3af; pointer-events:none; }
    .fi svg { width:16px; height:16px; display:block; }
    .field-wrap input { width:100%; padding:13px 14px 13px 40px; border:1.5px solid #e7eaf0; border-radius:12px; font-size:15px; font-family:inherit; color:#1f2a37; background:#fafbfd; outline:none; transition:.15s; box-sizing:border-box; }
    .field-wrap input:focus { border-color:#2f6bff; background:#fff; box-shadow:0 0 0 4px rgba(47,107,255,.10); }
    .field-wrap input::placeholder { color:#bcc3cc; }
    .field-eye { position:absolute; right:13px; top:50%; transform:translateY(-50%); color:#9ca3af; cursor:pointer; background:none; border:none; padding:0; display:flex; align-items:center; }
    .field-eye svg { width:17px; height:17px; }

    .forgot { text-align:right; margin-top:-10px; margin-bottom:22px; }
    .forgot a { font-size:12.5px; font-weight:700; color:#2f6bff; text-decoration:none; }
    .forgot a:hover { color:#2055e0; }

    .error-banner { display:flex; align-items:center; gap:8px; background:#fee2e2; color:#991b1b; border:1px solid #fecaca; border-radius:10px; padding:10px 14px; font-size:13px; margin-bottom:16px; }

    .btn-submit { width:100%; padding:15px; border-radius:13px; border:none; cursor:pointer; font-family:inherit; font-size:16px; font-weight:800; background:#2f6bff; color:#fff; box-shadow:0 8px 22px rgba(47,107,255,.36); transition:.15s; display:flex; align-items:center; justify-content:center; gap:9px; }
    .btn-submit:hover:not(:disabled) { background:#2055e0; transform:translateY(-1px); box-shadow:0 12px 28px rgba(47,107,255,.42); }
    .btn-submit:active { transform:translateY(0); }
    .btn-submit:disabled { opacity:.6; cursor:default; transform:none; }
    .btn-submit svg { width:18px; height:18px; }

    .form-foot { margin-top:22px; padding-top:18px; border-top:1px solid #e7eaf0; display:flex; align-items:center; gap:9px; }
    .status-dot { width:8px; height:8px; border-radius:99px; background:#16a34a; flex:0 0 8px; box-shadow:0 0 0 3px rgba(22,163,74,.2); animation:pulse 2.4s infinite; }
    @keyframes pulse { 0%,100%{box-shadow:0 0 0 3px rgba(22,163,74,.2)} 50%{box-shadow:0 0 0 5px rgba(22,163,74,.08)} }
    .form-foot-txt { font-size:12px; color:#6b7280; line-height:1.5; }
    .form-foot-txt b { color:#1f2a37; font-weight:700; }

    @media (max-width:900px) {
      .left { display:none; }
      .right { padding:28px 18px; background:#0e1626; align-items:flex-start; padding-top:60px; }
      .form-card { box-shadow:0 20px 60px rgba(0,0,0,.3); }
    }
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
  showPwd = false;
  step: 'pick-tenant' | 'login' | 'not-found' = 'login';
  tenantInput = '';
  tenantError = '';
  checkingTenant = false;

  constructor(
    private auth: AuthService,
    private tenantService: TenantService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    const sub = this.tenantService.getSubdomain();
    if (sub === null) {
      // localhost ou IP : demander le tenant à l'utilisateur
      this.checking = false;
      this.step = 'pick-tenant';
      this.cdr.detectChanges();
    } else {
      this.subdomain = sub;
      this.tenantService.getInfo(sub).subscribe({
        next: (info) => { this.tenant = info; this.checking = false; this.step = 'login'; this.cdr.detectChanges(); },
        error: () => { this.tenant = null; this.checking = false; this.step = 'not-found'; this.cdr.detectChanges(); }
      });
    }
  }

  onTenantInputBlur() {
    const slug = this.tenantInput.trim().toLowerCase();
    if (!slug || this.tenant?.subdomain === slug) return;
    this.resolveTenant(slug);
  }

  private resolveTenant(slug: string): Promise<boolean> {
    return new Promise(resolve => {
      this.checkingTenant = true;
      this.tenantError = '';
      this.tenant = null;
      this.cdr.detectChanges();
      this.tenantService.getInfo(slug).subscribe({
        next: (info) => {
          localStorage.setItem('tenant', slug);
          this.tenant = info;
          this.subdomain = slug;
          this.checkingTenant = false;
          this.cdr.detectChanges();
          resolve(true);
        },
        error: () => {
          this.checkingTenant = false;
          this.tenantError = `Aucune entreprise trouvée pour "${slug}"`;
          this.cdr.detectChanges();
          resolve(false);
        }
      });
    });
  }

  // Gardé pour compatibilité template mais plus utilisé comme submit
  onPickTenant() {}

  async onLogin() {
    if (this.step === 'pick-tenant' && !this.tenant) {
      const ok = await this.resolveTenant(this.tenantInput.trim().toLowerCase());
      if (!ok) return;
    }
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
