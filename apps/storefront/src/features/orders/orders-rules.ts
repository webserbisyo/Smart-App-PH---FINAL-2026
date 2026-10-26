// My orders (T11): which orders are active, the next step in words, and the rows kept on the phone.
import {
  isFinal,
  isTransfer,
  minutesUntil,
  vocab,
  words,
  type Item,
  type OrderReceipt,
  type OrderRow,
  type ShopKind,
} from '@smartapp/core';

export const ORDER_TABS = ['active', 'past'] as const;
export type OrderTab = (typeof ORDER_TABS)[number];

// Past orders show 20 at a time (test-stress has 50).
export const PAST_PAGE = 20;

export function splitOrders(rows: readonly OrderRow[]): { active: OrderRow[]; past: OrderRow[] } {
  return {
    active: rows.filter((r) => !isFinal(r.status)),
    past: rows.filter((r) => isFinal(r.status)),
  };
}

/** The tab from ?tab=, else Active when something is in progress, else Past. */
export function pickTab(param: string | null, activeCount: number): OrderTab {
  if (param === 'active' || param === 'past') return param;
  return activeCount > 0 ? 'active' : 'past';
}

/** Server rows win over the copies saved on the phone; one row per order, newest first. */
export function mergeOrderRows(
  server: readonly OrderRow[] | undefined,
  saved: readonly OrderRow[],
): OrderRow[] {
  const byToken = new Map<string, OrderRow>();
  for (const row of saved) byToken.set(row.token, row);
  for (const row of server ?? []) byToken.set(row.token, row);
  return [...byToken.values()].sort((a, b) => b.placedAt.localeCompare(a.placedAt));
}

/** A receipt saved on the phone as a My orders row (shown offline or when loading fails). */
export function rowFromReceipt(receipt: OrderReceipt, items: readonly Item[]): OrderRow {
  return {
    slug: receipt.slug,
    token: receipt.token,
    orderNo: receipt.orderNo,
    type: receipt.type,
    status: receipt.status,
    paymentStatus: receipt.paymentStatus,
    total: receipt.totals.total,
    placedAt: receipt.placedAt,
    scheduledAt: receipt.scheduledAt,
    itemCount: receipt.lines.reduce((n, l) => n + l.qty, 0),
    summary: receipt.lines.map((l) => `${l.qty} × ${l.name}`).join(', '),
    photos: receipt.lines
      .flatMap((l) => {
        const photo = items.find((i) => i.id === l.itemId)?.photos[0];
        return photo ? [photo] : [];
      })
      .slice(0, 3),
    paymentMethod: receipt.paymentMethod,
    expiresAt: receipt.expiresAt,
    ratingStars: receipt.rating?.stars ?? null,
  };
}

/** What the customer waits for or does next, in words. Null once the order has ended. */
export function nextStep(row: OrderRow, kind: ShopKind, now: string | null): string | null {
  const W = words.orders.next;
  switch (row.status) {
    case 'placed': {
      if (isTransfer(row.paymentMethod) && row.paymentStatus === 'unpaid') {
        if (!row.expiresAt || !now) return W.uploadProof;
        return W.payWithin(Math.max(1, minutesUntil(row.expiresAt, now)));
      }
      if (row.paymentStatus === 'pending') return W.checking;
      return W.placed;
    }
    case 'preparing':
      return vocab(kind).prepHero;
    case 'ready':
      return words.receipt.hero.ready[row.type];
    case 'out_for_delivery':
      return W.outForDelivery;
    default:
      return null;
  }
}
