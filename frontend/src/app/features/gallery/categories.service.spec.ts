// frontend/src/app/features/gallery/categories.service.spec.ts
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { CategoriesService } from './categories.service';
import { ApiService } from '../../core/http/api.service';
import { I18nService } from '../../core/i18n/i18n.service';
import type { Category } from '../../core/api-models/category.model';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let api: jasmine.SpyObj<ApiService>;
  let locale: ReturnType<typeof signal<'en' | 'hy' | 'ru'>>;

  const categories: Category[] = [{ id: 'c1', slug: 'landscape', name: 'Landscape' }];

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
    service = TestBed.inject(CategoriesService);
  });

  it('fetches categories from the API', async () => {
    api.get.and.returnValue(Promise.resolve(categories));
    const result = await service.list();
    expect(result).toBe(categories);
    expect(api.get).toHaveBeenCalledWith('/categories');
  });

  it('caches the result per locale — a second call does not refetch', async () => {
    api.get.and.returnValue(Promise.resolve(categories));
    await service.list();
    await service.list();
    expect(api.get).toHaveBeenCalledTimes(1);
  });

  it('re-fetches when the locale changes', async () => {
    api.get.and.returnValue(Promise.resolve(categories));
    await service.list();
    locale.set('hy');
    await service.list();
    expect(api.get).toHaveBeenCalledTimes(2);
  });

  it('drops the cache entry on failure so a later call retries', async () => {
    api.get.and.returnValue(Promise.reject(new Error('network')));
    await expectAsync(service.list()).toBeRejected();

    api.get.and.returnValue(Promise.resolve(categories));
    const result = await service.list();
    expect(result).toBe(categories);
    expect(api.get).toHaveBeenCalledTimes(2);
  });

  it('concurrent calls before resolution share the same in-flight promise', async () => {
    api.get.and.returnValue(Promise.resolve(categories));
    const [a, b] = [service.list(), service.list()];
    expect(api.get).toHaveBeenCalledTimes(1);
    await Promise.all([a, b]);
  });
});
