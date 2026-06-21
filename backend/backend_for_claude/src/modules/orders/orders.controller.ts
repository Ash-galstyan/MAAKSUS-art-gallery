// backend/src/modules/orders/orders.controller.ts
/**
 * Endpoints (under /api/orders):
 *   POST   /checkout              auth; body: shipping address
 *                                 → 200 { orderId, orderNumber, redirectUrl }
 *                                 frontend window.location = redirectUrl
 *   GET    /                      auth; the user's own orders
 *   GET    /:id                   auth; the user's own order detail
 *   GET    /admin                 admin; list with filters + cursor
 *   GET    /admin/:id             admin; order detail w/ payments
 *   PATCH  /admin/:id/status      admin; FULFILLED | CANCELLED | REFUNDED
 */
import type { Request, Response } from 'express';
import { HttpError } from '../../lib/http-error';
import * as service from './orders.service';

function uid(req: Request) {
  if (!req.user) throw HttpError.unauthorized();
  return req.user.id;
}

export const checkout = async (req: Request, res: Response) => {
  const outcome = await service.checkout(uid(req), req.body, req.locale);
  res.json(outcome);
};

export const listMine = async (req: Request, res: Response) =>
  res.json({ data: await service.listForUser(uid(req)) });

export const getMine = async (req: Request, res: Response) =>
  res.json({ data: await service.getForUser(uid(req), req.params.id) });

export const listAdmin = async (req: Request, res: Response) =>
  res.json(await service.listForAdmin(req.query as any));

export const getAdmin = async (req: Request, res: Response) =>
  res.json({ data: await service.getForAdmin(req.params.id) });

export const updateStatus = async (req: Request, res: Response) =>
  res.json({ data: await service.updateStatus(req.params.id, req.body.status) });
