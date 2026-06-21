// frontend/src/app/features/admin/orders/admin-orders.service.ts
/**
 * Admin Orders HTTP service.
 *
 * Endpoints:
 *   GET   /api/orders/admin?status=&from=&to=&cursor=&limit=
 *   GET   /api/orders/admin/:id
 *   PATCH /api/orders/admin/:id/status   body: { status }
 *
 * Status state machine (server-enforced, see orders.service updateStatus):
 *   PAID       → FULFILLED | REFUNDED
 *   FULFILLED  → REFUNDED
 *   PENDING    → CANCELLED  (rare; most cancels happen via failed payment)
 */
import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../../core/http/api.service';

export type OrderStatus =
  | 'PENDING'
  | 'PAID'
  | 'FAILED'
  | 'FULFILLED'
  | 'CANCELLED'
  | 'REFUNDED';

export type OrderUpdatableStatus = 'FULFILLED' | 'CANCELLED' | 'REFUNDED';

export interface AdminOrderListItem {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  totalAmount: number | string;
  currency: string;
  shippingFirstName: string;
  shippingLastName: string;
  shippingCity: string;
  paymentProvider: string | null;
  paidAt: string | null;
  createdAt: string;
  items: { id: string; artworkTitle: string; quantity: number }[];
  user: { id: string; email: string } | null;
}

export interface AdminOrderDetail extends AdminOrderListItem {
  shippingPhone: string;
  shippingAddress: string;
  shippingNotes: string | null;
  items: {
    id: string;
    artworkId: string | null;
    artworkTitle: string;
    artistName: string;
    printSizeLabel: string;
    frameLabel: string | null;
    withMatte: boolean;
    unitPrice: number | string;
    quantity: number;
    lineTotal: number | string;
    thumbnailPath: string | null;
  }[];
  payments: {
    id: string;
    provider: string;
    status: string;
    amount: number | string;
    providerPaymentId: string | null;
    providerOrderId: string | null;
    errorCode: string | null;
    errorMessage: string | null;
    createdAt: string;
  }[];
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
  } | null;
}

export interface AdminOrderListQuery {
  status?: OrderStatus;
  from?: string; // ISO date
  to?: string;
  cursor?: string;
  limit?: number;
}

@Injectable({ providedIn: 'root' })
export class AdminOrdersService {
  private readonly api = inject(ApiService);

  list(
    query: AdminOrderListQuery,
  ): Promise<{ data: AdminOrderListItem[]; nextCursor: string | null }> {
    return this.api.getPaginated<AdminOrderListItem>('/orders/admin', {
      status: query.status,
      from: query.from,
      to: query.to,
      cursor: query.cursor,
      limit: query.limit,
    });
  }

  detail(id: string): Promise<AdminOrderDetail> {
    return this.api.get<AdminOrderDetail>(`/orders/admin/${encodeURIComponent(id)}`);
  }

  updateStatus(id: string, status: OrderUpdatableStatus): Promise<AdminOrderDetail> {
    return this.api.patch<{ status: OrderUpdatableStatus }, AdminOrderDetail>(
      `/orders/admin/${encodeURIComponent(id)}/status`,
      { status },
    );
  }
}