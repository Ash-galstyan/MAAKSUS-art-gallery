// frontend/src/app/features/checkout/checkout.service.ts
/**
 * Calls POST /api/orders/checkout with the shipping address. On success the
 * server returns { orderId, orderNumber, redirectUrl }; the caller navigates
 * to redirectUrl (the bank's hosted page). Stub-free — this is the only thing
 * that has to actually work for the payment flow to function end-to-end.
 */
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface CheckoutInput {
  shippingFirstName: string;
  shippingLastName: string;
  shippingPhone: string;
  shippingCity: string;
  shippingAddress: string;
  shippingNotes?: string;
}

export interface CheckoutOutcome {
  orderId: string;
  orderNumber: string;
  redirectUrl: string;
}

@Injectable({ providedIn: 'root' })
export class CheckoutService {
  private readonly http = inject(HttpClient);

  checkout(input: CheckoutInput): Promise<CheckoutOutcome> {
    return firstValueFrom(
      this.http.post<CheckoutOutcome>(`${environment.apiBaseUrl}/orders/checkout`, input),
    );
  }
}
