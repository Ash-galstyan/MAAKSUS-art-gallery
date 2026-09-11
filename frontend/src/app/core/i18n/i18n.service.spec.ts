// frontend/src/app/core/i18n/i18n.service.spec.ts
import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { I18nService } from './i18n.service';

const STORAGE_KEY = 'gallery.locale';

describe('I18nService', () => {
  let httpMock: HttpTestingController;

  function inject(): I18nService {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
    return TestBed.inject(I18nService);
  }

  afterEach(() => {
    localStorage.removeItem(STORAGE_KEY);
    httpMock.verify();
  });

  describe('initial locale resolution', () => {
    it('uses the stored locale when it is a supported one', () => {
      localStorage.setItem(STORAGE_KEY, 'ru');
      const service = inject();
      expect(service.locale()).toBe('ru');
    });

    it('ignores an unsupported stored locale and falls back to browser/default', () => {
      localStorage.setItem(STORAGE_KEY, 'fr');
      spyOnProperty(navigator, 'language', 'get').and.returnValue('en-US');
      const service = inject();
      expect(service.locale()).toBe('en');
    });

    it('falls back to browser language when nothing is stored', () => {
      localStorage.removeItem(STORAGE_KEY);
      spyOnProperty(navigator, 'language', 'get').and.returnValue('hy-AM');
      const service = inject();
      expect(service.locale()).toBe('hy');
    });

    it('falls back to the default locale when browser language is unsupported', () => {
      localStorage.removeItem(STORAGE_KEY);
      spyOnProperty(navigator, 'language', 'get').and.returnValue('fr-FR');
      const service = inject();
      expect(service.locale()).toBe('en');
    });
  });

  describe('init', () => {
    it('loads the bundle for the current locale and flips ready', async () => {
      const service = inject();
      expect(service.ready()).toBeFalse();
      const promise = service.init();
      httpMock.expectOne('/assets/i18n/en.json').flush({ common: { dismiss: 'Dismiss' } });
      await promise;
      expect(service.ready()).toBeTrue();
    });
  });

  describe('setLocale', () => {
    it('is a no-op when switching to the already-active locale', async () => {
      const service = inject();
      await service.setLocale('en');
      httpMock.expectNone('/assets/i18n/en.json');
    });

    it('loads the new bundle, updates the signal, persists, and sets the <html lang>', async () => {
      const service = inject();
      const promise = service.setLocale('hy');
      httpMock.expectOne('/assets/i18n/hy.json').flush({ greeting: 'Barev' });
      await promise;
      expect(service.locale()).toBe('hy');
      expect(localStorage.getItem(STORAGE_KEY)).toBe('hy');
      expect(document.documentElement.getAttribute('lang')).toBe('hy');
    });

    it('does not re-fetch a bundle that was already loaded', async () => {
      const service = inject();
      const p1 = service.setLocale('ru');
      httpMock.expectOne('/assets/i18n/ru.json').flush({ a: '1' });
      await p1;

      const switchBack = service.setLocale('en');
      httpMock.expectOne('/assets/i18n/en.json').flush({ b: '2' });
      await switchBack;

      const p2 = service.setLocale('ru');
      httpMock.expectNone('/assets/i18n/ru.json');
      await p2;
      expect(service.locale()).toBe('ru');
    });
  });

  describe('t', () => {
    it('returns the key itself before any bundle has loaded', () => {
      const service = inject();
      expect(service.t('gallery.title')).toBe('gallery.title');
    });

    it('resolves a nested dot-path from the loaded bundle', async () => {
      const service = inject();
      const promise = service.init();
      httpMock.expectOne('/assets/i18n/en.json').flush({ gallery: { title: 'Gallery' } });
      await promise;
      expect(service.t('gallery.title')).toBe('Gallery');
    });

    it('returns the key when the path is missing', async () => {
      const service = inject();
      const promise = service.init();
      httpMock.expectOne('/assets/i18n/en.json').flush({ gallery: { title: 'Gallery' } });
      await promise;
      expect(service.t('gallery.missing.deep')).toBe('gallery.missing.deep');
    });

    it('interpolates {{param}} placeholders', async () => {
      const service = inject();
      const promise = service.init();
      httpMock.expectOne('/assets/i18n/en.json').flush({ cart: { itemsCount: '{{count}} items' } });
      await promise;
      expect(service.t('cart.itemsCount', { count: 3 })).toBe('3 items');
    });

    it('replaces every occurrence of a repeated placeholder', async () => {
      const service = inject();
      const promise = service.init();
      httpMock.expectOne('/assets/i18n/en.json').flush({ msg: '{{name}} says hi, {{name}}!' });
      await promise;
      expect(service.t('msg', { name: 'Ash' })).toBe('Ash says hi, Ash!');
    });
  });

  describe('localeServer', () => {
    it('uppercases the current locale for the backend', () => {
      const service = inject();
      expect(service.localeServer()).toBe('EN');
    });

    it('tracks locale changes', async () => {
      const service = inject();
      const promise = service.setLocale('hy');
      httpMock.expectOne('/assets/i18n/hy.json').flush({});
      await promise;
      expect(service.localeServer()).toBe('HY');
    });
  });
});
