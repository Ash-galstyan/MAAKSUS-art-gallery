// backend/src/middleware/auth.ts
/**
 * Verifies the access token from the Authorization header and attaches the
 * decoded user to req.user. Use on any route that needs an authenticated user.
 *
 *   router.get('/me', requireAuth, controller.getMe);
 *
 * NOTE: this does NOT check role. Combine with requireRole for admin routes.
 */
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { HttpError } from '../lib/http-error';
import type { UserRole } from '@prisma/client';

interface AccessTokenPayload {
  sub: string;
  email: string;
  role: UserRole;
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(HttpError.unauthorized('Missing access token', 'NO_TOKEN'));
  }
  const token = header.slice('Bearer '.length).trim();
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
    req.user = { id: payload.sub, email: payload.email, role: payload.role };
    next();
  } catch {
    next(HttpError.unauthorized('Invalid or expired access token', 'TOKEN_INVALID'));
  }
}

/** Soft variant: populates req.user if a valid token is present, otherwise continues. */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next();
  try {
    const payload = jwt.verify(
      header.slice('Bearer '.length).trim(),
      env.JWT_ACCESS_SECRET,
    ) as AccessTokenPayload;
    req.user = { id: payload.sub, email: payload.email, role: payload.role };
  } catch {
    /* ignore — treat as anonymous */
  }
  next();
}
