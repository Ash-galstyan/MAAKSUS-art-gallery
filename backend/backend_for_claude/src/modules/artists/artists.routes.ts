// backend/src/modules/artists/artists.routes.ts
import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/role';
import { validate } from '../../middleware/validate';
import { asyncH } from '../../lib/async-handler';
import {
  createArtistSchema,
  updateArtistSchema,
  artistParamsSchema,
} from './artists.schemas';
import * as ctrl from './artists.controller';

const router = Router();

router.get('/', asyncH(ctrl.list));
router.get('/admin', requireAuth, requireRole('ADMIN'), asyncH(ctrl.listAdmin));
router.get('/:id', validate({ params: artistParamsSchema }), asyncH(ctrl.detail));
router.post(
  '/',
  requireAuth,
  requireRole('ADMIN'),
  validate({ body: createArtistSchema }),
  asyncH(ctrl.create),
);
router.patch(
  '/:id',
  requireAuth,
  requireRole('ADMIN'),
  validate({ params: artistParamsSchema, body: updateArtistSchema }),
  asyncH(ctrl.update),
);
router.delete(
  '/:id',
  requireAuth,
  requireRole('ADMIN'),
  validate({ params: artistParamsSchema }),
  asyncH(ctrl.remove),
);

export default router;
