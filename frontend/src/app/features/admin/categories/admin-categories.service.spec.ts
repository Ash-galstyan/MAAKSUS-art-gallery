// frontend/src/app/features/admin/categories/admin-categories.service.spec.ts
import { TestBed } from '@angular/core/testing';
import { AdminCategoriesService, type AdminCategory, type AdminCategoryInput } from './admin-categories.service';
import { ApiService } from '../../../core/http/api.service';

describe('AdminCategoriesService', () => {
  let service: AdminCategoriesService;
  let api: jasmine.SpyObj<ApiService>;

  const category: AdminCategory = {
    id: 'c1',
    slug: 'landscape',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    translations: [{ locale: 'EN', name: 'Landscape' }],
  };

  beforeEach(() => {
    api = jasmine.createSpyObj<ApiService>('ApiService', ['get', 'post', 'patch', 'del']);
    TestBed.configureTestingModule({ providers: [{ provide: ApiService, useValue: api }] });
    service = TestBed.inject(AdminCategoriesService);
  });

  it('list() GETs /categories/admin', async () => {
    api.get.and.returnValue(Promise.resolve([category]));
    const result = await service.list();
    expect(api.get).toHaveBeenCalledWith('/categories/admin');
    expect(result).toEqual([category]);
  });

  it('create() POSTs to /categories', async () => {
    const input: AdminCategoryInput = { slug: 'landscape', translations: [{ locale: 'EN', name: 'Landscape' }] };
    api.post.and.returnValue(Promise.resolve(category));
    const result = await service.create(input);
    expect(api.post).toHaveBeenCalledWith('/categories', input);
    expect(result).toBe(category);
  });

  it('update() PATCHes /categories/:id', async () => {
    api.patch.and.returnValue(Promise.resolve(category));
    await service.update('c1', { slug: 'nature' });
    expect(api.patch).toHaveBeenCalledWith('/categories/c1', { slug: 'nature' });
  });

  it('remove() DELETEs /categories/:id', async () => {
    api.del.and.returnValue(Promise.resolve());
    await service.remove('c1');
    expect(api.del).toHaveBeenCalledWith('/categories/c1');
  });
});
