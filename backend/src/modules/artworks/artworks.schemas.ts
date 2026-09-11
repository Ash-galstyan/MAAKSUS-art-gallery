// backend/src/modules/artworks/artworks.schemas.ts
import { z } from 'zod';
import { SUPPORTED_LOCALES } from '../../config/constants';

const translationSchema = z.object({
  locale: z.enum(SUPPORTED_LOCALES),
  title: z.string().min(1).max(240),
  description: z.string().max(8000).optional(),
  history: z.string().max(8000).optional(),
  medium: z.string().max(240).optional(),
});

export const createArtworkSchema = z.object({
  slug: z.string().min(1).max(240).regex(/^[a-z0-9-]+$/),
  artistId: z.string().min(1),
  categoryId: z.string().min(1),
  year: z.number().int().min(0).max(2100).optional(),
  medium: z.string().max(240).optional(),
  widthCm: z.number().positive().optional(),
  heightCm: z.number().positive().optional(),
  basePrice: z.number().positive(),
  isAvailable: z.boolean().optional(),
  translations: z.array(translationSchema).min(1),
});

export const updateArtworkSchema = createArtworkSchema.partial();

const csvToArray = (v: string | undefined) =>
  v ? v.split(',').map((s) => s.trim()).filter(Boolean) : undefined;

export const ARTWORK_SORTS = ['newest', 'price-asc', 'price-desc'] as const;
export const ARTWORK_ORIENTATIONS = ['portrait', 'landscape', 'square'] as const;

/**
 * List query — category (single, the nav axis), the refinement facets
 * (artist, price range, orientation), sort, text search, and cursor-based
 * pagination for infinite scroll.
 *
 *   ?categoryIds=abc          &artistIds=a1,a2   &priceMin=5000&priceMax=80000
 *   &orientation=portrait,square   &sort=price-asc
 *   &search=sunset  &cursor=<last-id>  &limit=24
 *
 * Cursor pagination is stable for any sort: `orderBy` always ends with `id`
 * as a unique tiebreaker, and the cursor row is addressed by `id`.
 */
export const listArtworksQuerySchema = z.object({
  categoryIds: z.string().optional().transform(csvToArray),
  artistIds: z.string().optional().transform(csvToArray),
  /** `?new=1` — only pieces added within NEW_ARRIVAL_DAYS. */
  new: z
    .string()
    .optional()
    .transform((v) => v === '1' || v === 'true'),
  priceMin: z.coerce.number().int().min(0).optional(),
  priceMax: z.coerce.number().int().min(0).optional(),
  orientation: z
    .string()
    .optional()
    .transform(csvToArray)
    .pipe(z.array(z.enum(ARTWORK_ORIENTATIONS)).optional()),
  sort: z.enum(ARTWORK_SORTS).default('newest'),
  search: z.string().trim().min(1).max(120).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(60).default(24),
});

export const artworkParamsSchema = z.object({ id: z.string().min(1) });
