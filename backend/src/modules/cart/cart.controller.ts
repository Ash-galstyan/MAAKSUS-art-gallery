// backend/src/modules/cart/cart.controller.ts
/**
 * Endpoints (all under /api/cart, all require auth):
 *   GET    /                 → { items, subtotal, currency }
 *   POST   /items            body: { artworkId, printSizeId, frameOptionId?, withMatte?, quantity }
 *                            → 201 { item }
 *   PATCH  /items/:id        body: { quantity }
 *                            → 200 { item }
 *   DELETE /items/:id        → 204
 *   DELETE /                 clear entire cart → 204
 *   POST   /sync             body: { items: [...] }   merge guest cart
 *                            → 200 { ...cart }
 */
import type { Request, Response } from 'express';
import { HttpError } from '../../lib/http-error';
import * as service from './cart.service';

function uid(req: Request): string {
  if (!req.user) throw HttpError.unauthorized();
  return req.user.id;
}

export const get = async (req: Request, res: Response) =>
  res.json(await service.getCart(uid(req), req.locale));

export const addItem = async (req: Request, res: Response) =>
  res.status(201).json({ data: await service.addItem(uid(req), req.body) });

export const updateItem = async (req: Request, res: Response) =>
  res.json({ data: await service.updateItemQuantity(uid(req), req.params.id, req.body.quantity) });

export const removeItem = async (req: Request, res: Response) => {
  await service.removeItem(uid(req), req.params.id);
  res.status(204).end();
};

export const clear = async (req: Request, res: Response) => {
  await service.clearCart(uid(req));
  res.status(204).end();
};

export const sync = async (req: Request, res: Response) => {
  await service.syncFromGuest(uid(req), req.body);
  res.json(await service.getCart(uid(req), req.locale));
};
