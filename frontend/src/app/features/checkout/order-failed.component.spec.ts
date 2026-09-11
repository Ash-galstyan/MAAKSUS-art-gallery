// frontend/src/app/features/checkout/order-failed.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { signal } from '@angular/core';
import { OrderFailedComponent } from './order-failed.component';
import { OrderService } from './order.service';
import { I18nService } from '../../core/i18n/i18n.service';
import type { OrderDetail } from './order.model';

function makeOrder(overrides: Partial<OrderDetail> = {}): OrderDetail {
  return {
    id: 'o1',
    orderNumber: 'ORD-1',
    status: 'FAILED',
    totalAmount: 5000,
    currency: 'AMD',
    shippingFirstName: 'Ash',
    shippingLastName: 'G',
    shippingPhone: '+37412345678',
    shippingCity: 'Yerevan',
    shippingAddress: 'Some street 1',
    shippingNotes: null,
    paidAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    items: [],
    ...overrides,
  };
}

describe('OrderFailedComponent', () => {
  let fixture: ComponentFixture<OrderFailedComponent>;
  let component: OrderFailedComponent;
  let orderService: jasmine.SpyObj<OrderService>;

  async function setup(id: string | null) {
    orderService = jasmine.createSpyObj<OrderService>('OrderService', ['getById']);
    orderService.getById.and.returnValue(Promise.resolve(makeOrder()));
    const paramMap = convertToParamMap(id ? { id } : {});
    const i18nStub = { locale: signal('en'), t: (key: string) => key } as unknown as I18nService;

    TestBed.configureTestingModule({
      imports: [OrderFailedComponent],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        { provide: OrderService, useValue: orderService },
        { provide: I18nService, useValue: i18nStub },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap } } },
      ],
    });
    fixture = TestBed.createComponent(OrderFailedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  }

  it('does not fetch when there is no id param', async () => {
    await setup(null);
    expect(orderService.getById).not.toHaveBeenCalled();
    expect(component.loading()).toBeFalse();
    expect(component.order()).toBeNull();
  });

  it('does not fetch for the literal "failed" catch-all path segment', async () => {
    await setup('failed');
    expect(orderService.getById).not.toHaveBeenCalled();
    expect(component.loading()).toBeFalse();
  });

  it('loads the order for a real id', async () => {
    await setup('o1');
    expect(orderService.getById).toHaveBeenCalledWith('o1');
    expect(component.order()?.orderNumber).toBe('ORD-1');
    expect(component.loading()).toBeFalse();
  });

  it('clears the order and stops loading when the fetch fails', async () => {
    orderService = jasmine.createSpyObj<OrderService>('OrderService', ['getById']);
    orderService.getById.and.returnValue(Promise.reject(new Error('not found')));
    const paramMap = convertToParamMap({ id: 'missing' });
    TestBed.configureTestingModule({
      imports: [OrderFailedComponent],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        { provide: OrderService, useValue: orderService },
        { provide: I18nService, useValue: { locale: signal('en'), t: (k: string) => k } as unknown as I18nService },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap } } },
      ],
    });
    fixture = TestBed.createComponent(OrderFailedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.order()).toBeNull();
    expect(component.loading()).toBeFalse();
  });

  it('renders the order number when an order is present', async () => {
    await setup('o1');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.order-number').textContent).toContain('ORD-1');
  });

  it('omits the order-number block when there is no order', async () => {
    await setup(null);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.order-number')).toBeFalsy();
  });
});
