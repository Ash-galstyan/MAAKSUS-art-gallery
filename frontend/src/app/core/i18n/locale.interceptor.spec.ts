// frontend/src/app/core/i18n/locale.interceptor.spec.ts
import { TestBed } from '@angular/core/testing';
import { HttpRequest, type HttpEvent, type HttpHandlerFn } from '@angular/common/http';
import { of, firstValueFrom } from 'rxjs';
import { localeInterceptor } from './locale.interceptor';
import { I18nService } from './i18n.service';

describe('localeInterceptor', () => {
  it('adds an Accept-Language header derived from the current locale', async () => {
    const i18n = { localeServer: () => 'HY' } as unknown as I18nService;
    TestBed.configureTestingModule({ providers: [{ provide: I18nService, useValue: i18n }] });

    const next = jasmine.createSpy<HttpHandlerFn>().and.callFake(() => of({} as HttpEvent<unknown>));
    const req = new HttpRequest('GET', '/api/artworks');
    await firstValueFrom(
      TestBed.runInInjectionContext(() => localeInterceptor(req, next)),
    );
    const sentReq = next.calls.mostRecent().args[0];
    expect(sentReq.headers.get('Accept-Language')).toBe('HY');
  });
});
