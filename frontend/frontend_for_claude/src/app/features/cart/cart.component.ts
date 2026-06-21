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
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
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
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    TranslatePipe,
    UploadUrlPipe,
    PricePipe,
  ],
  template: `
    <div class="page">
      <h1 class="title">{{ 'cart.title' | translate }}</h1>

      @if (cart.loading()) {
        <div class="centered"><mat-progress-spinner mode="indeterminate" diameter="40"/></div>
      } @else if (!auth.isAuthenticated()) {
        <!-- Guest view -->
        @if (cart.guestItems().length === 0) {
          <div class="empty">
            <mat-icon class="empty-icon">shopping_cart</mat-icon>
            <p>{{ 'cart.empty' | translate }}</p>
            <a mat-flat-button color="primary" routerLink="/">
              {{ 'cart.browse' | translate }}
            </a>
          </div>
        } @else {
          <mat-card class="guest-card">
            <mat-card-content>
              <p class="guest-summary">
                {{ 'cart.guestSummary' | translate: { count: cart.itemCount() } }}
              </p>
              <a mat-flat-button color="primary"
                 [routerLink]="['/account/login']"
                 [queryParams]="{ redirect: '/cart' }">
                {{ 'cart.logInToCheckout' | translate }}
              </a>
              <p class="guest-hint">
                {{ 'cart.guestHint' | translate }}
                <a routerLink="/account/register" [queryParams]="{ redirect: '/cart' }">
                  {{ 'cart.signUp' | translate }}
                </a>
              </p>
            </mat-card-content>
          </mat-card>
        }
      } @else if (cart.items().length === 0) {
        <!-- Authed but empty -->
        <div class="empty">
          <mat-icon class="empty-icon">shopping_cart</mat-icon>
          <p>{{ 'cart.empty' | translate }}</p>
          <a mat-flat-button color="primary" routerLink="/">
            {{ 'cart.browse' | translate }}
          </a>
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
                      <span>·</span>
                      <span class="frame-chip">
                        <span class="frame-dot" [style.background]="line.frameOption.colorHex"></span>
                        {{ line.frameOption.label }}
                      </span>
                    }
                    @if (line.withMatte) {
                      <span>·</span>
                      <span>{{ 'cart.matte' | translate }}</span>
                    }
                  </p>
                </div>

                <div class="qty">
                  <button mat-icon-button (click)="dec(line.id, line.quantity)"
                          [disabled]="line.quantity <= 1" aria-label="Decrease">
                    <mat-icon>remove</mat-icon>
                  </button>
                  <span class="qty-val">{{ line.quantity }}</span>
                  <button mat-icon-button (click)="inc(line.id, line.quantity)"
                          [disabled]="line.quantity >= 20" aria-label="Increase">
                    <mat-icon>add</mat-icon>
                  </button>
                </div>

                <div class="line-total">
                  {{ line.lineTotal | price }}
                  <button mat-icon-button class="remove" (click)="remove(line.id)" aria-label="Remove">
                    <mat-icon>delete_outline</mat-icon>
                  </button>
                </div>
              </li>
            }
          </ul>

          <aside class="summary">
            <mat-card>
              <mat-card-content>
                <div class="subtotal-row">
                  <span>{{ 'cart.subtotal' | translate }}</span>
                  <span class="subtotal">{{ cart.subtotal() | price }}</span>
                </div>
                <p class="muted">{{ 'cart.shippingNote' | translate }}</p>
                <a mat-flat-button color="primary" class="checkout-btn"
                   routerLink="/checkout">
                  {{ 'cart.checkout' | translate }}
                </a>
                <button mat-stroked-button class="clear-btn" (click)="clearAll()">
                  {{ 'cart.clear' | translate }}
                </button>
              </mat-card-content>
            </mat-card>
          </aside>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .page { max-width: 1200px; margin: 0 auto; padding: 24px; }
      .title { font-size: 28px; margin: 0 0 24px; }
      .centered { display: flex; justify-content: center; padding: 48px; }

      .empty {
        text-align: center; padding: 64px 16px; display: flex; flex-direction: column;
        align-items: center; gap: 16px;
      }
      .empty-icon { font-size: 96px; width: 96px; height: 96px; opacity: 0.3; }

      .guest-card { max-width: 480px; margin: 32px auto; }
      .guest-summary { font-size: 16px; margin: 0 0 16px; }
      .guest-hint { margin-top: 16px; font-size: 13px; color: rgba(0,0,0,0.6); }

      .layout { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 24px; }
      @media (max-width: 900px) { .layout { grid-template-columns: 1fr; } }

      .items { list-style: none; padding: 0; margin: 0; }
      .row {
        display: grid;
        grid-template-columns: 96px 1fr auto auto;
        gap: 16px;
        padding: 16px 0;
        border-bottom: 1px solid #eee;
        align-items: center;
      }
      .thumb-link { display: block; }
      .thumb {
        width: 96px; height: 96px; object-fit: cover; border-radius: 4px;
        background: #f4f4f4;
      }
      .info { min-width: 0; }
      .line-title {
        display: block; font-weight: 600; color: inherit; text-decoration: none;
        margin-bottom: 4px;
      }
      .line-title:hover { text-decoration: underline; }
      .line-artist { margin: 0 0 6px; font-size: 13px; color: rgba(0,0,0,0.6); }
      .line-config {
        margin: 0; font-size: 13px; color: rgba(0,0,0,0.7);
        display: flex; flex-wrap: wrap; gap: 6px; align-items: center;
      }
      .frame-chip { display: inline-flex; align-items: center; gap: 4px; }
      .frame-dot {
        display: inline-block; width: 10px; height: 10px; border-radius: 50%;
        border: 1px solid rgba(0,0,0,0.15);
      }

      .qty { display: flex; align-items: center; gap: 4px; }
      .qty-val { min-width: 24px; text-align: center; font-weight: 600; }

      .line-total {
        display: flex; align-items: center; gap: 8px;
        font-weight: 600; white-space: nowrap;
      }
      .remove { color: rgba(0,0,0,0.45); }

      .summary mat-card { position: sticky; top: 96px; }
      .subtotal-row {
        display: flex; justify-content: space-between; align-items: baseline;
        margin-bottom: 8px;
      }
      .subtotal { font-size: 20px; font-weight: 700; }
      .muted { color: rgba(0,0,0,0.55); font-size: 13px; margin: 0 0 16px; }
      .checkout-btn { width: 100%; height: 48px; margin-bottom: 8px; }
      .clear-btn { width: 100%; }
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
