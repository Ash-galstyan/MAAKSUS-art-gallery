// backend/src/modules/users/users.routes.ts
import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/role';
import { validate } from '../../middleware/validate';
import { asyncH } from '../../lib/async-handler';
import {
  updateProfileSchema,
  changePasswordSchema,
  adminUserParamsSchema,
  blockUserSchema,
} from './users.schemas';
import * as ctrl from './users.controller';

const router = Router();
const admin = [requireAuth, requireRole('ADMIN')] as const;

router.patch('/me', requireAuth, validate({ body: updateProfileSchema }), asyncH(ctrl.updateMe));
router.post(
  '/me/change-password',
  requireAuth,
  validate({ body: changePasswordSchema }),
  asyncH(ctrl.changePassword),
);
router.get('/admin', ...admin, asyncH(ctrl.listAdmin));
router.get('/admin/:id', ...admin, validate({ params: adminUserParamsSchema }), asyncH(ctrl.getAdmin));
router.patch(
  '/admin/:id/status',
  ...admin,
  validate({ params: adminUserParamsSchema, body: blockUserSchema }),
  asyncH(ctrl.setStatus),
);

export default router;
