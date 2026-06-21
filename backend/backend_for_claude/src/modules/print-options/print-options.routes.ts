// backend/src/modules/print-options/print-options.routes.ts
import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/role';
import { validate } from '../../middleware/validate';
import { asyncH } from '../../lib/async-handler';
import {
  createPrintSizeSchema,
  updatePrintSizeSchema,
  createFrameOptionSchema,
  updateFrameOptionSchema,
  idParamsSchema,
} from './print-options.schemas';
import * as ctrl from './print-options.controller';

const router = Router();
const admin = [requireAuth, requireRole('ADMIN')] as const;

router.get('/sizes', asyncH(ctrl.listSizes));
router.get('/frames', asyncH(ctrl.listFrames));

router.get('/sizes/admin', ...admin, asyncH(ctrl.listSizesAdmin));
router.get('/frames/admin', ...admin, asyncH(ctrl.listFramesAdmin));

router.post('/sizes', ...admin, validate({ body: createPrintSizeSchema }), asyncH(ctrl.createSize));
router.patch(
  '/sizes/:id',
  ...admin,
  validate({ params: idParamsSchema, body: updatePrintSizeSchema }),
  asyncH(ctrl.updateSize),
);
router.delete('/sizes/:id', ...admin, validate({ params: idParamsSchema }), asyncH(ctrl.removeSize));

router.post('/frames', ...admin, validate({ body: createFrameOptionSchema }), asyncH(ctrl.createFrame));
router.patch(
  '/frames/:id',
  ...admin,
  validate({ params: idParamsSchema, body: updateFrameOptionSchema }),
  asyncH(ctrl.updateFrame),
);
router.delete('/frames/:id', ...admin, validate({ params: idParamsSchema }), asyncH(ctrl.removeFrame));

export default router;
