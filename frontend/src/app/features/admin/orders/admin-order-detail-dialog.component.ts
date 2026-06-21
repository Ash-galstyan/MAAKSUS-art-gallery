// frontend/src/app/features/admin/orders/admin-order-detail-dialog.component.ts
/**
 * Order detail dialog — read-mostly with status transition actions.
 *
 * Status transition buttons are conditionally shown based on the backend's
 * state machine:
 *   PAID       → "Mark fulfilled" (FULFILLED), "Refund" (REFUNDED)
 *   FULFILLED  → "Refund" (REFUNDED)
 *   PENDING    → "Cancel" (CANCELLED)        [rare; usually failed pmt → FAILED]
 *
 * Anything else is terminal from the admin's perspective.
 *
 * Payment attempts are listed below items in a small table. Useful when
 * debugging a "card declined" support case — you can see exactly what error
 * the bank returned.
 */
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { I18nService } from '../../../core/i18n/i18n.service';
import { UploadUrlPipe } from '../../../shared/pipes/upload-url.pipe';
import { PricePipe } from '../../../shared/pipes/price.pipe';
import { AdminSnackbarService } from '../shared/admin-snackbar.service';
import {
  AdminOrdersService,
  type AdminOrderDetail,
  type OrderUpdatableStatus,
} from './admin-orders.service';

