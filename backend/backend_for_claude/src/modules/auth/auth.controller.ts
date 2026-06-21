// backend/src/modules/auth/auth.controller.ts
/**
 * Endpoints (all under /api/auth):
 *   POST   /register         body: { email, password, firstName?, lastName?, locale? }
 *                            → 201 { accessToken, user }  +  sets refresh cookie
 *   POST   /login            body: { email, password }
 *                            → 200 { accessToken, user }  +  sets refresh cookie
 *   POST   /refresh          (reads refresh cookie)
 *                            → 200 { accessToken, user }  +  rotates refresh cookie
 *   POST   /logout           (reads refresh cookie)
 *                            → 204                          +  clears refresh cookie
 *   POST   /forgot-password  body: { email }
 *                            → 204 (always — no account enumeration)
 *   POST   /reset-password   body: { token, newPassword }
 *                            → 204
 *   GET    /me               auth: required
 *                            → 200 { user }
 */
import type { Request, Response } from 'express';
import { env } from '../../config/env';
import { REFRESH_COOKIE_NAME } from '../../config/constants';
import { HttpError } from '../../lib/http-error';
import * as authService from './auth.service';

function setRefreshCookie(res: Response, token: string, expiresAt: Date): void {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/auth',           // only sent to auth endpoints — minimises exposure
    expires: expiresAt,
  });
}

function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth' });
}

function ctxFromReq(req: Request) {
  return {
    userAgent: req.headers['user-agent'] ?? null,
    ip: req.ip ?? null,
  };
}

export async function register(req: Request, res: Response): Promise<void> {
  const result = await authService.register(req.body, ctxFromReq(req));
  setRefreshCookie(res, result.refreshToken, result.refreshTokenExpiresAt);
  res.status(201).json({ accessToken: result.accessToken, user: result.user });
}

export async function login(req: Request, res: Response): Promise<void> {
  const result = await authService.login(req.body, ctxFromReq(req));
  setRefreshCookie(res, result.refreshToken, result.refreshTokenExpiresAt);
  res.json({ accessToken: result.accessToken, user: result.user });
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const token = req.cookies?.[REFRESH_COOKIE_NAME];
  if (!token) throw HttpError.unauthorized('No refresh token', 'NO_REFRESH');
  const result = await authService.refreshAccessToken(token, ctxFromReq(req));
  setRefreshCookie(res, result.refreshToken, result.refreshTokenExpiresAt);
  res.json({ accessToken: result.accessToken, user: result.user });
}

export async function logout(req: Request, res: Response): Promise<void> {
  await authService.logout(req.cookies?.[REFRESH_COOKIE_NAME]);
  clearRefreshCookie(res);
  res.status(204).end();
}

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  await authService.forgotPassword(req.body);
  res.status(204).end();
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  await authService.resetPassword(req.body);
  res.status(204).end();
}

export async function me(req: Request, res: Response): Promise<void> {
  if (!req.user) throw HttpError.unauthorized();
  const user = await authService.getCurrentUser(req.user.id);
  res.json({ user });
}
