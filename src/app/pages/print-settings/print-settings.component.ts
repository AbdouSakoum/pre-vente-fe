import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { environment } from '../../../environments/environment';

interface PrintSettings {
  id?: string;
  company_name?: string;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
  ice?: string;
  if_fiscal?: string;
  rc?: string;
  patente?: string;
  logo_url?: string;
  cachet_url?: string;
  footer_text?: string;
  sector?: string;
  currency?: string;
  lang?: string;
  primary_color?: string;
  secondary_color?: string;
}

interface ActivationCode {
  id: string;
  code: string;
  label: string | null;
  used: boolean;
  expires_at: string;
  created_at: string;
}

const SECTORS = [
  'Distribution', 'Alimentaire', 'Pharmacie', 'Cosmetique', 'Textile',
  'Materiel de construction', 'Electronique', 'Mobilier', 'Automobile',
  'Agriculture', 'Services', 'Autre',
];

const CURRENCIES = [
  { code: 'MAD', label: 'Dirham marocain (MAD)' },
  { code: 'EUR', label: 'Euro (EUR)' },
  { code: 'USD', label: 'Dollar US (USD)' },
  { code: 'XOF', label: 'Franc CFA (XOF)' },
];

const LANGS = [
  { code: 'fr', label: 'Français' },
  { code: 'ar', label: 'Arabe (العربية)' },
];


