// backend/src/modules/orders/orders.routes.ts
import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/role';
import { validate } from '../../middleware/validate';
import { paymentLimiter } from '../../middleware/rate-limit';
import { asyncH } from '../../lib/async-handler';
import {
  checkoutSchema,
  listOrdersAdminQuerySchema,
  orderParamsSchema,
  updateOrderStatusSchema,
} from './orders.schemas';
import * as ctrl from './orders.controller';

const router = Router();
const admin = [requireAuth, requireRole('ADMIN')] as const;

router.post(
  '/checkout',
  requireAuth,
  paymentLimiter,
  validate({ body: checkoutSchema }),
  asyncH(ctrl.checkout),
);
router.get('/', requireAuth, asyncH(ctrl.listMine));
router.get('/:id', requireAuth, validate({ params: orderParamsSchema }), asyncH(ctrl.getMine));

router.get('/admin', ...admin, validate({ query: listOrdersAdminQuerySchema }), asyncH(ctrl.listAdmin));
router.get('/admin/:id', ...admin, validate({ params: orderParamsSchema }), asyncH(ctrl.getAdmin));
router.patch(
  '/admin/:id/status',
  ...admin,
  validate({ params: orderParamsSchema, body: updateOrderStatusSchema }),
  asyncH(ctrl.updateStatus),
);

export default router;
