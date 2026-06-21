// backend/src/modules/categories/categories.routes.ts
import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/role';
import { validate } from '../../middleware/validate';
import { asyncH } from '../../lib/async-handler';
import {
  createCategorySchema,
  updateCategorySchema,
  categoryParamsSchema,
} from './categories.schemas';
import * as ctrl from './categories.controller';

const router = Router();

router.get('/', asyncH(ctrl.list));
router.get('/admin', requireAuth, requireRole('ADMIN'), asyncH(ctrl.listAdmin));
router.post(
  '/',
  requireAuth,
  requireRole('ADMIN'),
  validate({ body: createCategorySchema }),
  asyncH(ctrl.create),
);
router.patch(
  '/:id',
  requireAuth,
  requireRole('ADMIN'),
  validate({ params: categoryParamsSchema, body: updateCategorySchema }),
  asyncH(ctrl.update),
);
router.delete(
  '/:id',
  requireAuth,
  requireRole('ADMIN'),
  validate({ params: categoryParamsSchema }),
  asyncH(ctrl.remove),
);

export default router;
