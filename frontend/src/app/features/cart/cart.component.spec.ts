// frontend/src/app/features/cart/cart.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { signal } from '@angular/core';
import { CartComponent } from './cart.component';
import { CartService } from '../../core/cart/cart.service';
import { AuthService } from '../../core/auth/auth.service';
import { I18nService } from '../../core/i18n/i18n.service';
import type { CartItemInput, CartLine } from '../../core/api-models/cart.model';

function makeLine(overrides: Partial<CartLine> = {}): CartLine {
  return {
    id: 'line-1',
    artwork: { id: 'a1', slug: 'a1', title: 'Sunset', artistName: 'Ash', thumbnailPath: null },
    printSize: { id: 'p1', label: 'Small' },
    frameOption: null,
    withMatte: false,
    quantity: 1,
    unitPrice: 1000,
    lineTotal: 1000,
    ...overrides,
  };
}

describe('CartComponent', () => {
  let fixture: ComponentFixture<CartComponent>;
  let component: CartComponent;
  let cart: jasmine.SpyObj<CartService> & {
    loading: ReturnType<typeof signal<boolean>>;
    items: ReturnType<typeof signal<CartLine[]>>;
    guestItems: ReturnType<typeof signal<CartItemInput[]>>;
    itemCount: ReturnType<typeof signal<number>>;
    subtotal: ReturnType<typeof signal<number>>;
  };
  let authed: ReturnType<typeof signal<boolean>>;

  beforeEach(() => {
    const loading = signal(false);
    const items = signal<CartLine[]>([]);
    const guestItems = signal<CartItemInput[]>([]);
    const itemCount = signal(0);
    const subtotal = signal(0);
    authed = signal(false);

    cart = {
      ...jasmine.createSpyObj<CartService>('CartService', [
        'updateQuantity',
        'removeItem',
        'clearCart',
        'addItem',
        'refreshFromServer',
      ]),
      loading,
      items,
      guestItems,
      itemCount,
      subtotal,
    } as never;

    const authStub = { isAuthenticated: authed } as unknown as AuthService;
    const i18nStub = { locale: signal('en'), t: (key: string) => key } as unknown as I18nService;

    TestBed.configureTestingModule({
      imports: [CartComponent],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        { provide: CartService, useValue: cart },
        { provide: AuthService, useValue: authStub },
        { provide: I18nService, useValue: i18nStub },
      ],
    });
    fixture = TestBed.createComponent(CartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('shows a spinner while loading', () => {
    cart.loading.set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('mat-progress-spinner')).toBeTruthy();
  });

  it('shows the empty state for a guest with no items', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.empty')).toBeTruthy();
  });

  it('shows a sign-in prompt for a guest with items', () => {
    cart.guestItems.set([
      { artworkId: 'a1', printSizeId: 'p1', frameOptionId: null, withMatte: false, quantity: 2 },
    ]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.guest-card')).toBeTruthy();
  });

  it('shows the empty state for an authenticated user with no items', () => {
    authed.set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.empty')).toBeTruthy();
  });

  it('renders cart lines and subtotal for an authenticated user with items', () => {
    authed.set(true);
    cart.items.set([makeLine()]);
    cart.subtotal.set(1000);
    fixture.detectChanges();
    const rows = fixture.nativeElement.querySelectorAll('.row');
    expect(rows.length).toBe(1);
    expect(fixture.nativeElement.querySelector('.subtotal').textContent).toContain('1,000');
  });

  it('inc() increases quantity by one', async () => {
    await component.inc('line-1', 2);
    expect(cart.updateQuantity).toHaveBeenCalledWith('line-1', 3);
  });

  it('dec() decreases quantity by one, floored at 1', async () => {
    await component.dec('line-1', 2);
    expect(cart.updateQuantity).toHaveBeenCalledWith('line-1', 1);
    await component.dec('line-1', 1);
    expect(cart.updateQuantity).toHaveBeenCalledWith('line-1', 1);
  });

  it('remove() delegates to CartService.removeItem', async () => {
    await component.remove('line-1');
    expect(cart.removeItem).toHaveBeenCalledWith('line-1');
  });

  it('clearAll() delegates to CartService.clearCart', async () => {
    await component.clearAll();
    expect(cart.clearCart).toHaveBeenCalled();
  });
});
