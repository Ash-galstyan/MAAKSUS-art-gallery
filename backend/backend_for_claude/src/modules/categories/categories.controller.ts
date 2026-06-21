// backend/src/modules/categories/categories.controller.ts
/**
 * Endpoints (under /api/categories):
 *   GET    /                    public; localised list  → [{ id, slug, name }]
 *   GET    /admin               admin;  full records with all translations
 *   POST   /                    admin;  create
 *   PATCH  /:id                 admin;  update (partial)
 *   DELETE /:id                 admin;  delete (fails if in use)
 */
import type { Request, Response } from 'express';
import * as service from './categories.service';

export async function list(req: Request, res: Response) {
  res.json({ data: await service.listForLocale(req.locale) });
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
