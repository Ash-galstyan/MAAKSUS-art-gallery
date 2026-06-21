// backend/src/modules/auth/token.service.ts
/**
 * Refresh-token lifecycle:
 *   - issue:   create a random token, store its SHA-256 hash, return raw token to caller
 *   - rotate:  on each /refresh, revoke the old token and issue a new one
 *   - revoke:  on logout, mark a specific token revoked
 *   - revokeAllForUser: "log out all devices" — e.g. after password change
 *
 * Why hash?  If the DB leaks, raw tokens would be valid sessions. Hashed
 * tokens are useless to an attacker.
 *
 * Why rotate?  If a refresh token is ever stolen, rotation means the legitimate
 * user's next refresh invalidates it. Detecting reuse of a revoked token is a
 * signal to revoke all that user's sessions — see refreshAccessToken in
 * auth.service.ts.
 */
import crypto from 'node:crypto';
import { prisma } from '../../lib/prisma';
import { env } from '../../config/env';

const TOKEN_BYTES = 48; // 384 bits — plenty of entropy

export function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

export function generateRawToken(): string {
  return crypto.randomBytes(TOKEN_BYTES).toString('base64url');
}

export interface IssueRefreshArgs {
  userId: string;
  userAgent?: string | null;
  ip?: string | null;
}

export async function issueRefreshToken(
  args: IssueRefreshArgs,
): Promise<{ raw: string; expiresAt: Date }> {
  const raw = generateRawToken();
  const tokenHash = hashToken(raw);
  const expiresAt = new Date(Date.now() + env.JWT_REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({
    data: {
      userId: args.userId,
      tokenHash,
      userAgent: args.userAgent ?? null,
      ip: args.ip ?? null,
      expiresAt,
    },
  });

  return { raw, expiresAt };
}

export async function findActiveRefreshToken(raw: string) {
  return prisma.refreshToken.findUnique({ where: { tokenHash: hashToken(raw) } });
}

export async function revokeRefreshToken(raw: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashToken(raw), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllForUser(userId: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
