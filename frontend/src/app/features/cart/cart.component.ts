// frontend/src/app/features/cart/cart.component.ts
/**
 * Cart page (/cart).
 *
 * Two render modes:
 *
 *  - AUTHENTICATED: shows full server-side cart with thumbnails, quantity
 *    steppers, remove buttons, subtotal, "Proceed to checkout" CTA.
 *
 *  - GUEST: shows an item count and a sign-in prompt. We require login for
 *    checkout regardless, so deferring the rich render until login is a
 *    fair trade for a simpler v1.
 */
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CartService } from '../../core/cart/cart.service';
import { AuthService } from '../../core/auth/auth.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { UploadUrlPipe } from '../../shared/pipes/upload-url.pipe';
import { PricePipe } from '../../shared/pipes/price.pipe';

@Component({
  selector: 'app-cart',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    MatIconModule,
    MatProgressSpinnerModule,
    TranslatePipe,
    UploadUrlPipe,
    PricePipe,
  ],
  template: `
    <div class="page wrap wrap--narrow">
      <h1 class="title display-2">{{ 'cart.title' | translate }}</h1>

      @if (cart.loading()) {
        <div class="centered"><mat-progress-spinner mode="indeterminate" diameter="40"/></div>
      } @else if (!auth.isAuthenticated()) {
        <!-- Guest view -->
        @if (cart.guestItems().length === 0) {
          <div class="empty">
            <p>{{ 'cart.empty' | translate }}</p>
            <a class="btn btn--sm" routerLink="/gallery">{{ 'cart.browse' | translate }}</a>
          </div>
        } @else {
          <div class="guest-card">
            <p class="guest-summary">
              {{ 'cart.guestSummary' | translate: { count: cart.itemCount() } }}
            </p>
            <a class="btn btn--solid"
               [routerLink]="['/account/login']"
               [queryParams]="{ redirect: '/cart' }">
              {{ 'cart.logInToCheckout' | translate }}
            </a>
            <p class="guest-hint">
              {{ 'cart.guestHint' | translate }}
              <a class="inline-link" routerLink="/account/register" [queryParams]="{ redirect: '/cart' }">
                {{ 'cart.signUp' | translate }}
              </a>
            </p>
          </div>
        }
      } @else if (cart.items().length === 0) {
        <!-- Authed but empty -->
        <div class="empty">
          <p>{{ 'cart.empty' | translate }}</p>
          <a class="btn btn--sm" routerLink="/gallery">{{ 'cart.browse' | translate }}</a>
        </div>
      } @else {
        <!-- Authed cart -->
        <div class="layout">
          <ul class="items">
            @for (line of cart.items(); track line.id) {
              <li class="row">
                <a [routerLink]="['/artwork', line.artwork.id]" class="thumb-link">
                  <img
                    class="thumb"
                    loading="lazy"
                    [src]="line.artwork.thumbnailPath | uploadUrl"
                    [alt]="line.artwork.title"
                  />
                </a>
                <div class="info">
                  <a [routerLink]="['/artwork', line.artwork.id]" class="line-title">
                    {{ line.artwork.title }}
                  </a>
                  <p class="line-artist">{{ line.artwork.artistName }}</p>
                  <p class="line-config">
                    <span>{{ line.printSize.label }}</span>
                    @if (line.frameOption) {
                      <span aria-hidden="true">·</span>
                      <span class="frame-chip">
                        <span class="frame-dot" [style.background]="line.frameOption.colorHex"></span>
                        {{ line.frameOption.label }}
                      </span>
                    }
                    @if (line.withMatte) {
                      <span aria-hidden="true">·</span>
                      <span>{{ 'cart.matte' | translate }}</span>
                    }
                  </p>

                  <div class="qty">
                    <button type="button" (click)="dec(line.id, line.quantity)"
                            [disabled]="line.quantity <= 1" aria-label="Decrease">−</button>
                    <span class="qty-val">{{ line.quantity }}</span>
                    <button type="button" (click)="inc(line.id, line.quantity)"
                            [disabled]="line.quantity >= 20" aria-label="Increase">+</button>
                  </div>
                </div>

                <div class="line-total">
                  <span>{{ line.lineTotal | price }}</span>
                  <button type="button" class="remove" (click)="remove(line.id)" aria-label="Remove">
                    <mat-icon>close</mat-icon>
                  </button>
                </div>
              </li>
            }
          </ul>

          <aside class="summary">
            <div class="summary-card">
              <div class="subtotal-row">
                <span>{{ 'cart.subtotal' | translate }}</span>
                <span class="subtotal">{{ cart.subtotal() | price }}</span>
              </div>
              <p class="muted">{{ 'cart.shippingNote' | translate }}</p>
              <a class="btn btn--solid btn--block" routerLink="/checkout">
                {{ 'cart.checkout' | translate }}
              </a>
              <button type="button" class="btn btn--block clear-btn" (click)="clearAll()">
                {{ 'cart.clear' | translate }}
              </button>
            </div>
          </aside>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .page { padding-block: clamp(28px, 5vw, 56px) clamp(56px, 9vw, 112px); }
      .title { margin: 0 0 clamp(28px, 4vw, 44px); }
      .centered { display: flex; justify-content: center; padding: 64px; }

      .empty {
        text-align: center; padding: 72px 16px; display: flex; flex-direction: column;
        align-items: center; gap: 22px; color: var(--c-muted);
      }
      .inline-link { text-decoration: underline; text-underline-offset: 3px; }

      .guest-card {
        max-width: 460px; margin: 24px auto 0; padding: 32px;
        border: 1px solid var(--c-line); background: var(--c-paper-warm);
        display: flex; flex-direction: column; align-items: flex-start; gap: 18px;
      }
      .guest-summary { font-size: 15px; margin: 0; }
      .guest-hint { margin: 0; font-size: 13px; color: var(--c-muted); line-height: 1.6; }

      .layout { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: clamp(28px, 5vw, 56px); align-items: start; }
      @media (max-width: 860px) { .layout { grid-template-columns: 1fr; } }

      .items { list-style: none; padding: 0; margin: 0; border-top: 1px solid var(--c-line); }
      .row {
        display: grid;
        grid-template-columns: 104px 1fr auto;
        gap: 20px;
        padding: 24px 0;
        border-bottom: 1px solid var(--c-line);
        align-items: start;
      }
      .thumb-link { display: block; }
      .thumb {
        width: 104px; height: 128px; object-fit: cover;
        background: var(--c-paper-warm);
      }
      .info { min-width: 0; }
      .line-title {
        display: block; font-family: var(--font-display); font-size: 1.15rem;
        margin-bottom: 5px;
      }
      .line-title:hover { color: var(--c-muted); }
      .line-artist {
        margin: 0 0 10px; font-size: 11px; font-weight: 600;
        letter-spacing: var(--tracking-label); text-transform: uppercase; color: var(--c-muted);
      }
      .line-config {
        margin: 0 0 16px; font-size: 13px; color: var(--c-muted);
        display: flex; flex-wrap: wrap; gap: 8px; align-items: center;
      }
      .frame-chip { display: inline-flex; align-items: center; gap: 5px; }
      .frame-dot {
        display: inline-block; width: 10px; height: 10px;
        border: 1px solid var(--c-line-strong);
      }

      .qty { display: inline-flex; align-items: center; border: 1px solid var(--c-line-strong); }
      .qty button {
        width: 34px; height: 34px; border: 0; background: none; cursor: pointer;
        font-size: 15px; color: var(--c-ink);
      }
      .qty button:disabled { opacity: 0.3; cursor: not-allowed; }
      .qty button:hover:not(:disabled) { background: var(--c-paper-alt); }
      .qty-val { min-width: 34px; text-align: center; font-size: 13px; font-weight: 600; }

      .line-total {
        display: flex; align-items: center; gap: 10px;
        font-size: 14px; white-space: nowrap;
      }
      .remove {
        border: 0; background: none; cursor: pointer; color: var(--c-muted);
        display: inline-flex; padding: 4px;
      }
      .remove:hover { color: var(--c-ink); }
      .remove mat-icon { font-size: 18px; width: 18px; height: 18px; }

      .summary-card {
        position: sticky; top: calc(var(--header-h) + 24px);
        border: 1px solid var(--c-line); background: var(--c-paper-warm);
        padding: 28px;
      }
      .subtotal-row {
        display: flex; justify-content: space-between; align-items: baseline;
        margin-bottom: 10px;
      }
      .subtotal { font-family: var(--font-display); font-size: 1.5rem; }
      .muted { color: var(--c-muted); font-size: 12px; margin: 0 0 22px; }
      .clear-btn { margin-top: 10px; }
    `,
  ],
})
export class CartComponent {
  readonly cart = inject(CartService);
  readonly auth = inject(AuthService);

  async inc(id: string, current: number): Promise<void> {
    await this.cart.updateQuantity(id, current + 1);
  }
  async dec(id: string, current: number): Promise<void> {
    await this.cart.updateQuantity(id, Math.max(1, current - 1));
  }
  async remove(id: string): Promise<void> {
    await this.cart.removeItem(id);
  }
  async clearAll(): Promise<void> {
    await this.cart.clearCart();
  }
}
