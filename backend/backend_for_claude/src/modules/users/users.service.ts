// backend/src/modules/users/users.service.ts
import bcrypt from 'bcrypt';
import { prisma } from '../../lib/prisma';
import { HttpError } from '../../lib/http-error';
import { env } from '../../config/env';
import { revokeAllForUser } from '../auth/token.service';
import type { z } from 'zod';
import type { updateProfileSchema, changePasswordSchema } from './users.schemas';
import type { UserStatus } from '@prisma/client';

export async function updateProfile(userId: string, input: z.infer<typeof updateProfileSchema>) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      firstName: input.firstName ?? undefined,
      lastName: input.lastName ?? undefined,
      phone: input.phone ?? undefined,
      locale: input.locale ?? undefined,
    },
    select: {
      id: true, email: true, firstName: true, lastName: true,
      phone: true, role: true, locale: true,
    },
  });
}

export async function changePassword(userId: string, input: z.infer<typeof changePasswordSchema>) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw HttpError.notFound('User not found', 'USER_NOT_FOUND');

  const ok = await bcrypt.compare(input.currentPassword, user.passwordHash);
  if (!ok) throw HttpError.badRequest('Current password is incorrect', 'WRONG_PASSWORD');

  const newHash = await bcrypt.hash(input.newPassword, env.BCRYPT_COST);
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash: newHash } }),
  ]);
  // Force re-login on all other devices.
  await revokeAllForUser(userId);
}

// ───── Admin ───────────────────────────────────────────────────────────────

export async function listForAdmin() {
  return prisma.user.findMany({
    select: {
      id: true, email: true, firstName: true, lastName: true,
      role: true, status: true, locale: true, createdAt: true,
      _count: { select: { orders: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getForAdmin(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, email: true, firstName: true, lastName: true, phone: true,
      role: true, status: true, locale: true, createdAt: true,
      orders: { select: { id: true, orderNumber: true, status: true, totalAmount: true, createdAt: true } },
    },
  });
  if (!user) throw HttpError.notFound('User not found', 'USER_NOT_FOUND');
  return user;
}

export async function setStatus(id: string, status: UserStatus) {
  await prisma.user.update({ where: { id }, data: { status } });
  if (status === 'BLOCKED') {
    await revokeAllForUser(id);
  }
}
