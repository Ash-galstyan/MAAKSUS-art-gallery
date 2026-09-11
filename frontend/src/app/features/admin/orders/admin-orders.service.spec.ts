// frontend/src/app/features/admin/orders/admin-orders.service.spec.ts
import { TestBed } from '@angular/core/testing';
import { AdminOrdersService, type AdminOrderDetail, type AdminOrderListItem } from './admin-orders.service';
import { ApiService } from '../../../core/http/api.service';

describe('AdminOrdersService', () => {
  let service: AdminOrdersService;
  let api: jasmine.SpyObj<ApiService>;

  const listItem: AdminOrderListItem = {
    id: 'o1',
    orderNumber: 'ORD-1',
    status: 'PAID',
    totalAmount: 5000,
    currency: 'AMD',
    shippingFirstName: 'Ash',
    shippingLastName: 'G',
    shippingCity: 'Yerevan',
    paymentProvider: 'ameriabank',
    paidAt: '2026-01-01',
    createdAt: '2026-01-01',
    items: [],
    user: { id: 'u1', email: 'a@b.com' },
  };

  const detail: AdminOrderDetail = {
    ...listItem,
    shippingPhone: '+37412345678',
    shippingAddress: 'Some street',
    shippingNotes: null,
    items: [],
    payments: [],
    user: { id: 'u1', email: 'a@b.com', firstName: 'Ash', lastName: 'G', phone: null },
  };

  beforeEach(() => {
    api = jasmine.createSpyObj<ApiService>('ApiService', ['get', 'getPaginated', 'patch']);
    TestBed.configureTestingModule({ providers: [{ provide: ApiService, useValue: api }] });
    service = TestBed.inject(AdminOrdersService);
  });

  it('list() forwards filters to getPaginated on /orders/admin', async () => {
    api.getPaginated.and.returnValue(Promise.resolve({ data: [listItem], nextCursor: null }));
    const result = await service.list({ status: 'PAID', from: '2026-01-01', to: '2026-02-01', cursor: 'c', limit: 10 });
    expect(api.getPaginated).toHaveBeenCalledWith('/orders/admin', {
      status: 'PAID',
      from: '2026-01-01',
      to: '2026-02-01',
      cursor: 'c',
      limit: 10,
    });
    expect(result.data).toEqual([listItem]);
  });

  it('list() passes through an empty query as all-undefined fields', async () => {
    api.getPaginated.and.returnValue(Promise.resolve({ data: [], nextCursor: null }));
    await service.list({});
    expect(api.getPaginated).toHaveBeenCalledWith('/orders/admin', {
      status: undefined,
      from: undefined,
      to: undefined,
      cursor: undefined,
      limit: undefined,
    });
  });

  it('detail() GETs /orders/admin/:id', async () => {
    api.get.and.returnValue(Promise.resolve(detail));
    const result = await service.detail('o1');
    expect(api.get).toHaveBeenCalledWith('/orders/admin/o1');
    expect(result).toBe(detail);
  });

  it('updateStatus() PATCHes the status sub-resource', async () => {
    api.patch.and.returnValue(Promise.resolve(detail));
    await service.updateStatus('o1', 'FULFILLED');
    expect(api.patch).toHaveBeenCalledWith('/orders/admin/o1/status', { status: 'FULFILLED' });
  });
});
