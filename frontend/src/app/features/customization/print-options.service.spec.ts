// frontend/src/app/features/customization/print-options.service.spec.ts
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { PrintOptionsService } from './print-options.service';
import { ApiService } from '../../core/http/api.service';
import { I18nService } from '../../core/i18n/i18n.service';
import type { FrameOption, PrintSize } from '../../core/api-models/print-options.model';

describe('PrintOptionsService', () => {
  let service: PrintOptionsService;
  let api: jasmine.SpyObj<ApiService>;
  let locale: ReturnType<typeof signal<'en' | 'hy' | 'ru'>>;

  const sizes: PrintSize[] = [
    { id: 's1', code: 'M', label: 'Medium', widthCm: 40, heightCm: 30, priceMultiplier: 1.5 },
  ];
  const frames: FrameOption[] = [
    { id: 'f1', code: 'WOOD', label: 'Wood', frameType: 'WOOD', colorHex: '#6b4423', additionalPrice: 5000 },
  ];

  beforeEach(() => {
    api = jasmine.createSpyObj<ApiService>('ApiService', ['get']);
    locale = signal<'en' | 'hy' | 'ru'>('en');
    TestBed.configureTestingModule({
      providers: [
        { provide: ApiService, useValue: api },
        { provide: I18nService, useValue: { locale } as unknown as I18nService },
      ],
    });
    service = TestBed.inject(PrintOptionsService);
  });

  describe('listSizes', () => {
    it('fetches sizes from the API', async () => {
      api.get.and.returnValue(Promise.resolve(sizes));
      const result = await service.listSizes();
      expect(api.get).toHaveBeenCalledWith('/print-options/sizes');
      expect(result).toBe(sizes);
    });

    it('caches per locale', async () => {
      api.get.and.returnValue(Promise.resolve(sizes));
      await service.listSizes();
      await service.listSizes();
      expect(api.get).toHaveBeenCalledTimes(1);
    });

    it('re-fetches after a locale change', async () => {
      api.get.and.returnValue(Promise.resolve(sizes));
      await service.listSizes();
      locale.set('ru');
      await service.listSizes();
      expect(api.get).toHaveBeenCalledTimes(2);
    });

    it('drops the cache entry on failure so a later call retries', async () => {
      api.get.and.returnValue(Promise.reject(new Error('network')));
      await expectAsync(service.listSizes()).toBeRejected();
      api.get.and.returnValue(Promise.resolve(sizes));
      const result = await service.listSizes();
      expect(result).toBe(sizes);
      expect(api.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('listFrames', () => {
    it('fetches frames from a cache independent of sizes', async () => {
      api.get.and.callFake(((path: string) =>
        Promise.resolve(path === '/print-options/sizes' ? sizes : frames)) as ApiService['get']);
      const [sizesResult, framesResult] = await Promise.all([service.listSizes(), service.listFrames()]);
      expect(sizesResult).toBe(sizes);
      expect(framesResult).toBe(frames);
      expect(api.get).toHaveBeenCalledWith('/print-options/frames');
      expect(api.get).toHaveBeenCalledWith('/print-options/sizes');
    });

    it('caches frames per locale independently of the sizes cache', async () => {
      api.get.and.returnValue(Promise.resolve(frames));
      await service.listFrames();
      await service.listFrames();
      expect(api.get).toHaveBeenCalledTimes(1);
    });
  });
});
