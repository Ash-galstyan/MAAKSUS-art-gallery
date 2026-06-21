// backend/src/modules/users/users.controller.ts
/**
 * Endpoints (under /api/users):
 *   PATCH  /me                   auth; update profile
 *   POST   /me/change-password   auth; revokes all refresh tokens after success
 *   GET    /admin                admin; list users
 *   GET    /admin/:id            admin; user detail with order summary
 *   PATCH  /admin/:id/status     admin; ACTIVE | BLOCKED
 */
import type { Request, Response } from 'express';
import { HttpError } from '../../lib/http-error';
import * as service from './users.service';

function uid(req: Request) {
  if (!req.user) throw HttpError.unauthorized();
  return req.user.id;
}

export const updateMe = async (req: Request, res: Response) =>
  res.json({ data: await service.updateProfile(uid(req), req.body) });

export const changePassword = async (req: Request, res: Response) => {
  await service.changePassword(uid(req), req.body);
  res.status(204).end();
};

export const listAdmin = async (_req: Request, res: Response) =>
  res.json({ data: await service.listForAdmin() });

export const getAdmin = async (req: Request, res: Response) =>
  res.json({ data: await service.getForAdmin(req.params.id) });

export const setStatus = async (req: Request, res: Response) => {
  await service.setStatus(req.params.id, req.body.status);
  res.status(204).end();
};
