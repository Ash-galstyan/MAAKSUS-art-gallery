// backend/src/payments/ameriabank/ameriabank.types.ts
/**
 * Request / response shapes for Ameriabank vPOS REST endpoints.
 *
 * Sourced from the bank's published help page:
 *   https://servicestest.ameriabank.am/VPOS/Help/Api/POST-api-VPOS-InitPayment
 *
 * Field names are PascalCase to match the wire format — we don't transform
 * them. Keep these types in sync if the bank publishes a v2.
 */

export interface InitPaymentRequest {
  ClientID: string;
  Amount: number;        // decimal in major units (e.g. 1500.00 AMD)
  OrderID: number;       // integer, must be within the bank-assigned range
  BackURL: string;       // where the bank redirects the browser after payment
  Username: string;
  Password: string;
  Description?: string;
  Currency?: string;     // 3-letter ISO, e.g. "AMD"
  CardHolderID?: string; // for card-binding flows; not used in v1
  Opaque?: string;       // free-form merchant data, echoed back verbatim
  Timeout?: number;      // seconds the bank holds the session open
}

export interface InitPaymentResponse {
  PaymentID: string;
  ResponseCode: number;  // 1 = success per bank convention; anything else = failure
  ResponseMessage: string;
}

export interface GetPaymentDetailsRequest {
  PaymentID: string;
  Username: string;
  Password: string;
}

/**
 * Response shape based on bank docs and the published Laravel SDK fields.
 * Status semantics (observed across community integrations):
 *
 *   PaymentState:
 *     "Completed"       — payment captured successfully
 *     "Rejected"        — bank or 3-D Secure declined
 *     "Cancelled"       — user clicked Cancel on the hosted page
 *     "Expired"         — session timed out without completion
 *     "Started" / "Initiated" — still in progress; we shouldn't see this on return
 *
 * `ResponseCode === 1` confirms the bank accepted the GetPaymentDetails
 * request itself (not that the payment succeeded — see PaymentState for that).
 */
export interface GetPaymentDetailsResponse {
  PaymentID: string;
  OrderID: number;
  Amount: number;
  ApprovedAmount?: number;
  DepositedAmount?: number;
  PaymentState: string;            // see semantics above
  ResponseCode: number;
  ResponseMessage: string;
  RRN?: string;                    // bank reference number (useful for support)
  TransactionID?: string;
  CardNumber?: string;             // masked, e.g. "4111****1111"
  Currency?: string;
  Opaque?: string;
  // Additional fields exist (DateTime, MerchantID, etc.) — captured
  // verbatim in Payment.rawVerifyResponse for audit; not typed here.
  [key: string]: unknown;
}
