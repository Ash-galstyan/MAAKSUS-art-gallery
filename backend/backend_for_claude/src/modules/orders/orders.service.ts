// backend/src/modules/orders/orders.service.ts
/**
 * Order lifecycle:
 *   1. checkout()         creates Order(PENDING) + OrderItem snapshots from cart
 *                         creates Payment(INITIATED), asks provider for redirect URL,
 *                         returns it to the controller. Cart is NOT cleared yet —
 *                         only on successful payment, so a failed redirect doesn't
 *                         lose the user's selections.
 *
 *   2. handlePaymentReturn()   called from the payment return handler. Verifies
 *                              with the provider, updates Payment + Order.status,
 *                              clears the cart on success, sends confirmation email.
 *
 * Everything an OrderItem needs to render forever is snapshotted at checkout time
 * (title, artist name, labels, thumbnail path). The artwork can be soft-deleted
 * later and the order page still works.
 */
import { prisma } from '../../lib/prisma';
import { HttpError } from '../../lib/http-error';
import { pickTranslation } from '../../lib/i18n-select';
import { logger } from '../../lib/logger';
import { sendMail } from '../../lib/mailer';
import { env } from '../../config/env';
import { DEFAULT_LOCALE, type LocaleCode } from '../../config/constants';
import { getPaymentProvider } from '../../payments';
import { nextOrderNumber } from './order-number';
import type { Prisma } from '@prisma/client';
import type { z } from 'zod';
import type { checkoutSchema, listOrdersAdminQuerySchema } from './orders.schemas';

export interface CheckoutOutcome {
  orderId: string;
  orderNumber: string;
  redirectUrl: string;
}

export async function checkout(
  userId: string,
  shipping: z.infer<typeof checkoutSchema>,
  locale: LocaleCode,
): Promise<CheckoutOutcome> {
  // Re-fetch cart inside this flow — never trust totals from the client.
  const cartItems = await prisma.cartItem.findMany({
    where: { userId },
    include: {
      artwork: {
        include: {
          translations: true,
          images: { where: { isPrimary: true }, take: 1 },
          artist: { include: { translations: true } },
        },
      },
      printSize: { include: { translations: true } },
      frameOption: { include: { translations: true } },
    },
  });

  if (cartItems.length === 0) {
    throw HttpError.badRequest('Cart is empty', 'CART_EMPTY');
  }

  // Re-check availability — admin may have deactivated something while cart sat.
  for (const i of cartItems) {
    if (i.artwork.deletedAt || !i.artwork.isAvailable) {
      throw HttpError.badRequest(`Artwork unavailable: ${i.artworkId}`, 'ARTWORK_UNAVAILABLE');
    }
    if (!i.printSize.isActive) {
      throw HttpError.badRequest('Print size unavailable', 'PRINT_SIZE_UNAVAILABLE');
    }
    if (i.frameOption && !i.frameOption.isActive) {
      throw HttpError.badRequest('Frame option unavailable', 'FRAME_OPTION_UNAVAILABLE');
    }
  }

  const totalAmount = cartItems.reduce(
    (sum, i) => sum + Math.round(Number(i.unitPrice) * i.quantity),
    0,
  );

  const orderNumber = await nextOrderNumber();

  // Build everything in one transaction — order + items + payment row.
  const { order, payment } = await prisma.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        orderNumber,
        userId,
        status: 'PENDING',
        totalAmount,
        currency: 'AMD',
        shippingFirstName: shipping.shippingFirstName,
        shippingLastName: shipping.shippingLastName,
        shippingPhone: shipping.shippingPhone,
        shippingCity: shipping.shippingCity,
        shippingAddress: shipping.shippingAddress,
        shippingNotes: shipping.shippingNotes ?? null,
        paymentProvider: 'AMERIABANK',
        items: {
          create: cartItems.map((i) => {
            const artworkT = pickTranslation(i.artwork.translations, locale);
            const artistT = pickTranslation(i.artwork.artist.translations, locale);
            const sizeT = pickTranslation(i.printSize.translations, locale);
            const frameT = i.frameOption ? pickTranslation(i.frameOption.translations, locale) : null;
            const unitPrice = Number(i.unitPrice);
            return {
              artworkId: i.artworkId,
              printSizeId: i.printSizeId,
              frameOptionId: i.frameOptionId,
              artworkTitle: artworkT?.title ?? i.artwork.slug,
              artistName: artistT?.name ?? i.artwork.artist.slug,
              printSizeLabel: sizeT?.label ?? i.printSize.code,
              frameLabel: frameT?.label ?? null,
              withMatte: i.withMatte,
              unitPrice,
              quantity: i.quantity,
              lineTotal: Math.round(unitPrice * i.quantity),
              thumbnailPath: i.artwork.images[0]?.thumbnailPath ?? null,
            };
          }),
        },
      },
    });

    const payment = await tx.payment.create({
      data: {
        orderId: order.id,
        provider: 'AMERIABANK',
        status: 'INITIATED',
        amount: totalAmount,
        currency: 'AMD',
      },
    });

    return { order, payment };
  });

  // Ask the provider for a redirect URL. Done OUTSIDE the transaction — never
  // hold a DB transaction open across an external HTTP call.
  const provider = getPaymentProvider();
  let session;
  try {
    session = await provider.createSession({
      orderNumber,
      amount: totalAmount,
      currency: 'AMD',
      description: `Order ${orderNumber}`,
      returnUrl: env.AMERIABANK_RETURN_URL,
      customerEmail: (await prisma.user.findUnique({ where: { id: userId }, select: { email: true } }))?.email,
    });
  } catch (err) {
    // Mark the payment row as failed so admins can see what happened.
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'FAILED',
        errorMessage: err instanceof Error ? err.message : String(err),
      },
    });
    await prisma.order.update({ where: { id: order.id }, data: { status: 'FAILED' } });
    logger.error({ err, orderId: order.id }, 'Failed to create payment session');
    throw HttpError.badRequest('Payment provider unavailable', 'PAYMENT_INIT_FAILED');
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      providerPaymentId: session.providerPaymentId,
      providerOrderId: orderNumber,
      rawInitResponse: session.raw as Prisma.InputJsonValue,
    },
  });

  return { orderId: order.id, orderNumber, redirectUrl: session.redirectUrl };
}

