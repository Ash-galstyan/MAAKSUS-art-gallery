// frontend/src/app/features/checkout/order-confirmation.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { signal } from '@angular/core';
import { OrderConfirmationComponent } from './order-confirmation.component';
import { OrderService } from './order.service';
import { I18nService } from '../../core/i18n/i18n.service';
import type { OrderDetail } from './order.model';

function makeOrder(overrides: Partial<OrderDetail> = {}): OrderDetail {
  return {
    id: 'o1',
    orderNumber: 'ORD-1',
    status: 'PAID',
    totalAmount: 5000,
    currency: 'AMD',
    shippingFirstName: 'Ash',
    shippingLastName: 'G',
    shippingPhone: '+37412345678',
    shippingCity: 'Yerevan',
    shippingAddress: 'Some street 1',
    shippingNotes: null,
    paidAt: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
    items: [],
    ...overrides,
  };
}

describe('OrderConfirmationComponent', () => {
  let fixture: ComponentFixture<OrderConfirmationComponent>;
  let component: OrderConfirmationComponent;
  let orderService: jasmine.SpyObj<OrderService>;

  async function setup(id: string | null) {
    orderService = jasmine.createSpyObj<OrderService>('OrderService', ['getById']);
    orderService.getById.and.returnValue(Promise.resolve(makeOrder()));
    const paramMap = convertToParamMap(id ? { id } : {});
    const i18nStub = { locale: signal('en'), t: (key: string) => key } as unknown as I18nService;

    TestBed.configureTestingModule({
      imports: [OrderConfirmationComponent],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        { provide: OrderService, useValue: orderService },
        { provide: I18nService, useValue: i18nStub },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap } } },
      ],
    });
    fixture = TestBed.createComponent(OrderConfirmationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  }

  it('does not fetch and stops loading when there is no id param', async () => {
    await setup(null);
    expect(orderService.getById).not.toHaveBeenCalled();
    expect(component.loading()).toBeFalse();
    expect(component.order()).toBeNull();
  });

  it('loads the order for a valid id', async () => {
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
      imports: [OrderConfirmationComponent],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        { provide: OrderService, useValue: orderService },
        { provide: I18nService, useValue: { locale: signal('en'), t: (k: string) => k } as unknown as I18nService },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap } } },
      ],
    });
    fixture = TestBed.createComponent(OrderConfirmationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.order()).toBeNull();
    expect(component.loading()).toBeFalse();
  });

  it('renders the PAID hero without the pending class', async () => {
    await setup('o1');
    fixture.detectChanges();
    const hero: HTMLElement = fixture.nativeElement.querySelector('.hero');
    expect(hero.classList.contains('pending')).toBeFalse();
  });

  it('renders the pending hero for a non-PAID order', async () => {
    orderService = jasmine.createSpyObj<OrderService>('OrderService', ['getById']);
    orderService.getById.and.returnValue(Promise.resolve(makeOrder({ status: 'PENDING' })));
    const paramMap = convertToParamMap({ id: 'o1' });
    TestBed.configureTestingModule({
      imports: [OrderConfirmationComponent],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        { provide: OrderService, useValue: orderService },
        { provide: I18nService, useValue: { locale: signal('en'), t: (k: string) => k } as unknown as I18nService },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap } } },
      ],
    });
    fixture = TestBed.createComponent(OrderConfirmationComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const hero: HTMLElement = fixture.nativeElement.querySelector('.hero');
    expect(hero.querySelector('h1')?.textContent?.trim()).toBe('order.confirmation.pendingTitle');
    expect(hero.querySelector('.hero-sub')?.textContent?.trim()).toBe('order.confirmation.pendingSubtitle');
  });
});
