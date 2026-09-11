// frontend/src/app/features/checkout/checkout.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DOCUMENT } from '@angular/common';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { signal } from '@angular/core';
import { CheckoutComponent } from './checkout.component';
import { CheckoutService, type CheckoutOutcome } from './checkout.service';
import { CartService } from '../../core/cart/cart.service';
import { AuthService } from '../../core/auth/auth.service';
import { I18nService } from '../../core/i18n/i18n.service';
import type { CartLine } from '../../core/api-models/cart.model';

function makeLine(): CartLine {
  return {
    id: 'line-1',
    artwork: { id: 'a1', slug: 'a1', title: 'T', artistName: 'Art', thumbnailPath: null },
    printSize: { id: 'p1', label: 'Small' },
    frameOption: null,
    withMatte: false,
    quantity: 1,
    unitPrice: 1000,
    lineTotal: 1000,
  };
}

const VALID_FORM = {
  shippingFirstName: 'Ash',
  shippingLastName: 'G',
  shippingPhone: '+37412345678',
  shippingCity: 'Yerevan',
  shippingAddress: 'Some street 1',
  shippingNotes: '',
};

describe('CheckoutComponent', () => {
  let fixture: ComponentFixture<CheckoutComponent>;
  let component: CheckoutComponent;
  let checkoutService: jasmine.SpyObj<CheckoutService>;
  let items: ReturnType<typeof signal<CartLine[]>>;
  let fakeLocation: { href: string };

  beforeEach(() => {
    checkoutService = jasmine.createSpyObj<CheckoutService>('CheckoutService', ['checkout']);
    items = signal<CartLine[]>([makeLine()]);
    const cartStub = {
      items,
      subtotal: signal(1000),
    } as unknown as CartService;
    const authStub = { currentUser: signal(null) } as unknown as AuthService;
    const i18nStub = { locale: signal('en'), t: (key: string) => key } as unknown as I18nService;
    fakeLocation = { href: '' };

    TestBed.configureTestingModule({
      imports: [CheckoutComponent],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        { provide: CheckoutService, useValue: checkoutService },
        { provide: CartService, useValue: cartStub },
        { provide: AuthService, useValue: authStub },
        { provide: I18nService, useValue: i18nStub },
      ],
    })
      // Real window.location is unforgeable/non-configurable in Chrome, so it
      // can't be spied on — and assigning to it for real disconnects the
      // Karma browser mid-suite. Override DOCUMENT for this component ONLY
      // (a root-level override breaks Angular's own test renderer, which
      // reads the real DOCUMENT to attach/remove the fixture's root element).
      .overrideComponent(CheckoutComponent, {
        add: { providers: [{ provide: DOCUMENT, useValue: { defaultView: { location: fakeLocation } } }] },
      });
    fixture = TestBed.createComponent(CheckoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('starts with an invalid form', () => {
    expect(component.form.invalid).toBeTrue();
  });

  it('is valid once all required shipping fields are filled', () => {
    component.form.setValue(VALID_FORM);
    expect(component.form.valid).toBeTrue();
  });

  it('does not submit while the form is invalid', async () => {
    await component.onSubmit();
    expect(checkoutService.checkout).not.toHaveBeenCalled();
  });

  it('does not submit when the cart is empty, even with a valid form', async () => {
    items.set([]);
    component.form.setValue(VALID_FORM);
    await component.onSubmit();
    expect(checkoutService.checkout).not.toHaveBeenCalled();
  });

  it('checks out and redirects to the bank page on success', async () => {
    component.form.setValue(VALID_FORM);
    const outcome: CheckoutOutcome = {
      orderId: 'o1',
      orderNumber: 'ORD-1',
      redirectUrl: 'https://bank.example/pay/o1',
    };
    checkoutService.checkout.and.returnValue(Promise.resolve(outcome));
    await component.onSubmit();
    expect(checkoutService.checkout).toHaveBeenCalledWith({
      ...VALID_FORM,
      shippingNotes: undefined,
    });
    expect(fakeLocation.href).toBe('https://bank.example/pay/o1');
    expect(component.submitting()).toBeTrue(); // deliberately not reset on success
  });

  it('passes non-blank shipping notes through unchanged', async () => {
    component.form.setValue({ ...VALID_FORM, shippingNotes: 'Leave at the door' });
    checkoutService.checkout.and.returnValue(
      Promise.resolve({ orderId: 'o1', orderNumber: 'ORD-1', redirectUrl: 'https://bank.example' }),
    );
    await component.onSubmit();
    expect(checkoutService.checkout).toHaveBeenCalledWith(
      jasmine.objectContaining({ shippingNotes: 'Leave at the door' }),
    );
  });

  it('resets submitting and does not redirect on failure', async () => {
    component.form.setValue(VALID_FORM);
    checkoutService.checkout.and.returnValue(Promise.reject(new Error('payment init failed')));
    await component.onSubmit();
    expect(component.submitting()).toBeFalse();
    expect(fakeLocation.href).toBe('');
  });

  it('ignores a second submit while one is already in flight', async () => {
    component.form.setValue(VALID_FORM);
    let resolveFn!: (v: CheckoutOutcome) => void;
    checkoutService.checkout.and.returnValue(new Promise((resolve) => (resolveFn = resolve)));
    const first = component.onSubmit();
    const second = component.onSubmit();
    resolveFn({ orderId: 'o1', orderNumber: 'ORD-1', redirectUrl: 'https://bank.example' });
    await Promise.all([first, second]);
    expect(checkoutService.checkout).toHaveBeenCalledTimes(1);
  });
});
