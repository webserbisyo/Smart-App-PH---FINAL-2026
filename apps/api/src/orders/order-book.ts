import { randomBytes } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import {
  manilaDate,
  pickupCode,
  type BasketLine,
  type PublicShop,
  type Quote,
  type QuoteProblem,
  type ErrorCode,
  type ScheduleBookingsInput,
} from '@smartapp/core';
import { sql } from 'drizzle-orm';
import { ApiFailure } from '../common/api-failure.js';
import { Db } from '../db/db.service.js';
import { orderLineOptions, orderLines } from '../db/generated/schema.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** An order's receipt link: 24 random URL-safe characters (the column takes 16 to 64). */
export function newToken(): string {
  return randomBytes(18).toString('base64url');
}

export function uuidOrNull(value: string | null | undefined): string | null {
  return value && UUID.test(value) ? value : null;
}

/** The error a quote problem answers with when the order is placed anyway (the mock's mapping). */
export function quoteProblemCode(p: QuoteProblem): ErrorCode {
  switch (p.code) {
    case 'shop_paused':
      return 'shop_closed';
    case 'below_min_order':
    case 'empty_basket':
      return 'invalid_input';
    default:
      return p.code;
  }
}

/** A flagged line or a quote problem stops the order, worded from its code (rule 7). */
export function failOnQuote(q: Quote, slotCode: ErrorCode = 'slot_unavailable'): void {
  const flagged = q.lines.find((l) => l.problems.length > 0);
  if (flagged) {
    const code = flagged.problems[0]?.code;
    throw new ApiFailure(
      code === 'sold_out' || code === 'sold_out_today'
        ? 'out_of_stock'
        : code === 'item_missing' || code === 'variant_missing'
          ? 'item_unavailable'
          : 'invalid_options',
      409,
    );
  }
  const first = q.problems[0];
  if (!first) return;
  throw new ApiFailure(first.code === 'slot_unavailable' ? slotCode : quoteProblemCode(first), 409);
}

/**
 * What every order path shares (storefront checkout, the owner's New order and Edit order): booked times and
 * items for the schedule, the order number, the daily limits, and writing the lines. Everything runs in the
 * request's transaction under the shop's RLS; the SQL guards (next_order_no, take_daily_count, lock_slot)
 * decide when two phones race for the last place.
 */
@Injectable()
export class OrderBook {
  constructor(@Inject(Db) private readonly db: Db) {}

  /**
   * Booked times and items still to come, for the schedule rules in core. `exceptId` leaves one order out,
   * so moving or editing it never competes with itself (T85). Cancelled and expired orders gave theirs back.
   */
  async bookings(exceptId?: string | null): Promise<ScheduleBookingsInput> {
    const shopId = this.db.shopId;
    const except = uuidOrNull(exceptId);
    const skip = except ? sql`and o.id <> ${except}::uuid` : sql``;
    const slots = await this.db.tx.execute<{ at: string; n: number }>(sql`
      select o.scheduled_at as at, count(*)::int as n
      from public.orders o
      where o.tenant_id = ${shopId} and o.scheduled_at is not null
        and o.scheduled_at >= now() - interval '1 day'
        and o.status not in ('cancelled', 'expired') ${skip}
      group by o.scheduled_at`);
    const lines = await this.db.tx.execute<{ day: string; item_id: string; n: number }>(sql`
      select to_char(o.due_at at time zone 'Asia/Manila', 'YYYY-MM-DD') as day, l.item_id, sum(l.qty)::int as n
      from public.orders o
      join public.order_lines l on l.order_id = o.id and l.tenant_id = o.tenant_id
      where o.tenant_id = ${shopId}
        and o.due_at >= now() - interval '1 day'
        and o.status not in ('cancelled', 'expired') ${skip}
      group by 1, 2`);
    const slotCounts: Record<string, number> = {};
    for (const row of slots.rows) slotCounts[new Date(row.at).toISOString()] = Number(row.n);
    const itemCounts: Record<string, Record<string, number>> = {};
    for (const row of lines.rows) {
      const day = (itemCounts[row.day] ??= {});
      day[row.item_id] = Number(row.n);
    }
    return { slotCounts, itemCounts };
  }

