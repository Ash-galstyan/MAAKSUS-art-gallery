// backend/src/middleware/role.ts
/**
 * Role guard. Use AFTER requireAuth.
 *
 *   router.get('/admin/orders', requireAuth, requireRole('ADMIN'), controller.list);
 */
import type { Request, Response, NextFunction } from 'express';
import type { UserRole } from '@prisma/client';
import { HttpError } from '../lib/http-error';

export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(HttpError.unauthorized());
    if (!roles.includes(req.user.role)) return next(HttpError.forbidden());
    next();
  };
}
