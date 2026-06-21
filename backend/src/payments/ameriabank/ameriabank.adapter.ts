// backend/src/payments/ameriabank/ameriabank.adapter.ts
/**
 * ════════════════════════════════════════════════════════════════════════════
 *  AMERIABANK vPOS ADAPTER
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Implements the PaymentProvider contract using Ameriabank's REST API.
 *
 * ─── Flow ─────────────────────────────────────────────────────────────────
 *
 *   1.  Checkout (POST /api/orders/checkout)
 *         orders.service.checkout() creates Order(PENDING) + OrderItems and
 *         calls THIS adapter's createSession().
 *
 *   2.  createSession() → POST {BASE_URL}/InitPayment
 *         Body: { ClientID, Username, Password, Amount, OrderID, BackURL, ... }
 *         The bank replies with { PaymentID, ResponseCode, ResponseMessage }.
 *         ResponseCode === 1 means success.
 *
 *         We build the customer-facing redirect URL by appending the PaymentID
 *         and language to the AMERIABANK_PAYMENT_PAGE_URL. The browser is sent
 *         there; the bank renders its own hosted page with 3-D Secure.
 *
 *   3.  Bank hosted page → customer enters card details, completes 3-D Secure.
 *
 *   4.  Bank redirects customer's browser to BackURL (= AMERIABANK_RETURN_URL).
 *         The querystring contains at least: orderID=<numeric>, paymentID=<...>
 *         and a result code/state hint. WE NEVER TRUST THE QUERY HINT.
 *
 *   5.  payments.controller.ameriabankReturn → orders.service.handlePaymentReturn
 *         which calls THIS adapter's verify().
 *
 *   6.  verify() → POST {BASE_URL}/GetPaymentDetails
 *         Body: { PaymentID, Username, Password }.
 *         Response contains PaymentState ("Completed" | "Rejected" | "Cancelled"
 *         | "Expired" | …) along with amount, RRN, masked card, etc.
 *         We translate PaymentState → VerifyOutcome and let orders.service
 *         persist + transition the order.
 *
 * ─── Why server-to-server verify ──────────────────────────────────────────
 *
 *   The redirect querystring is attacker-controllable. A user (or anyone)
 *   could craft `?orderID=ours&resultCode=success` and visit the return URL
 *   without ever paying. Calling GetPaymentDetails directly to the bank with
 *   our credentials is the only trustworthy way to confirm a payment.
 *
 * ─── Credential rotation (test → live) ────────────────────────────────────
 *
 *   To switch environments, change FOUR env vars and restart:
 *     AMERIABANK_BASE_URL         → https://services.ameriabank.am/VPOS/api/VPOS
 *     AMERIABANK_PAYMENT_PAGE_URL → https://services.ameriabank.am/VPOS/Payments/Pay
 *     AMERIABANK_CLIENT_ID        → live Client ID
 *     AMERIABANK_USERNAME / _PASSWORD → live creds
 *     AMERIABANK_ORDER_ID_MIN/MAX → live-assigned range
 *
 *   See ameriabank.README.md in this folder for full onboarding steps.
 *
 * ─── Onboarding checklist (test env) ──────────────────────────────────────
 *
 *   ☐ Apply for Ameria Internet Acquiring Service
 *   ☐ Receive test credentials (ClientID, Username, Password) by email
 *   ☐ Set AMERIABANK_ORDER_ID_MIN/MAX to your assigned test range
 *   ☐ Make 5 successful test payments with completed status, OrderIDs in range
 *   ☐ Confirm receipt by email (the bank waits for this)
 *   ☐ Request live credentials after testing is approved
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { type AxiosInstance, isAxiosError } from 'axios';
import { env } from '../../config/env';
import { logger } from '../../lib/logger';
import { HttpError } from '../../lib/http-error';
import { createAmeriabankClient } from './ameriabank.client';
import { nextAmeriabankOrderId } from './ameriabank-order-id';
import type {
  PaymentProvider,
  CreateSessionArgs,
  CreateSessionResult,
  VerifyArgs,
  VerifyResult,
  VerifyOutcome,
} from '../provider.interface';
import type {
  InitPaymentRequest,
  InitPaymentResponse,
  GetPaymentDetailsRequest,
  GetPaymentDetailsResponse,
} from './ameriabank.types';

const SUCCESS_RESPONSE_CODE = 1;

/**
 * Maps the bank's PaymentState string to our internal outcome union.
 * Conservative on unknown values — treat anything we can't classify as FAILED
 * rather than risk shipping an order that wasn't actually paid.
 */
