// backend/src/lib/logger.ts
/**
 * pino logger. Pretty output in dev, JSON in prod (for log aggregators).
 * Use this everywhere instead of console.log — pino is ~5x faster and
 * structured logs are searchable.
 */
import pino from 'pino';
import { env } from '../config/env';

export const logger = pino({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  transport:
    env.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss' } }
      : undefined,
});