  /** Holds one booking time until the transaction ends, so two orders never both take its last place. */
  async lockSlot(at: string): Promise<void> {
    await this.db.tx.execute(sql`select private.lock_slot(${at}::timestamptz)`);
  }

  /** The next gap-free number for today (Manila); the counter row's lock orders two orders at once. */
  async nextOrderNo(now: Date): Promise<{ orderNo: number; businessDate: string }> {
    const businessDate = manilaDate(now);
    const result = await this.db.tx.execute<{ n: number }>(
      sql`select private.next_order_no(${businessDate}::date) as n`,
    );
    const orderNo = Number(result.rows[0]?.n ?? 0);
    if (orderNo < 1) throw new ApiFailure('unknown', 500);
    return { orderNo, businessDate };
  }

  /**
   * Takes each item's quantity from its daily limit for the order's day (items without a limit always pass).
   * `skip` leaves out what an edit already holds; `allowOver` is the owner's Allow anyway (P6).
   */
  async takeDailyCounts(
    lines: readonly Pick<BasketLine, 'itemId' | 'qty'>[],
    day: string,
    allowOver = false,
  ): Promise<void> {
    const perItem = new Map<string, number>();
    for (const l of lines) perItem.set(l.itemId, (perItem.get(l.itemId) ?? 0) + l.qty);
    for (const [itemId, qty] of perItem) {
      if (qty <= 0 || !uuidOrNull(itemId)) continue;
      const result = await this.db.tx.execute<{ ok: boolean }>(
        sql`select private.take_daily_count(${itemId}::uuid, ${day}::date, ${qty}) as ok`,
      );
      if (result.rows[0]?.ok !== true && !allowOver) {
        throw new ApiFailure('daily_limit_reached', 409);
      }
    }
  }

  /** Gives an order's quantities back to the day's limits (a cancel, an expiry or an edit), once. */
  async giveBackDailyCounts(
    lines: readonly { itemId: string; qty: number }[],
    day: string,
  ): Promise<void> {
    const perItem = new Map<string, number>();
    for (const l of lines) perItem.set(l.itemId, (perItem.get(l.itemId) ?? 0) + l.qty);
    for (const [itemId, qty] of perItem) {
      if (qty <= 0 || !uuidOrNull(itemId)) continue;
      await this.db.tx.execute(
        sql`select private.give_back_daily_count(${itemId}::uuid, ${day}::date, ${qty})`,
      );
    }
  }

  /** Writes an order's lines and add-ons with the names and prices of this moment (history, not a copy). */
  async writeLines(orderId: string, shop: PublicShop, q: Quote): Promise<void> {
    const shopId = this.db.shopId;
    const options = new Map(
      shop.catalog.optionGroups.flatMap((g) => g.options).map((o) => [o.id, o]),
    );
    for (const [sort, line] of q.lines.entries()) {
      if (line.problems.length > 0) continue;
      const [written] = await this.db.tx
        .insert(orderLines)
        .values({
          tenantId: shopId,
          orderId,
          itemId: line.itemId,
          variantId: line.variantId,
          name: line.name,
          variantLabel: line.variantLabel,
          note: line.note.trim(),
          qty: line.qty,
          unitPrice: line.unitPrice,
          lineTotal: line.lineTotal,
          sort,
        })
        .returning({ id: orderLines.id });
      if (!written) throw new ApiFailure('unknown', 500);
      const picked = [...new Set(line.optionIds)].flatMap((id) => {
        const option = options.get(id);
        return option ? [option] : [];
      });
      if (picked.length > 0) {
        await this.db.tx.insert(orderLineOptions).values(
          picked.map((o) => ({
            tenantId: shopId,
            lineId: written.id,
            optionId: o.id,
            name: o.name,
            price: o.priceDelta,
          })),
        );
      }
    }
  }

  /** A new receipt link and its pickup code. */
  newTicket(): { token: string; pickupCode: string } {
    const token = newToken();
    return { token, pickupCode: pickupCode(token) };
  }
}
