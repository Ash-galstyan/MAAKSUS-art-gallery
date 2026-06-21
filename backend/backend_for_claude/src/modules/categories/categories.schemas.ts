// backend/src/modules/categories/categories.schemas.ts
import { z } from 'zod';
import { SUPPORTED_LOCALES } from '../../config/constants';

const translationSchema = z.object({
  locale: z.enum(SUPPORTED_LOCALES),
  name: z.string().min(1).max(120),
});

export const createCategorySchema = z.object({
  slug: z.string().min(1).max(120).regex(/^[a-z0-9-]+$/, 'lowercase letters, digits, hyphens'),
  translations: z.array(translationSchema).min(1),
});

export const updateCategorySchema = createCategorySchema.partial();

export const categoryParamsSchema = z.object({ id: z.string().min(1) });
