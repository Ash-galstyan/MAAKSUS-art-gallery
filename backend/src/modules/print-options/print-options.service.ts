// backend/src/modules/print-options/print-options.service.ts
/**
 * Public reads return only ACTIVE options sorted by `position`.
 * Admin reads return everything for management.
 */
import { prisma } from '../../lib/prisma';
import { HttpError } from '../../lib/http-error';
import { pickTranslation } from '../../lib/i18n-select';
import type { LocaleCode } from '../../config/constants';
import type { z } from 'zod';
import type {
  createPrintSizeSchema,
  updatePrintSizeSchema,
  createFrameOptionSchema,
  updateFrameOptionSchema,
} from './print-options.schemas';

// ───── Print sizes ─────────────────────────────────────────────────────────

export async function listPrintSizesForLocale(locale: LocaleCode) {
  const rows = await prisma.printSize.findMany({
    where: { isActive: true },
    include: { translations: true },
    orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
  });
  return rows.map((s) => ({
    id: s.id,
    code: s.code,
    label: pickTranslation(s.translations, locale)?.label ?? s.code,
    widthCm: Number(s.widthCm),
    heightCm: Number(s.heightCm),
    priceMultiplier: Number(s.priceMultiplier),
  }));
}

export async function listPrintSizesForAdmin() {
  return prisma.printSize.findMany({
    include: { translations: true },
    orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
  });
}

export async function createPrintSize(input: z.infer<typeof createPrintSizeSchema>) {
  return prisma.printSize.create({
    data: {
      code: input.code,
      widthCm: input.widthCm,
      heightCm: input.heightCm,
      priceMultiplier: input.priceMultiplier,
      isActive: input.isActive ?? true,
      position: input.position ?? 0,
      translations: { create: input.translations },
    },
    include: { translations: true },
  });
}

export async function updatePrintSize(id: string, input: z.infer<typeof updatePrintSizeSchema>) {
  const existing = await prisma.printSize.findUnique({ where: { id } });
  if (!existing) throw HttpError.notFound('Print size not found', 'PRINT_SIZE_NOT_FOUND');

  return prisma.$transaction(async (tx) => {
    await tx.printSize.update({
      where: { id },
      data: {
        code: input.code ?? undefined,
        widthCm: input.widthCm ?? undefined,
        heightCm: input.heightCm ?? undefined,
        priceMultiplier: input.priceMultiplier ?? undefined,
        isActive: input.isActive ?? undefined,
        position: input.position ?? undefined,
      },
    });
    if (input.translations) {
      for (const t of input.translations) {
        await tx.printSizeTranslation.upsert({
          where: { printSizeId_locale: { printSizeId: id, locale: t.locale } },
          update: { label: t.label },
          create: { printSizeId: id, locale: t.locale, label: t.label },
        });
      }
    }
    return tx.printSize.findUniqueOrThrow({ where: { id }, include: { translations: true } });
  });
}

export async function removePrintSize(id: string) {
  try {
    await prisma.printSize.delete({ where: { id } });
  } catch (err: any) {
    if (err?.code === 'P2003') {
      throw HttpError.conflict('Cannot delete print size in use', 'PRINT_SIZE_IN_USE');
    }
    throw err;
  }
}

// ───── Frame options ───────────────────────────────────────────────────────

export async function listFrameOptionsForLocale(locale: LocaleCode) {
  const rows = await prisma.frameOption.findMany({
    where: { isActive: true },
    include: { translations: true },
    orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
  });
  return rows.map((f) => ({
    id: f.id,
    code: f.code,
    label: pickTranslation(f.translations, locale)?.label ?? f.code,
    frameType: f.frameType,
    colorHex: f.colorHex,
    additionalPrice: Number(f.additionalPrice),
  }));
}

export async function listFrameOptionsForAdmin() {
  return prisma.frameOption.findMany({
    include: { translations: true },
    orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
  });
}

export async function createFrameOption(input: z.infer<typeof createFrameOptionSchema>) {
  return prisma.frameOption.create({
    data: {
      code: input.code,
      frameType: input.frameType,
      colorHex: input.colorHex,
      additionalPrice: input.additionalPrice,
      isActive: input.isActive ?? true,
      position: input.position ?? 0,
      translations: { create: input.translations },
    },
    include: { translations: true },
  });
}

export async function updateFrameOption(id: string, input: z.infer<typeof updateFrameOptionSchema>) {
  const existing = await prisma.frameOption.findUnique({ where: { id } });
  if (!existing) throw HttpError.notFound('Frame option not found', 'FRAME_OPTION_NOT_FOUND');

  return prisma.$transaction(async (tx) => {
    await tx.frameOption.update({
      where: { id },
      data: {
        code: input.code ?? undefined,
        frameType: input.frameType ?? undefined,
        colorHex: input.colorHex ?? undefined,
        additionalPrice: input.additionalPrice ?? undefined,
        isActive: input.isActive ?? undefined,
        position: input.position ?? undefined,
      },
    });
    if (input.translations) {
      for (const t of input.translations) {
        await tx.frameOptionTranslation.upsert({
          where: { frameOptionId_locale: { frameOptionId: id, locale: t.locale } },
          update: { label: t.label },
          create: { frameOptionId: id, locale: t.locale, label: t.label },
        });
      }
    }
    return tx.frameOption.findUniqueOrThrow({ where: { id }, include: { translations: true } });
  });
}

export async function removeFrameOption(id: string) {
  try {
    await prisma.frameOption.delete({ where: { id } });
  } catch (err: any) {
    if (err?.code === 'P2003') {
      throw HttpError.conflict('Cannot delete frame option in use', 'FRAME_OPTION_IN_USE');
    }
    throw err;
  }
}
