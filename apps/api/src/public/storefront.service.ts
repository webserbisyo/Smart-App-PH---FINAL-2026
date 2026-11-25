import { Inject, Injectable } from '@nestjs/common';
import {
  dueTimes,
  isTransfer,
  manilaDate,
  normalisePhPhone,
  paymentAccountFor,
  quote,
  QuoteSchema,
  scheduleDays,
  words,
  type OrderPayload,
  type OrderType,
  type PublicShop,
  type Quote,
  type Schedule,
} from '@smartapp/core';
import { and, eq, sql } from 'drizzle-orm';
import { ApiFailure } from '../common/api-failure.js';
import { Db } from '../db/db.service.js';
import { orderEvents, orders, tenants } from '../db/generated/schema.js';
import { EditorService } from '../editor/editor.service.js';
import { failOnQuote, OrderBook, uuidOrNull } from '../orders/order-book.js';
import { ShopReader } from './shop-reader.js';

// A transfer is paid within 30 minutes or the order expires (A-mvp, the expiry job).
const PAY_MINUTES = 30;
// Limits (phases-4-6 section 3, R12): per phone, then per shop.
const UNPAID_PER_PHONE = 3;
const ORDERS_PER_SHOP_MINUTE = 30;

export interface PlacedOrder {
  orderId: string;
  orderNo: number;
  token: string;
}

/**
 * The customer's side of a shop before and while ordering (api.md "Storefront"): the shop itself, its
 * draft for the owner's preview, the days and times it can take, the price check and Place order. The shop
 * comes from the link (`enterShop`), so RLS keeps every read and write inside it.
 */
@Injectable()
export class StorefrontService {
  constructor(
    @Inject(Db) private readonly db: Db,
    @Inject(ShopReader) private readonly shops: ShopReader,
    @Inject(OrderBook) private readonly book: OrderBook,
    @Inject(EditorService) private readonly editor: EditorService,
  ) {}

  /** A live or demo shop as customers see it; anything else is Not found (rule 12). */
  async getStorefront(slug: string): Promise<PublicShop> {
    await this.shops.enterShop(slug);
    return this.shops.read('published');
  }

  /**
   * The Editor's draft behind the owner's preview link. It works before the shop is live (the owner is still
   * setting up), so the shop comes from the signed token and the link's slug must match it.
   */
  async getStorefrontPreview(slug: string, token: string): Promise<PublicShop> {
    const shopId = this.editor.previewShopOf(token);
    if (!shopId || !uuidOrNull(shopId)) throw new ApiFailure('preview_expired', 410);
    await this.db.useShop(shopId);
    const [shop] = await this.db.tx
      .select({ slug: tenants.slug })
      .from(tenants)
      .where(eq(tenants.id, shopId));
    if (!shop || shop.slug !== slug.trim().toLowerCase()) {
      throw new ApiFailure('shop_not_found', 404);
    }
    return this.shops.read('draft');
  }

  /** The days and times a basket can be booked for, counting what is already booked (T85). */
  async getSchedule(
    slug: string,
    lines: readonly { itemId: string; qty: number }[],
  ): Promise<Schedule> {
    await this.shops.enterShop(slug);
    const shop = await this.shops.read();
    return this.schedule(shop, lines, new Date());
  }

  /** The server's price check, always called before Place order. */
  async quoteOrder(slug: string, payload: OrderPayload): Promise<Quote> {
    await this.shops.enterShop(slug);
    const shop = await this.shops.read();
    const now = new Date();
    if (payload.scheduledAt) {
      await this.checkSlot(shop, payload, payload.scheduledAt, now);
    }
    return QuoteSchema.parse(quote({ shop, now, member: null }, payload));
  }

