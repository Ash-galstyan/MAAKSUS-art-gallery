// frontend/src/app/core/cart/cart.service.ts
/**
 * Cart service — owns ALL cart state on the client.
 *
 * Two modes, transparent to the UI:
 *
 *   ANONYMOUS  : items live in localStorage as CartItemInput[].
 *                The UI cannot render rich cart lines (it has only IDs);
 *                the cart page asks the server to hydrate guest carts via
 *                a one-shot POST /cart/sync that returns the full server
 *                view. (Sync is idempotent.)
 *
 *   AUTHENTICATED : items live on the server; CartService keeps a signal
 *                copy of the latest server view. Add/update/remove call
 *                the API and update the signal in place.
 *
 * Login transition:
 *   When AuthService transitions anon → authed, CartService observes that,
 *   posts the localStorage cart to /cart/sync, clears localStorage, and
 *   refreshes from the server response.
 *
 * Logout transition:
 *   Clear the server-cart signal; localStorage is left alone (it's empty
 *   for an authed user anyway).
 *
 * Exposes (signals):
 *   - items()      : CartLine[]   — empty array for anon
 *   - subtotal()   : number       — sum of lineTotal
 *   - itemCount()  : number       — sum of quantities (used by header badge)
 *   - guestItems() : CartItemInput[] — anon-only, used by the cart page to
 *                    decide whether to call /cart/sync to render.
 *   - loading()    : boolean
 */
import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { ApiService } from '../http/api.service';
import { AuthService } from '../auth/auth.service';
import { CartStorageService } from './cart-storage.service';
import type { CartItemInput, CartLine, CartPayload } from '../api-models/cart.model';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

