// backend/src/payments/provider.interface.ts
/**
 * Adapter contract for payment providers. Any provider (Ameriabank, Idram,
 * Stripe…) must implement this to plug into the orders flow.
 *
 * Two methods:
 *   - createSession: backend → provider; called when user clicks "Pay".
 *     Returns the URL we 302 the user to.
 *   - verify: provider → backend; called from the return handler. Confirms
 *     the payment server-to-server (never trust the redirect querystring).
 */
export interface CreateSessionArgs {
  orderNumber: string;       // human-readable; also the provider's OrderID
  amount: number;            // whole AMD
  currency: 'AMD';
  description: string;
  returnUrl: string;
  customerEmail?: string | null;
}

export interface CreateSessionResult {
  redirectUrl: string;       // user is sent here
  providerPaymentId: string;
  raw: unknown;              // full provider response — persisted for audit
}

export interface VerifyArgs {
  providerPaymentId: string;
  orderNumber: string;
}

export type VerifyOutcome = 'SUCCEEDED' | 'FAILED' | 'CANCELLED';

export interface VerifyResult {
  outcome: VerifyOutcome;
  amount?: number;
  currency?: string;
  errorCode?: string;
  errorMessage?: string;
  raw: unknown;
}

export interface PaymentProvider {
  readonly name: 'AMERIABANK';        // extend the union when adding providers
  createSession(args: CreateSessionArgs): Promise<CreateSessionResult>;
  verify(args: VerifyArgs): Promise<VerifyResult>;
}
