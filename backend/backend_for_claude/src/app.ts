// backend/src/app.ts
/**
 * Express app setup. Mounted by server.ts.
 *
 * Order matters:
 *   1. Trust-proxy (so rate-limit sees real IPs behind Nginx)
 *   2. Security headers (helmet)
 *   3. CORS (the SPA is on a different origin in dev)
 *   4. Body parsers + cookie parser
 *   5. pino-http logger
 *   6. Locale middleware (sets req.locale for all downstream handlers)
 *   7. Health check (above auth so monitoring doesn't need credentials)
 *   8. /api/* route trees
 *   9. 404 handler
 *  10. Error handler (must be last)
 */
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';

import { env } from './config/env';
import { logger } from './lib/logger';
import { localeMiddleware } from './middleware/locale';
import { errorHandler, notFoundHandler } from './middleware/error-handler';

import authRoutes from './modules/auth/auth.routes';
import categoriesRoutes from './modules/categories/categories.routes';
import artistsRoutes from './modules/artists/artists.routes';
import printOptionsRoutes from './modules/print-options/print-options.routes';
import artworksRoutes from './modules/artworks/artworks.routes';
import cartRoutes from './modules/cart/cart.routes';
import ordersRoutes from './modules/orders/orders.routes';
import paymentsRoutes from './modules/payments/payments.routes';
import usersRoutes from './modules/users/users.routes';

export function createApp(): express.Express {
  const app = express();

  // Trust the first hop (Nginx in prod, Angular's proxy in dev) so req.ip
  // is the real client and rate limiting works correctly.
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(
    cors({
      origin: env.WEB_PUBLIC_URL,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  app.use(
    pinoHttp({
      logger,
      // Quiet down health-check noise in logs.
      autoLogging: {
        ignore: (req) => req.url === '/api/health',
      },
    }),
  );

  app.use(localeMiddleware);

  // Static uploads.
  //
  // In production Nginx serves /uploads/ directly from disk and never lets
  // these requests reach Node. In dev there's no Nginx, so we serve them
  // from Express to keep things working without environment-specific code
  // in the frontend. Cheap; only used during development traffic.
  app.use(
    '/uploads',
    express.static(env.UPLOAD_ROOT, {
      fallthrough: false,
      maxAge: env.NODE_ENV === 'production' ? '30d' : 0,
    }),
  );

  // Health
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // Domain routes
  app.use('/api/auth', authRoutes);
  app.use('/api/categories', categoriesRoutes);
  app.use('/api/artists', artistsRoutes);
  app.use('/api/print-options', printOptionsRoutes);
  app.use('/api/artworks', artworksRoutes);
  app.use('/api/cart', cartRoutes);
  app.use('/api/orders', ordersRoutes);
  app.use('/api/payments', paymentsRoutes);
  app.use('/api/users', usersRoutes);

  // 404 + error handlers (must be last)
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}