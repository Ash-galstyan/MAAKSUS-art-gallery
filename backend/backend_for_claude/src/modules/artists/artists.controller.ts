// backend/src/modules/artists/artists.controller.ts
/**
 * Endpoints (under /api/artists):
 *   GET    /             public localised list
 *   GET    /:id          public localised detail
 *   GET    /admin        admin: full with counts
 *   POST   /             admin
 *   PATCH  /:id          admin
 *   DELETE /:id          admin
 */
import type { Request, Response } from 'express';
import * as service from './artists.service';

export async function list(req: Request, res: Response) {
  res.json({ data: await service.listForLocale(req.locale) });
}
export async function detail(req: Request, res: Response) {
  res.json({ data: await service.getByIdForLocale(req.params.id, req.locale) });
}
export async function listAdmin(_req: Request, res: Response) {
  res.json({ data: await service.listForAdmin() });
}
export async function create(req: Request, res: Response) {
  res.status(201).json({ data: await service.create(req.body) });
}
export async function update(req: Request, res: Response) {
  res.json({ data: await service.update(req.params.id, req.body) });
}
export async function remove(req: Request, res: Response) {
  await service.remove(req.params.id);
  res.status(204).end();
}
