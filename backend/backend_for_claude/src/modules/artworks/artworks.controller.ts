// backend/src/modules/artworks/artworks.controller.ts
/**
 * Endpoints (under /api/artworks):
 *   GET    /                            public list with chip-filter + search + cursor
 *                                       → { data: [...], nextCursor: string | null }
 *   GET    /:id                         public detail
 *   GET    /admin                       admin full list
 *   POST   /                            admin create (JSON only — images via separate endpoint)
 *   PATCH  /:id                         admin update
 *   DELETE /:id                         admin soft-delete
 *   PATCH  /:id/availability            admin toggle availability
 *   POST   /:id/images                  admin upload image (multipart); ?primary=true to make primary
 *   DELETE /:id/images/:imageId         admin remove image
 */
import type { Request, Response } from 'express';
import { HttpError } from '../../lib/http-error';
import * as service from './artworks.service';

export async function list(req: Request, res: Response) {
  const result = await service.listForLocale(req.query as any, req.locale);
  res.json(result);
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
  await service.softRemove(req.params.id);
  res.status(204).end();
}

export async function toggleAvailability(req: Request, res: Response) {
  const { isAvailable } = req.body as { isAvailable: boolean };
  await service.toggleAvailability(req.params.id, isAvailable);
  res.status(204).end();
}

export async function uploadImage(req: Request, res: Response) {
  if (!req.file) throw HttpError.badRequest('No image file provided', 'NO_FILE');
  const makePrimary = req.query.primary === 'true';
  const image = await service.addImage(req.params.id, req.file.path, makePrimary);
  res.status(201).json({ data: image });
}

export async function removeImage(req: Request, res: Response) {
  await service.removeImage(req.params.id, req.params.imageId);
  res.status(204).end();
}
