// backend/src/modules/cart/cart.schemas.ts
import { z } from 'zod';

const cartItemInputSchema = z.object({
  artworkId: z.string().min(1),
  printSizeId: z.string().min(1),
  frameOptionId: z.string().min(1).nullable().optional(),
  withMatte: z.boolean().default(false),
  quantity: z.number().int().min(1).max(20).default(1),
});

export const addToCartSchema = cartItemInputSchema;
export const updateCartItemSchema = z.object({
  quantity: z.number().int().min(1).max(20),
});
export const cartItemParamsSchema = z.object({ id: z.string().min(1) });

/**
 * Merge strategy: server cart wins on duplicates (matched by
 * artworkId + printSizeId + frameOptionId + withMatte). Quantities are summed,
 * capped at 20. Anything in guest cart that doesn't exist server-side is
 * added. Nothing in server cart gets removed.
 */
export const syncCartSchema = z.object({
  items: z.array(cartItemInputSchema).max(50),
});
