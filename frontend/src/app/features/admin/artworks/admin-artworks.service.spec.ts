// frontend/src/app/features/admin/artworks/admin-artworks.service.spec.ts
import { TestBed } from '@angular/core/testing';
import {
  AdminArtworksService,
  type AdminArtwork,
  type AdminArtworkImage,
  type AdminArtworkInput,
} from './admin-artworks.service';
import { ApiService } from '../../../core/http/api.service';

describe('AdminArtworksService', () => {
  let service: AdminArtworksService;
  let api: jasmine.SpyObj<ApiService>;

  const artwork: AdminArtwork = {
    id: 'a1',
    slug: 'sunset',
    artistId: 'ar1',
    categoryId: 'c1',
    year: 2020,
    medium: 'Oil',
    widthCm: 40,
    heightCm: 30,
    basePrice: 10000,
    isAvailable: true,
    deletedAt: null,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    translations: [{ locale: 'EN', title: 'Sunset' }],
    images: [],
    artist: { id: 'ar1', slug: 'ash', translations: [{ locale: 'EN', name: 'Ash' }] },
    category: { id: 'c1', slug: 'landscape', translations: [{ locale: 'EN', name: 'Landscape' }] },
  };

  const image: AdminArtworkImage = {
    id: 'img1',
    thumbnailPath: 't.jpg',
    mediumPath: 'm.jpg',
    originalPath: 'o.jpg',
    width: 800,
    height: 600,
    isPrimary: true,
    position: 0,
  };

  beforeEach(() => {
    api = jasmine.createSpyObj<ApiService>('ApiService', ['get', 'post', 'patch', 'del', 'postForm']);
    TestBed.configureTestingModule({ providers: [{ provide: ApiService, useValue: api }] });
    service = TestBed.inject(AdminArtworksService);
  });

  it('list() GETs /artworks/admin', async () => {
    api.get.and.returnValue(Promise.resolve([artwork]));
    const result = await service.list();
    expect(api.get).toHaveBeenCalledWith('/artworks/admin');
    expect(result).toEqual([artwork]);
  });

  it('create() POSTs to /artworks', async () => {
    const input: AdminArtworkInput = {
      slug: 'sunset',
      artistId: 'ar1',
      categoryId: 'c1',
      basePrice: 10000,
      translations: [{ locale: 'EN', title: 'Sunset' }],
    };
    api.post.and.returnValue(Promise.resolve(artwork));
    await service.create(input);
    expect(api.post).toHaveBeenCalledWith('/artworks', input);
  });

  it('update() PATCHes /artworks/:id', async () => {
    api.patch.and.returnValue(Promise.resolve(artwork));
    await service.update('a1', { basePrice: 12000 });
    expect(api.patch).toHaveBeenCalledWith('/artworks/a1', { basePrice: 12000 });
  });

  it('remove() DELETEs /artworks/:id', async () => {
    api.del.and.returnValue(Promise.resolve());
    await service.remove('a1');
    expect(api.del).toHaveBeenCalledWith('/artworks/a1');
  });

  it('setAvailability() PATCHes the availability sub-resource', async () => {
    api.patch.and.returnValue(Promise.resolve(undefined));
    await service.setAvailability('a1', false);
    expect(api.patch).toHaveBeenCalledWith('/artworks/a1/availability', { isAvailable: false });
  });

  describe('uploadImage', () => {
    it('posts the file as FormData without a primary flag by default', async () => {
      api.postForm.and.returnValue(Promise.resolve(image));
      const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
      const result = await service.uploadImage('a1', file);
      expect(api.postForm).toHaveBeenCalledWith(
        '/artworks/a1/images',
        jasmine.any(FormData),
        { primary: undefined },
      );
      const form = api.postForm.calls.mostRecent().args[1] as FormData;
      const submitted = form.get('image') as File;
      expect(submitted.name).toBe(file.name);
      expect(submitted.type).toBe(file.type);
      expect(submitted.size).toBe(file.size);
      expect(result).toBe(image);
    });

    it('sets primary=true when requested', async () => {
      api.postForm.and.returnValue(Promise.resolve(image));
      const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
      await service.uploadImage('a1', file, { primary: true });
      expect(api.postForm).toHaveBeenCalledWith('/artworks/a1/images', jasmine.any(FormData), {
        primary: 'true',
      });
    });
  });

  it('removeImage() DELETEs the nested image resource', async () => {
    api.del.and.returnValue(Promise.resolve());
    await service.removeImage('a1', 'img1');
    expect(api.del).toHaveBeenCalledWith('/artworks/a1/images/img1');
  });
});
