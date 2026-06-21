// backend/src/modules/auth/auth.routes.ts
import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { requireAuth } from '../../middleware/auth';
import { authLimiter, passwordResetLimiter } from '../../middleware/rate-limit';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './auth.schemas';
import * as ctrl from './auth.controller';

const router = Router();

router.post('/register', authLimiter, validate({ body: registerSchema }), asyncH(ctrl.register));
router.post('/login', authLimiter, validate({ body: loginSchema }), asyncH(ctrl.login));
router.post('/refresh', authLimiter, asyncH(ctrl.refresh));
router.post('/logout', asyncH(ctrl.logout));
router.post(
  '/forgot-password',
  passwordResetLimiter,
  validate({ body: forgotPasswordSchema }),
  asyncH(ctrl.forgotPassword),
);
router.post(
  '/reset-password',
  passwordResetLimiter,
  validate({ body: resetPasswordSchema }),
  asyncH(ctrl.resetPassword),
);
router.get('/me', requireAuth, asyncH(ctrl.me));

/**
 * Tiny wrapper to forward async handler rejections to the error middleware.
 * Express 5 will do this natively, but we're on 4 — and being explicit here
 * keeps it working even after upgrade.
 */
function asyncH<T extends (req: any, res: any, next: any) => Promise<any>>(fn: T) {
  return (req: any, res: any, next: any) => fn(req, res, next).catch(next);
}

export default router;
