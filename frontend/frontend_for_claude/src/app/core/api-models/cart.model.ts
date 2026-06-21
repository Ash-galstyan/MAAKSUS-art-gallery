// frontend/src/app/core/api-models/cart.model.ts
/** Item shape returned by GET /api/cart. */
export interface CartLine {
  id: string;
  artwork: {
    id: string;
    slug: string;
    title: string;
    artistName: string;
    thumbnailPath: string | null;
  };
  printSize: { id: string; label: string };
  frameOption: { id: string; label: string; colorHex: string } | null;
  withMatte: boolean;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface CartPayload {
  items: CartLine[];
  subtotal: number;
  currency: 'AMD';
}

/** Compact form persisted to localStorage and sent to POST /api/cart/sync. */
export interface CartItemInput {
  artworkId: string;
  printSizeId: string;
  frameOptionId: string | null;
  withMatte: boolean;
  quantity: number;
}