function paymentStateToOutcome(state: string): VerifyOutcome {
  const normalized = state.trim().toLowerCase();
  if (normalized === 'completed') return 'SUCCEEDED';
  if (normalized === 'cancelled' || normalized === 'canceled') return 'CANCELLED';
  return 'FAILED'; // rejected, expired, declined, anything unknown
}

/**
 * Build the customer-facing redirect URL given a PaymentID returned by
 * InitPayment. The bank's hosted page reads `id` and `lang` from the query.
 */
function buildRedirectUrl(paymentId: string): string {
  const url = new URL(env.AMERIABANK_PAYMENT_PAGE_URL);
  url.searchParams.set('id', paymentId);
  url.searchParams.set('lang', env.AMERIABANK_LANGUAGE);
  return url.toString();
}

/**
 * Append `orderID` to BackURL so when the bank redirects the customer back,
 * the return handler can resolve the order without trusting other params.
 */
function backUrlForBankOrderId(bankOrderId: number): string {
  const url = new URL(env.AMERIABANK_RETURN_URL);
  url.searchParams.set('orderID', String(bankOrderId));
  return url.toString();
}

/**
 * Safe error logger — strips credentials before they hit the log stream.
 * NEVER log raw responses from this adapter without going through here.
 */
function redactForLog(payload: unknown): unknown {
  if (!payload || typeof payload !== 'object') return payload;
  const obj = payload as Record<string, unknown>;
  const clone: Record<string, unknown> = { ...obj };
  for (const k of Object.keys(clone)) {
    if (/password|username|clientid/i.test(k)) clone[k] = '<redacted>';
  }
  return clone;
}

class AmeriabankAdapter implements PaymentProvider {
  readonly name = 'AMERIABANK' as const;
  private readonly http: AxiosInstance;

  constructor() {
    this.http = createAmeriabankClient();
  }

  /**
   * createSession — calls InitPayment and returns the URL we redirect the
   * customer to.
   *
   * The Payment row in our DB already exists (created by orders.service).
   * On success we hand back the providerPaymentId for that row to persist;
   * on failure we throw and orders.service marks the Order/Payment FAILED.
   */
  async createSession(args: CreateSessionArgs): Promise<CreateSessionResult> {
    this.assertConfigured();

    const bankOrderId = await nextAmeriabankOrderId();

    const body: InitPaymentRequest = {
      ClientID: env.AMERIABANK_CLIENT_ID,
      Username: env.AMERIABANK_USERNAME,
      Password: env.AMERIABANK_PASSWORD,
      Amount: args.amount,
      OrderID: bankOrderId,
      BackURL: backUrlForBankOrderId(bankOrderId),
      Currency: env.AMERIABANK_CURRENCY,
      Description: args.description.slice(0, 100), // keep short for the bank's page
      Opaque: args.orderNumber,                    // our user-facing reference,
                                                   // echoed back in GetPaymentDetails
      Timeout: env.AMERIABANK_TIMEOUT_SECONDS,
    };

    let resp;
    try {
      resp = await this.http.post<InitPaymentResponse>('/InitPayment', body);
    } catch (err) {
      this.logAxiosError('InitPayment', err);
      throw new HttpError(502, 'Payment provider unreachable', 'PAYMENT_PROVIDER_DOWN');
    }

    const data = resp.data;

    if (data.ResponseCode !== SUCCESS_RESPONSE_CODE || !data.PaymentID) {
      logger.warn(
        {
          bankOrderId,
          ResponseCode: data.ResponseCode,
          ResponseMessage: data.ResponseMessage,
        },
        'Ameriabank InitPayment rejected',
      );
      throw new HttpError(
        502,
        `Payment provider rejected request: ${data.ResponseMessage ?? 'unknown'}`,
        'PAYMENT_INIT_REJECTED',
      );
    }

    return {
      providerPaymentId: data.PaymentID,
      redirectUrl: buildRedirectUrl(data.PaymentID),
      // raw response gets persisted to Payment.rawInitResponse for audit.
      // We DO NOT include `body` here — it contains credentials.
      raw: { response: data, bankOrderId },
    };
  }

