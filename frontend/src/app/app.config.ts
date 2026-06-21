// frontend/src/app/app.config.ts
/**
 * App-wide providers.
 *
 * APP_INITIALIZER chain:
 *   1. Load the current locale bundle (so the first paint has strings).
 *   2. Try to hydrate the auth session via the refresh cookie. If it succeeds
 *      the user lands logged-in even on a fresh tab.
 *
 * Interceptors are registered in order; the auth interceptor runs first so
 * the bearer token is attached before the locale header is added.
 */
import {
  APP_INITIALIZER,
  type ApplicationConfig,
  inject,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { APP_ROUTES } from './app.routes';
import { I18nService } from './core/i18n/i18n.service';
import { AuthService } from './core/auth/auth.service';
import { authInterceptor } from './core/auth/auth.interceptor';
import { localeInterceptor } from './core/i18n/locale.interceptor';
import { errorInterceptor } from './core/http/error.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideAnimationsAsync(),
    provideRouter(
      APP_ROUTES,
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
    ),
    provideHttpClient(withInterceptors([authInterceptor, localeInterceptor, errorInterceptor])),
    {
      provide: APP_INITIALIZER,
      multi: true,
      useFactory: () => {
        const i18n = inject(I18nService);
        const auth = inject(AuthService);
        return async () => {
          await i18n.init();
          await auth.hydrate();
        };
      },
    },
  ],
};
