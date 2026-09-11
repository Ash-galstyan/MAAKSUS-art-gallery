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
    MatProgressSpinnerModule,
    TranslatePipe,
    UploadUrlPipe,
    PricePipe,
  ],
  template: `
    <div class="page wrap wrap--narrow">
      @if (loading()) {
        <div class="centered"><mat-progress-spinner mode="indeterminate" diameter="40"/></div>
      } @else if (!order()) {
        <div class="centered">
          <p>{{ 'order.notFound' | translate }}</p>
          <a routerLink="/gallery" class="btn btn--sm">{{ 'common.back' | translate }}</a>
        </div>
      } @else {
        <div class="hero">
          <span class="eyebrow">
            {{ (order()!.status === 'PAID' ? 'order.confirmation.eyebrow' : 'order.confirmation.pendingEyebrow') | translate }}
          </span>
          <h1 class="display-1">
            {{ (order()!.status === 'PAID' ? 'order.confirmation.title' : 'order.confirmation.pendingTitle')
                | translate }}
          </h1>
          <p class="order-number">
            {{ 'order.numberLabel' | translate }} <strong>{{ order()!.orderNumber }}</strong>
          </p>
          <p class="hero-sub">
            {{ (order()!.status === 'PAID' ? 'order.confirmation.subtitle' : 'order.confirmation.pendingSubtitle') | translate }}
          </p>
        </div>

        <div class="grid">
          <section class="panel">
            <h2 class="block__title">{{ 'order.items' | translate }}</h2>
            <ul class="lines">
              @for (line of order()!.items; track line.id) {
                <li class="line">
                  <img [src]="line.thumbnailPath | uploadUrl" [alt]="line.artworkTitle"
                       class="thumb" loading="lazy" />
                  <div class="line-info">
                    <span class="line-title">{{ line.artworkTitle }}</span>
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
          </section>

          <section class="panel">
            <h2 class="block__title">{{ 'order.shipping.title' | translate }}</h2>
            <p class="addr">
              {{ order()!.shippingFirstName }} {{ order()!.shippingLastName }}<br />
              {{ order()!.shippingAddress }}<br />
              {{ order()!.shippingCity }}<br />
              {{ order()!.shippingPhone }}
            </p>
            @if (order()!.shippingNotes) {
              <p class="muted"><em>{{ order()!.shippingNotes }}</em></p>
            }
          </section>
        </div>

        <div class="actions">
          <a routerLink="/gallery" class="btn btn--solid">
            {{ 'order.confirmation.continueShopping' | translate }}
          </a>
          <a routerLink="/account/profile" class="btn">
            {{ 'order.confirmation.viewOrders' | translate }}
          </a>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .page { padding-block: clamp(32px, 6vw, 72px) clamp(56px, 9vw, 112px); }
      .centered {
        min-height: 50vh; display: flex; flex-direction: column;
        align-items: center; justify-content: center; gap: 16px;
      }
      .hero {
        text-align: center; padding: clamp(32px, 6vw, 56px) 24px;
        border: 1px solid var(--c-line); background: var(--c-paper-warm);
        margin-bottom: 24px;
      }
      .hero h1 { margin: 12px 0 16px; }
      .order-number { font-size: 14px; margin: 0; letter-spacing: 0.02em; }
      .order-number strong { font-family: var(--font-display); font-size: 1.1rem; }
      .hero-sub { color: var(--c-muted); margin: 12px 0 0; font-size: 14px; }

      .grid { display: grid; grid-template-columns: minmax(0, 1.8fr) minmax(0, 1fr); gap: 2px; background: var(--c-line); border: 1px solid var(--c-line); }
      @media (max-width: 800px) { .grid { grid-template-columns: 1fr; } }
      .panel { background: var(--c-paper); padding: 28px; }
      .block__title {
        font-family: var(--font-sans); font-size: 11px; font-weight: 600;
        letter-spacing: var(--tracking-label); text-transform: uppercase;
        color: var(--c-muted); margin: 0 0 18px;
      }

      .lines { list-style: none; padding: 0; margin: 0; }
      .line {
        display: grid; grid-template-columns: 56px 1fr auto auto;
        gap: 14px; align-items: start; padding: 14px 0; border-bottom: 1px solid var(--c-line);
      }
      .thumb { width: 56px; height: 68px; object-fit: cover; background: var(--c-stone); }
      .line-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
      .line-title { font-size: 13px; }
      .muted { color: var(--c-muted); font-size: 12px; }
      .config { font-size: 11px; }
      .qty { white-space: nowrap; font-size: 12px; }
      .line-total { font-size: 13px; white-space: nowrap; }
      .addr { line-height: 1.7; font-size: 14px; margin: 0 0 8px; }

      .total-row {
        display: flex; justify-content: space-between; align-items: baseline;
        padding-top: 16px; font-size: 14px;
      }
      .total { font-family: var(--font-display); font-size: 1.4rem; }

      .actions {
        display: flex; gap: 14px; justify-content: center; margin-top: 32px; flex-wrap: wrap;
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