  /**
   * verify — calls GetPaymentDetails. Translates PaymentState into our
   * three-value outcome.
   *
   * Idempotent on the bank's side: calling GetPaymentDetails twice for the
   * same PaymentID returns the same answer, so retries in the return handler
   * are safe.
   */
  async verify(args: VerifyArgs): Promise<VerifyResult> {
    this.assertConfigured();

    const body: GetPaymentDetailsRequest = {
      PaymentID: args.providerPaymentId,
      Username: env.AMERIABANK_USERNAME,
      Password: env.AMERIABANK_PASSWORD,
    };

    let resp;
    try {
      resp = await this.http.post<GetPaymentDetailsResponse>('/GetPaymentDetails', body);
    } catch (err) {
      this.logAxiosError('GetPaymentDetails', err);
      // Don't translate to a final outcome on network error — the order
      // stays PENDING and the user can retry the return, or admin can
      // resolve manually. Throw so orders.service surfaces it.
      throw new HttpError(502, 'Could not verify payment', 'PAYMENT_VERIFY_FAILED');
    }

    const data = resp.data;

    if (data.ResponseCode !== SUCCESS_RESPONSE_CODE) {
      // The bank refused the verify call itself (bad creds, unknown PaymentID, …).
      // Treat as FAILED so the order doesn't sit in PENDING forever.
      logger.warn(
        {
          paymentId: args.providerPaymentId,
          ResponseCode: data.ResponseCode,
          ResponseMessage: data.ResponseMessage,
        },
        'Ameriabank GetPaymentDetails reported error',
      );
      return {
        outcome: 'FAILED',
        errorCode: String(data.ResponseCode),
        errorMessage: data.ResponseMessage,
        raw: data,
      };
    }

    // Sanity-check: bank's echoed Opaque should match our orderNumber.
    // If it doesn't, refuse to call this a success — something is very wrong.
    if (data.Opaque && data.Opaque !== args.orderNumber) {
      logger.error(
        { expected: args.orderNumber, got: data.Opaque, paymentId: args.providerPaymentId },
        'Ameriabank Opaque mismatch — refusing to honour payment',
      );
      return {
        outcome: 'FAILED',
        errorCode: 'OPAQUE_MISMATCH',
        errorMessage: 'Order reference mismatch',
        raw: data,
      };
    }

    const outcome = paymentStateToOutcome(data.PaymentState);

    return {
      outcome,
      amount: data.ApprovedAmount ?? data.Amount,
      currency: data.Currency,
      errorCode: outcome === 'SUCCEEDED' ? undefined : data.PaymentState,
      errorMessage: outcome === 'SUCCEEDED' ? undefined : data.ResponseMessage,
      raw: data,
    };
  }

  // ─── helpers ─────────────────────────────────────────────────────────────

  private assertConfigured(): void {
    if (!env.AMERIABANK_CLIENT_ID || !env.AMERIABANK_USERNAME || !env.AMERIABANK_PASSWORD) {
      throw new HttpError(
        500,
        'Ameriabank credentials are not configured — see backend/src/payments/ameriabank/ameriabank.README.md',
        'PAYMENT_NOT_CONFIGURED',
      );
    }
  }

  private logAxiosError(op: 'InitPayment' | 'GetPaymentDetails', err: unknown): void {
    if (isAxiosError(err)) {
      logger.error(
        {
          op,
          status: err.response?.status,
          data: redactForLog(err.response?.data),
          code: err.code,
          message: err.message,
        },
        'Ameriabank request failed',
      );
    } else {
      logger.error({ op, err }, 'Ameriabank request failed (non-axios)');
    }
  }
}

export const ameriabankAdapter: PaymentProvider = new AmeriabankAdapter();
