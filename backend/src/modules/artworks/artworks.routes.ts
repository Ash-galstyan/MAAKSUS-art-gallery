// backend/src/modules/artworks/artworks.routes.ts
import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/role';
import { validate } from '../../middleware/validate';
import { asyncH } from '../../lib/async-handler';
import { imageUpload } from '../uploads/multer.config';
import {
  createArtworkSchema,
  updateArtworkSchema,
  listArtworksQuerySchema,
  artworkParamsSchema,
} from './artworks.schemas';
import * as ctrl from './artworks.controller';

const router = Router();
const admin = [requireAuth, requireRole('ADMIN')] as const;

router.get('/', validate({ query: listArtworksQuerySchema }), asyncH(ctrl.list));
router.get('/facets', asyncH(ctrl.facets));
router.get('/admin', ...admin, asyncH(ctrl.listAdmin));
router.get('/:id', validate({ params: artworkParamsSchema }), asyncH(ctrl.detail));
router.post('/', ...admin, validate({ body: createArtworkSchema }), asyncH(ctrl.create));
router.patch(
  '/:id',
  ...admin,
  validate({ params: artworkParamsSchema, body: updateArtworkSchema }),
  asyncH(ctrl.update),
);
router.delete('/:id', ...admin, validate({ params: artworkParamsSchema }), asyncH(ctrl.remove));
router.patch(
  '/:id/availability',
  ...admin,
  validate({ params: artworkParamsSchema, body: z.object({ isAvailable: z.boolean() }) }),
  asyncH(ctrl.toggleAvailability),
);
router.post(
  '/:id/images',
  ...admin,
  validate({ params: artworkParamsSchema }),
  imageUpload.single('image'),
  asyncH(ctrl.uploadImage),
);
router.delete(
  '/:id/images/:imageId',
  ...admin,
  validate({
    params: z.object({ id: z.string().min(1), imageId: z.string().min(1) }),
  }),
  asyncH(ctrl.removeImage),
);

export default router;
