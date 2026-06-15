export const environment = {
  production: false,
  // En dev, le proxy (proxy.conf.json) redirige /api → http://localhost:3000
  // Donc on garde des chemins relatifs, cohérents avec la prod
  apiUrl: '/api',
  appVersion: 'dev',
  enableDevTools: true,
  // Clé superadmin — à ne jamais commiter en prod ; remplacer dans environment.prod.ts
  superadminSecret: 'superadmin_dev_key',
};
