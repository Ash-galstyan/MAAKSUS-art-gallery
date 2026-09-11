// frontend/src/app/features/artwork-detail/artwork-detail.service.spec.ts
import { TestBed } from '@angular/core/testing';
import { ArtworkDetailService } from './artwork-detail.service';
import { ApiService } from '../../core/http/api.service';
import type { ArtworkDetail } from '../../core/api-models/artwork.model';

describe('ArtworkDetailService', () => {
  let service: ArtworkDetailService;
  let api: jasmine.SpyObj<ApiService>;

  const detail: ArtworkDetail = {
    id: 'a1',
    slug: 'sunset',
    title: 'Sunset',
    description: null,
    history: null,
    medium: null,
    year: null,
    widthCm: null,
    heightCm: null,
    basePrice: 1000,
    isAvailable: true,
    artist: { id: 'ar1', name: 'Ash' },
    category: { id: 'c1', slug: 'landscape', name: 'Landscape' },
    images: [],
  };

  beforeEach(() => {
    api = jasmine.createSpyObj<ApiService>('ApiService', ['get']);
    TestBed.configureTestingModule({ providers: [{ provide: ApiService, useValue: api }] });
    service = TestBed.inject(ArtworkDetailService);
  });

  it('fetches an artwork by id', async () => {
    api.get.and.returnValue(Promise.resolve(detail));
    const result = await service.getById('a1');
    expect(api.get).toHaveBeenCalledWith('/artworks/a1');
    expect(result).toBe(detail);
  });

  it('URL-encodes the id', async () => {
    api.get.and.returnValue(Promise.resolve(detail));
    await service.getById('has space/slash');
    expect(api.get).toHaveBeenCalledWith(`/artworks/${encodeURIComponent('has space/slash')}`);
  });
});
