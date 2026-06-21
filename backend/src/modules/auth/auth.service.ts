// backend/src/modules/auth/auth.service.ts
/**
 * Pure business logic — no Express here. Returns plain objects; controllers
 * shape them into HTTP responses.
 *
 * Access token:  short-lived JWT, sent in Authorization header.
 * Refresh token: long-lived opaque random string, sent in httpOnly cookie.
 *                Rotated on every /refresh call (one-time-use).
 */
import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { prisma } from '../../lib/prisma';
import { env } from '../../config/env';
import { PASSWORD_RESET_TTL_MIN } from '../../config/constants';
import { HttpError } from '../../lib/http-error';
import { sendMail } from '../../lib/mailer';
import { logger } from '../../lib/logger';
import {
  issueRefreshToken,
  findActiveRefreshToken,
  revokeRefreshToken,
  revokeAllForUser,
  hashToken,
} from './token.service';
import type {
  RegisterInput,
  LoginInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from './auth.schemas';
import type { User, UserRole } from '@prisma/client';

interface ClientContext {
  userAgent?: string | null;
  ip?: string | null;
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
  user: { id: string; email: string; firstName: string | null; lastName: string | null; role: UserRole; locale: string };
}

function signAccessToken(user: Pick<User, 'id' | 'email' | 'role'>): string {
  const options: SignOptions = { expiresIn: env.JWT_ACCESS_TTL as SignOptions['expiresIn'] };
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    env.JWT_ACCESS_SECRET,
    options,
  );
}

function toAuthResult(user: User, refresh: { raw: string; expiresAt: Date }): AuthResult {
  return {
    accessToken: signAccessToken(user),
    refreshToken: refresh.raw,
    refreshTokenExpiresAt: refresh.expiresAt,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      locale: user.locale,
    },
  };
}

export async function register(input: RegisterInput, ctx: ClientContext): Promise<AuthResult> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw HttpError.conflict('Email already registered', 'EMAIL_TAKEN');

  const passwordHash = await bcrypt.hash(input.password, env.BCRYPT_COST);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      firstName: input.firstName ?? null,
      lastName: input.lastName ?? null,
      locale: input.locale ?? 'EN',
    },
  });

  const refresh = await issueRefreshToken({ userId: user.id, ...ctx });
  return toAuthResult(user, refresh);
}

export async function login(input: LoginInput, ctx: ClientContext): Promise<AuthResult> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  // Constant-time-ish: always run bcrypt.compare to avoid leaking whether
  // the email exists via response timing.
  const dummyHash = '$2b$12$abcdefghijklmnopqrstuvabcdefghijklmnopqrstuvwxyz0123456';
  const ok = await bcrypt.compare(input.password, user?.passwordHash ?? dummyHash);
  if (!user || !ok) throw HttpError.unauthorized('Invalid email or password', 'BAD_CREDENTIALS');
  if (user.status === 'BLOCKED') throw HttpError.forbidden('Account is blocked', 'ACCOUNT_BLOCKED');

  const refresh = await issueRefreshToken({ userId: user.id, ...ctx });
  return toAuthResult(user, refresh);
}

/**
 * Refresh flow with token rotation + reuse detection.
 *
 * If a presented refresh token is found but already revoked, that's a strong
 * signal of theft: the legitimate user used it, it rotated, and now someone
 * is trying the old one. Revoke ALL of that user's tokens to force re-auth.
 */
export async function refreshAccessToken(rawRefreshToken: string, ctx: ClientContext): Promise<AuthResult> {
  const record = await findActiveRefreshToken(rawRefreshToken);
  if (!record) throw HttpError.unauthorized('Invalid refresh token', 'REFRESH_INVALID');

  if (record.revokedAt) {
    // Reuse detected — burn all sessions for this user.
    logger.warn({ userId: record.userId }, 'Refresh token reuse detected — revoking all sessions');
    await revokeAllForUser(record.userId);
    throw HttpError.unauthorized('Refresh token reused', 'REFRESH_REUSED');
  }
  if (record.expiresAt.getTime() < Date.now()) {
    throw HttpError.unauthorized('Refresh token expired', 'REFRESH_EXPIRED');
  }

  const user = await prisma.user.findUnique({ where: { id: record.userId } });
  if (!user || user.status === 'BLOCKED') {
    throw HttpError.unauthorized('Account unavailable', 'ACCOUNT_UNAVAILABLE');
  }

  // Rotate: revoke the old, issue a new.
  await revokeRefreshToken(rawRefreshToken);
  const newRefresh = await issueRefreshToken({ userId: user.id, ...ctx });

  return toAuthResult(user, newRefresh);
}

export async function logout(rawRefreshToken: string | undefined): Promise<void> {
  if (!rawRefreshToken) return;
  await revokeRefreshToken(rawRefreshToken);
}

/**
 * Always returns success regardless of whether the email exists — prevents
 * account enumeration. Only sends a real email if the user exists.
 */
export async function forgotPassword(input: ForgotPasswordInput): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) return;

  const raw = crypto.randomBytes(32).toString('base64url');
  const tokenHash = hashToken(raw);
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MIN * 60_000);

  await prisma.passwordReset.create({ data: { userId: user.id, tokenHash, expiresAt } });

  const resetUrl = `${env.WEB_PUBLIC_URL}/account/reset-password?token=${raw}`;
  await sendMail({
    to: user.email,
    subject: 'Reset your password',
    text: `Click to reset: ${resetUrl}\n\nThis link expires in ${PASSWORD_RESET_TTL_MIN} minutes.`,
    html: `<p>Click to reset: <a href="${resetUrl}">${resetUrl}</a></p><p>This link expires in ${PASSWORD_RESET_TTL_MIN} minutes.</p>`,
  });
}

export async function resetPassword(input: ResetPasswordInput): Promise<void> {
  const reset = await prisma.passwordReset.findUnique({ where: { tokenHash: hashToken(input.token) } });
  if (!reset || reset.usedAt || reset.expiresAt.getTime() < Date.now()) {
    throw HttpError.badRequest('Invalid or expired reset token', 'RESET_INVALID');
  }

  const passwordHash = await bcrypt.hash(input.newPassword, env.BCRYPT_COST);

  await prisma.$transaction([
    prisma.user.update({ where: { id: reset.userId }, data: { passwordHash } }),
    prisma.passwordReset.update({ where: { id: reset.id }, data: { usedAt: new Date() } }),
    // Force re-login on all devices after a password reset.
    prisma.refreshToken.updateMany({
      where: { userId: reset.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);
}

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      role: true,
      status: true,
      locale: true,
      createdAt: true,
    },
  });
  if (!user) throw HttpError.notFound('User not found', 'USER_NOT_FOUND');
  return user;
}
