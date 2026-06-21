// backend/src/modules/cart/cart.routes.ts
import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncH } from '../../lib/async-handler';
import {
  addToCartSchema,
  updateCartItemSchema,
  cartItemParamsSchema,
  syncCartSchema,
} from './cart.schemas';
import * as ctrl from './cart.controller';

const router = Router();

router.use(requireAuth);

router.get('/', asyncH(ctrl.get));
router.post('/items', validate({ body: addToCartSchema }), asyncH(ctrl.addItem));
router.patch(
  '/items/:id',
  validate({ params: cartItemParamsSchema, body: updateCartItemSchema }),
  asyncH(ctrl.updateItem),
);
router.delete(
  '/items/:id',
  validate({ params: cartItemParamsSchema }),
  asyncH(ctrl.removeItem),
);
router.delete('/', asyncH(ctrl.clear));
router.post('/sync', validate({ body: syncCartSchema }), asyncH(ctrl.sync));

export default router;
