// backend/src/modules/artists/artists.schemas.ts
import { z } from 'zod';
import { SUPPORTED_LOCALES } from '../../config/constants';

const translationSchema = z.object({
  locale: z.enum(SUPPORTED_LOCALES),
  name: z.string().min(1).max(160),
  bio: z.string().max(8000).optional(),
});

export const createArtistSchema = z.object({
  slug: z.string().min(1).max(160).regex(/^[a-z0-9-]+$/),
  birthYear: z.number().int().min(1000).max(2100).optional(),
  deathYear: z.number().int().min(1000).max(2100).optional(),
  translations: z.array(translationSchema).min(1),
});

export const updateArtistSchema = createArtistSchema.partial();

export const artistParamsSchema = z.object({ id: z.string().min(1) });
