// frontend/src/app/features/checkout/order.service.ts
/**
 * Reads a single order owned by the current user. Used by the confirmation
 * and failed pages.
 */
import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../core/http/api.service';
import type { OrderDetail } from './order.model';

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly api = inject(ApiService);

  getById(id: string): Promise<OrderDetail> {
    return this.api.get<OrderDetail>(`/orders/${encodeURIComponent(id)}`);
  }
}
