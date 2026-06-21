// frontend/src/app/features/checkout/order-confirmation.component.ts
/**
 * /order/:id/confirmation — bank-success target.
 *
 * Loads the order, shows the order number prominently, lists items, shipping
 * address, total. Status is checked: if not PAID (e.g. user landed here by
 * URL while order is still PENDING), shows a "we'll email you" message.
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
import { UploadUrlPipe } from '../../shared/pipes/upload-url.pipe';
import { PricePipe } from '../../shared/pipes/price.pipe';
import type { OrderDetail } from './order.model';

@Component({
  selector: 'app-order-confirmation',
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
      @if (loading()) {
        <div class="centered"><mat-progress-spinner mode="indeterminate" diameter="48"/></div>
      } @else if (!order()) {
        <div class="centered">
          <mat-icon class="big-icon">error_outline</mat-icon>
          <p>{{ 'order.notFound' | translate }}</p>
          <a mat-button routerLink="/">{{ 'common.back' | translate }}</a>
        </div>
      } @else {
        <div class="hero" [class.pending]="order()!.status !== 'PAID'">
          <mat-icon class="hero-icon">
            {{ order()!.status === 'PAID' ? 'check_circle' : 'hourglass_top' }}
          </mat-icon>
          <h1>
            {{ (order()!.status === 'PAID' ? 'order.confirmation.title' : 'order.confirmation.pendingTitle')
                | translate }}
          </h1>
          <p class="order-number">
            {{ 'order.numberLabel' | translate }}
            <strong>{{ order()!.orderNumber }}</strong>
          </p>
          @if (order()!.status === 'PAID') {
            <p class="hero-sub">{{ 'order.confirmation.subtitle' | translate }}</p>
          } @else {
            <p class="hero-sub">{{ 'order.confirmation.pendingSubtitle' | translate }}</p>
          }
        </div>

        <div class="grid">
          <mat-card>
            <mat-card-header><mat-card-title>{{ 'order.items' | translate }}</mat-card-title></mat-card-header>
            <mat-card-content>
              <ul class="lines">
                @for (line of order()!.items; track line.id) {
                  <li class="line">
                    <img
                      [src]="line.thumbnailPath | uploadUrl"
                      [alt]="line.artworkTitle"
                      class="thumb"
                      loading="lazy"
                    />
                    <div class="line-info">
                      <strong>{{ line.artworkTitle }}</strong>
                      <span class="muted">{{ line.artistName }}</span>
                      <span class="config muted">
                        {{ line.printSizeLabel }}
                        @if (line.frameLabel) { · {{ line.frameLabel }} }
                        @if (line.withMatte) { · {{ 'cart.matte' | translate }} }
                      </span>
                    </div>
                    <div class="qty muted">× {{ line.quantity }}</div>
                    <div class="line-total">{{ line.lineTotal | price }}</div>
                  </li>
                }
              </ul>
              <div class="total-row">
                <span>{{ 'order.total' | translate }}</span>
                <span class="total">{{ order()!.totalAmount | price }}</span>
              </div>
            </mat-card-content>
          </mat-card>

          <mat-card>
            <mat-card-header>
              <mat-card-title>{{ 'order.shipping.title' | translate }}</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <p>
                {{ order()!.shippingFirstName }} {{ order()!.shippingLastName }}<br />
                {{ order()!.shippingAddress }}<br />
                {{ order()!.shippingCity }}<br />
                {{ order()!.shippingPhone }}
              </p>
              @if (order()!.shippingNotes) {
                <p class="muted"><em>{{ order()!.shippingNotes }}</em></p>
              }
            </mat-card-content>
          </mat-card>
        </div>

        <div class="actions">
          <a mat-flat-button color="primary" routerLink="/">
            {{ 'order.confirmation.continueShopping' | translate }}
          </a>
          <a mat-stroked-button routerLink="/account/profile">
            {{ 'order.confirmation.viewOrders' | translate }}
          </a>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .page { max-width: 960px; margin: 0 auto; padding: 32px 24px; }
      .centered {
        min-height: 50vh; display: flex; flex-direction: column;
        align-items: center; justify-content: center; gap: 16px;
      }
      .big-icon { font-size: 72px; width: 72px; height: 72px; opacity: 0.5; }
      .hero {
        text-align: center; padding: 32px 16px; background: #e8f5e9;
        border-radius: 8px; margin-bottom: 24px;
      }
      .hero.pending { background: #fff8e1; }
      .hero-icon { font-size: 64px; width: 64px; height: 64px; color: #2e7d32; }
      .hero.pending .hero-icon { color: #f57f17; }
      .hero h1 { margin: 8px 0 4px; }
      .order-number { font-size: 16px; margin: 8px 0; }
      .hero-sub { color: rgba(0,0,0,0.7); margin: 4px 0 0; }

      .grid { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); gap: 16px; }
      @media (max-width: 800px) { .grid { grid-template-columns: 1fr; } }

      .lines { list-style: none; padding: 0; margin: 0; }
      .line {
        display: grid; grid-template-columns: 64px 1fr auto auto;
        gap: 12px; align-items: center; padding: 12px 0; border-bottom: 1px solid #f0f0f0;
      }
      .thumb { width: 64px; height: 64px; object-fit: cover; border-radius: 4px; background: #f4f4f4; }
      .line-info { display: flex; flex-direction: column; min-width: 0; }
      .muted { color: rgba(0,0,0,0.55); font-size: 13px; }
      .config { font-size: 12px; }
      .qty { white-space: nowrap; }
      .line-total { font-weight: 600; white-space: nowrap; }

      .total-row {
        display: flex; justify-content: space-between; padding-top: 12px;
        font-size: 16px;
      }
      .total { font-weight: 700; font-size: 20px; }

      .actions {
        display: flex; gap: 12px; justify-content: center; margin-top: 32px;
        flex-wrap: wrap;
      }
    `,
  ],
})
export class OrderConfirmationComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly orderService = inject(OrderService);

  readonly order = signal<OrderDetail | null>(null);
  readonly loading = signal(true);

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.load(id);
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
