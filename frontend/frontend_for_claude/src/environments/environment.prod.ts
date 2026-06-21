// frontend/src/environments/environment.prod.ts
export const environment = {
  production: true,
  apiBaseUrl: '/api',
  uploadsBaseUrl: '/uploads',
  defaultLocale: 'en' as const,
  supportedLocales: ['en', 'hy', 'ru'] as const,
};