@Component({
  selector: 'app-admin-order-detail-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    DatePipe,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTableModule,
    TranslatePipe,
    UploadUrlPipe,
    PricePipe,
  ],
  template: `
    <h2 mat-dialog-title>
      @if (order(); as o) {
        {{ 'admin.orders.detailTitle' | translate }} — <code>{{ o.orderNumber }}</code>
        <span class="status-chip" [class]="'status-' + o.status.toLowerCase()">{{ o.status }}</span>
      } @else {
        {{ 'admin.orders.detailTitle' | translate }}
      }
    </h2>

    <mat-dialog-content class="dialog-body">
      @if (loading()) {
        <div class="loading-overlay"><mat-spinner diameter="40"></mat-spinner></div>
      } @else {
        @if (order(); as o) {
          <!-- ─── Customer + shipping ──────────────────────────────────────── -->
          <section class="section">
            <h3>{{ 'admin.orders.shippingHeading' | translate }}</h3>
            <div class="kv-grid">
              <div class="key">{{ 'admin.orders.name' | translate }}</div>
              <div>{{ o.shippingFirstName }} {{ o.shippingLastName }}</div>
              <div class="key">{{ 'admin.orders.phone' | translate }}</div>
              <div>{{ o.shippingPhone }}</div>
              <div class="key">{{ 'admin.orders.city' | translate }}</div>
              <div>{{ o.shippingCity }}</div>
              <div class="key">{{ 'admin.orders.address' | translate }}</div>
              <div class="pre">{{ o.shippingAddress }}</div>
              @if (o.shippingNotes) {
                <div class="key">{{ 'admin.orders.notes' | translate }}</div>
                <div class="pre">{{ o.shippingNotes }}</div>
              }
              @if (o.user?.email) {
                <div class="key">{{ 'admin.orders.userEmail' | translate }}</div>
                <div>{{ o.user!.email }}</div>
              }
            </div>
          </section>

          <!-- ─── Items ────────────────────────────────────────────────────── -->
          <section class="section">
            <h3>{{ 'admin.orders.itemsHeading' | translate }}</h3>
            @for (item of o.items; track item.id) {
              <div class="item-row">
                @if (item.thumbnailPath) {
                  <img class="thumb" [src]="item.thumbnailPath | uploadUrl" alt="" />
                } @else {
                  <div class="thumb-placeholder">—</div>
                }
                <div class="item-meta">
                  <div class="item-title">{{ item.artworkTitle }}</div>
                  <div class="muted">{{ item.artistName }}</div>
                  <div class="muted">
                    {{ item.printSizeLabel }}
                    @if (item.frameLabel) { · {{ item.frameLabel }} }
                    @if (item.withMatte) { · {{ 'admin.orders.withMatte' | translate }} }
                  </div>
                </div>
                <div class="item-qty">×{{ item.quantity }}</div>
                <div class="item-price price">{{ +item.lineTotal | price }}</div>
              </div>
            }
            <div class="totals-row">
              <span>{{ 'admin.orders.total' | translate }}</span>
              <span class="price">{{ +o.totalAmount | price }}</span>
            </div>
          </section>

          <!-- ─── Payments ─────────────────────────────────────────────────── -->
          @if (o.payments.length > 0) {
            <section class="section">
              <h3>{{ 'admin.orders.paymentsHeading' | translate }}</h3>
              <table mat-table [dataSource]="o.payments" class="payment-table">
                <ng-container matColumnDef="date">
                  <th mat-header-cell *matHeaderCellDef>{{ 'admin.orders.date' | translate }}</th>
                  <td mat-cell *matCellDef="let p">{{ p.createdAt | date:'short' }}</td>
                </ng-container>
                <ng-container matColumnDef="provider">
                  <th mat-header-cell *matHeaderCellDef>{{ 'admin.orders.provider' | translate }}</th>
                  <td mat-cell *matCellDef="let p">{{ p.provider }}</td>
                </ng-container>
                <ng-container matColumnDef="status">
                  <th mat-header-cell *matHeaderCellDef>{{ 'admin.orders.status' | translate }}</th>
                  <td mat-cell *matCellDef="let p">
                    <span class="status-chip" [class]="'status-' + p.status.toLowerCase()">{{ p.status }}</span>
                  </td>
                </ng-container>
                <ng-container matColumnDef="paymentId">
                  <th mat-header-cell *matHeaderCellDef>Payment ID</th>
                  <td mat-cell *matCellDef="let p">
                    <code class="muted">{{ p.providerPaymentId || '—' }}</code>
                  </td>
                </ng-container>
                <ng-container matColumnDef="error">
                  <th mat-header-cell *matHeaderCellDef>{{ 'admin.orders.error' | translate }}</th>
                  <td mat-cell *matCellDef="let p">
                    @if (p.errorCode || p.errorMessage) {
                      <code class="muted">{{ p.errorCode }}</code>
                      @if (p.errorMessage) { <div class="muted">{{ p.errorMessage }}</div> }
                    } @else { — }
                  </td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="paymentColumns"></tr>
                <tr mat-row *matRowDef="let p; columns: paymentColumns;"></tr>
              </table>
            </section>
          }
        } @else {
          @if (error(); as msg) {
            <div class="error-banner">{{ msg }}</div>
          }
        }
      }
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="close()">
        {{ 'common.close' | translate }}
      </button>
      @if (canFulfill()) {
        <button mat-stroked-button color="primary" type="button"
                [disabled]="updating()"
                (click)="changeStatus('FULFILLED')">
          <mat-icon>local_shipping</mat-icon>
          {{ 'admin.orders.markFulfilled' | translate }}
        </button>
      }
      @if (canRefund()) {
        <button mat-stroked-button color="warn" type="button"
                [disabled]="updating()"
                (click)="changeStatus('REFUNDED')">
          <mat-icon>undo</mat-icon>
          {{ 'admin.orders.markRefunded' | translate }}
        </button>
      }
      @if (canCancel()) {
        <button mat-stroked-button color="warn" type="button"
                [disabled]="updating()"
                (click)="changeStatus('CANCELLED')">
          {{ 'admin.orders.markCancelled' | translate }}
        </button>
      }
    </mat-dialog-actions>
  `,
  styleUrls: ['../shared/admin-page.scss'],
  styles: [
    `
      .dialog-body { padding-top: 8px; max-height: 70vh; }
      .section { margin-bottom: 24px; }
      .section h3 { margin: 0 0 12px; font-size: 15px; font-weight: 500; }
      .kv-grid {
        display: grid;
        grid-template-columns: 160px 1fr;
        gap: 8px 16px;
      }
      .key { color: #757575; font-size: 13px; }
      .pre { white-space: pre-wrap; }

      .item-row {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 8px 0;
        border-bottom: 1px solid #eee;
      }
      .item-row:last-child { border-bottom: none; }
      .item-meta { flex: 1; }
      .item-title { font-weight: 500; }
      .item-qty { font-variant-numeric: tabular-nums; color: #757575; }
      .item-price { font-weight: 500; min-width: 100px; text-align: right; }

      .totals-row {
        display: flex;
        justify-content: space-between;
        margin-top: 12px;
        padding-top: 12px;
        border-top: 2px solid #eee;
        font-weight: 600;
        font-size: 16px;
      }

      .payment-table { width: 100%; font-size: 13px; }

      code { font-family: monospace; font-size: 12px; }
      h2 .status-chip { margin-left: 12px; vertical-align: middle; }
    `,
  ],
})
export class AdminOrderDetailDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<AdminOrderDetailDialogComponent, { changed?: boolean } | undefined>);
  private readonly service = inject(AdminOrdersService);
  private readonly snack = inject(AdminSnackbarService);
  private readonly i18n = inject(I18nService);
  private readonly data = inject<{ orderId: string }>(MAT_DIALOG_DATA);

  readonly order = signal<AdminOrderDetail | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly updating = signal(false);
  private hasChanged = false;

  readonly paymentColumns = ['date', 'provider', 'status', 'paymentId', 'error'];

  readonly canFulfill = computed(() => this.order()?.status === 'PAID');
  readonly canRefund = computed(() => {
    const s = this.order()?.status;
    return s === 'PAID' || s === 'FULFILLED';
  });
  readonly canCancel = computed(() => this.order()?.status === 'PENDING');

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      this.order.set(await this.service.detail(this.data.orderId));
    } catch (err) {
      this.error.set((err as Error).message ?? 'Failed to load order');
    } finally {
      this.loading.set(false);
    }
  }

  async changeStatus(status: OrderUpdatableStatus): Promise<void> {
    if (!confirm(this.i18n.t('admin.orders.confirmStatusChange'))) return;
    this.updating.set(true);
    try {
      const updated = await this.service.updateStatus(this.data.orderId, status);
      this.order.set(updated);
      this.hasChanged = true;
      this.snack.success(this.i18n.t('admin.orders.statusUpdated'));
    } catch {
      /* interceptor toast */
    } finally {
      this.updating.set(false);
    }
  }

  close(): void {
    this.dialogRef.close(this.hasChanged ? { changed: true } : undefined);
  }
}