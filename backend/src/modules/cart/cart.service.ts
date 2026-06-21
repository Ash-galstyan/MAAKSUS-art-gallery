// backend/src/modules/cart/cart.service.ts
/**
 * Cart pricing logic mirrors the frontend's price-calculator (Phase 8) so the
 * unitPrice snapshot is authoritative. If the frontend ever drifts, the DB
 * reflects what the user actually owes — never trust the client price.
 *
 *   unitPrice = artwork.basePrice * printSize.priceMultiplier
 *             + (frameOption?.additionalPrice ?? 0)
 *             + (withMatte ? MATTE_FLAT_AMD : 0)
 *
 * MATTE_FLAT_AMD is a constant for v1; promote to PrintOption / FrameOption
 * later if you need per-option matte pricing.
 */
import { prisma } from '../../lib/prisma';
import { HttpError } from '../../lib/http-error';
import { pickTranslation } from '../../lib/i18n-select';
import type { LocaleCode } from '../../config/constants';
import type { z } from 'zod';
import type { addToCartSchema, syncCartSchema } from './cart.schemas';

const MATTE_FLAT_AMD = 3000;

interface PricingPieces {
  artwork: { basePrice: number; isAvailable: boolean; deletedAt: Date | null };
  printSize: { priceMultiplier: number; isActive: boolean };
  frameOption: { additionalPrice: number; isActive: boolean } | null;
}

function calculateUnitPrice(p: PricingPieces, withMatte: boolean): number {
  const base = p.artwork.basePrice * p.printSize.priceMultiplier;
  const frame = p.frameOption?.additionalPrice ?? 0;
  const matte = withMatte ? MATTE_FLAT_AMD : 0;
  // Round to whole AMD — Armenia has no sub-unit currency
  return Math.round(base + frame + matte);
}

async function resolvePricing(input: {
  artworkId: string;
  printSizeId: string;
  frameOptionId?: string | null;
}): Promise<PricingPieces> {
  const [artwork, printSize, frameOption] = await Promise.all([
    prisma.artwork.findUnique({
      where: { id: input.artworkId },
      select: { basePrice: true, isAvailable: true, deletedAt: true },
    }),
    prisma.printSize.findUnique({
      where: { id: input.printSizeId },
      select: { priceMultiplier: true, isActive: true },
    }),
    input.frameOptionId
      ? prisma.frameOption.findUnique({
          where: { id: input.frameOptionId },
          select: { additionalPrice: true, isActive: true },
        })
      : Promise.resolve(null),
  ]);

  if (!artwork || artwork.deletedAt || !artwork.isAvailable) {
    throw HttpError.badRequest('Artwork unavailable', 'ARTWORK_UNAVAILABLE');
  }
  if (!printSize || !printSize.isActive) {
    throw HttpError.badRequest('Print size unavailable', 'PRINT_SIZE_UNAVAILABLE');
  }
  if (input.frameOptionId && (!frameOption || !frameOption.isActive)) {
    throw HttpError.badRequest('Frame option unavailable', 'FRAME_OPTION_UNAVAILABLE');
  }

  return {
    artwork: { ...artwork, basePrice: Number(artwork.basePrice) },
    printSize: { ...printSize, priceMultiplier: Number(printSize.priceMultiplier) },
    frameOption: frameOption
      ? { ...frameOption, additionalPrice: Number(frameOption.additionalPrice) }
      : null,
  };
}

