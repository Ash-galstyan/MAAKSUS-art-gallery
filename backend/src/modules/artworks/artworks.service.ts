// backend/src/modules/artworks/artworks.service.ts
/**
 * List with chip-filter + search + cursor pagination.
 *
 * Search strategy: case-insensitive partial match on the ArtworkTranslation
 * row for the active locale. For full-fledged search later, swap to Postgres
 * `tsvector` columns with a GIN index — out of scope for v1.
 *
 * Cursor pagination: we sort by (createdAt DESC, id DESC) and use the last
 * artwork's id as the cursor. Skips the id of the cursor item so no duplicates.
 */
import { prisma } from '../../lib/prisma';
import { HttpError } from '../../lib/http-error';
import { pickTranslation } from '../../lib/i18n-select';
import { processArtworkImage, deleteArtworkImage } from '../../lib/image-processor';
import type { LocaleCode } from '../../config/constants';
import type { Prisma } from '@prisma/client';
import type { z } from 'zod';
import type {
  createArtworkSchema,
  updateArtworkSchema,
  listArtworksQuerySchema,
} from './artworks.schemas';

type ListQuery = z.infer<typeof listArtworksQuerySchema>;

/** Which "physical dimensions" bucket a piece falls in. Null dims → unknown. */
export function deriveOrientation(
  widthCm: number | null | undefined,
  heightCm: number | null | undefined,
): string | null {
  if (widthCm == null || heightCm == null) return null;
  if (widthCm > heightCm) return 'landscape';
  if (heightCm > widthCm) return 'portrait';
  return 'square';
}

/** How recent an artwork must be to count as a "new arrival". */
const NEW_ARRIVAL_DAYS = 90;

const SORT_ORDER_BY: Record<ListQuery['sort'], Prisma.ArtworkOrderByWithRelationInput[]> = {
  newest: [{ createdAt: 'desc' }, { id: 'desc' }],
  'price-asc': [{ basePrice: 'asc' }, { id: 'asc' }],
  'price-desc': [{ basePrice: 'desc' }, { id: 'desc' }],
};

/** Shared `where` for the public catalogue: live, purchasable, plus the
 *  request's category + facet selection. */
function buildListWhere(query: ListQuery, locale: LocaleCode): Prisma.ArtworkWhereInput {
  return {
    deletedAt: null,
    isAvailable: true,
    ...(query.categoryIds?.length ? { categoryId: { in: query.categoryIds } } : {}),
    ...(query.artistIds?.length ? { artistId: { in: query.artistIds } } : {}),
    ...(query.orientation?.length ? { orientation: { in: query.orientation } } : {}),
    ...(query.new
      ? { createdAt: { gte: new Date(Date.now() - NEW_ARRIVAL_DAYS * 86_400_000) } }
      : {}),
    ...(query.priceMin != null || query.priceMax != null
      ? {
          basePrice: {
            ...(query.priceMin != null ? { gte: query.priceMin } : {}),
            ...(query.priceMax != null ? { lte: query.priceMax } : {}),
          },
        }
      : {}),
    ...(query.search
      ? {
          translations: {
            some: {
              locale,
              title: { contains: query.search, mode: 'insensitive' },
            },
          },
        }
      : {}),
  };
}

export async function listForLocale(query: ListQuery, locale: LocaleCode) {
  const where = buildListWhere(query, locale);

  // Cursor: skip the cursor item itself by reading id from it.
  const cursorClause: Pick<Prisma.ArtworkFindManyArgs, 'cursor' | 'skip'> = query.cursor
    ? { cursor: { id: query.cursor }, skip: 1 }
    : {};

  const rows = await prisma.artwork.findMany({
    where,
    include: {
      images: { where: { isPrimary: true }, take: 1 },
      translations: { where: { locale: { in: [locale, 'EN'] } } },
      artist: { include: { translations: { where: { locale: { in: [locale, 'EN'] } } } } },
      category: { include: { translations: { where: { locale: { in: [locale, 'EN'] } } } } },
    },
    orderBy: SORT_ORDER_BY[query.sort],
    take: query.limit + 1, // ask for one extra to know if there's more
    ...cursorClause,
  });

  const hasMore = rows.length > query.limit;
  const page = hasMore ? rows.slice(0, query.limit) : rows;
  const nextCursor = hasMore ? page[page.length - 1]!.id : null;

  return {
    data: page.map((a) => {
      const t = pickTranslation(a.translations, locale);
      const artistT = pickTranslation(a.artist.translations, locale);
      const categoryT = pickTranslation(a.category.translations, locale);
      const primary = a.images[0];
      return {
        id: a.id,
        slug: a.slug,
        title: t?.title ?? a.slug,
        artist: { id: a.artist.id, name: artistT?.name ?? a.artist.slug },
        category: { id: a.category.id, slug: a.category.slug, name: categoryT?.name ?? a.category.slug },
        basePrice: Number(a.basePrice),
        thumbnailPath: primary?.thumbnailPath ?? null,
        mediumPath: primary?.mediumPath ?? null,
        width: primary?.width ?? null,
        height: primary?.height ?? null,
      };
    }),
    nextCursor,
  };
}

