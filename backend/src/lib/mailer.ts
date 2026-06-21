// backend/src/lib/mailer.ts
/**
 * Thin nodemailer wrapper.
 *
 * Plug your SMTP creds into .env. Templates are intentionally minimal — swap
 * to a templating engine (mjml, react-email) once branding firms up.
 *
 * In dev, leave SMTP_USER/PASS blank and use a Mailtrap / Mailpit / Ethereal
 * sandbox so you don't accidentally email real addresses.
 */
import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../config/env';
import { logger } from './logger';

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  });
  return transporter;
}

export interface SendMailArgs {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export async function sendMail(args: SendMailArgs): Promise<void> {
  try {
    await getTransporter().sendMail({ from: env.MAIL_FROM, ...args });
  } catch (err) {
    // Don't throw — a failed email shouldn't break the request flow that triggered it.
    // For password reset, the user can request a new one. Log loudly for ops.
    logger.error({ err, to: args.to, subject: args.subject }, 'Failed to send mail');
  }
}
