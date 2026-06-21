// backend/src/payments/ameriabank/ameriabank.client.ts
/**
 * Axios instance pointed at the configured base URL. Kept tiny on purpose —
 * the adapter does the protocol-level work; this just owns the connection.
 *
 * Note on timeouts: the bank's API can take a few seconds under load. 15s is
 * generous for InitPayment and conservative for GetPaymentDetails. If you see
 * spurious ECONNABORTED errors during peak hours, raise it.
 */
import axios, { type AxiosInstance } from 'axios';
import { env } from '../../config/env';

export function createAmeriabankClient(): AxiosInstance {
  return axios.create({
    baseURL: env.AMERIABANK_BASE_URL,
    timeout: 15_000,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    // The bank's API uses POST for both InitPayment and GetPaymentDetails.
    // Never log Username/Password — see redaction in errorHandler below.
  });
}
