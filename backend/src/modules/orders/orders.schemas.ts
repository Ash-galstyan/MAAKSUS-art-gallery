// backend/src/modules/orders/orders.schemas.ts
import { z } from 'zod';

export const checkoutSchema = z.object({
  shippingFirstName: z.string().min(1).max(80),
  shippingLastName: z.string().min(1).max(80),
  shippingPhone: z.string().min(5).max(40),
  shippingCity: z.string().min(1).max(120),
  shippingAddress: z.string().min(1).max(400),
  shippingNotes: z.string().max(1000).optional(),
});

export const listOrdersAdminQuerySchema = z.object({
  status: z
    .enum(['PENDING', 'PAID', 'FAILED', 'FULFILLED', 'CANCELLED', 'REFUNDED'])
    .optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(60).default(24),
});

export const orderParamsSchema = z.object({ id: z.string().min(1) });

export const updateOrderStatusSchema = z.object({
  status: z.enum(['FULFILLED', 'CANCELLED', 'REFUNDED']),
});
