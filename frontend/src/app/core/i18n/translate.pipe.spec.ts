// frontend/src/app/core/i18n/translate.pipe.spec.ts
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { TranslatePipe } from './translate.pipe';
import { I18nService } from './i18n.service';

describe('TranslatePipe', () => {
  let pipe: TranslatePipe;
  let locale: ReturnType<typeof signal<'en' | 'hy' | 'ru'>>;
  let t: jasmine.Spy;

  beforeEach(() => {
    locale = signal<'en' | 'hy' | 'ru'>('en');
    t = jasmine.createSpy('t').and.callFake((key: string) => `translated:${key}`);
    const i18nStub = { locale, t } as unknown as I18nService;
    TestBed.configureTestingModule({ providers: [{ provide: I18nService, useValue: i18nStub }] });
    pipe = TestBed.runInInjectionContext(() => new TranslatePipe());
  });

  it('delegates to I18nService.t with the key and params', () => {
    const result = pipe.transform('gallery.title', { count: 2 });
    expect(result).toBe('translated:gallery.title');
    expect(t).toHaveBeenCalledWith('gallery.title', { count: 2 });
  });

  it('works without params', () => {
    pipe.transform('gallery.title');
    expect(t).toHaveBeenCalledWith('gallery.title', undefined);
  });

  it('reads the locale signal so it re-runs on language change (impure pipe)', () => {
    pipe.transform('gallery.title');
    locale.set('ru');
    pipe.transform('gallery.title');
    // Two independent reads of the locale signal, one per transform call.
    expect(t).toHaveBeenCalledTimes(2);
  });
});
