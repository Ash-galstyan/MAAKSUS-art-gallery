// backend/src/payments/mock/mock.adapter.ts
/**
 * Development-only mock payment provider.
 *
 * Activated automatically by getPaymentProvider() when Ameriabank credentials
 * are not configured (see ../index.ts). NEVER active when AMERIABANK_CLIENT_ID
 * is set, so it can't fire in production.
 *
 * Behaviour:
 *   - createSession() skips the bank entirely and returns a redirectUrl that
 *     points straight at our own return handler with ?orderID=<orderNumber>.
 *     The browser "redirects to the bank" but actually bounces right back,
 *     exactly as if the customer had paid successfully.
 *   - verify() always reports SUCCEEDED.
 *
 * This lets you exercise the full cart → checkout → confirmation → order
 * history flow locally without merchant credentials. To simulate a failure
 * instead, set MOCK_PAYMENT_OUTCOME=FAILED in your .env.
 */
import { env } from '../../config/env';
import { logger } from '../../lib/logger';
import type {
  PaymentProvider,
  CreateSessionArgs,
  CreateSessionResult,
  VerifyArgs,
  VerifyResult,
  VerifyOutcome,
} from '../provider.interface';

function configuredOutcome(): VerifyOutcome {
  const raw = (process.env.MOCK_PAYMENT_OUTCOME ?? 'SUCCEEDED').toUpperCase();
  if (raw === 'FAILED' || raw === 'CANCELLED') return raw;
  return 'SUCCEEDED';
}

export const mockAdapter: PaymentProvider = {
  // The interface pins `name` to 'AMERIABANK'; the mock impersonates it so the
  // rest of the system (Payment.provider column, return route) works unchanged.
  name: 'AMERIABANK',

  async createSession(args: CreateSessionArgs): Promise<CreateSessionResult> {
    logger.warn(
      { orderNumber: args.orderNumber, amount: args.amount },
      '⚠️  MOCK PAYMENT PROVIDER active — no real bank call. Set AMERIABANK_CLIENT_ID to disable.',
    );

    // Point straight back at our own return handler. The handler will call
    // verify() (below), which reports success, and the user lands on the
    // confirmation page — same path a real payment takes.
    const redirectUrl = `${env.AMERIABANK_RETURN_URL}?orderID=${encodeURIComponent(args.orderNumber)}`;

    return {
      redirectUrl,
      providerPaymentId: `MOCK-${args.orderNumber}`,
      raw: { mock: true, note: 'Mock provider — no bank contacted', args },
    };
  },

  async verify(args: VerifyArgs): Promise<VerifyResult> {
    const outcome = configuredOutcome();
    logger.warn({ orderNumber: args.orderNumber, outcome }, 'MOCK PAYMENT verify()');

    if (outcome !== 'SUCCEEDED') {
      return {
        outcome,
        errorCode: 'MOCK_DECLINED',
        errorMessage: `Mock provider configured to return ${outcome}`,
        raw: { mock: true, outcome },
      };
    }

    return {
      outcome: 'SUCCEEDED',
      currency: 'AMD',
      raw: { mock: true, outcome: 'SUCCEEDED' },
    };
  },
};