/**
 * Called from the return-URL handler (payments module). Verifies with the
 * provider and applies the result. Idempotent — if called twice, the second
 * call sees the order already finalised and returns early.
 */
export async function handlePaymentReturn(orderNumber: string): Promise<{ orderId: string; status: string }> {
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: { payments: { orderBy: { createdAt: 'desc' }, take: 1 }, user: true },
  });
  if (!order) throw HttpError.notFound('Order not found', 'ORDER_NOT_FOUND');
  if (order.status !== 'PENDING') {
    // Already processed — return current status (idempotent).
    return { orderId: order.id, status: order.status };
  }

  const payment = order.payments[0];
  if (!payment?.providerPaymentId) {
    throw HttpError.badRequest('No payment session for this order', 'NO_PAYMENT_SESSION');
  }

  const provider = getPaymentProvider();
  const result = await provider.verify({
    providerPaymentId: payment.providerPaymentId,
    orderNumber,
  });

  const newOrderStatus =
    result.outcome === 'SUCCEEDED' ? 'PAID'
    : result.outcome === 'CANCELLED' ? 'CANCELLED'
    : 'FAILED';

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: result.outcome,
        rawVerifyResponse: result.raw as Prisma.InputJsonValue,
        errorCode: result.errorCode ?? null,
        errorMessage: result.errorMessage ?? null,
      },
    });
    await tx.order.update({
      where: { id: order.id },
      data: {
        status: newOrderStatus,
        paidAt: result.outcome === 'SUCCEEDED' ? new Date() : null,
      },
    });
    if (result.outcome === 'SUCCEEDED') {
      await tx.cartItem.deleteMany({ where: { userId: order.userId! } });
    }
  });

  if (result.outcome === 'SUCCEEDED' && order.user) {
    await sendMail({
      to: order.user.email,
      subject: `Order ${orderNumber} confirmed`,
      text: `Thank you for your order ${orderNumber}. We'll be in touch about shipping.`,
    });
  }

  return { orderId: order.id, status: newOrderStatus };
}

// ───── Reads ───────────────────────────────────────────────────────────────

export async function listForUser(userId: string) {
  return prisma.order.findMany({
    where: { userId },
    include: { items: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getForUser(userId: string, orderId: string) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
    include: { items: true },
  });
  if (!order) throw HttpError.notFound('Order not found', 'ORDER_NOT_FOUND');
  return order;
}

export async function listForAdmin(query: z.infer<typeof listOrdersAdminQuerySchema>) {
  const where: Prisma.OrderWhereInput = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.from || query.to
      ? { createdAt: { ...(query.from ? { gte: query.from } : {}), ...(query.to ? { lte: query.to } : {}) } }
      : {}),
  };

  const rows = await prisma.order.findMany({
    where,
    include: {
      items: { select: { id: true, artworkTitle: true, quantity: true } },
      user: { select: { id: true, email: true } },
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: query.limit + 1,
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
  });

  const hasMore = rows.length > query.limit;
  const page = hasMore ? rows.slice(0, query.limit) : rows;
  return { data: page, nextCursor: hasMore ? page[page.length - 1]!.id : null };
}

export async function getForAdmin(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
      user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
      payments: { orderBy: { createdAt: 'desc' } },
    },
  });
  if (!order) throw HttpError.notFound('Order not found', 'ORDER_NOT_FOUND');
  return order;
}

export async function updateStatus(orderId: string, status: 'FULFILLED' | 'CANCELLED' | 'REFUNDED') {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw HttpError.notFound('Order not found', 'ORDER_NOT_FOUND');

  // Simple state-machine guard: can only fulfil PAID; can refund PAID/FULFILLED;
  // can cancel PENDING (rare — most cancels happen via failed payment).
  const allowed: Record<typeof status, string[]> = {
    FULFILLED: ['PAID'],
    REFUNDED: ['PAID', 'FULFILLED'],
    CANCELLED: ['PENDING', 'PAID'],
  };
  if (!allowed[status].includes(order.status)) {
    throw HttpError.badRequest(
      `Cannot transition from ${order.status} to ${status}`,
      'INVALID_STATE_TRANSITION',
    );
  }

  return prisma.order.update({ where: { id: orderId }, data: { status } });
}
