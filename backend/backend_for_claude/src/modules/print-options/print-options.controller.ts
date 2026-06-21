// backend/src/modules/print-options/print-options.controller.ts
/**
 * Endpoints (under /api/print-options):
 *   GET    /sizes              public localised
 *   GET    /frames             public localised
 *   GET    /sizes/admin        admin
 *   GET    /frames/admin       admin
 *   POST   /sizes              admin
 *   PATCH  /sizes/:id          admin
 *   DELETE /sizes/:id          admin
 *   POST   /frames             admin
 *   PATCH  /frames/:id         admin
 *   DELETE /frames/:id         admin
 */
import type { Request, Response } from 'express';
import * as service from './print-options.service';

export const listSizes = async (req: Request, res: Response) =>
  res.json({ data: await service.listPrintSizesForLocale(req.locale) });

export const listFrames = async (req: Request, res: Response) =>
  res.json({ data: await service.listFrameOptionsForLocale(req.locale) });

export const listSizesAdmin = async (_req: Request, res: Response) =>
  res.json({ data: await service.listPrintSizesForAdmin() });

export const listFramesAdmin = async (_req: Request, res: Response) =>
  res.json({ data: await service.listFrameOptionsForAdmin() });

export const createSize = async (req: Request, res: Response) =>
  res.status(201).json({ data: await service.createPrintSize(req.body) });

export const updateSize = async (req: Request, res: Response) =>
  res.json({ data: await service.updatePrintSize(req.params.id, req.body) });

export const removeSize = async (req: Request, res: Response) => {
  await service.removePrintSize(req.params.id);
  res.status(204).end();
};

export const createFrame = async (req: Request, res: Response) =>
  res.status(201).json({ data: await service.createFrameOption(req.body) });

export const updateFrame = async (req: Request, res: Response) =>
  res.json({ data: await service.updateFrameOption(req.params.id, req.body) });

export const removeFrame = async (req: Request, res: Response) => {
  await service.removeFrameOption(req.params.id);
  res.status(204).end();
};
