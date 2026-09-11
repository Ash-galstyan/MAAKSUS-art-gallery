// frontend/src/app/features/admin/artists/admin-artists.service.spec.ts
import { TestBed } from '@angular/core/testing';
import { AdminArtistsService, type AdminArtist, type AdminArtistInput } from './admin-artists.service';
import { ApiService } from '../../../core/http/api.service';

describe('AdminArtistsService', () => {
  let service: AdminArtistsService;
  let api: jasmine.SpyObj<ApiService>;

  const artist: AdminArtist = {
    id: 'ar1',
    slug: 'ash',
    birthYear: 1990,
    deathYear: null,
    portraitPath: null,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    translations: [{ locale: 'EN', name: 'Ash' }],
  };

  beforeEach(() => {
    api = jasmine.createSpyObj<ApiService>('ApiService', ['get', 'post', 'patch', 'del']);
    TestBed.configureTestingModule({ providers: [{ provide: ApiService, useValue: api }] });
    service = TestBed.inject(AdminArtistsService);
  });

  it('list() GETs /artists/admin', async () => {
    api.get.and.returnValue(Promise.resolve([artist]));
    const result = await service.list();
    expect(api.get).toHaveBeenCalledWith('/artists/admin');
    expect(result).toEqual([artist]);
  });

  it('create() POSTs to /artists with the input', async () => {
    const input: AdminArtistInput = { slug: 'ash', translations: [{ locale: 'EN', name: 'Ash' }] };
    api.post.and.returnValue(Promise.resolve(artist));
    const result = await service.create(input);
    expect(api.post).toHaveBeenCalledWith('/artists', input);
    expect(result).toBe(artist);
  });

  it('update() PATCHes /artists/:id with the partial input', async () => {
    api.patch.and.returnValue(Promise.resolve(artist));
    const result = await service.update('ar1', { slug: 'new-slug' });
    expect(api.patch).toHaveBeenCalledWith('/artists/ar1', { slug: 'new-slug' });
    expect(result).toBe(artist);
  });

  it('update() URL-encodes the id', async () => {
    api.patch.and.returnValue(Promise.resolve(artist));
    await service.update('a/b', {});
    expect(api.patch).toHaveBeenCalledWith(`/artists/${encodeURIComponent('a/b')}`, {});
  });

  it('remove() DELETEs /artists/:id', async () => {
    api.del.and.returnValue(Promise.resolve());
    await service.remove('ar1');
    expect(api.del).toHaveBeenCalledWith('/artists/ar1');
  });
});
