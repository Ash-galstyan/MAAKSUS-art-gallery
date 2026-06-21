// backend/src/modules/payments/payments.controller.ts
/**
 * Ameriabank redirects the user's BROWSER back here after the hosted payment
 * page. The querystring typically includes `orderID` (our orderNumber) and
 * a status hint — but we NEVER trust the hint. We re-verify server-to-server
 * via the provider adapter.
 *
 * After verification, we 302 the user to a frontend route that shows the
 * confirmation (success or failure).
 */
import type { Request, Response } from 'express';
import { z } from 'zod';
import { env } from '../../config/env';
import { HttpError } from '../../lib/http-error';
import { logger } from '../../lib/logger';
import * as orderService from '../orders/orders.service';

const returnQuerySchema = z.object({
  orderID: z.string().min(1),
});

export async function ameriabankReturn(req: Request, res: Response): Promise<void> {
  const parsed = returnQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.redirect(`${env.WEB_PUBLIC_URL}/order/failed`);
    return;
  }

  try {
    const { orderId, status } = await orderService.handlePaymentReturn(parsed.data.orderID);
    const path = status === 'PAID' ? `/order/${orderId}/confirmation` : `/order/${orderId}/failed`;
    res.redirect(`${env.WEB_PUBLIC_URL}${path}`);
  } catch (err) {
    logger.error({ err, query: req.query }, 'Payment return handler failed');
    res.redirect(`${env.WEB_PUBLIC_URL}/order/failed`);
  }
}