/**
 * Facet options for the gallery filter panel — the artists that have live
 * work (with counts), the min/max `basePrice`, and which orientation buckets
 * are populated. Scoped to the public catalogue (live + available), not to the
 * caller's current filter selection.
 */
export async function getFacetsForLocale(locale: LocaleCode) {
  const baseWhere = { deletedAt: null, isAvailable: true } as const;

  const [artists, priceAgg, orientationGroups] = await Promise.all([
    prisma.artist.findMany({
      where: { artworks: { some: baseWhere } },
      include: {
        translations: { where: { locale: { in: [locale, 'EN'] } } },
        _count: { select: { artworks: { where: baseWhere } } },
      },
    }),
    prisma.artwork.aggregate({
      where: baseWhere,
      _min: { basePrice: true },
      _max: { basePrice: true },
    }),
    prisma.artwork.groupBy({
      by: ['orientation'],
      where: { ...baseWhere, orientation: { not: null } },
      _count: true,
    }),
  ]);

  return {
    artists: artists
      .map((a) => ({
        id: a.id,
        slug: a.slug,
        name: pickTranslation(a.translations, locale)?.name ?? a.slug,
        count: a._count.artworks,
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    priceRange: {
      min: priceAgg._min.basePrice ? Number(priceAgg._min.basePrice) : 0,
      max: priceAgg._max.basePrice ? Number(priceAgg._max.basePrice) : 0,
    },
    orientations: orientationGroups
      .map((g) => ({ key: g.orientation as string, count: g._count }))
      .sort((a, b) => a.key.localeCompare(b.key)),
  };
}

export async function getByIdForLocale(id: string, locale: LocaleCode) {
  const a = await prisma.artwork.findFirst({
    where: { id, deletedAt: null },
    include: {
      images: { orderBy: { position: 'asc' } },
      translations: true,
      artist: { include: { translations: true } },
      category: { include: { translations: true } },
    },
  });
  if (!a) throw HttpError.notFound('Artwork not found', 'ARTWORK_NOT_FOUND');

  const t = pickTranslation(a.translations, locale);
  const artistT = pickTranslation(a.artist.translations, locale);
  const categoryT = pickTranslation(a.category.translations, locale);

  return {
    id: a.id,
    slug: a.slug,
    title: t?.title ?? a.slug,
    description: t?.description ?? null,
    history: t?.history ?? null,
    medium: t?.medium ?? a.medium,
    year: a.year,
    widthCm: a.widthCm ? Number(a.widthCm) : null,
    heightCm: a.heightCm ? Number(a.heightCm) : null,
    basePrice: Number(a.basePrice),
    isAvailable: a.isAvailable,
    artist: {
      id: a.artist.id,
      slug: a.artist.slug,
      name: artistT?.name ?? a.artist.slug,
      bio: artistT?.bio ?? null,
      portraitPath: a.artist.portraitPath,
    },
    category: { id: a.category.id, slug: a.category.slug, name: categoryT?.name ?? a.category.slug },
    images: a.images.map((img) => ({
      id: img.id,
      originalPath: img.originalPath,
      mediumPath: img.mediumPath,
      thumbnailPath: img.thumbnailPath,
      width: img.width,
      height: img.height,
      isPrimary: img.isPrimary,
    })),
  };
}

// ───── Admin operations ────────────────────────────────────────────────────

export async function listForAdmin() {
  return prisma.artwork.findMany({
    include: {
      translations: true,
      artist: { include: { translations: true } },
      category: { include: { translations: true } },
      images: { where: { isPrimary: true }, take: 1 },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function create(input: z.infer<typeof createArtworkSchema>) {
  const slugTaken = await prisma.artwork.findUnique({ where: { slug: input.slug } });
  if (slugTaken) throw HttpError.conflict('Slug already in use', 'SLUG_TAKEN');

  return prisma.artwork.create({
    data: {
      slug: input.slug,
      artistId: input.artistId,
      categoryId: input.categoryId,
      year: input.year ?? null,
      medium: input.medium ?? null,
      widthCm: input.widthCm ?? null,
      heightCm: input.heightCm ?? null,
      orientation: deriveOrientation(input.widthCm, input.heightCm),
      basePrice: input.basePrice,
      isAvailable: input.isAvailable ?? true,
      translations: {
        create: input.translations.map((t) => ({
          locale: t.locale,
          title: t.title,
          description: t.description ?? null,
          history: t.history ?? null,
          medium: t.medium ?? null,
        })),
      },
    },
    include: { translations: true },
  });
}

export async function update(id: string, input: z.infer<typeof updateArtworkSchema>) {
  const existing = await prisma.artwork.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw HttpError.notFound('Artwork not found', 'ARTWORK_NOT_FOUND');

  // Effective dimensions after this update — input value if supplied, else
  // what's already stored — so `orientation` stays consistent.
  const effWidth =
    input.widthCm !== undefined
      ? input.widthCm
      : existing.widthCm != null
        ? Number(existing.widthCm)
        : null;
  const effHeight =
    input.heightCm !== undefined
      ? input.heightCm
      : existing.heightCm != null
        ? Number(existing.heightCm)
        : null;

  return prisma.$transaction(async (tx) => {
    if (input.slug && input.slug !== existing.slug) {
      const taken = await tx.artwork.findUnique({ where: { slug: input.slug } });
      if (taken) throw HttpError.conflict('Slug already in use', 'SLUG_TAKEN');
    }
    await tx.artwork.update({
      where: { id },
      data: {
        slug: input.slug ?? undefined,
        artistId: input.artistId ?? undefined,
        categoryId: input.categoryId ?? undefined,
        year: input.year ?? undefined,
        medium: input.medium ?? undefined,
        widthCm: input.widthCm ?? undefined,
        heightCm: input.heightCm ?? undefined,
        orientation: deriveOrientation(effWidth, effHeight),
        basePrice: input.basePrice ?? undefined,
        isAvailable: input.isAvailable ?? undefined,
      },
    });
    if (input.translations) {
      for (const t of input.translations) {
        await tx.artworkTranslation.upsert({
          where: { artworkId_locale: { artworkId: id, locale: t.locale } },
          update: {
            title: t.title,
            description: t.description ?? null,
            history: t.history ?? null,
            medium: t.medium ?? null,
          },
          create: {
            artworkId: id,
            locale: t.locale,
            title: t.title,
            description: t.description ?? null,
            history: t.history ?? null,
            medium: t.medium ?? null,
          },
        });
      }
    }
    return tx.artwork.findUniqueOrThrow({ where: { id }, include: { translations: true } });
  });
}

/** Soft delete — keeps history and prevents accidental loss. */
export async function softRemove(id: string) {
  await prisma.artwork.update({ where: { id }, data: { deletedAt: new Date(), isAvailable: false } });
}

export async function toggleAvailability(id: string, isAvailable: boolean) {
  await prisma.artwork.update({ where: { id }, data: { isAvailable } });
}

// ───── Image management ────────────────────────────────────────────────────

export async function addImage(artworkId: string, tempPath: string, makePrimary: boolean) {
  const artwork = await prisma.artwork.findFirst({ where: { id: artworkId, deletedAt: null } });
  if (!artwork) throw HttpError.notFound('Artwork not found', 'ARTWORK_NOT_FOUND');

  const processed = await processArtworkImage(tempPath, `artworks/${artworkId}`);

  return prisma.$transaction(async (tx) => {
    if (makePrimary) {
      await tx.artworkImage.updateMany({ where: { artworkId }, data: { isPrimary: false } });
    }
    const count = await tx.artworkImage.count({ where: { artworkId } });
    return tx.artworkImage.create({
      data: {
        artworkId,
        originalPath: processed.originalPath,
        mediumPath: processed.mediumPath,
        thumbnailPath: processed.thumbnailPath,
        width: processed.width,
        height: processed.height,
        position: count,
        isPrimary: makePrimary || count === 0, // first image is always primary
      },
    });
  });
}

export async function removeImage(artworkId: string, imageId: string) {
  const image = await prisma.artworkImage.findFirst({ where: { id: imageId, artworkId } });
  if (!image) throw HttpError.notFound('Image not found', 'IMAGE_NOT_FOUND');

  await prisma.artworkImage.delete({ where: { id: imageId } });
  await deleteArtworkImage(image);

  // If we deleted the primary, promote the next image (if any).
  if (image.isPrimary) {
    const next = await prisma.artworkImage.findFirst({
      where: { artworkId },
      orderBy: { position: 'asc' },
    });
    if (next) {
      await prisma.artworkImage.update({ where: { id: next.id }, data: { isPrimary: true } });
    }
  }
}