@Component({
  selector: 'app-print-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- ═══════ PAGE HEAD ═══════ -->
    <div class="phead">
      <div>
        <h1>Paramètres</h1>
        <div class="sub">Configurez votre société, branding et accès mobile</div>
      </div>
    </div>

    <!-- ═══════ ONGLETS ═══════ -->
    <div class="tabs">
      <button class="tab" [class.tab-active]="activeTab() === 'societe'" (click)="activeTab.set('societe')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-6 9 6v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 21V12h6v9"/></svg>
        Société &amp; Impression
      </button>
      <button class="tab" [class.tab-active]="activeTab() === 'visuel'" (click)="activeTab.set('visuel')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
        Identité visuelle
      </button>
      <button class="tab" [class.tab-active]="activeTab() === 'mobile'" (click)="activeTab.set('mobile'); loadCodes()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
        Application mobile
      </button>
    </div>

    @if (loading()) {
      <div class="skel-wrap">
        <div class="skel" style="height:160px;border-radius:14px"></div>
        <div class="skel" style="height:220px;border-radius:14px;margin-top:16px"></div>
      </div>
    }

    @if (!loading()) {

      <!-- ══════════════════════════════════════════════
           ONGLET 1 — SOCIÉTÉ & IMPRESSION
      ══════════════════════════════════════════════ -->
      @if (activeTab() === 'societe') {
        <div class="grid">

          <!-- COL GAUCHE -->
          <div class="col">

            <!-- Logo -->
            <div class="card">
              <div class="card-h">
                <span class="ch-l">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                  Logo société
                </span>
              </div>
              <div class="card-body logo-section">
                @if (settings().logo_url) {
                  <div class="logo-preview">
                    <img [src]="logoSrc()" alt="Logo" (error)="onImgError($event)">
                    <button class="btn-remove" (click)="deleteLogo()" title="Supprimer">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                  <div class="upload-hint"><button class="btn-link" (click)="fileInput.click()">Changer le logo</button></div>
                }
                @if (!settings().logo_url) {
                  <div class="drop-zone" (dragover)="$event.preventDefault()" (drop)="onDrop($event, 'logo')" (click)="fileInput.click()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    <div class="dz-label">Glissez votre logo ici</div>
                    <div class="dz-sub">PNG, JPG, WEBP · max 5 Mo</div>
                  </div>
                }
                <input #fileInput type="file" accept="image/jpeg,image/png,image/webp" style="display:none" (change)="onFileChange($event, 'logo')">
                @if (uploading()) { <div class="upload-progress"><div class="spinner"></div> Envoi…</div> }
              </div>
            </div>

            <!-- Cachet -->
            <div class="card" style="margin-top:16px">
              <div class="card-h">
                <span class="ch-l">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8.56 2.75c4.37 6.03 6.02 9.42 8.03 17.72m2.54-15.38c-3.72 4.35-8.94 5.66-16.88 5.85m19.5 1.9c-3.5-.93-6.63-.82-8.94 0-2.58.92-5.01 2.86-7.44 6.32"/></svg>
                  Cachet / Tampon
                </span>
              </div>
              <div class="card-body logo-section">
                @if (settings().cachet_url) {
                  <div class="logo-preview">
                    <img [src]="cachetSrc()" alt="Cachet" (error)="onImgError($event)">
                    <button class="btn-remove" (click)="deleteCachet()" title="Supprimer">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                  <div class="upload-hint"><button class="btn-link" (click)="cachetInput.click()">Changer le cachet</button></div>
                }
                @if (!settings().cachet_url) {
                  <div class="drop-zone" (dragover)="$event.preventDefault()" (drop)="onDrop($event, 'cachet')" (click)="cachetInput.click()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    <div class="dz-label">Glissez votre cachet ici</div>
                    <div class="dz-sub">PNG fond transparent recommandé</div>
                  </div>
                }
                <input #cachetInput type="file" accept="image/jpeg,image/png,image/webp" style="display:none" (change)="onFileChange($event, 'cachet')">
                @if (uploadingCachet()) { <div class="upload-progress"><div class="spinner"></div> Envoi…</div> }
              </div>
            </div>

            <!-- Pied de page -->
            <div class="card" style="margin-top:16px">
              <div class="card-h">
                <span class="ch-l">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="21" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="21" y1="18" x2="3" y2="18"/></svg>
                  Pied de page
                </span>
              </div>
              <div class="card-body" style="padding:18px">
                <div class="field">
                  <label>Texte de pied de page</label>
                  <textarea [(ngModel)]="form.footer_text" rows="3" placeholder="Ex: Merci de votre confiance. RC : 12345 · ICE : 0012345678900054"></textarea>
                  <span class="field-hint">Affiché en bas de chaque document imprimé</span>
                </div>
              </div>
            </div>

          </div>

          <!-- COL DROITE -->
          <div class="col">

            <!-- Informations générales -->
            <div class="card">
              <div class="card-h">
                <span class="ch-l">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                  Informations générales
                </span>
              </div>
              <div class="card-body" style="padding:18px">
                <div class="fields-grid">
                  <div class="field">
                    <label>Secteur d'activité</label>
                    <select [(ngModel)]="form.sector">
                      <option value="">— Choisir —</option>
                      @for (s of SECTORS; track s) {
                        <option [value]="s">{{ s }}</option>
                      }
                    </select>
                  </div>
                  <div class="field">
                    <label>Devise</label>
                    <select [(ngModel)]="form.currency">
                      @for (c of CURRENCIES; track c.code) {
                        <option [value]="c.code">{{ c.label }}</option>
                      }
                    </select>
                  </div>
                  <div class="field full">
                    <label>Langue de l'interface</label>
                    <div class="lang-grid">
                      @for (l of LANGS; track l.code) {
                        <label class="lang-card" [class.lang-active]="form.lang === l.code">
                          <input type="radio" [value]="l.code" [(ngModel)]="form.lang" style="display:none">
                          <span class="lang-flag">{{ l.code === 'fr' ? '🇫🇷' : '🇲🇦' }}</span>
                          <span>{{ l.label }}</span>
                        </label>
                      }
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Identité société -->
            <div class="card" style="margin-top:16px">
              <div class="card-h">
                <span class="ch-l">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-6 9 6v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 21V12h6v9"/></svg>
                  Identité société
                </span>
              </div>
              <div class="card-body" style="padding:18px">
                <div class="fields-grid">
                  <div class="field full">
                    <label>Raison sociale <span class="req">*</span></label>
                    <input type="text" [(ngModel)]="form.company_name" placeholder="Ex: Société ABC SARL">
                  </div>
                  <div class="field full">
                    <label>Adresse</label>
                    <input type="text" [(ngModel)]="form.address" placeholder="Ex: 12 Rue Mohammed V">
                  </div>
                  <div class="field">
                    <label>Ville</label>
                    <input type="text" [(ngModel)]="form.city" placeholder="Ex: Casablanca">
                  </div>
                  <div class="field">
                    <label>Téléphone</label>
                    <input type="text" [(ngModel)]="form.phone" placeholder="Ex: 0522 123 456">
                  </div>
                  <div class="field full">
                    <label>Email</label>
                    <input type="email" [(ngModel)]="form.email" placeholder="contact@societe.ma">
                  </div>
                </div>
              </div>
            </div>

            <!-- Identifiants fiscaux -->
            <div class="card" style="margin-top:16px">
              <div class="card-h">
                <span class="ch-l">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                  Identifiants fiscaux
                </span>
              </div>
              <div class="card-body" style="padding:18px">
                <div class="fields-grid">
                  <div class="field">
                    <label>ICE</label>
                    <input type="text" [(ngModel)]="form.ice" placeholder="000123456789000">
                  </div>
                  <div class="field">
                    <label>IF (Identifiant Fiscal)</label>
                    <input type="text" [(ngModel)]="form.if_fiscal" placeholder="Ex: 12345678">
                  </div>
                  <div class="field">
                    <label>RC (Registre Commerce)</label>
                    <input type="text" [(ngModel)]="form.rc" placeholder="Ex: 123456">
                  </div>
                  <div class="field">
                    <label>Patente</label>
                    <input type="text" [(ngModel)]="form.patente" placeholder="Ex: 12345678">
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        <div class="form-footer">
          @if (saveStatus()) {
            <div class="save-status">
              @if (saveStatus() === 'ok') {
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-6"/></svg>
                <span class="green">Enregistré</span>
              }
              @if (saveStatus() === 'err') {
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                <span class="red">Erreur de sauvegarde</span>
              }
            </div>
          }
          <button class="btn-save" (click)="save()" [disabled]="saving()">
            @if (!saving()) { <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> }
            @if (saving()) { <div class="spinner-sm"></div> }
            {{ saving() ? 'Enregistrement…' : 'Enregistrer' }}
          </button>
        </div>
      }

      <!-- ══════════════════════════════════════════════
           ONGLET 2 — IDENTITÉ VISUELLE
      ══════════════════════════════════════════════ -->
      @if (activeTab() === 'visuel') {
        <div class="visuel-grid">

          <!-- Couleurs -->
          <div class="card">
            <div class="card-h">
              <span class="ch-l">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>
                Couleurs de la marque
              </span>
            </div>
            <div class="card-body" style="padding:24px">
              <div class="color-grid">
                <div class="color-field">
                  <label>Couleur principale</label>
                  <div class="color-input-wrap">
                    <input type="color" [(ngModel)]="form.primary_color" class="color-picker">
                    <input type="text" [(ngModel)]="form.primary_color" class="color-hex" placeholder="#2f6bff" maxlength="7">
                  </div>
                  <div class="color-preview" [style.background]="form.primary_color">
                    <span>Boutons · En-têtes · PDF</span>
                  </div>
                </div>
                <div class="color-field">
                  <label>Couleur secondaire</label>
                  <div class="color-input-wrap">
                    <input type="color" [(ngModel)]="form.secondary_color" class="color-picker">
                    <input type="text" [(ngModel)]="form.secondary_color" class="color-hex" placeholder="#16a34a" maxlength="7">
                  </div>
                  <div class="color-preview" [style.background]="form.secondary_color">
                    <span>Validations · Statuts · Accents</span>
                  </div>
                </div>
              </div>

              <!-- Aperçu PDF -->
              <div class="preview-block">
                <div class="preview-label">Aperçu sur documents PDF</div>
                <div class="pdf-preview">
                  <div class="pdf-header-bar" [style.background]="form.primary_color || '#2f6bff'">
                    <span style="color:#fff;font-size:11px;font-weight:700">BON DE COMMANDE</span>
                    <span style="color:rgba(255,255,255,.7);font-size:10px">BC-00001</span>
                  </div>
                  <div class="pdf-body">
                    <div class="pdf-row"><div class="pdf-label-cell" [style.color]="form.primary_color || '#2f6bff'">CLIENT</div><div class="pdf-val-cell">Mohamed Alami</div></div>
                    <div class="pdf-table-head" [style.background]="form.primary_color || '#2f6bff'">
                      <span style="color:#fff;font-size:10px;font-weight:700">Désignation</span>
                      <span style="color:#fff;font-size:10px;font-weight:700">Total</span>
                    </div>
                    <div class="pdf-table-row"><span>Produit A</span><span [style.color]="form.secondary_color || '#16a34a'" style="font-weight:700">240 {{ form.currency || 'MAD' }}</span></div>
                    <div class="pdf-table-total" [style.color]="form.primary_color || '#2f6bff'">Total TTC : 288 {{ form.currency || 'MAD' }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Aperçu mobile -->
          <div class="card">
            <div class="card-h">
              <span class="ch-l">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
                Aperçu application mobile
              </span>
            </div>
            <div class="card-body" style="padding:24px;display:flex;flex-direction:column;align-items:center;gap:20px">
              <div class="phone-mock">
                <div class="phone-screen">
                  <div class="phone-topbar" [style.background]="form.primary_color || '#2f6bff'">
                    <span style="color:#fff;font-size:11px;font-weight:700">{{ form.company_name || 'Ma Société' }}</span>
                  </div>
                  <div class="phone-body">
                    <div class="phone-card">
                      <div class="phone-card-dot" [style.background]="form.primary_color || '#2f6bff'"></div>
                      <div>
                        <div style="font-size:10px;font-weight:700">Client : Mohamed</div>
                        <div style="font-size:9px;color:#6b7280">CMD-00012</div>
                      </div>
                    </div>
                    <div class="phone-card" style="margin-top:6px">
                      <div class="phone-card-dot" [style.background]="form.secondary_color || '#16a34a'"></div>
                      <div>
                        <div style="font-size:10px;font-weight:700">Client : Fatima</div>
                        <div style="font-size:9px;color:#6b7280">CMD-00013</div>
                      </div>
                    </div>
                    <div class="phone-btn" [style.background]="form.primary_color || '#2f6bff'">
                      Nouvelle commande
                    </div>
                  </div>
                </div>
              </div>
              <p style="font-size:12px;color:#6b7280;text-align:center;max-width:220px">
                Les couleurs seront appliquées sur l'interface de l'app mobile lors de la prochaine mise à jour.
              </p>
            </div>
          </div>

        </div>

        <div class="form-footer">
          @if (saveStatus()) {
            <div class="save-status">
              @if (saveStatus() === 'ok') {
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-6"/></svg>
                <span class="green">Enregistré</span>
              }
              @if (saveStatus() === 'err') {
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                <span class="red">Erreur</span>
              }
            </div>
          }
          <button class="btn-save" (click)="save()" [disabled]="saving()">
            @if (!saving()) { <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> }
            @if (saving()) { <div class="spinner-sm"></div> }
            {{ saving() ? 'Enregistrement…' : 'Enregistrer les couleurs' }}
          </button>
        </div>
      }

      <!-- ══════════════════════════════════════════════
           ONGLET 3 — APPLICATION MOBILE
      ══════════════════════════════════════════════ -->
      @if (activeTab() === 'mobile') {
        <div class="mobile-layout">

          <!-- Explication -->
          <div class="info-banner">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <div>
              <div class="info-title">Comment fonctionne l'accès mobile ?</div>
              <div class="info-body">Générez un code à 6 chiffres et saisissez-le dans l'application mobile au premier lancement. Ce code lie l'app à votre société. Il est à usage unique — une fois utilisé il ne peut plus servir. Générez-en un nouveau si besoin (nouveau téléphone, réinstallation…).</div>
            </div>
          </div>

          <!-- Générer un code -->
          <div class="card">
            <div class="card-h">
              <span class="ch-l">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
                Générer un code d'accès mobile
              </span>
            </div>
            <div class="card-body" style="padding:20px">
              <div class="gen-form">
                <div class="field">
                  <label>Note (optionnel)</label>
                  <input type="text" [(ngModel)]="newCode.label" placeholder="Ex: Réinstallation Ahmed, Nouveau téléphone…">
                </div>
                <div class="field">
                  <label>Validité</label>
                  <select [(ngModel)]="newCode.days">
                    <option [ngValue]="7">7 jours</option>
                    <option [ngValue]="30">30 jours</option>
                    <option [ngValue]="90">3 mois</option>
                    <option [ngValue]="365">1 an</option>
                  </select>
                </div>
                <button class="btn-gen" (click)="generateCode()" [disabled]="generatingCode()">
                  @if (generatingCode()) { <div class="spinner-sm"></div> Génération… }
                  @if (!generatingCode()) {
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Générer le code
                  }
                </button>
              </div>

              @if (lastGeneratedCode()) {
                <div class="code-result">
                  <div class="code-result-label">Code généré — à partager avec l'utilisateur</div>
                  <div class="code-display">
                    <span class="code-chars">{{ lastGeneratedCode()!.code }}</span>
                    <button class="btn-copy" (click)="copyCode(lastGeneratedCode()!.code)" title="Copier">
                      @if (copied()) {
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      }
                      @if (!copied()) {
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                      }
                    </button>
                  </div>
                  <div class="code-meta">
                    Code d'accès mobile ·
                    Expire le {{ lastGeneratedCode()!.expires_at | date:'dd/MM/yyyy' }}
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- Liste des codes -->
          <div class="card" style="margin-top:16px">
            <div class="card-h">
              <span class="ch-l">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                Codes actifs
              </span>
              <span style="margin-left:auto;font-size:12px;color:#6b7280">{{ codes().length }} code(s)</span>
            </div>
            @if (codesLoading()) {
              <div style="padding:32px;text-align:center;color:#9aa3af;font-size:13px">Chargement…</div>
            }
            @if (!codesLoading() && !codes().length) {
              <div style="padding:40px;text-align:center;color:#9aa3af;font-size:13px">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:32px;height:32px;opacity:.4;display:block;margin:0 auto 8px"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
                Aucun code généré
              </div>
            }
            @if (!codesLoading() && codes().length) {
              <div class="codes-list">
                @for (c of codes(); track c.id) {
                  <div class="code-row" [class.code-used]="c.used || isExpired(c)">
                    <div class="code-badge" [class.code-badge-used]="c.used || isExpired(c)">
                      {{ c.code }}
                    </div>
                    <div class="code-info">
                      <div class="code-role">Code d'accès mobile</div>
                      <div class="code-sub">
                        @if (c.label) { <span>{{ c.label }} · </span> }
                        @if (c.used) { <span class="tag-used">Utilisé</span> }
                        @else if (isExpired(c)) { <span class="tag-exp">Expiré</span> }
                        @else { Expire le {{ c.expires_at | date:'dd/MM/yyyy' }} }
                      </div>
                    </div>
                    <button class="btn-del" (click)="deleteCode(c.id)" title="Révoquer">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                    </button>
                  </div>
                }
              </div>
            }
          </div>

        </div>
      }

    }
  `,
  styles: [`
    :host {
      --blue:#2f6bff; --blue-d:#2055e0; --blue-soft:#e9f0ff;
      --green:#16a34a; --green-soft:#e6f6ec;
      --red:#e2483d; --red-soft:#fdeae9;
      --amber:#d97706; --amber-soft:#fdf2e3;
      --border:#e7eaf0; --card:#fff; --muted:#6b7280; --muted2:#9aa3af; --text:#1f2a37;
      --sh:0 1px 2px rgba(16,24,40,.04),0 1px 3px rgba(16,24,40,.06);
      display:block;
    }

    /* ── Head ── */
    .phead { margin-bottom:20px; }
    h1 { font-size:24px; font-weight:900; letter-spacing:-.02em; margin:0; }
    .sub { font-size:13.5px; color:var(--muted); margin-top:4px; }

    /* ── Tabs ── */
    .tabs { display:flex; gap:4px; background:#f1f4f8; border-radius:12px; padding:4px; margin-bottom:22px; width:fit-content; }
    .tab { display:inline-flex; align-items:center; gap:7px; padding:9px 18px; border:none; background:transparent; border-radius:9px; font-size:13.5px; font-weight:600; color:var(--muted); cursor:pointer; transition:.15s; }
    .tab svg { width:15px; height:15px; }
    .tab:hover { color:var(--text); background:rgba(255,255,255,.6); }
    .tab-active { background:#fff; color:var(--blue); box-shadow:0 1px 4px rgba(16,24,40,.1); font-weight:700; }

    /* ── Skeleton ── */
    .skel-wrap { display:flex; flex-direction:column; }
    .skel { background:linear-gradient(90deg,#f1f4f8 25%,#e8ecf0 50%,#f1f4f8 75%); background-size:200% 100%; animation:shimmer 1.4s infinite; }
    @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

    /* ── Layout grids ── */
    .grid { display:grid; grid-template-columns:1fr 1.4fr; gap:18px; align-items:start; }
    .visuel-grid { display:grid; grid-template-columns:1fr 1fr; gap:18px; align-items:start; }
    .mobile-layout { display:flex; flex-direction:column; gap:0; }
    .col { display:flex; flex-direction:column; }

    /* ── Card ── */
    .card { background:var(--card); border:1px solid var(--border); border-radius:14px; box-shadow:var(--sh); overflow:hidden; }
    .card-h { display:flex; align-items:center; gap:12px; padding:14px 18px; border-bottom:1px solid var(--border); }
    .ch-l { display:flex; align-items:center; gap:9px; font-size:15px; font-weight:800; }
    .ch-l svg { width:16px; height:16px; color:var(--blue); flex-shrink:0; }

    /* ── Upload zones ── */
    .logo-section { padding:18px; display:flex; flex-direction:column; gap:12px; }
    .logo-preview { position:relative; display:inline-block; }
    .logo-preview img { max-height:100px; max-width:220px; border-radius:10px; border:1px solid var(--border); object-fit:contain; display:block; }
    .btn-remove { position:absolute; top:-8px; right:-8px; width:22px; height:22px; border-radius:99px; background:var(--red); color:#fff; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; }
    .btn-remove svg { width:12px; height:12px; }
    .drop-zone { border:2px dashed var(--border); border-radius:12px; padding:28px 16px; text-align:center; cursor:pointer; transition:.15s; display:flex; flex-direction:column; align-items:center; gap:8px; }
    .drop-zone:hover { border-color:var(--blue); background:var(--blue-soft); }
    .drop-zone svg { width:28px; height:28px; color:var(--muted2); }
    .dz-label { font-size:13.5px; font-weight:700; color:var(--text); }
    .dz-sub { font-size:11.5px; color:var(--muted2); }
    .upload-hint { text-align:center; }
    .btn-link { background:none; border:none; color:var(--blue); font-size:13px; font-weight:600; cursor:pointer; }
    .btn-link:hover { text-decoration:underline; }
    .upload-progress { display:flex; align-items:center; gap:8px; font-size:13px; color:var(--muted); }

    /* ── Fields ── */
    .fields-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
    .field { display:flex; flex-direction:column; gap:5px; }
    .field.full { grid-column:1/-1; }
    .field label { font-size:12.5px; font-weight:700; color:#374151; }
    .req { color:var(--red); }
    .field input, .field textarea, .field select {
      padding:9px 12px; border:1px solid var(--border); border-radius:9px;
      font-size:13.5px; color:var(--text); outline:none; transition:.13s;
      background:#fff; resize:vertical; font-family:inherit;
    }
    .field input:focus, .field textarea:focus, .field select:focus { border-color:var(--blue); box-shadow:0 0 0 3px rgba(47,107,255,.12); }
    .field-hint { font-size:11.5px; color:var(--muted2); }

    /* ── Langue ── */
    .lang-grid { display:grid; grid-template-columns:1fr 1fr; gap:9px; }
    .lang-card { display:flex; align-items:center; gap:10px; border:1.5px solid var(--border); border-radius:10px; padding:10px 13px; cursor:pointer; transition:.13s; font-size:13.5px; font-weight:600; }
    .lang-card:hover { border-color:#c3d3f5; }
    .lang-active { border-color:var(--blue); background:var(--blue-soft); color:var(--blue); }
    .lang-flag { font-size:20px; }

    /* ── Couleurs ── */
    .color-grid { display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:24px; }
    .color-field label { display:block; font-size:12.5px; font-weight:700; color:#374151; margin-bottom:8px; }
    .color-input-wrap { display:flex; align-items:center; gap:8px; margin-bottom:10px; }
    .color-picker { width:44px; height:38px; border:none; border-radius:8px; cursor:pointer; padding:2px; background:#f1f4f8; }
    .color-hex { flex:1; padding:8px 11px; border:1px solid var(--border); border-radius:9px; font-size:13px; font-family:ui-monospace,monospace; color:var(--text); outline:none; }
    .color-hex:focus { border-color:var(--blue); box-shadow:0 0 0 3px rgba(47,107,255,.12); }
    .color-preview { border-radius:10px; padding:12px 16px; display:flex; align-items:center; }
    .color-preview span { color:rgba(255,255,255,.9); font-size:11.5px; font-weight:600; }

    /* ── PDF preview ── */
    .preview-block { border-top:1px solid var(--border); padding-top:20px; }
    .preview-label { font-size:11px; font-weight:700; letter-spacing:.04em; text-transform:uppercase; color:var(--muted); margin-bottom:12px; }
    .pdf-preview { border:1px solid var(--border); border-radius:10px; overflow:hidden; font-size:10px; }
    .pdf-header-bar { display:flex; justify-content:space-between; padding:8px 12px; }
    .pdf-body { padding:10px 12px; background:#fff; }
    .pdf-row { display:flex; gap:8px; margin-bottom:8px; font-size:10px; }
    .pdf-label-cell { font-size:8px; font-weight:700; letter-spacing:.03em; text-transform:uppercase; margin-top:1px; }
    .pdf-val-cell { font-weight:600; }
    .pdf-table-head { display:flex; justify-content:space-between; padding:5px 8px; border-radius:6px; }
    .pdf-table-row { display:flex; justify-content:space-between; padding:5px 8px; font-size:10px; }
    .pdf-table-total { text-align:right; font-size:11px; font-weight:700; padding:6px 8px 2px; }

    /* ── Phone mock ── */
    .phone-mock { background:#1a1a2e; border-radius:24px; padding:10px; box-shadow:0 20px 60px rgba(0,0,0,.3); }
    .phone-screen { background:#f6f7fa; border-radius:16px; overflow:hidden; width:180px; }
    .phone-topbar { padding:10px 12px; }
    .phone-body { padding:10px; }
    .phone-card { background:#fff; border-radius:8px; padding:8px 10px; display:flex; align-items:center; gap:8px; box-shadow:0 1px 3px rgba(0,0,0,.07); }
    .phone-card-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
    .phone-btn { margin-top:10px; border-radius:8px; padding:9px; text-align:center; font-size:10px; font-weight:700; color:#fff; }

    /* ── Info banner ── */
    .info-banner { display:flex; align-items:flex-start; gap:12px; background:#eff6ff; border:1px solid #bfdbfe; border-radius:12px; padding:14px 16px; margin-bottom:16px; }
    .info-banner svg { width:18px; height:18px; color:#3b82f6; flex-shrink:0; margin-top:1px; }
    .info-title { font-size:13px; font-weight:700; color:#1e40af; }
    .info-body { font-size:12.5px; color:#3b4f6b; margin-top:3px; line-height:1.55; }

    /* ── Génération code ── */
    .gen-form { display:grid; grid-template-columns:1fr 1fr auto; gap:12px; align-items:end; }
    .btn-gen { display:inline-flex; align-items:center; justify-content:center; gap:7px; background:var(--blue); color:#fff; border:none; border-radius:10px; padding:10px 18px; font-size:13.5px; font-weight:700; cursor:pointer; transition:.13s; white-space:nowrap; }
    .btn-gen:hover:not(:disabled) { background:var(--blue-d); }
    .btn-gen:disabled { opacity:.6; cursor:not-allowed; }
    .btn-gen svg { width:16px; height:16px; }

    .code-result { margin-top:18px; background:linear-gradient(135deg,#0e1626,#1a2744); border-radius:14px; padding:20px 22px; }
    .code-result-label { font-size:11px; font-weight:700; letter-spacing:.04em; text-transform:uppercase; color:rgba(255,255,255,.5); margin-bottom:12px; }
    .code-display { display:flex; align-items:center; gap:16px; }
    .code-chars { font-size:36px; font-weight:900; letter-spacing:.18em; color:#fff; font-family:ui-monospace,monospace; }
    .btn-copy { width:38px; height:38px; border-radius:9px; border:1px solid rgba(255,255,255,.2); background:rgba(255,255,255,.1); color:#fff; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:.13s; }
    .btn-copy:hover { background:rgba(255,255,255,.2); }
    .btn-copy svg { width:16px; height:16px; }
    .code-meta { margin-top:10px; font-size:12px; color:rgba(255,255,255,.5); }

    /* ── Codes list ── */
    .codes-list { padding:6px 0; }
    .code-row { display:flex; align-items:center; gap:14px; padding:12px 18px; border-bottom:1px solid var(--border); transition:.13s; }
    .code-row:last-child { border-bottom:none; }
    .code-row:hover { background:#fafbfd; }
    .code-used { opacity:.5; }
    .code-badge { font-size:16px; font-weight:900; letter-spacing:.1em; color:var(--blue); background:var(--blue-soft); border-radius:8px; padding:6px 12px; font-family:ui-monospace,monospace; }
    .code-badge-used { color:var(--muted); background:#f1f4f8; }
    .code-info { flex:1; min-width:0; }
    .code-role { font-size:13px; font-weight:700; }
    .code-sub { font-size:11.5px; color:var(--muted); margin-top:2px; display:flex; align-items:center; gap:6px; }
    .tag-used { background:var(--green-soft); color:var(--green); font-size:10.5px; font-weight:700; padding:1px 7px; border-radius:20px; }
    .tag-exp  { background:var(--amber-soft); color:var(--amber); font-size:10.5px; font-weight:700; padding:1px 7px; border-radius:20px; }
    .btn-del { width:30px; height:30px; border-radius:7px; border:none; background:transparent; color:var(--muted2); display:flex; align-items:center; justify-content:center; cursor:pointer; transition:.13s; }
    .btn-del:hover { background:var(--red-soft); color:var(--red); }
    .btn-del svg { width:14px; height:14px; }

    /* ── Footer ── */
    .form-footer { display:flex; align-items:center; justify-content:flex-end; gap:14px; margin-top:22px; padding:16px 0; border-top:1px solid var(--border); }
    .save-status { display:flex; align-items:center; gap:7px; font-size:13.5px; font-weight:600; }
    .save-status svg { width:16px; height:16px; }
    .green { color:var(--green); } .red { color:var(--red); }
    .btn-save { display:inline-flex; align-items:center; gap:8px; background:var(--blue); color:#fff; border:none; border-radius:10px; padding:10px 22px; font-size:14px; font-weight:700; cursor:pointer; transition:.13s; }
    .btn-save:hover:not(:disabled) { background:var(--blue-d); }
    .btn-save:disabled { opacity:.6; cursor:not-allowed; }
    .btn-save svg { width:16px; height:16px; }

    .spinner, .spinner-sm { border-radius:99px; animation:spin .7s linear infinite; }
    .spinner { width:18px; height:18px; border:2px solid rgba(47,107,255,.2); border-top-color:var(--blue); }
    .spinner-sm { width:14px; height:14px; border:2px solid rgba(255,255,255,.3); border-top-color:#fff; }
    @keyframes spin { to { transform:rotate(360deg); } }

    @media(max-width:900px) { .grid,.visuel-grid { grid-template-columns:1fr; } }
    @media(max-width:700px) { .gen-form { grid-template-columns:1fr; } }
  `]
})
export class PrintSettingsComponent implements OnInit {

  readonly SECTORS    = SECTORS;
  readonly CURRENCIES = CURRENCIES;
  readonly LANGS      = LANGS;

  loading  = signal(true);
  saving   = signal(false);
  uploading        = signal(false);
  uploadingCachet  = signal(false);
  saveStatus = signal<'ok' | 'err' | null>(null);
  activeTab = signal<'societe' | 'visuel' | 'mobile'>('societe');

  settings = signal<PrintSettings>({});

  form: PrintSettings = {
    company_name: '', address: '', city: '', phone: '', email: '',
    ice: '', if_fiscal: '', rc: '', patente: '', footer_text: '',
    sector: '', currency: 'MAD', lang: 'fr',
    primary_color: '#2f6bff', secondary_color: '#16a34a',
  };

  // Codes activation
  codes           = signal<ActivationCode[]>([]);
  codesLoading    = signal(false);
  codesLoaded     = false;
  generatingCode  = signal(false);
  lastGeneratedCode = signal<ActivationCode | null>(null);
  copied          = signal(false);
  newCode = { label: '', days: 30 };

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.get<PrintSettings>('/print-settings').subscribe({
      next: s => {
        this.settings.set(s);
        this.form = {
          company_name:    s.company_name    || '',
          address:         s.address         || '',
          city:            s.city            || '',
          phone:           s.phone           || '',
          email:           s.email           || '',
          ice:             s.ice             || '',
          if_fiscal:       s.if_fiscal       || '',
          rc:              s.rc              || '',
          patente:         s.patente         || '',
          footer_text:     s.footer_text     || '',
          sector:          s.sector          || '',
          currency:        s.currency        || 'MAD',
          lang:            s.lang            || 'fr',
          primary_color:   s.primary_color   || '#2f6bff',
          secondary_color: s.secondary_color || '#16a34a',
        };
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  save() {
    this.saving.set(true);
    this.saveStatus.set(null);
    this.api.put<PrintSettings>('/print-settings', this.form).subscribe({
      next: s => {
        this.settings.set(s);
        this.saving.set(false);
        this.saveStatus.set('ok');
        setTimeout(() => this.saveStatus.set(null), 3000);
      },
      error: () => { this.saving.set(false); this.saveStatus.set('err'); },
    });
  }

  // ── Logo / Cachet ──────────────────────────────────────

  logoSrc(): string {
    const url = this.settings().logo_url;
    if (!url) return '';
    return url.startsWith('http') ? url : `${environment.apiUrl.replace('/api', '')}${url}`;
  }

  cachetSrc(): string {
    const url = this.settings().cachet_url;
    if (!url) return '';
    return url.startsWith('http') ? url : `${environment.apiUrl.replace('/api', '')}${url}`;
  }

  onImgError(e: Event) { (e.target as HTMLImageElement).style.display = 'none'; }

  onFileChange(e: Event, type: 'logo' | 'cachet') {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) type === 'logo' ? this.uploadLogo(file) : this.uploadCachet(file);
  }

  onDrop(e: DragEvent, type: 'logo' | 'cachet') {
    e.preventDefault();
    const file = e.dataTransfer?.files[0];
    if (file) type === 'logo' ? this.uploadLogo(file) : this.uploadCachet(file);
  }

  uploadLogo(file: File) {
    this.uploading.set(true);
    const fd = new FormData();
    fd.append('logo', file);
    this.api.postForm<{ logo_url: string }>('/print-settings/logo', fd).subscribe({
      next: r => { this.settings.update(s => ({ ...s, logo_url: r.logo_url })); this.uploading.set(false); },
      error: () => this.uploading.set(false),
    });
  }

  deleteLogo() {
    this.api.delete('/print-settings/logo').subscribe({
      next: () => this.settings.update(s => ({ ...s, logo_url: undefined })),
      error: () => {},
    });
  }

  uploadCachet(file: File) {
    this.uploadingCachet.set(true);
    const fd = new FormData();
    fd.append('cachet', file);
    this.api.postForm<{ cachet_url: string }>('/print-settings/cachet', fd).subscribe({
      next: r => { this.settings.update(s => ({ ...s, cachet_url: r.cachet_url })); this.uploadingCachet.set(false); },
      error: () => this.uploadingCachet.set(false),
    });
  }

  deleteCachet() {
    this.api.delete('/print-settings/cachet').subscribe({
      next: () => this.settings.update(s => ({ ...s, cachet_url: undefined })),
      error: () => {},
    });
  }

  // ── Codes activation ───────────────────────────────────

  loadCodes() {
    if (this.codesLoaded) return;
    this.codesLoading.set(true);
    this.api.get<ActivationCode[]>('/print-settings/activation-codes').subscribe({
      next: list => { this.codes.set(list); this.codesLoading.set(false); this.codesLoaded = true; },
      error: () => this.codesLoading.set(false),
    });
  }

  generateCode() {
    this.generatingCode.set(true);
    this.api.post<ActivationCode>('/print-settings/activation-codes', this.newCode).subscribe({
      next: code => {
        this.codes.update(list => [code, ...list]);
        this.lastGeneratedCode.set(code);
        this.generatingCode.set(false);
        this.newCode.label = '';
      },
      error: () => this.generatingCode.set(false),
    });
  }

  deleteCode(id: string) {
    this.api.delete(`/print-settings/activation-codes/${id}`).subscribe({
      next: () => this.codes.update(list => list.filter(c => c.id !== id)),
      error: () => {},
    });
  }

  copyCode(code: string) {
    navigator.clipboard.writeText(code).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    });
  }

  isExpired(c: ActivationCode): boolean {
    return new Date(c.expires_at) < new Date();
  }
}
