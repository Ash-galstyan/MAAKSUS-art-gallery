// backend/src/payments/ameriabank/ameriabank-order-id.ts
/**
 * Allocates the next numeric OrderID for an Ameriabank InitPayment call.
 *
 * The bank requires OrderIDs to fall inside an assigned range (e.g. 2350301
 * through 2350400 for test). We map sequential allocations from
 * `ameriabank_order_id_seq` into that range by offsetting from MIN.
 *
 * If you exceed the range, the bank will reject InitPayment. In test, ask the
 * bank for a wider range. In live, you should never hit the cap — but the
 * adapter throws a clear error if it happens, so you find out early.
 */
import { prisma } from '../../lib/prisma';
import { env } from '../../config/env';
import { HttpError } from '../../lib/http-error';

export async function nextAmeriabankOrderId(): Promise<number> {
  const rows = await prisma.$queryRaw<{ nextval: bigint }[]>`
    SELECT nextval('ameriabank_order_id_seq') AS nextval
  `;
  const seq = Number(rows[0]?.nextval ?? 0);
  const candidate = env.AMERIABANK_ORDER_ID_MIN + (seq - 1);

  if (candidate > env.AMERIABANK_ORDER_ID_MAX) {
    throw new HttpError(
      500,
      'Ameriabank OrderID range exhausted — request a wider range from the bank',
      'BANK_ORDER_ID_EXHAUSTED',
    );
  }
  return candidate;
}
