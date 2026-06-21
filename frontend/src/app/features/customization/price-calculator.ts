// frontend/src/app/features/customization/price-calculator.ts
/**
 * Pure price calculator.
 *
 * MIRRORS the backend formula in cart.service.ts. Any change here must also
 * change there — or the customer sees a price that doesn't match what the
 * server records on add-to-cart. The server wins silently, so a drift would
 * surface only as user confusion.
 *
 *   unitPrice = round(basePrice * priceMultiplier
 *                     + (frame?.additionalPrice ?? 0)
 *                     + (withMatte ? MATTE_FLAT_AMD : 0))
 *
 * Rounding to whole AMD because Armenia has no sub-unit currency.
 */
import type { FrameOption, PrintSize } from '../../core/api-models/print-options.model';

export const MATTE_FLAT_AMD = 3000;

export interface PriceInputs {
  artworkBasePrice: number;
  printSize: PrintSize | null;
  frameOption: FrameOption | null;
  withMatte: boolean;
}

export interface PriceBreakdown {
  unitPrice: number;          // total per unit
  baseLine: number;           // artwork × multiplier
  frameLine: number;          // frame.additionalPrice or 0
  matteLine: number;          // MATTE_FLAT_AMD or 0
}

export function calculatePrice(input: PriceInputs): PriceBreakdown {
  const multiplier = input.printSize?.priceMultiplier ?? 1;
  const baseLine = input.artworkBasePrice * multiplier;
  const frameLine = input.frameOption?.additionalPrice ?? 0;
  const matteLine = input.withMatte ? MATTE_FLAT_AMD : 0;
  const unitPrice = Math.round(baseLine + frameLine + matteLine);
  return { unitPrice, baseLine: Math.round(baseLine), frameLine, matteLine };
}
