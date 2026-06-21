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

/**
 * List query — supports the chip filter (multiple categoryIds), text search,
 * and cursor-based pagination for infinite scroll.
 *
 *   ?categoryIds=abc,def  &search=sunset  &cursor=<last-id>  &limit=24
 *
 * Cursor pagination over (createdAt DESC, id DESC) — stable even as new
 * artworks are added between scrolls.
 */
export const listArtworksQuerySchema = z.object({
  categoryIds: z
    .string()
    .optional()
    .transform((v) => (v ? v.split(',').filter(Boolean) : undefined)),
  search: z.string().trim().min(1).max(120).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(60).default(24),
});

export const artworkParamsSchema = z.object({ id: z.string().min(1) });
