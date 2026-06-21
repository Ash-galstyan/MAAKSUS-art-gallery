<!-- backend/src/payments/ameriabank/ameriabank.README.md -->
# Ameriabank vPOS Adapter

Everything you need to onboard, test, and go live with Ameriabank's virtual
POS terminal. Read this end-to-end the first time; skim later.

## 1. What this adapter does

- **`createSession(args)`** — calls `POST /InitPayment` and returns the URL
  to redirect the customer to (the bank's hosted card-entry page with 3-D
  Secure).
- **`verify(args)`** — calls `POST /GetPaymentDetails` from the return-URL
  handler to confirm payment server-to-server. Never trusts the redirect
  querystring.

Both methods implement the `PaymentProvider` interface in
`backend/src/payments/provider.interface.ts`. To swap providers later (Idram,
ArCa, Telcell, Stripe…), implement that interface in a sibling folder and
update `backend/src/payments/index.ts` to return the new instance.

## 2. Onboarding (test environment)

These steps must happen in the real world before any code path that hits the
bank's API will work.

1. **Apply for the Internet Acquiring Service.** Go to
   <https://ecommerce.ameriabank.am/> (or open a ticket through your business
   account). You'll be asked about your business, the site URL, expected
   transaction volume, refund policy, etc.

2. **Receive test credentials.** Once approved, the vPOS team emails you:
   - A `ClientID` (UUID, e.g. `7e7ef8ff-6300-4a78-bb31-3ad1a8c67d5f`)
   - A `Username` and `Password` for the API
   - An assigned **OrderID range** for testing (a block of ~100 integers,
     e.g. `2350301`–`2350400`)
   - A test amount constraint (typically **10 AMD** per transaction)
   - A link to <https://servicestest.ameriabank.am/VPOS/help> for the API
     reference

3. **Populate `.env`:**
   