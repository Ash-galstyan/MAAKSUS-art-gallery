// backend/src/lib/prisma.ts
/**
 * Singleton PrismaClient. Re-instantiating per request would exhaust the
 * Postgres connection pool within minutes. Dev hot-reload via tsx also benefits
 * from the global cache pattern.
 */
import { PrismaClient } from '@prisma/client';
import { env } from '../config/env';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