const STORAGE_KEY = 'gallery.cart.v1';
const MAX_ITEMS = 50;
const MAX_QUANTITY = 20;

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly header = inject(CartStorageService);
  private readonly http = inject(HttpClient);

  // ─── Authenticated state ────────────────────────────────────────────────
  private readonly _serverItems = signal<CartLine[]>([]);
  private readonly _subtotal = signal(0);
  readonly loading = signal(false);

  // ─── Guest state ────────────────────────────────────────────────────────
  private readonly _guestItems = signal<CartItemInput[]>(this.readGuest());

  // ─── Public derived state ───────────────────────────────────────────────

  /** For authed users only. Guests get [] (cart page calls /cart/sync to hydrate). */
  readonly items = this._serverItems.asReadonly();
  readonly subtotal = this._subtotal.asReadonly();
  readonly guestItems = this._guestItems.asReadonly();

  /** Combined count — works for both modes. */
  readonly itemCount = computed(() =>
    this.auth.isAuthenticated()
      ? this._serverItems().reduce((n, i) => n + i.quantity, 0)
      : this._guestItems().reduce((n, i) => n + i.quantity, 0),
  );

  constructor() {
    // Keep the header badge service in lock-step.
    effect(() => this.header.setCountForHeader(this.itemCount()), { allowSignalWrites: true });

    // Auth transitions.
    let wasAuthed = this.auth.isAuthenticated();
    effect(() => {
      const isAuthed = this.auth.isAuthenticated();
      if (!wasAuthed && isAuthed) {
        wasAuthed = true;
        this.handleLoginSync();
      } else if (wasAuthed && !isAuthed) {
        wasAuthed = false;
        this._serverItems.set([]);
        this._subtotal.set(0);
      }
    });

    // If we start authenticated (page refresh while logged in), fetch the cart.
    if (this.auth.isAuthenticated()) {
      this.refreshFromServer();
    }
  }

  // ─── Mutations ──────────────────────────────────────────────────────────

  /** Add a configured item to the cart. */
  async addItem(input: CartItemInput): Promise<void> {
    if (this.auth.isAuthenticated()) {
      try {
        await this.api.post('/cart/items', input);
      } catch {
        return; // errorInterceptor surfaces the message; abort
      }
      await this.refreshFromServer();
    } else {
      this._guestItems.update((curr) => mergeGuestItem(curr, input));
      this.writeGuest();
    }
  }

  /** Change quantity of an existing line (authed only — guests update via re-add). */
  async updateQuantity(itemId: string, quantity: number): Promise<void> {
    if (!this.auth.isAuthenticated()) return;
    const clamped = Math.min(MAX_QUANTITY, Math.max(1, Math.round(quantity)));
    // Optimistic
    const prev = this._serverItems();
    this._serverItems.update((items) =>
      items.map((i) => (i.id === itemId ? recalcLine({ ...i, quantity: clamped }) : i)),
    );
    this.recomputeSubtotal();
    try {
      await this.api.post<{ quantity: number }, unknown>(`/cart/items/${itemId}`, { quantity: clamped });
      // Refresh to pick up any server-side adjustments.
      await this.refreshFromServer();
    } catch {
      this._serverItems.set(prev);
      this.recomputeSubtotal();
    }
  }

  /** Remove a line. For guests we work by index (no server IDs in guest mode). */
  async removeItem(itemIdOrIndex: string | number): Promise<void> {
    if (this.auth.isAuthenticated()) {
      const id = String(itemIdOrIndex);
      const prev = this._serverItems();
      this._serverItems.update((items) => items.filter((i) => i.id !== id));
      this.recomputeSubtotal();
      try {
        await this.api.del(`/cart/items/${encodeURIComponent(id)}`);
        await this.refreshFromServer();
      } catch {
        this._serverItems.set(prev);
        this.recomputeSubtotal();
      }
    } else {
      const ix = typeof itemIdOrIndex === 'number' ? itemIdOrIndex : -1;
      if (ix < 0) return;
      this._guestItems.update((items) => items.filter((_, i) => i !== ix));
      this.writeGuest();
    }
  }

  async clearCart(): Promise<void> {
    if (this.auth.isAuthenticated()) {
      const prev = this._serverItems();
      this._serverItems.set([]);
      this._subtotal.set(0);
      try {
        await this.api.del('/cart');
      } catch {
        this._serverItems.set(prev);
        this.recomputeSubtotal();
      }
    } else {
      this._guestItems.set([]);
      this.writeGuest();
    }
  }

  // ─── Server hydration ───────────────────────────────────────────────────

  async refreshFromServer(): Promise<void> {
    if (!this.auth.isAuthenticated()) return;
    this.loading.set(true);
    try {
      // GET /cart returns the FULL CartPayload directly (not envelope-wrapped
      // per Phase 3 cart.controller).
      const data = await this.fetchCart();
      this._serverItems.set(data.items);
      this._subtotal.set(data.subtotal);
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Called once on login. If there are guest items, POST them to /cart/sync;
   * the backend merges them with whatever's on the server. Then clear local.
   */
  private async handleLoginSync(): Promise<void> {
    const guest = this._guestItems();
    try {
      if (guest.length > 0) {
        const data = await this.syncGuest(guest);
        this._serverItems.set(data.items);
        this._subtotal.set(data.subtotal);
        this._guestItems.set([]);
        this.writeGuest();
      } else {
        await this.refreshFromServer();
      }
    } catch {
      // Don't blow up the login flow — user will see snackbar from interceptor.
      await this.refreshFromServer();
    }
  }

  // ─── HTTP plumbing (kept lightweight rather than dragging more into ApiService) ──

  /**
   * GET /cart returns the FULL payload (not wrapped in { data }), because the
   * controller writes `await service.getCart()` directly to res.json. Same
   * for /cart/sync. ApiService only handles { data } envelopes, so we use
   * HttpClient directly here.
   */
  private async fetchCart(): Promise<CartPayload> {
    return firstValueFrom(
      this.http.get<CartPayload>(`${environment.apiBaseUrl}/cart`),
    );
  }

  private async syncGuest(items: CartItemInput[]): Promise<CartPayload> {
    return firstValueFrom(
      this.http.post<CartPayload>(`${environment.apiBaseUrl}/cart/sync`, { items }),
    );
  }

  // ─── Local persistence ──────────────────────────────────────────────────

  private readGuest(): CartItemInput[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.slice(0, MAX_ITEMS).filter(isGuestItem);
    } catch {
      return [];
    }
  }

  private writeGuest(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this._guestItems().slice(0, MAX_ITEMS)));
    } catch {
      // Quota exceeded — silently drop. Worst case the user has a slightly
      // stale cart across reloads.
    }
  }

  private recomputeSubtotal(): void {
    this._subtotal.set(this._serverItems().reduce((sum, i) => sum + i.lineTotal, 0));
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function isGuestItem(v: unknown): v is CartItemInput {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o['artworkId'] === 'string' &&
    typeof o['printSizeId'] === 'string' &&
    (o['frameOptionId'] === null || typeof o['frameOptionId'] === 'string') &&
    typeof o['withMatte'] === 'boolean' &&
    typeof o['quantity'] === 'number'
  );
}

/**
 * Same dedupe rule as the server's cart.service.ts addItem: match on
 * artwork + size + frame + matte, sum quantities, cap at MAX_QUANTITY.
 */
function mergeGuestItem(curr: CartItemInput[], next: CartItemInput): CartItemInput[] {
  const ix = curr.findIndex(
    (i) =>
      i.artworkId === next.artworkId &&
      i.printSizeId === next.printSizeId &&
      i.frameOptionId === next.frameOptionId &&
      i.withMatte === next.withMatte,
  );
  if (ix === -1) {
    return [...curr, { ...next, quantity: Math.min(MAX_QUANTITY, next.quantity) }];
  }
  const merged = [...curr];
  merged[ix] = {
    ...merged[ix]!,
    quantity: Math.min(MAX_QUANTITY, merged[ix]!.quantity + next.quantity),
  };
  return merged;
}

function recalcLine(line: CartLine): CartLine {
  return { ...line, lineTotal: Math.round(line.unitPrice * line.quantity) };
}
