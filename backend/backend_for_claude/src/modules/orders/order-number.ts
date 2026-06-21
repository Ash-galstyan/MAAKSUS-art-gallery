// backend/src/modules/orders/order-number.ts
/**
 * Atomic, gapless-ish order numbers via a dedicated Postgres sequence.
 *
 * Why a sequence and not max(id)+1?  Sequences are concurrency-safe at the DB
 * level — no race between two simultaneous checkouts. They may have gaps if a
 * transaction rolls back, which is fine; the number doesn't need to be gapless,
 * just unique per merchant (Ameriabank's OrderID requirement).
 *
 * The sequence is created by the migration below — add this to a new migration
 * named `add_order_number_sequence`:
 *
 *   CREATE SEQUENCE order_number_seq START 1;
 */
import { prisma } from '../../lib/prisma';

export async function nextOrderNumber(): Promise<string> {
  const rows = await prisma.$queryRaw<{ nextval: bigint }[]>`
    SELECT nextval('order_number_seq') AS nextval
  `;
  const seq = rows[0]?.nextval ?? 0n;
  const year = new Date().getFullYear();
  return `ORD-${year}-${String(seq).padStart(6, '0')}`;
}
