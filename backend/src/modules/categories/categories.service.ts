// backend/src/modules/categories/categories.service.ts
/**
 * Categories are flat (no parent/child) by design. If you ever need
 * sub-categories, add a `parentId String?` self-relation to the model.
 */
import { prisma } from '../../lib/prisma';
import { HttpError } from '../../lib/http-error';
import { pickTranslation } from '../../lib/i18n-select';
import type { LocaleCode } from '../../config/constants';
import type { z } from 'zod';
import type { createCategorySchema, updateCategorySchema } from './categories.schemas';

export async function listForLocale(locale: LocaleCode) {
  const rows = await prisma.category.findMany({
    include: { translations: true },
    orderBy: { createdAt: 'asc' },
  });
  return rows.map((c) => {
    const t = pickTranslation(c.translations, locale);
    return { id: c.id, slug: c.slug, name: t?.name ?? c.slug };
  });
}

/** Admin: full record with all translations attached. */
export async function listForAdmin() {
  return prisma.category.findMany({
    include: { translations: true },
    orderBy: { createdAt: 'asc' },
  });
}

export async function create(input: z.infer<typeof createCategorySchema>) {
  const existing = await prisma.category.findUnique({ where: { slug: input.slug } });
  if (existing) throw HttpError.conflict('Slug already in use', 'SLUG_TAKEN');

  return prisma.category.create({
    data: {
      slug: input.slug,
      translations: { create: input.translations },
    },
    include: { translations: true },
  });
}

export async function update(id: string, input: z.infer<typeof updateCategorySchema>) {
  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) throw HttpError.notFound('Category not found', 'CATEGORY_NOT_FOUND');

  return prisma.$transaction(async (tx) => {
    if (input.slug && input.slug !== existing.slug) {
      const slugTaken = await tx.category.findUnique({ where: { slug: input.slug } });
      if (slugTaken) throw HttpError.conflict('Slug already in use', 'SLUG_TAKEN');
      await tx.category.update({ where: { id }, data: { slug: input.slug } });
    }
    if (input.translations) {
      // Upsert each translation; leave any not provided alone.
      for (const t of input.translations) {
        await tx.categoryTranslation.upsert({
          where: { categoryId_locale: { categoryId: id, locale: t.locale } },
          update: { name: t.name },
          create: { categoryId: id, locale: t.locale, name: t.name },
        });
      }
    }
    return tx.category.findUniqueOrThrow({ where: { id }, include: { translations: true } });
  });
}

export async function remove(id: string) {
  // Prisma will throw P2003 (foreign key constraint) if artworks reference this
  // category — caught and translated to a friendly error.
  try {
    await prisma.category.delete({ where: { id } });
  } catch (err: any) {
    if (err?.code === 'P2003') {
      throw HttpError.conflict(
        'Cannot delete category that contains artworks',
        'CATEGORY_IN_USE',
      );
    }
    throw err;
  }
}
