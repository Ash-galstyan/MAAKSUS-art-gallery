// frontend/src/app/features/gallery/gallery.service.spec.ts
import { TestBed } from '@angular/core/testing';
import { GalleryService } from './gallery.service';
import { ApiService } from '../../core/http/api.service';
import type { ArtworkListItem } from '../../core/api-models/artwork.model';

describe('GalleryService', () => {
  let service: GalleryService;
  let api: jasmine.SpyObj<ApiService>;

  const item: ArtworkListItem = {
    id: 'a1',
    slug: 'a1',
    title: 'Sunset',
    artist: { id: 'ar1', name: 'Ash' },
    category: { id: 'c1', slug: 'landscape', name: 'Landscape' },
    basePrice: 1000,
    thumbnailPath: null,
    mediumPath: null,
    width: null,
    height: null,
  };

  beforeEach(() => {
    api = jasmine.createSpyObj<ApiService>('ApiService', ['getPaginated']);
    TestBed.configureTestingModule({ providers: [{ provide: ApiService, useValue: api }] });
    service = TestBed.inject(GalleryService);
  });

  it('applies default limit and omits absent optional params', async () => {
    api.getPaginated.and.returnValue(Promise.resolve({ data: [item], nextCursor: null }));
    const result = await service.listArtworks({});
    expect(api.getPaginated).toHaveBeenCalledWith('/artworks', {
      categoryIds: undefined,
      artistIds: undefined,
      new: undefined,
      priceMin: undefined,
      priceMax: undefined,
      orientation: undefined,
      sort: undefined,
      search: undefined,
      cursor: undefined,
      limit: 24,
    });
    expect(result).toEqual({ items: [item], nextCursor: null });
  });

  it('joins categoryIds with commas', async () => {
    api.getPaginated.and.returnValue(Promise.resolve({ data: [], nextCursor: null }));
    await service.listArtworks({ categoryIds: ['c1', 'c2'] });
    expect(api.getPaginated).toHaveBeenCalledWith(
      '/artworks',
      jasmine.objectContaining({ categoryIds: 'c1,c2' }),
    );
  });

  it('omits categoryIds entirely when the array is empty', async () => {
    api.getPaginated.and.returnValue(Promise.resolve({ data: [], nextCursor: null }));
    await service.listArtworks({ categoryIds: [] });
    expect(api.getPaginated).toHaveBeenCalledWith(
      '/artworks',
      jasmine.objectContaining({ categoryIds: undefined }),
    );
  });

  it('trims search and drops it when blank', async () => {
    api.getPaginated.and.returnValue(Promise.resolve({ data: [], nextCursor: null }));
    await service.listArtworks({ search: '  sea  ' });
    expect(api.getPaginated).toHaveBeenCalledWith(
      '/artworks',
      jasmine.objectContaining({ search: 'sea' }),
    );

    await service.listArtworks({ search: '   ' });
    expect(api.getPaginated).toHaveBeenCalledWith(
      '/artworks',
      jasmine.objectContaining({ search: undefined }),
    );
  });

  it('passes cursor and a custom limit through', async () => {
    api.getPaginated.and.returnValue(Promise.resolve({ data: [], nextCursor: 'next' }));
    const result = await service.listArtworks({ cursor: 'abc', limit: 10 });
    expect(api.getPaginated).toHaveBeenCalledWith(
      '/artworks',
      jasmine.objectContaining({ cursor: 'abc', limit: 10 }),
    );
    expect(result.nextCursor).toBe('next');
  });

  it('maps a null cursor to undefined', async () => {
    api.getPaginated.and.returnValue(Promise.resolve({ data: [], nextCursor: null }));
    await service.listArtworks({ cursor: null });
    expect(api.getPaginated).toHaveBeenCalledWith(
      '/artworks',
      jasmine.objectContaining({ cursor: undefined }),
    );
  });
});
