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
import { EmailOutbox } from '../email/email-outbox.service.js';
import type { CallerUser } from '../auth/caller.js';
import { MemberAccounts, type MemberRow } from '../members/member-accounts.js';
import { StampLedger } from '../members/stamp-ledger.js';
import { PushOutbox } from '../push/push-outbox.service.js';
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
    @Inject(PushOutbox) private readonly push: PushOutbox,
    @Inject(EmailOutbox) private readonly emails: EmailOutbox,
    @Inject(MemberAccounts) private readonly accounts: MemberAccounts,
    @Inject(StampLedger) private readonly ledger: StampLedger,
  ) {}

  /** A live or demo shop as customers see it; anything else is Not found (rule 12). */
  async getStorefront(slug: string): Promise<PublicShop> {
    await this.shops.enterShop(slug);
    return this.shops.readForCustomers();
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
    const shop = await this.shops.readForCustomers();
    return this.schedule(shop, lines, new Date());
  }

  /** The server's price check, always called before Place order. */
  async quoteOrder(slug: string, payload: OrderPayload, user: CallerUser | null): Promise<Quote> {
    await this.shops.enterShop(slug);
    const shop = await this.shops.readForCustomers();
    const now = new Date();
    if (payload.scheduledAt) {
      await this.checkSlot(shop, payload, payload.scheduledAt, now);
    }
    const member = await this.memberOf(user);
    return QuoteSchema.parse(
      quote({ shop, now, member: member ? await this.stampsOf(member, shop) : null }, payload),
    );
  }

  /**
   * Place order, in one transaction (phases-4-6 section 3): the same `clientKey` gives back the first order;
   * the slot is locked before it is counted; the server quotes again and refuses a flagged line or a
   * problem; the limits, the order number and each item's daily count are taken under their SQL guards.
   */
  async placeOrder(
    slug: string,
    payload: OrderPayload,
    clientKey: string,
    user: CallerUser | null,
  ): Promise<PlacedOrder> {
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

    const shop = await this.shops.readForCustomers();
    const now = new Date();
    const placedAt = now.toISOString();
    if (payload.scheduledAt) {
      // Held until the commit: a second phone waits here, then sees this order in the count.
      await this.book.lockSlot(payload.scheduledAt);
      await this.checkSlot(shop, payload, payload.scheduledAt, now);
    }
    // A signed-in member's order joins their card; their stamps are held while the reward is used.
    const member = await this.memberOf(user);
    const stamps = member ? await this.ledger.lock(member.id) : 0;
    const q = quote(
      { shop, now, member: member ? await this.stampsOf(member, shop) : null },
      payload,
    );
    failOnQuote(q);
    const card = shop.storefront.stampCard;
    const redeemed = member && payload.useReward && q.discount > 0 ? card.rule.stampsNeeded : 0;
    if (redeemed > 0) {
      // A limited prize loses one piece (S26); the last one can't go twice.
      const took = await this.db.tx.execute<{ ok: boolean }>(
        sql`select private.take_prize() as ok`,
      );
      if (took.rows[0]?.ok !== true) throw new ApiFailure('reward_all_claimed', 409);
    }
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
        memberId: member?.id ?? null,
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
        rewardTitle: redeemed > 0 ? card.reward.title.slice(0, 60) : null,
        note: note === '' ? null : note,
        source: 'storefront',
        lastStepAt: placedAt,
      })
      .returning({ id: orders.id });
    if (!order) throw new ApiFailure('unknown', 500);
    await this.book.writeLines(order.id, shop, q);
    if (member && redeemed > 0) {
      await this.ledger.add(
        { memberId: member.id, kind: 'used', delta: -redeemed, orderId: order.id },
        stamps,
      );
    }
    await this.db.tx.insert(orderEvents).values({
      tenantId: shopId,
      orderId: order.id,
      status: 'placed',
      by: 'customer',
      at: placedAt,
    });
    // The owner hears about it on their own devices (Q2) and, when they want it, by email.
    await this.push.toOwner(
      'owner_new_order',
      {
        id: order.id,
        orderNo,
        type: payload.type,
        token: ticket.token,
        total: q.total,
        customerName: payload.customer.name,
      },
      `new:${order.id}`,
    );
    this.emails.ownerAlert(
      'new_order',
      { orderId: order.id, orderNo, total: q.total, shop: shop.storefront.info.name },
      `new_order:${order.id}`,
    );
    return { orderId: order.id, orderNo, token: ticket.token };
  }

  private async memberOf(user: CallerUser | null): Promise<MemberRow | null> {
    return user ? this.accounts.byUser(user.id) : null;
  }

  /** What the price check needs of a member: their balance and the stamps on the way. */
  private async stampsOf(
    member: MemberRow,
    shop: PublicShop,
  ): Promise<{ balance: number; pendingStamps: number }> {
    const account = await this.accounts.account(member, shop.storefront.stampCard);
    return { balance: account.balance, pendingStamps: account.pendingStamps };
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
