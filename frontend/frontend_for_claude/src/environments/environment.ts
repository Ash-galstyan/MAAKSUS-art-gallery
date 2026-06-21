// frontend/src/environments/environment.ts
export const environment = {
  production: false,
  apiBaseUrl: '/api',                       // proxied to localhost:3000 in dev
  uploadsBaseUrl: '/uploads',
  defaultLocale: 'en' as const,
  supportedLocales: ['en', 'hy', 'ru'] as const,
};
