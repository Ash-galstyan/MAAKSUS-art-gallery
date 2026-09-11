// frontend/src/app/core/cart/cart.service.spec.ts
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { CartService } from './cart.service';
import { CartStorageService } from './cart-storage.service';
import { ApiService } from '../http/api.service';
import { AuthService } from '../auth/auth.service';
import { environment } from '../../../environments/environment';
import type { CartItemInput, CartLine, CartPayload } from '../api-models/cart.model';

const STORAGE_KEY = 'gallery.cart.v1';

/** Drains pending microtasks (promise continuations) via a macrotask boundary. */
function tick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve));
}

function makeLine(overrides: Partial<CartLine> = {}): CartLine {
  return {
    id: 'line-1',
    artwork: { id: 'a1', slug: 'a1', title: 'T', artistName: 'Art', thumbnailPath: null },
    printSize: { id: 'p1', label: 'Small' },
    frameOption: null,
    withMatte: false,
    quantity: 1,
    unitPrice: 1000,
    lineTotal: 1000,
    ...overrides,
  };
}

function makeInput(overrides: Partial<CartItemInput> = {}): CartItemInput {
  return {
    artworkId: 'a1',
    printSizeId: 'p1',
    frameOptionId: null,
    withMatte: false,
    quantity: 1,
    ...overrides,
  };
}

