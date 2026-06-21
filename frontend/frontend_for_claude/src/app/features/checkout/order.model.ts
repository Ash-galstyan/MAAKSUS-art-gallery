// frontend/src/app/features/checkout/order.model.ts
/** Subset of the backend OrderResponse we care about in confirmation/failed views. */
export type OrderStatus =
  | 'PENDING'
  | 'PAID'
  | 'FAILED'
  | 'FULFILLED'
  | 'CANCELLED'
  | 'REFUNDED';

export interface OrderLine {
  id: string;
  artworkTitle: string;
  artistName: string;
  printSizeLabel: string;
  frameLabel: string | null;
  withMatte: boolean;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  thumbnailPath: string | null;
}

export interface OrderDetail {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  totalAmount: number;
  currency: string;
  shippingFirstName: string;
  shippingLastName: string;
  shippingPhone: string;
  shippingCity: string;
  shippingAddress: string;
  shippingNotes: string | null;
  paidAt: string | null;
  createdAt: string;
  items: OrderLine[];
}
