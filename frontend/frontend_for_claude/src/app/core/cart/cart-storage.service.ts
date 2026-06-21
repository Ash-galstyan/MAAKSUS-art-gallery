// frontend/src/app/core/cart/cart-storage.service.ts
/**
 * Minimal cart-count surface used by the header badge in Phase 5.
 * Full cart service (add/remove/sync/pricing) is implemented in Phase 8.
 *
 * Exposes:
 *   - itemCount() : signal<number>  — total quantity across all cart items
 */
import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CartStorageService {
  private readonly _itemCount = signal(0);
  readonly itemCount = this._itemCount.asReadonly();

  /** Phase 8 will replace this with real storage + sync. */
  setCountForHeader(n: number): void {
    this._itemCount.set(n);
  }
}
