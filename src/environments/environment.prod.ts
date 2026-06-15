export const environment = {
  production: true,
  // Le frontend est servi depuis le même serveur que le backend (13.140.148.8)
  // Les chemins relatifs /api → http://13.140.148.8/api automatiquement
  apiUrl: '/api',
  appVersion: '1.0.0',
  enableDevTools: false,
  // IMPORTANT : remplacer cette valeur par la vraie clé avant le build de production
  superadminSecret: 'superadmin_master_key_change_in_prod',
};
