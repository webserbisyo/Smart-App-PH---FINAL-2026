// Kitchen / Packing view (O5) and Find order: which tickets the wall shows, and how a typed or scanned
// code becomes a search. Pure functions, shared by the dashboard and its tests.
import type { OrderStatus, OrderType, PaymentMethod, PaymentStatus } from '../schemas/enums.js';
import { nextActions } from './order-rules.js';
import { orderTiming } from './order-timing.js';
import { PICKUP_CODE_ALPHABET } from './pickup-code.js';

export interface KitchenOrderInput {
  status: OrderStatus;
  type: OrderType;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  startBy: string;
  dueAt: string;
  orderNo: number;
}

/**
 * Tickets to make now, oldest start-by first: Preparing orders, and New orders once their start time is
 * near (orderTiming `active`). Unpaid transfers stay off the wall: they can't be started until paid.
 */
export function kitchenTickets<T extends KitchenOrderInput>(
  orders: readonly T[],
  now: Date,
  type: OrderType | 'all' = 'all',
): T[] {
  return orders
    .filter((o) => type === 'all' || o.type === type)
    .filter((o) => {
      if (o.status === 'preparing') return true;
      if (o.status !== 'placed') return false;
      return orderTiming(o, now).phase === 'active' && nextActions(o).length > 0;
    })
    .sort(
      (a, b) =>
        new Date(a.startBy).getTime() - new Date(b.startBy).getTime() || a.orderNo - b.orderNo,
    );
}

/** Ready orders waiting to be handed over, for the thin row at the bottom (oldest due first). */
export function kitchenReady<T extends KitchenOrderInput>(
  orders: readonly T[],
  type: OrderType | 'all' = 'all',
): T[] {
  return orders
    .filter((o) => o.status === 'ready' && (type === 'all' || o.type === type))
    .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
}

/** Line checks on this device: order id → indexes of the lines the cook ticked. */
export type KitchenChecks = Record<string, number[]>;

export function toggleKitchenCheck(
  checks: KitchenChecks,
  orderId: string,
  line: number,
): KitchenChecks {
  const current = checks[orderId] ?? [];
  const next = current.includes(line)
    ? current.filter((l) => l !== line)
    : [...current, line].sort((a, b) => a - b);
  const copy: KitchenChecks = { ...checks };
  if (next.length === 0) delete copy[orderId];
  else copy[orderId] = next;
  return copy;
}

/** Drops ticks for orders that left the wall, so the device keeps only what is still open. */
export function pruneKitchenChecks(
  checks: KitchenChecks,
  openIds: ReadonlySet<string>,
): KitchenChecks {
  const kept: KitchenChecks = {};
  for (const [id, lines] of Object.entries(checks)) {
    if (openIds.has(id)) kept[id] = lines;
  }
  return kept;
}

export type FindQuery =
  // Typed: an order number, a pickup code, or both when the text could be either ("2345").
  | { kind: 'typed'; orderNo: number | null; code: string | null }
  // Scanned: the shop and token from the receipt link in the QR.
  | { kind: 'receipt'; slug: string; token: string };

/** Spaces, a leading # and lower case don't matter: " k7 qp " → "K7QP", "#012" → "012". */
export function normalizeFindCode(raw: string): string {
  return raw.replace(/\s+/g, '').replace(/^#/, '').toUpperCase();
}

const RECEIPT_PATH = /\/([a-z0-9-]+)\/o\/([A-Za-z0-9_-]{8,})(?:[/?#]|$)/;

function isPickupCode(code: string): boolean {
  return code.length === 4 && [...code].every((c) => PICKUP_CODE_ALPHABET.includes(c));
}

/**
 * What the owner typed or scanned, as one search: an order number ("12", "#012"), a 4-character pickup
 * code, or a receipt link from the QR (its shop and token). Anything else is null.
 */
export function parseFindInput(raw: string): FindQuery | null {
  const receipt = RECEIPT_PATH.exec(raw.trim());
  if (receipt?.[1] && receipt[2]) return { kind: 'receipt', slug: receipt[1], token: receipt[2] };
  const text = normalizeFindCode(raw);
  const orderNo = /^\d{1,6}$/.test(text) && Number(text) > 0 ? Number(text) : null;
  const code = isPickupCode(text) ? text : null;
  return orderNo === null && code === null ? null : { kind: 'typed', orderNo, code };
}
