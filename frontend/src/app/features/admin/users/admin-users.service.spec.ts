// frontend/src/app/features/admin/users/admin-users.service.spec.ts
import { TestBed } from '@angular/core/testing';
import { AdminUsersService, type AdminUser } from './admin-users.service';
import { ApiService } from '../../../core/http/api.service';

describe('AdminUsersService', () => {
  let service: AdminUsersService;
  let api: jasmine.SpyObj<ApiService>;

  const user: AdminUser = {
    id: 'u1',
    email: 'a@b.com',
    firstName: 'Ash',
    lastName: 'G',
    phone: null,
    role: 'USER',
    status: 'ACTIVE',
    locale: 'EN',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  };

  beforeEach(() => {
    api = jasmine.createSpyObj<ApiService>('ApiService', ['get', 'patch']);
    TestBed.configureTestingModule({ providers: [{ provide: ApiService, useValue: api }] });
    service = TestBed.inject(AdminUsersService);
  });

  it('list() GETs /users/admin', async () => {
    api.get.and.returnValue(Promise.resolve([user]));
    const result = await service.list();
    expect(api.get).toHaveBeenCalledWith('/users/admin');
    expect(result).toEqual([user]);
  });

  it('detail() GETs /users/admin/:id', async () => {
    api.get.and.returnValue(Promise.resolve(user));
    const result = await service.detail('u1');
    expect(api.get).toHaveBeenCalledWith('/users/admin/u1');
    expect(result).toBe(user);
  });

  it('setStatus() PATCHes the status sub-resource', async () => {
    api.patch.and.returnValue(Promise.resolve({ ...user, status: 'BLOCKED' }));
    const result = await service.setStatus('u1', 'BLOCKED');
    expect(api.patch).toHaveBeenCalledWith('/users/admin/u1/status', { status: 'BLOCKED' });
    expect(result.status).toBe('BLOCKED');
  });
});
