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
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
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
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    TranslatePipe,
  ],
  template: `
    <div class="page">
      @if (loading()) {
        <div class="centered"><mat-progress-spinner mode="indeterminate" diameter="48"/></div>
      } @else {
        <div class="hero">
          <mat-icon class="hero-icon">error_outline</mat-icon>
          <h1>{{ 'order.failed.title' | translate }}</h1>
          @if (order()) {
            <p class="order-number">
              {{ 'order.numberLabel' | translate }}
              <strong>{{ order()!.orderNumber }}</strong>
            </p>
            <p class="muted">{{ 'order.failed.statusLabel' | translate }}: {{ order()!.status }}</p>
          }
          <p class="hero-sub">{{ 'order.failed.subtitle' | translate }}</p>
        </div>

        <div class="actions">
          <a mat-flat-button color="primary" routerLink="/checkout">
            <mat-icon>refresh</mat-icon>
            {{ 'order.failed.tryAgain' | translate }}
          </a>
          <a mat-stroked-button routerLink="/cart">
            {{ 'order.failed.backToCart' | translate }}
          </a>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .page { max-width: 640px; margin: 0 auto; padding: 48px 24px; }
      .centered { display: flex; justify-content: center; padding: 48px; }
      .hero {
        text-align: center; padding: 32px 16px; background: #ffebee;
        border-radius: 8px; margin-bottom: 24px;
      }
      .hero-icon { font-size: 64px; width: 64px; height: 64px; color: #c62828; }
      .hero h1 { margin: 8px 0 4px; }
      .order-number { font-size: 16px; margin: 8px 0; }
      .muted { color: rgba(0,0,0,0.6); font-size: 14px; margin: 4px 0; }
      .hero-sub { color: rgba(0,0,0,0.75); margin: 8px 0 0; }
      .actions { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
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