  /**
   * Place order, in one transaction (phases-4-6 section 3): the same `clientKey` gives back the first order;
   * the slot is locked before it is counted; the server quotes again and refuses a flagged line or a
   * problem; the limits, the order number and each item's daily count are taken under their SQL guards.
   */
  async placeOrder(slug: string, payload: OrderPayload, clientKey: string): Promise<PlacedOrder> {
    const shopId = await this.shops.enterShop(slug);
    // Two taps with the same key wait for each other here, so the second one finds the first order.
    await this.db.tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${`order:${shopId}:${clientKey}`}, 0))`,
    );
    const [again] = await this.db.tx
      .select({ id: orders.id, orderNo: orders.orderNo, token: orders.token })
      .from(orders)
      .where(and(eq(orders.tenantId, shopId), eq(orders.clientKey, clientKey)));
    if (again) return { orderId: again.id, orderNo: again.orderNo, token: again.token };

    const phone = normalisePhPhone(payload.customer.phone);
    if (!phone.ok) {
      throw new ApiFailure('invalid_input', 422, { phone: [words.shop.phoneInvalid] });
    }

    const shop = await this.shops.read();
    const now = new Date();
    const placedAt = now.toISOString();
    if (payload.scheduledAt) {
      // Held until the commit: a second phone waits here, then sees this order in the count.
      await this.book.lockSlot(payload.scheduledAt);
      await this.checkSlot(shop, payload, payload.scheduledAt, now);
    }
    const q = quote({ shop, now, member: null }, payload);
    failOnQuote(q);
    await this.checkLimits(phone.e164, now);

    const { orderNo, businessDate } = await this.book.nextOrderNo(now);
    const due = dueTimes({
      placedAt,
      scheduledAt: payload.scheduledAt,
      prepMinutes: shop.storefront.prepMinutes,
    });
    await this.book.takeDailyCounts(payload.lines, manilaDate(due.dueAt));

    const account = paymentAccountFor(
      shop.storefront.payments,
      payload.paymentMethod,
      payload.paymentAccountId,
    );
    const delivery = payload.type === 'delivery' ? payload.delivery : null;
    if (payload.type === 'delivery' && !delivery) throw new ApiFailure('zone_required', 409);
    const payBy =
      isTransfer(payload.paymentMethod) && q.total > 0
        ? new Date(now.getTime() + PAY_MINUTES * 60_000).toISOString()
        : null;
    const ticket = this.book.newTicket();
    const note = payload.note?.trim().slice(0, 240) ?? '';

    const [order] = await this.db.tx
      .insert(orders)
      .values({
        tenantId: shopId,
        businessDate,
        orderNo,
        token: ticket.token,
        pickupCode: ticket.pickupCode,
        clientKey,
        type: payload.type,
        status: 'placed',
        paymentMethod: payload.paymentMethod,
        paymentStatus: q.total === 0 ? 'paid' : 'unpaid',
        paymentAccountId: uuidOrNull(account?.id),
        customerName: payload.customer.name.trim(),
        customerPhone: phone.e164,
        customerEmail: payload.customer.email,
        addressLine: delivery?.addressLine.trim() ?? null,
        houseNo: emptyToNull(delivery?.houseNo),
        floor: emptyToNull(delivery?.floor),
        landmark: emptyToNull(delivery?.landmark),
        lat: delivery?.spot?.lat ?? null,
        lng: delivery?.spot?.lng ?? null,
        zoneId: uuidOrNull(delivery?.zoneId),
        distanceM: delivery ? q.distanceM : null,
        placedAt,
        scheduledAt: payload.scheduledAt,
        dueAt: due.dueAt,
        startBy: due.startBy,
        payBy,
        subtotal: q.subtotal,
        discount: q.discount,
        deliveryFee: q.deliveryFee,
        total: q.total,
        note: note === '' ? null : note,
        source: 'storefront',
        lastStepAt: placedAt,
      })
      .returning({ id: orders.id });
    if (!order) throw new ApiFailure('unknown', 500);
    await this.book.writeLines(order.id, shop, q);
    await this.db.tx.insert(orderEvents).values({
      tenantId: shopId,
      orderId: order.id,
      status: 'placed',
      by: 'customer',
      at: placedAt,
    });
    return { orderId: order.id, orderNo, token: ticket.token };
  }

  private async schedule(
    shop: PublicShop,
    lines: readonly { itemId: string; qty: number }[],
    now: Date,
  ): Promise<Schedule> {
    return scheduleDays(
      shop.storefront,
      lines,
      shop.catalog.items,
      await this.book.bookings(),
      now,
    );
  }

  /** A booked time must still be open on the shop's schedule: full is `slot_full`, else `slot_unavailable`. */
  private async checkSlot(
    shop: PublicShop,
    payload: { lines: readonly { itemId: string; qty: number }[]; type: OrderType },
    at: string,
    now: Date,
  ): Promise<void> {
    const sched = await this.schedule(shop, payload.lines, now);
    const day = sched.days.find((d) => d.date === manilaDate(at));
    const slot = day?.slots.find((s) => s.at === new Date(at).toISOString());
    if (slot?.state === 'full' || day?.state === 'full') throw new ApiFailure('slot_full', 409);
    if (!day || day.state !== 'open' || !slot || slot.state !== 'open') {
      throw new ApiFailure('slot_unavailable', 409);
    }
  }

  /** 3 unpaid orders per phone per 30 minutes, and 30 orders a minute per shop (`rate_limited`). */
  private async checkLimits(phone: string, now: Date): Promise<void> {
    const shopId = this.db.shopId;
    const since = new Date(now.getTime() - PAY_MINUTES * 60_000).toISOString();
    const minuteAgo = new Date(now.getTime() - 60_000).toISOString();
    const result = await this.db.tx.execute<{ unpaid: number; recent: number }>(sql`
      select
        count(*) filter (
          where o.customer_phone = ${phone} and o.status = 'placed' and o.payment_status = 'unpaid'
            and o.placed_at >= ${since}::timestamptz
        )::int as unpaid,
        count(*) filter (where o.source = 'storefront' and o.placed_at >= ${minuteAgo}::timestamptz)::int as recent
      from public.orders o
      where o.tenant_id = ${shopId} and o.placed_at >= ${since}::timestamptz`);
    const row = result.rows[0];
    if (
      Number(row?.unpaid ?? 0) >= UNPAID_PER_PHONE ||
      Number(row?.recent ?? 0) >= ORDERS_PER_SHOP_MINUTE
    ) {
      throw new ApiFailure('rate_limited', 429);
    }
  }
}

function emptyToNull(value: string | null | undefined): string | null {
  const clean = value?.trim() ?? '';
  return clean === '' ? null : clean;
}