export async function getCart(userId: string, locale: LocaleCode) {
  const items = await prisma.cartItem.findMany({
    where: { userId },
    include: {
      artwork: {
        include: {
          translations: { where: { locale: { in: [locale, 'EN'] } } },
          images: { where: { isPrimary: true }, take: 1 },
          artist: { include: { translations: { where: { locale: { in: [locale, 'EN'] } } } } },
        },
      },
      printSize: { include: { translations: { where: { locale: { in: [locale, 'EN'] } } } } },
      frameOption: { include: { translations: { where: { locale: { in: [locale, 'EN'] } } } } },
    },
    orderBy: { createdAt: 'asc' },
  });

  const mapped = items.map((i) => {
    const artworkT = pickTranslation(i.artwork.translations, locale);
    const artistT = pickTranslation(i.artwork.artist.translations, locale);
    const printSizeT = pickTranslation(i.printSize.translations, locale);
    const frameT = i.frameOption ? pickTranslation(i.frameOption.translations, locale) : null;
    return {
      id: i.id,
      artwork: {
        id: i.artwork.id,
        slug: i.artwork.slug,
        title: artworkT?.title ?? i.artwork.slug,
        artistName: artistT?.name ?? i.artwork.artist.slug,
        thumbnailPath: i.artwork.images[0]?.thumbnailPath ?? null,
      },
      printSize: {
        id: i.printSize.id,
        label: printSizeT?.label ?? i.printSize.code,
      },
      frameOption: i.frameOption
        ? { id: i.frameOption.id, label: frameT?.label ?? i.frameOption.code, colorHex: i.frameOption.colorHex }
        : null,
      withMatte: i.withMatte,
      quantity: i.quantity,
      unitPrice: Number(i.unitPrice),
      lineTotal: Math.round(Number(i.unitPrice) * i.quantity),
    };
  });

  return {
    items: mapped,
    subtotal: mapped.reduce((sum, i) => sum + i.lineTotal, 0),
    currency: 'AMD',
  };
}

export async function addItem(userId: string, input: z.infer<typeof addToCartSchema>) {
  const pricing = await resolvePricing(input);
  const unitPrice = calculateUnitPrice(pricing, input.withMatte);

  // Dedupe: same artwork+size+frame+matte → bump quantity instead of new row.
  const existing = await prisma.cartItem.findFirst({
    where: {
      userId,
      artworkId: input.artworkId,
      printSizeId: input.printSizeId,
      frameOptionId: input.frameOptionId ?? null,
      withMatte: input.withMatte,
    },
  });

  if (existing) {
    return prisma.cartItem.update({
      where: { id: existing.id },
      data: { quantity: Math.min(20, existing.quantity + input.quantity) },
    });
  }

  return prisma.cartItem.create({
    data: {
      userId,
      artworkId: input.artworkId,
      printSizeId: input.printSizeId,
      frameOptionId: input.frameOptionId ?? null,
      withMatte: input.withMatte,
      quantity: input.quantity,
      unitPrice,
    },
  });
}

export async function updateItemQuantity(userId: string, itemId: string, quantity: number) {
  const item = await prisma.cartItem.findFirst({ where: { id: itemId, userId } });
  if (!item) throw HttpError.notFound('Cart item not found', 'CART_ITEM_NOT_FOUND');
  return prisma.cartItem.update({ where: { id: itemId }, data: { quantity } });
}

export async function removeItem(userId: string, itemId: string) {
  const item = await prisma.cartItem.findFirst({ where: { id: itemId, userId } });
  if (!item) throw HttpError.notFound('Cart item not found', 'CART_ITEM_NOT_FOUND');
  await prisma.cartItem.delete({ where: { id: itemId } });
}

export async function clearCart(userId: string) {
  await prisma.cartItem.deleteMany({ where: { userId } });
}

/**
 * Called once after login. Merges the guest's localStorage cart into the
 * server cart. See merge strategy in cart.schemas.ts.
 *
 * Each input row is validated/priced independently. If one row is unavailable
 * (e.g. artwork deleted while user was browsing), we skip it silently rather
 * than fail the entire sync.
 */
export async function syncFromGuest(userId: string, input: z.infer<typeof syncCartSchema>) {
  for (const row of input.items) {
    try {
      await addItem(userId, row);
    } catch {
      // Skip invalid items — the user can re-add manually if they care.
    }
  }
}
