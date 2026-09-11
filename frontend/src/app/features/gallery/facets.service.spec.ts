// frontend/src/app/features/gallery/facets.service.spec.ts
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { FacetsService } from './facets.service';
import { ApiService } from '../../core/http/api.service';
import { I18nService } from '../../core/i18n/i18n.service';
import type { GalleryFacets } from '../../core/api-models/gallery-facets.model';

describe('FacetsService', () => {
  let service: FacetsService;
  let api: jasmine.SpyObj<ApiService>;
  let locale: ReturnType<typeof signal<'en' | 'hy' | 'ru'>>;

  const facets: GalleryFacets = {
    artists: [{ id: 'ar1', slug: 'ash', name: 'Ash', count: 5 }],
    priceRange: { min: 0, max: 5000 },
    orientations: [{ key: 'landscape', count: 3 }],
  };

  beforeEach(() => {
    api = jasmine.createSpyObj<ApiService>('ApiService', ['get']);
    locale = signal<'en' | 'hy' | 'ru'>('en');
    const i18nStub = { locale } as unknown as I18nService;

    TestBed.configureTestingModule({
      providers: [
        { provide: ApiService, useValue: api },
        { provide: I18nService, useValue: i18nStub },
      ],
    });
    service = TestBed.inject(FacetsService);
  });

  it('fetches facets from the API', async () => {
    api.get.and.returnValue(Promise.resolve(facets));
    const result = await service.getFacets();
    expect(result).toBe(facets);
    expect(api.get).toHaveBeenCalledWith('/artworks/facets');
  });

  it('caches the result per locale — a second call does not refetch', async () => {
    api.get.and.returnValue(Promise.resolve(facets));
    await service.getFacets();
    await service.getFacets();
    expect(api.get).toHaveBeenCalledTimes(1);
  });

  it('re-fetches when the locale changes', async () => {
    api.get.and.returnValue(Promise.resolve(facets));
    await service.getFacets();
    locale.set('hy');
    await service.getFacets();
    expect(api.get).toHaveBeenCalledTimes(2);
  });

  it('drops the cache entry on failure so a later call retries', async () => {
    api.get.and.returnValue(Promise.reject(new Error('network')));
    await expectAsync(service.getFacets()).toBeRejected();

    api.get.and.returnValue(Promise.resolve(facets));
    const result = await service.getFacets();
    expect(result).toBe(facets);
    expect(api.get).toHaveBeenCalledTimes(2);
  });

  it('concurrent calls before resolution share the same in-flight promise', async () => {
    api.get.and.returnValue(Promise.resolve(facets));
    const [a, b] = [service.getFacets(), service.getFacets()];
    expect(api.get).toHaveBeenCalledTimes(1);
    await Promise.all([a, b]);
  });
});
