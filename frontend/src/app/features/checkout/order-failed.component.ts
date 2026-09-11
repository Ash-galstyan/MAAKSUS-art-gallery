// frontend/src/app/features/checkout/order-failed.component.ts
/**
 * /order/:id/failed — bank-failure target.
 *
 * The order is in FAILED or CANCELLED status. Shows what went wrong (where
 * possible) and offers "try again" (route back to checkout with the cart
 * intact — cart wasn't cleared since the order didn't succeed).
 */
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { OrderService } from './order.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import type { OrderDetail } from './order.model';

@Component({
  selector: 'app-order-failed',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    MatProgressSpinnerModule,
    TranslatePipe,
  ],
  template: `
    <div class="page wrap wrap--narrow">
      @if (loading()) {
        <div class="centered"><mat-progress-spinner mode="indeterminate" diameter="40"/></div>
      } @else {
        <div class="hero">
          <span class="eyebrow">{{ 'order.failed.statusLabel' | translate }}</span>
          <h1 class="display-1">{{ 'order.failed.title' | translate }}</h1>
          @if (order()) {
            <p class="order-number">
              {{ 'order.numberLabel' | translate }} <strong>{{ order()!.orderNumber }}</strong>
            </p>
            <p class="muted">{{ 'order.failed.statusLabel' | translate }}: {{ order()!.status }}</p>
          }
          <p class="hero-sub">{{ 'order.failed.subtitle' | translate }}</p>
        </div>

        <div class="actions">
          <a routerLink="/checkout" class="btn btn--solid">{{ 'order.failed.tryAgain' | translate }}</a>
          <a routerLink="/cart" class="btn">{{ 'order.failed.backToCart' | translate }}</a>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .page { padding-block: clamp(40px, 8vw, 96px) clamp(56px, 9vw, 112px); }
      .centered { display: flex; justify-content: center; padding: 64px; }
      .hero {
        text-align: center; padding: clamp(32px, 6vw, 56px) 24px;
        border: 1px solid var(--c-line); background: var(--c-paper-warm); margin-bottom: 24px;
      }
      .hero h1 { margin: 12px 0 16px; }
      .order-number { font-size: 14px; margin: 0; }
      .order-number strong { font-family: var(--font-display); font-size: 1.1rem; }
      .muted { color: var(--c-muted); font-size: 13px; margin: 8px 0 0; }
      .hero-sub { color: var(--c-muted); margin: 12px 0 0; font-size: 14px; }
      .actions { display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; }
    `,
  ],
})
export class OrderFailedComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly orderService = inject(OrderService);

  readonly order = signal<OrderDetail | null>(null);
  readonly loading = signal(true);

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    // /order/failed (no id) is the catch-all bank-return path for malformed
    // returns. Render the failed UI without order detail in that case.
    if (id && id !== 'failed') this.load(id);
    else this.loading.set(false);
  }

  private async load(id: string): Promise<void> {
    try {
      this.order.set(await this.orderService.getById(id));
    } catch {
      this.order.set(null);
    } finally {
      this.loading.set(false);
    }
  }
}