describe('CartService', () => {
  let authedSignal: ReturnType<typeof signal<boolean>>;
  let api: jasmine.SpyObj<ApiService>;
  let header: jasmine.SpyObj<CartStorageService>;
  let httpMock: HttpTestingController;

  function setup() {
    authedSignal = signal(false);
    api = jasmine.createSpyObj<ApiService>('ApiService', ['post', 'del', 'get', 'getPaginated', 'patch', 'postForm']);
    header = jasmine.createSpyObj<CartStorageService>('CartStorageService', ['setCountForHeader']);
    const authStub = { isAuthenticated: authedSignal } as unknown as AuthService;

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ApiService, useValue: api },
        { provide: AuthService, useValue: authStub },
        { provide: CartStorageService, useValue: header },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  }

  afterEach(() => {
    localStorage.removeItem(STORAGE_KEY);
    httpMock.verify();
  });

  describe('anonymous mode', () => {
    beforeEach(() => {
      localStorage.removeItem(STORAGE_KEY);
      setup();
    });

    it('starts with an empty guest cart and does not hit the server', () => {
      const service = TestBed.inject(CartService);
      expect(service.guestItems()).toEqual([]);
      expect(service.items()).toEqual([]);
      expect(service.itemCount()).toBe(0);
      httpMock.expectNone(`${environment.apiBaseUrl}/cart`);
    });

    it('addItem appends a new guest line and persists to localStorage', async () => {
      const service = TestBed.inject(CartService);
      await service.addItem(makeInput({ quantity: 2 }));
      expect(service.guestItems().length).toBe(1);
      expect(service.itemCount()).toBe(2);
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
      expect(stored.length).toBe(1);
    });

    it('addItem merges quantities for an identical combination and caps at 20', async () => {
      const service = TestBed.inject(CartService);
      await service.addItem(makeInput({ quantity: 15 }));
      await service.addItem(makeInput({ quantity: 15 }));
      expect(service.guestItems().length).toBe(1);
      expect(service.guestItems()[0].quantity).toBe(20);
    });

    it('addItem keeps distinct combinations as separate lines', async () => {
      const service = TestBed.inject(CartService);
      await service.addItem(makeInput({ printSizeId: 'p1' }));
      await service.addItem(makeInput({ printSizeId: 'p2' }));
      expect(service.guestItems().length).toBe(2);
    });

    it('caps an individual new line at quantity 20', async () => {
      const service = TestBed.inject(CartService);
      await service.addItem(makeInput({ quantity: 99 }));
      expect(service.guestItems()[0].quantity).toBe(20);
    });

    it('removeItem removes a guest line by index', async () => {
      const service = TestBed.inject(CartService);
      await service.addItem(makeInput({ printSizeId: 'p1' }));
      await service.addItem(makeInput({ printSizeId: 'p2' }));
      await service.removeItem(0);
      expect(service.guestItems().length).toBe(1);
      expect(service.guestItems()[0].printSizeId).toBe('p2');
    });

    it('removeItem is a no-op for guests when given a non-index (string) id', async () => {
      const service = TestBed.inject(CartService);
      await service.addItem(makeInput());
      await service.removeItem('some-id');
      expect(service.guestItems().length).toBe(1);
    });

    it('updateQuantity is a no-op for guests', async () => {
      const service = TestBed.inject(CartService);
      await service.addItem(makeInput());
      await service.updateQuantity('line-1', 5);
      expect(service.guestItems()[0].quantity).toBe(1);
      httpMock.expectNone(`${environment.apiBaseUrl}/cart/items/line-1`);
    });

    it('clearCart empties the guest cart and localStorage', async () => {
      const service = TestBed.inject(CartService);
      await service.addItem(makeInput());
      await service.clearCart();
      expect(service.guestItems()).toEqual([]);
      expect(localStorage.getItem(STORAGE_KEY)).toBe('[]');
    });

    it('refreshFromServer is a no-op for guests', async () => {
      const service = TestBed.inject(CartService);
      await service.refreshFromServer();
      httpMock.expectNone(`${environment.apiBaseUrl}/cart`);
    });

    it('reads a previously persisted guest cart on construction', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([makeInput({ quantity: 3 })]));
      const service = TestBed.inject(CartService);
      expect(service.guestItems().length).toBe(1);
      expect(service.itemCount()).toBe(3);
    });

    it('ignores malformed JSON in localStorage', () => {
      localStorage.setItem(STORAGE_KEY, '{not json');
      const service = TestBed.inject(CartService);
      expect(service.guestItems()).toEqual([]);
    });

    it('ignores a non-array payload in localStorage', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ foo: 'bar' }));
      const service = TestBed.inject(CartService);
      expect(service.guestItems()).toEqual([]);
    });

    it('slices to 50 items first, then filters out malformed entries', () => {
      // readGuest() slices to MAX_ITEMS before filtering, so a malformed entry
      // occupying one of the first 50 slots reduces the final count below 50.
      const good = makeInput();
      const bad = { artworkId: 'x' }; // missing required fields
      const many = Array.from({ length: 60 }, () => good);
      localStorage.setItem(STORAGE_KEY, JSON.stringify([bad, ...many]));
      const service = TestBed.inject(CartService);
      expect(service.guestItems().length).toBe(49);
    });

    it('caps at 50 items when there are no malformed entries ahead of the slice', () => {
      const good = makeInput();
      const many = Array.from({ length: 60 }, () => good);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(many));
      const service = TestBed.inject(CartService);
      expect(service.guestItems().length).toBe(50);
    });

    it('keeps the header badge in sync via the effect', () => {
      TestBed.inject(CartService);
      TestBed.flushEffects();
      expect(header.setCountForHeader).toHaveBeenCalledWith(0);
    });
  });

  describe('authenticated mode', () => {
    beforeEach(() => {
      localStorage.removeItem(STORAGE_KEY);
      setup();
      authedSignal.set(true);
    });

    /** Injects the service and settles its constructor-triggered initial fetch. */
    async function injectSettled(payload: CartPayload = { items: [], subtotal: 0, currency: 'AMD' }) {
      const service = TestBed.inject(CartService);
      httpMock.expectOne(`${environment.apiBaseUrl}/cart`).flush(payload);
      await tick();
      return service;
    }

    it('fetches the cart from the server on construction', async () => {
      const service = await injectSettled({ items: [makeLine()], subtotal: 1000, currency: 'AMD' });
      expect(service.items().length).toBe(1);
      expect(service.subtotal()).toBe(1000);
    });

    it('addItem posts to the API then refreshes from the server', async () => {
      const service = await injectSettled();
      api.post.and.returnValue(Promise.resolve({}));

      const addPromise = service.addItem(makeInput());
      await tick();
      const payload: CartPayload = { items: [makeLine()], subtotal: 1000, currency: 'AMD' };
      httpMock.expectOne(`${environment.apiBaseUrl}/cart`).flush(payload);
      await addPromise;

      expect(api.post).toHaveBeenCalledWith('/cart/items', jasmine.objectContaining({ artworkId: 'a1' }));
      expect(service.items().length).toBe(1);
    });

    it('addItem aborts silently if the API call rejects', async () => {
      const service = await injectSettled();
      api.post.and.returnValue(Promise.reject(new Error('nope')));

      await service.addItem(makeInput());
      httpMock.expectNone(`${environment.apiBaseUrl}/cart`);
      expect(service.items()).toEqual([]);
    });

    it('updateQuantity optimistically updates then confirms via refresh', async () => {
      const service = await injectSettled({
        items: [makeLine({ quantity: 1, unitPrice: 1000, lineTotal: 1000 })],
        subtotal: 1000,
        currency: 'AMD',
      });

      api.post.and.returnValue(Promise.resolve({ quantity: 3 }));
      const updatePromise = service.updateQuantity('line-1', 3);
      expect(service.items()[0].quantity).toBe(3);
      expect(service.items()[0].lineTotal).toBe(3000);

      await tick();
      const finalPayload: CartPayload = {
        items: [makeLine({ quantity: 3, unitPrice: 1000, lineTotal: 3000 })],
        subtotal: 3000,
        currency: 'AMD',
      };
      httpMock.expectOne(`${environment.apiBaseUrl}/cart`).flush(finalPayload);
      await updatePromise;

      expect(api.post).toHaveBeenCalledWith('/cart/items/line-1', { quantity: 3 });
      expect(service.subtotal()).toBe(3000);
    });

    it('updateQuantity clamps to [1, 20]', async () => {
      const service = await injectSettled({ items: [makeLine()], subtotal: 1000, currency: 'AMD' });

      api.post.and.returnValue(Promise.resolve({}));
      const promise = service.updateQuantity('line-1', 999);
      expect(service.items()[0].quantity).toBe(20);
      await tick();
      httpMock.expectOne(`${environment.apiBaseUrl}/cart`).flush({ items: [], subtotal: 0, currency: 'AMD' });
      await promise;
    });

    it('updateQuantity rolls back on API failure', async () => {
      const service = await injectSettled({ items: [makeLine({ quantity: 1 })], subtotal: 1000, currency: 'AMD' });

      api.post.and.returnValue(Promise.reject(new Error('fail')));
      await service.updateQuantity('line-1', 5);
      expect(service.items()[0].quantity).toBe(1);
      expect(service.subtotal()).toBe(1000);
    });

    it('removeItem optimistically removes then confirms via refresh', async () => {
      const service = await injectSettled({ items: [makeLine({ id: 'line-1' })], subtotal: 1000, currency: 'AMD' });

      api.del.and.returnValue(Promise.resolve());
      const removePromise = service.removeItem('line-1');
      expect(service.items()).toEqual([]);
      await tick();
      httpMock.expectOne(`${environment.apiBaseUrl}/cart`).flush({ items: [], subtotal: 0, currency: 'AMD' });
      await removePromise;
      expect(api.del).toHaveBeenCalledWith('/cart/items/line-1');
    });

    it('removeItem rolls back on API failure', async () => {
      const service = await injectSettled({ items: [makeLine({ id: 'line-1' })], subtotal: 1000, currency: 'AMD' });

      api.del.and.returnValue(Promise.reject(new Error('fail')));
      await service.removeItem('line-1');
      expect(service.items().length).toBe(1);
    });

    it('clearCart empties then confirms via the API', async () => {
      const service = await injectSettled({ items: [makeLine()], subtotal: 1000, currency: 'AMD' });

      api.del.and.returnValue(Promise.resolve());
      await service.clearCart();
      expect(service.items()).toEqual([]);
      expect(service.subtotal()).toBe(0);
      expect(api.del).toHaveBeenCalledWith('/cart');
    });

    it('clearCart rolls back on API failure', async () => {
      const service = await injectSettled({ items: [makeLine()], subtotal: 1000, currency: 'AMD' });

      api.del.and.returnValue(Promise.reject(new Error('fail')));
      await service.clearCart();
      expect(service.items().length).toBe(1);
    });

    it('toggles loading around refreshFromServer', async () => {
      const service = TestBed.inject(CartService);
      const req = httpMock.expectOne(`${environment.apiBaseUrl}/cart`);
      expect(service.loading()).toBeTrue();
      req.flush({ items: [], subtotal: 0, currency: 'AMD' });
      await tick();
      expect(service.loading()).toBeFalse();
    });
  });

  describe('login/logout transitions', () => {
    beforeEach(() => {
      localStorage.removeItem(STORAGE_KEY);
      setup();
    });

    it('syncs guest items to the server on login and clears local storage', async () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([makeInput({ quantity: 2 })]));
      const service = TestBed.inject(CartService);
      expect(service.guestItems().length).toBe(1);

      authedSignal.set(true);
      TestBed.flushEffects();

      const req = httpMock.expectOne(`${environment.apiBaseUrl}/cart/sync`);
      expect(req.request.body).toEqual({ items: service.guestItems() });
      const payload: CartPayload = { items: [makeLine()], subtotal: 1000, currency: 'AMD' };
      req.flush(payload);
      await Promise.resolve();
      await Promise.resolve();

      expect(service.items().length).toBe(1);
      expect(service.guestItems()).toEqual([]);
      expect(localStorage.getItem(STORAGE_KEY)).toBe('[]');
    });

    it('falls back to refreshFromServer on login when there are no guest items', async () => {
      const service = TestBed.inject(CartService);
      authedSignal.set(true);
      TestBed.flushEffects();
      await tick();

      const req = httpMock.expectOne(`${environment.apiBaseUrl}/cart`);
      req.flush({ items: [], subtotal: 0, currency: 'AMD' });
      await tick();
      expect(service.items()).toEqual([]);
    });

    it('falls back to refreshFromServer when the sync request fails', async () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([makeInput()]));
      const service = TestBed.inject(CartService);
      authedSignal.set(true);
      TestBed.flushEffects();

      httpMock
        .expectOne(`${environment.apiBaseUrl}/cart/sync`)
        .flush({ error: { code: 'SERVER', message: 'boom' } }, { status: 500, statusText: 'Error' });
      await Promise.resolve();
      await Promise.resolve();

      const req = httpMock.expectOne(`${environment.apiBaseUrl}/cart`);
      req.flush({ items: [], subtotal: 0, currency: 'AMD' });
      void service;
    });

    it('clears server state on logout without calling the API', async () => {
      authedSignal.set(true);
      const service = TestBed.inject(CartService);
      httpMock.expectOne(`${environment.apiBaseUrl}/cart`).flush({ items: [makeLine()], subtotal: 1000, currency: 'AMD' });
      await tick();
      expect(service.items().length).toBe(1);

      authedSignal.set(false);
      TestBed.flushEffects();
      expect(service.items()).toEqual([]);
      expect(service.subtotal()).toBe(0);
      httpMock.expectNone(`${environment.apiBaseUrl}/cart`);
    });
  });
});
