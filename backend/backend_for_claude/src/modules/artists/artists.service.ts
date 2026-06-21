// backend/src/modules/artists/artists.service.ts
import { prisma } from '../../lib/prisma';
import { HttpError } from '../../lib/http-error';
import { pickTranslation } from '../../lib/i18n-select';
import type { LocaleCode } from '../../config/constants';
import type { z } from 'zod';
import type { createArtistSchema, updateArtistSchema } from './artists.schemas';

export async function listForLocale(locale: LocaleCode) {
  const rows = await prisma.artist.findMany({
    include: { translations: true },
    orderBy: { createdAt: 'asc' },
  });
  return rows.map((a) => {
    const t = pickTranslation(a.translations, locale);
    return {
      id: a.id,
      slug: a.slug,
      name: t?.name ?? a.slug,
      bio: t?.bio ?? null,
      portraitPath: a.portraitPath,
      birthYear: a.birthYear,
      deathYear: a.deathYear,
    };
  });
}

export async function getByIdForLocale(id: string, locale: LocaleCode) {
  const a = await prisma.artist.findUnique({ where: { id }, include: { translations: true } });
  if (!a) throw HttpError.notFound('Artist not found', 'ARTIST_NOT_FOUND');
  const t = pickTranslation(a.translations, locale);
  return {
    id: a.id,
    slug: a.slug,
    name: t?.name ?? a.slug,
    bio: t?.bio ?? null,
    portraitPath: a.portraitPath,
    birthYear: a.birthYear,
    deathYear: a.deathYear,
  };
}

export async function listForAdmin() {
  return prisma.artist.findMany({
    include: { translations: true, _count: { select: { artworks: true } } },
    orderBy: { createdAt: 'asc' },
  });
}

export async function create(input: z.infer<typeof createArtistSchema>) {
  const slugTaken = await prisma.artist.findUnique({ where: { slug: input.slug } });
  if (slugTaken) throw HttpError.conflict('Slug already in use', 'SLUG_TAKEN');

  return prisma.artist.create({
    data: {
      slug: input.slug,
      birthYear: input.birthYear ?? null,
      deathYear: input.deathYear ?? null,
      translations: { create: input.translations.map((t) => ({ ...t, bio: t.bio ?? null })) },
    },
    include: { translations: true },
  });
}

export async function update(id: string, input: z.infer<typeof updateArtistSchema>) {
  const existing = await prisma.artist.findUnique({ where: { id } });
  if (!existing) throw HttpError.notFound('Artist not found', 'ARTIST_NOT_FOUND');

  return prisma.$transaction(async (tx) => {
    if (input.slug && input.slug !== existing.slug) {
      const taken = await tx.artist.findUnique({ where: { slug: input.slug } });
      if (taken) throw HttpError.conflict('Slug already in use', 'SLUG_TAKEN');
    }
    await tx.artist.update({
      where: { id },
      data: {
        slug: input.slug ?? undefined,
        birthYear: input.birthYear ?? undefined,
        deathYear: input.deathYear ?? undefined,
      },
    });
    if (input.translations) {
      for (const t of input.translations) {
        await tx.artistTranslation.upsert({
          where: { artistId_locale: { artistId: id, locale: t.locale } },
          update: { name: t.name, bio: t.bio ?? null },
          create: { artistId: id, locale: t.locale, name: t.name, bio: t.bio ?? null },
        });
      }
    }
    return tx.artist.findUniqueOrThrow({ where: { id }, include: { translations: true } });
  });
}

export async function remove(id: string) {
  try {
    await prisma.artist.delete({ where: { id } });
  } catch (err: any) {
    if (err?.code === 'P2003') {
      throw HttpError.conflict('Cannot delete artist with artworks', 'ARTIST_IN_USE');
    }
    throw err;
  }
}

/**
 * Called by the upload route once the portrait is processed.
 * Stored as a single path — portraits don't need multi-size variants.
 */
export async function setPortraitPath(id: string, path: string) {
  await prisma.artist.update({ where: { id }, data: { portraitPath: path } });
}
