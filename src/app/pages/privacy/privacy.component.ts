import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-privacy',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="privacy-page">
      <div class="privacy-card">
        <div class="head">
          <img src="assets/logo.svg" alt="KeepOn" class="logo" />
          <h1>Politique de confidentialité</h1>
          <p class="updated">Dernière mise à jour : 4 juillet 2026</p>
        </div>

        <section>
          <h2>1. Introduction</h2>
          <p>KeepOn ("nous", "notre application") respecte la confidentialité des utilisateurs de son application mobile et de sa plateforme web, destinées à la gestion de la force de vente, des commandes, des livraisons et du stock pour les entreprises clientes. Cette politique décrit quelles données sont collectées, pourquoi, et comment elles sont protégées.</p>
        </section>

        <section>
          <h2>2. Données collectées</h2>
          <ul>
            <li><strong>Identifiants de compte :</strong> nom, email professionnel, mot de passe (chiffré), rôle dans l'entreprise.</li>
            <li><strong>Données de localisation :</strong> position GPS utilisée pendant les visites commerciales et les tournées de livraison, afin d'enregistrer le lieu des visites et d'optimiser les trajets. La localisation n'est utilisée que pendant l'usage actif de l'application.</li>
            <li><strong>Données professionnelles :</strong> commandes, clients, produits, stocks et documents (bons de livraison, factures) saisis par l'utilisateur dans le cadre de son activité.</li>
            <li><strong>Données biométriques locales :</strong> si l'utilisateur active le déverrouillage par empreinte digitale ou reconnaissance faciale, l'authentification biométrique est traitée entièrement par le système d'exploitation de l'appareil ; aucune donnée biométrique n'est transmise ou stockée par KeepOn.</li>
          </ul>
        </section>

        <section>
          <h2>3. Utilisation des données</h2>
          <p>Les données sont utilisées exclusivement pour :</p>
          <ul>
            <li>Permettre l'authentification et la gestion des accès selon le rôle de l'utilisateur.</li>
            <li>Assurer le suivi des visites commerciales, commandes et livraisons pour le compte de l'entreprise cliente.</li>
            <li>Générer des rapports d'activité et statistiques à usage interne de l'entreprise.</li>
          </ul>
          <p>Les données ne sont ni vendues ni partagées avec des tiers à des fins publicitaires.</p>
        </section>

        <section>
          <h2>4. Partage des données</h2>
          <p>Les données peuvent être partagées avec :</p>
          <ul>
            <li>L'entreprise cliente (tenant) à laquelle l'utilisateur est rattaché, qui reste responsable de ses propres données.</li>
            <li>Des prestataires techniques d'hébergement, uniquement pour le fonctionnement du service, sous obligation de confidentialité.</li>
          </ul>
        </section>

        <section>
          <h2>5. Conservation et sécurité</h2>
          <p>Les données sont conservées tant que le compte utilisateur ou l'entreprise cliente reste actif. Les communications sont chiffrées (TLS) et les mots de passe sont stockés sous forme hachée. L'accès aux données est restreint selon le rôle de chaque utilisateur.</p>
        </section>

        <section>
          <h2>6. Droits des utilisateurs</h2>
          <p>Tout utilisateur peut demander l'accès, la correction ou la suppression de ses données personnelles en contactant l'administrateur de son entreprise ou directement à l'adresse ci-dessous.</p>
        </section>

        <section id="delete-account">
          <h2>6bis. Suppression du compte et des données</h2>
          <p>Pour demander la suppression de votre compte KeepOn et de toutes les données associées (informations de profil, historique de visites, commandes), envoyez un e-mail à <a href="mailto:abd1111sakoum@gmail.com?subject=Demande%20de%20suppression%20de%20compte%20KeepOn">abd1111sakoum@gmail.com</a> en précisant :</p>
          <ul>
            <li>Votre nom d'entreprise (tenant) KeepOn</li>
            <li>Votre adresse e-mail de connexion</li>
          </ul>
          <p>Votre demande sera traitée sous 30 jours maximum.</p>
        </section>

        <section>
          <h2>7. Permissions de l'application mobile</h2>
          <ul>
            <li><strong>Localisation :</strong> requise pour l'enregistrement des visites et tournées.</li>
            <li><strong>Stockage/fichiers :</strong> requis pour générer et partager des documents PDF (bons de commande, factures).</li>
            <li><strong>Réseau :</strong> requis pour la synchronisation des données avec le serveur.</li>
          </ul>
        </section>

        <section>
          <h2>8. Contact</h2>
          <p>Pour toute question relative à cette politique de confidentialité, contactez-nous à : <a href="mailto:abd1111sakoum@gmail.com">abd1111sakoum@gmail.com</a></p>
        </section>
      </div>
    </div>
  `,
  styles: [`
    .privacy-page { min-height:100vh; background:#f4f5f8; padding:48px 20px; display:flex; justify-content:center; }
    .privacy-card { width:100%; max-width:760px; background:#fff; border-radius:22px; border:1px solid #e7eaf0; box-shadow:0 4px 6px rgba(16,24,40,.04), 0 10px 40px rgba(16,24,40,.10); padding:48px; }
    .head { margin-bottom:32px; border-bottom:1px solid #e7eaf0; padding-bottom:24px; }
    .logo { width:100px; margin-bottom:16px; }
    .head h1 { font-size:26px; font-weight:900; color:#1f2a37; letter-spacing:-.02em; margin:0; }
    .updated { font-size:13px; color:#6b7280; margin-top:6px; }
    section { margin-bottom:26px; }
    section h2 { font-size:16px; font-weight:800; color:#1f2a37; margin-bottom:10px; }
    section p, section li { font-size:14.5px; color:#374151; line-height:1.65; }
    section ul { padding-left:20px; margin:8px 0; }
    section li { margin-bottom:6px; }
    a { color:#FF3532; }
  `]
})
export class PrivacyComponent {}
