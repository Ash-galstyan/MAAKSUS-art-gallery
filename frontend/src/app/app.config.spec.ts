// frontend/src/app/app.config.spec.ts
import { TestBed } from '@angular/core/testing';
import { APP_INITIALIZER } from '@angular/core';
import { appConfig } from './app.config';
import { I18nService } from './core/i18n/i18n.service';
import { AuthService } from './core/auth/auth.service';

describe('appConfig', () => {
  it('registers a multi APP_INITIALIZER provider', () => {
    const entry = appConfig.providers.find(
      (p) => typeof p === 'object' && p !== null && 'provide' in p && p.provide === APP_INITIALIZER,
    ) as unknown as { multi: boolean } | undefined;
    expect(entry).toBeDefined();
    expect(entry!.multi).toBeTrue();
  });

  it('the initializer awaits i18n.init() before auth.hydrate()', async () => {
    const order: string[] = [];
    const i18n = {
      init: jasmine.createSpy('init').and.callFake(async () => {
        order.push('i18n.init');
      }),
    } as unknown as I18nService;
    const auth = {
      hydrate: jasmine.createSpy('hydrate').and.callFake(async () => {
        order.push('auth.hydrate');
      }),
    } as unknown as AuthService;

    TestBed.configureTestingModule({
      providers: [
        { provide: I18nService, useValue: i18n },
        { provide: AuthService, useValue: auth },
      ],
    });

    const entry = appConfig.providers.find(
      (p) => typeof p === 'object' && p !== null && 'provide' in p && p.provide === APP_INITIALIZER,
    ) as unknown as { useFactory: () => () => Promise<void> };
    const initFn = TestBed.runInInjectionContext(() => entry.useFactory());
    await initFn();

    expect(order).toEqual(['i18n.init', 'auth.hydrate']);
  });
});
