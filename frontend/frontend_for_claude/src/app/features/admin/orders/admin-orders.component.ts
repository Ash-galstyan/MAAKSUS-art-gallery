// frontend/src/app/features/admin/orders/admin-orders.component.ts
/**
 * Admin → Orders list page.
 *
 * Differs from other admin pages:
 *   - Paginated (cursor-based) — orders can grow indefinitely
 *   - Read-only at list level; status changes happen in the detail dialog
 *   - Status filter at the top
 *
 * Why pagination here but not artworks/categories: a working gallery has
 * maybe 50–500 artworks, but tens of thousands of orders over time. The
 * backend's listForAdmin already returns { data, nextCursor }; we use
 * "Load more" rather than infinite-scroll because the table doesn't have
 * a single scroll container we can hook onto.
 */
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { PricePipe } from '../../../shared/pipes/price.pipe';
import {
  AdminOrdersService,
  type AdminOrderListItem,
  type OrderStatus,
} from './admin-orders.service';
import { AdminOrderDetailDialogComponent } from './admin-order-detail-dialog.component';

const STATUSES: OrderStatus[] = ['PENDING', 'PAID', 'FAILED', 'FULFILLED', 'CANCELLED', 'REFUNDED'];

@Component({
  selector: 'app-admin-orders',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    DatePipe,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTableModule,
    MatTooltipModule,
    TranslatePipe,
    PricePipe,
  ],
  template: `
    <div class="page-header">
      <h2>{{ 'admin.nav.orders' | translate }}</h2>
    </div>

    <div class="toolbar">
      <mat-form-field appearance="outline" class="status-filter">
        <mat-label>{{ 'admin.orders.statusFilter' | translate }}</mat-label>
        <mat-select [(ngModel)]="statusFilter" (selectionChange)="onFilterChange()">
          <mat-option [value]="null">{{ 'admin.orders.allStatuses' | translate }}</mat-option>
          @for (s of statuses; track s) {
            <mat-option [value]="s">{{ s }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <span class="spacer"></span>
      <button mat-icon-button (click)="reload(true)" [matTooltip]="'common.refresh' | translate">
        <mat-icon>refresh</mat-icon>
      </button>
    </div>

    @if (error(); as msg) {
      <div class="error-banner">{{ msg }}</div>
    }

    @if (loading() && orders().length === 0) {
      <div class="loading-overlay"><mat-spinner diameter="40"></mat-spinner></div>
    } @else if (orders().length === 0) {
      <div class="empty-state">{{ 'admin.orders.empty' | translate }}</div>
    } @else {
      <div class="table-card mat-elevation-z1">
        <table mat-table [dataSource]="orders()">
          <ng-container matColumnDef="orderNumber">
            <th mat-header-cell *matHeaderCellDef>{{ 'admin.orders.number' | translate }}</th>
            <td mat-cell *matCellDef="let row">
              <code>{{ row.orderNumber }}</code>
            </td>
          </ng-container>
          <ng-container matColumnDef="createdAt">
            <th mat-header-cell *matHeaderCellDef>{{ 'admin.orders.date' | translate }}</th>
            <td mat-cell *matCellDef="let row">{{ row.createdAt | date:'short' }}</td>
          </ng-container>
          <ng-container matColumnDef="customer">
            <th mat-header-cell *matHeaderCellDef>{{ 'admin.orders.customer' | translate }}</th>
            <td mat-cell *matCellDef="let row">
              <div>{{ row.shippingFirstName }} {{ row.shippingLastName }}</div>
              @if (row.user?.email) {
                <div class="muted">{{ row.user.email }}</div>
              }
            </td>
          </ng-container>
          <ng-container matColumnDef="city">
            <th mat-header-cell *matHeaderCellDef>{{ 'admin.orders.city' | translate }}</th>
            <td mat-cell *matCellDef="let row">{{ row.shippingCity }}</td>
          </ng-container>
          <ng-container matColumnDef="items">
            <th mat-header-cell *matHeaderCellDef>{{ 'admin.orders.itemsCount' | translate }}</th>
            <td mat-cell *matCellDef="let row">{{ itemSummary(row) }}</td>
          </ng-container>
          <ng-container matColumnDef="total">
            <th mat-header-cell *matHeaderCellDef>{{ 'admin.orders.total' | translate }}</th>
            <td mat-cell *matCellDef="let row" class="price">{{ +row.totalAmount | price }}</td>
          </ng-container>
          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>{{ 'admin.orders.status' | translate }}</th>
            <td mat-cell *matCellDef="let row">
              <span class="status-chip" [class]="'status-' + row.status.toLowerCase()">
                {{ row.status }}
              </span>
            </td>
          </ng-container>
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let row">
              <button mat-icon-button (click)="openDetail(row)"
                      [matTooltip]="'common.view' | translate" type="button">
                <mat-icon>visibility</mat-icon>
              </button>
            </td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="columns"></tr>
          <tr mat-row *matRowDef="let row; columns: columns;"></tr>
        </table>
      </div>

      @if (nextCursor()) {
        <div class="load-more">
          <button mat-stroked-button (click)="loadMore()" [disabled]="loading()">
            @if (loading()) {
              <mat-spinner diameter="20"></mat-spinner>
            } @else {
              {{ 'common.loadMore' | translate }}
            }
          </button>
        </div>
      }
    }
  `,
  styleUrls: ['../shared/admin-page.scss'],
  styles: [
    `
      .status-filter { width: 200px; }
      .load-more { text-align: center; padding: 24px; }
      code { font-family: monospace; font-size: 13px; }
    `,
  ],
})
export class AdminOrdersComponent {
  private readonly service = inject(AdminOrdersService);
  private readonly dialog = inject(MatDialog);

  readonly orders = signal<AdminOrderListItem[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly nextCursor = signal<string | null>(null);

  statusFilter: OrderStatus | null = null;

  readonly statuses = STATUSES;
  readonly columns = ['orderNumber', 'createdAt', 'customer', 'city', 'items', 'total', 'status', 'actions'];

  constructor() {
    void this.reload(true);
  }

  async reload(reset = false): Promise<void> {
    if (reset) {
      this.orders.set([]);
      this.nextCursor.set(null);
    }
    this.loading.set(true);
    this.error.set(null);
    try {
      const result = await this.service.list({
        status: this.statusFilter ?? undefined,
        cursor: reset ? undefined : (this.nextCursor() ?? undefined),
      });
      this.orders.update((curr) => (reset ? result.data : [...curr, ...result.data]));
      this.nextCursor.set(result.nextCursor);
    } catch (err) {
      this.error.set((err as Error).message ?? 'Failed to load orders');
    } finally {
      this.loading.set(false);
    }
  }

  onFilterChange(): void {
    void this.reload(true);
  }

  loadMore(): void {
    void this.reload(false);
  }

  itemSummary(row: AdminOrderListItem): string {
    const total = row.items.reduce((n, i) => n + i.quantity, 0);
    return `${row.items.length} (${total})`;
  }

  openDetail(row: AdminOrderListItem): void {
    const ref = this.dialog.open<
      AdminOrderDetailDialogComponent,
      { orderId: string },
      { changed?: boolean } | undefined
    >(AdminOrderDetailDialogComponent, {
      data: { orderId: row.id },
      width: '880px',
      maxWidth: '95vw',
      autoFocus: false,
    });
    ref.afterClosed().subscribe((result) => {
      if (result?.changed) void this.reload(true);
    });
  }
}