// backend/src/modules/users/users.schemas.ts
import { z } from 'zod';
import { SUPPORTED_LOCALES } from '../../config/constants';

export const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(80).optional(),
  lastName: z.string().min(1).max(80).optional(),
  phone: z.string().max(40).optional(),
  locale: z.enum(SUPPORTED_LOCALES).optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

export const adminUserParamsSchema = z.object({ id: z.string().min(1) });

export const blockUserSchema = z.object({
  status: z.enum(['ACTIVE', 'BLOCKED']),
});
