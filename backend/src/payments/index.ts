// backend/src/payments/index.ts
/**
 * Resolves the active payment provider.
 *
 * Selection logic:
 *   - If Ameriabank credentials are configured (AMERIABANK_CLIENT_ID set),
 *     use the real adapter.
 *   - Otherwise fall back to the dev mock so the checkout flow is testable
 *     locally without merchant credentials. The mock logs a loud warning on
 *     every call and can never activate once real credentials are present.
 *
 * When you add Idram or another provider, switch on a query/env flag here.
 */
import type { PaymentProvider } from './provider.interface';
import { ameriabankAdapter } from './ameriabank/ameriabank.adapter';
import { mockAdapter } from './mock/mock.adapter';
import { env } from '../config/env';
import { logger } from '../lib/logger';

let warnedOnce = false;

export function getPaymentProvider(): PaymentProvider {
  // A real ClientID is the signal that Ameriabank onboarding is done.
  const hasRealCredentials = env.AMERIABANK_CLIENT_ID.trim().length > 0;

  if (hasRealCredentials) {
    return ameriabankAdapter;
  }

  if (!warnedOnce) {
    logger.warn(
      'No AMERIABANK_CLIENT_ID configured — using MOCK payment provider. ' +
        'Payments will auto-succeed without contacting any bank. ' +
        'This is for local development only.',
    );
    warnedOnce = true;
  }
  return mockAdapter;
}