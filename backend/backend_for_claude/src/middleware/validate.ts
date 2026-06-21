// backend/src/middleware/validate.ts
/**
 * Zod-based request validator.
 * Usage:
 *   router.post('/', validate({ body: createArtworkSchema }), controller.create);
 *
 * On success, the parsed/transformed value REPLACES req.body/query/params so
 * controllers can rely on `req.body` being the typed, sanitised version.
 */
import type { Request, Response, NextFunction } from 'express';
import { z, type ZodTypeAny } from 'zod';
import { HttpError } from '../lib/http-error';

interface Schemas {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

export function validate(schemas: Schemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body);
      if (schemas.query) (req as any).query = schemas.query.parse(req.query);
      if (schemas.params) (req as any).params = schemas.params.parse(req.params);
      next();
    } catch (err) {
      if (err instanceof z.ZodError) {
        next(
          HttpError.badRequest('Validation failed', 'VALIDATION_ERROR', {
            issues: err.issues.map((i) => ({
              path: i.path.join('.'),
              message: i.message,
              code: i.code,
            })),
          }),
        );
        return;
      }
      next(err);
    }
  };
}
