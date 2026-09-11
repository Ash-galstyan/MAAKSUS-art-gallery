// frontend/src/app/features/admin/orders/admin-orders.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import { AdminOrdersComponent } from './admin-orders.component';
import { AdminOrdersService, type AdminOrderListItem } from './admin-orders.service';
import { I18nService } from '../../../core/i18n/i18n.service';

function makeOrder(overrides: Partial<AdminOrderListItem> = {}): AdminOrderListItem {
  return {
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
    items: [
      { id: 'i1', artworkTitle: 'Sunset', quantity: 2 },
      { id: 'i2', artworkTitle: 'Dusk', quantity: 1 },
    ],
    user: { id: 'u1', email: 'a@b.com' },
    ...overrides,
  };
}

describe('AdminOrdersComponent', () => {
  let fixture: ComponentFixture<AdminOrdersComponent>;
  let component: AdminOrdersComponent;
  let service: jasmine.SpyObj<AdminOrdersService>;
  let dialogOpen: jasmine.Spy;

  beforeEach(() => {
    service = jasmine.createSpyObj<AdminOrdersService>('AdminOrdersService', ['list', 'detail', 'updateStatus']);
    service.list.and.returnValue(Promise.resolve({ data: [makeOrder()], nextCursor: null }));
    const i18nStub = { locale: signal('en'), t: (k: string) => k } as unknown as I18nService;

    TestBed.configureTestingModule({
      imports: [AdminOrdersComponent],
      providers: [
        provideNoopAnimations(),
        { provide: AdminOrdersService, useValue: service },
        { provide: I18nService, useValue: i18nStub },
      ],
    });
    fixture = TestBed.createComponent(AdminOrdersComponent);
    component = fixture.componentInstance;
    dialogOpen = spyOn(fixture.debugElement.injector.get(MatDialog), 'open');
    fixture.detectChanges();
  });

  it('loads the first page on construction with no filter/cursor', async () => {
    await fixture.whenStable();
    expect(service.list).toHaveBeenCalledWith({ status: undefined, cursor: undefined });
    expect(component.orders().length).toBe(1);
    expect(component.loading()).toBeFalse();
  });

  it('sets an error message when reload fails', async () => {
    service.list.and.returnValue(Promise.reject(new Error('down')));
    await component.reload(true);
    expect(component.error()).toBe('down');
  });

  describe('itemSummary', () => {
    it('shows the line count and total quantity', () => {
      expect(component.itemSummary(makeOrder())).toBe('2 (3)');
    });

    it('handles an empty item list', () => {
      expect(component.itemSummary(makeOrder({ items: [] }))).toBe('0 (0)');
    });
  });

  describe('pagination', () => {
    it('loadMore appends using the current nextCursor without resetting', async () => {
      await fixture.whenStable();
      service.list.and.returnValue(Promise.resolve({ data: [makeOrder({ id: 'o2' })], nextCursor: 'cur-2' }));
      component.nextCursor.set('cur-1');

      component.loadMore();
      await fixture.whenStable();

      expect(service.list).toHaveBeenCalledWith({ status: undefined, cursor: 'cur-1' });
      expect(component.orders().map((o) => o.id)).toEqual(['o1', 'o2']);
      expect(component.nextCursor()).toBe('cur-2');
    });

    it('onFilterChange resets the list and refetches with the selected status', async () => {
      await fixture.whenStable();
      component.statusFilter = 'FAILED';
      service.list.and.returnValue(Promise.resolve({ data: [makeOrder({ status: 'FAILED' })], nextCursor: null }));

      component.onFilterChange();
      await fixture.whenStable();

      expect(service.list).toHaveBeenCalledWith({ status: 'FAILED', cursor: undefined });
      expect(component.orders().length).toBe(1);
    });

    it('reload(true) clears existing orders and cursor before refetching', async () => {
      await fixture.whenStable();
      component.nextCursor.set('cur-1');
      service.list.and.returnValue(Promise.resolve({ data: [], nextCursor: null }));

      const promise = component.reload(true);
      expect(component.orders()).toEqual([]);
      expect(component.nextCursor()).toBeNull();
      await promise;
    });
  });

  it('openDetail opens the dialog with the order id and reloads when changed:true', async () => {
    await fixture.whenStable();
    dialogOpen.and.returnValue({ afterClosed: () => of({ changed: true }) } as never);
    service.list.calls.reset();

    component.openDetail(makeOrder());
    await fixture.whenStable();

    expect(dialogOpen).toHaveBeenCalledWith(jasmine.any(Function), jasmine.objectContaining({ data: { orderId: 'o1' } }));
    expect(service.list).toHaveBeenCalled();
  });

  it('openDetail does not reload when the dialog closes unchanged', async () => {
    await fixture.whenStable();
    dialogOpen.and.returnValue({ afterClosed: () => of(undefined) } as never);
    service.list.calls.reset();

    component.openDetail(makeOrder());
    await fixture.whenStable();

    expect(service.list).not.toHaveBeenCalled();
  });
});
