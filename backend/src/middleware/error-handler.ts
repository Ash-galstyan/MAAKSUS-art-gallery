// backend/src/middleware/error-handler.ts
/**
 * Final error handler — must be the LAST middleware mounted on app.
 *
 * Wire-format for ALL errors reaching the client:
 *   { error: { code: string, message: string, details?: unknown } }
 *
 * Frontend's error interceptor knows this shape and can map `code` to a
 * localised message.
 */
import type { ErrorRequestHandler } from 'express';
import { HttpError } from '../lib/http-error';
import { logger } from '../lib/logger';
import { env } from '../config/env';

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof HttpError) {
    if (err.status >= 500) {
      logger.error({ err, path: req.path }, 'HttpError 5xx');
    } else {
      logger.debug({ status: err.status, code: err.code, path: req.path }, 'HttpError');
    }
    res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
    return;
  }

  logger.error({ err, path: req.path }, 'Unhandled error');
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: env.NODE_ENV === 'production' ? 'Internal server error' : String(err?.message ?? err),
    },
  });
};

/** 404 handler — mount immediately BEFORE errorHandler. */
export const notFoundHandler: ErrorRequestHandler = (_req, _res, next) => {
  next(HttpError.notFound('Route not found', 'ROUTE_NOT_FOUND'));
};
