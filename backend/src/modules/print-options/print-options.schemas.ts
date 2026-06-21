// backend/src/modules/print-options/print-options.schemas.ts
import { z } from 'zod';
import { SUPPORTED_LOCALES } from '../../config/constants';

const printSizeTranslation = z.object({
  locale: z.enum(SUPPORTED_LOCALES),
  label: z.string().min(1).max(80),
});

export const createPrintSizeSchema = z.object({
  code: z.string().min(1).max(40),
  widthCm: z.number().positive(),
  heightCm: z.number().positive(),
  priceMultiplier: z.number().positive(),
  isActive: z.boolean().optional(),
  position: z.number().int().optional(),
  translations: z.array(printSizeTranslation).min(1),
});

export const updatePrintSizeSchema = createPrintSizeSchema.partial();

const frameTranslation = z.object({
  locale: z.enum(SUPPORTED_LOCALES),
  label: z.string().min(1).max(80),
});

export const createFrameOptionSchema = z.object({
  code: z.string().min(1).max(40),
  frameType: z.enum(['NONE', 'WOOD', 'METAL', 'PLASTIC']),
  colorHex: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  additionalPrice: z.number().nonnegative(),
  isActive: z.boolean().optional(),
  position: z.number().int().optional(),
  translations: z.array(frameTranslation).min(1),
});

export const updateFrameOptionSchema = createFrameOptionSchema.partial();

export const idParamsSchema = z.object({ id: z.string().min(1) });
