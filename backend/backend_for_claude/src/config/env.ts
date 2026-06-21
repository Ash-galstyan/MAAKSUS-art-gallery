// backend/src/config/env.ts
/**
 * Loads .env and validates every variable with Zod.
 * Fails loudly at startup if anything is missing or malformed — you'd rather
 * crash on boot than discover a missing JWT secret on the first login attempt.
 *
 * Import as: import { env } from './config/env';
 */
import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  API_PUBLIC_URL: z.string().url(),
  WEB_PUBLIC_URL: z.string().url(),

  DATABASE_URL: z.string().min(1),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 chars'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 chars'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL_DAYS: z.coerce.number().int().positive().default(30),
  BCRYPT_COST: z.coerce.number().int().min(10).max(15).default(12),

  UPLOAD_ROOT: z.string().min(1),
  UPLOAD_MAX_BYTES: z.coerce.number().int().positive().default(20 * 1024 * 1024),

  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().positive(),
  SMTP_SECURE: z.coerce.boolean().default(false),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASS: z.string().optional().default(''),
  MAIL_FROM: z.string().min(1),

  AMERIABANK_BASE_URL: z.string().url(),
  AMERIABANK_CLIENT_ID: z.string().optional().default(''),
  AMERIABANK_USERNAME: z.string().optional().default(''),
  AMERIABANK_PASSWORD: z.string().optional().default(''),
  AMERIABANK_RETURN_URL: z.string().url(),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('❌ Invalid environment variables:');
  for (const issue of parsed.error.issues) {
    // eslint-disable-next-line no-console
    console.error(`  • ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
