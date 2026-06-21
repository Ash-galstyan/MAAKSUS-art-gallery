// backend/src/lib/async-handler.ts
/**
 * Express 4 doesn't auto-forward async errors. Wrap every async handler with
 * this so rejections reach the error middleware.
 *
 *   router.get('/x', asyncH(ctrl.method));
 */
import type { Request, Response, NextFunction, RequestHandler } from 'express';

export function asyncH(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
