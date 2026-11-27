import { Inject, Injectable } from '@nestjs/common';
import {
  BookingRulesSchema,
  canReschedule,
  dayLoads,
  dueTimes,
  editBlock,
  formatPeso,
  intervalsForDate,
  lineIdentity,
  manilaDate,
  methodsFor,
  normalisePhPhone,
  phoneSearchText,
  openState,
  OpenStateSchema,
  OrderStatusEnum,
  orderChangeWords,
  ownerScheduleDays,
  paidStatusFor,
  parseFindInput,
  quote,
  QuoteSchema,
  receiptDate,
  words,
  type BookingRules,
  type BoardOrder,
  type ChatSummary,
  type CreateOwnerOrderInput,
  type DayLoad,
  type EditOrderInput,
  type OpenState,
  type OwnerOrderCreated,
  type OwnerOrderPayload,
  type PauseMode,
  type PublicShop,
  type Quote,
  type Schedule,
} from '@smartapp/core';
import {
  and,
  asc,
  between,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  notInArray,
  or,
  sql,
} from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import { CatalogReader } from '../catalog/catalog-reader.js';
import { ApiFailure, notFound } from '../common/api-failure.js';
import { Db } from '../db/db.service.js';
import {
  mediaFiles,
  members,
  orderEvents,
  orderLineOptions,
  orderLines,
  orderMessages,
  orders,
  paymentProofs,
  shopSettings,
} from '../db/generated/schema.js';
import { MediaStorage } from '../media/media-storage.js';
import { MemberAccounts } from '../members/member-accounts.js';
import { StampLedger } from '../members/stamp-ledger.js';
import { StorefrontCache } from '../public/pages-cache.service.js';
import { ShopReader } from '../public/shop-reader.js';
import { failOnQuote, OrderBook, uuidOrNull } from './order-book.js';
import { OrderReader, type OrderView } from './order-reader.js';
import { OrderSteps } from './order-steps.service.js';

const FINAL = ['completed', 'cancelled', 'expired'];
// T95: a list reaches back at most 92 days; the Calendar 60 back and 60 ahead.
const MAX_LIST_DAYS = 92;
const MAX_CALENDAR_DAYS = 122;
const MAX_ROWS = 2000;
// An any-day search (T126) returns the newest matches.
const ANY_DAY_ROWS = 200;
const MAX_CHATS = 50;
const PROOF_LINK_SECONDS = 300;

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

function likeText(value: string): string {
  return `%${value.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

function emptyToNull(value: string | null | undefined): string | null {
  const clean = value?.trim() ?? '';
  return clean === '' ? null : clean;
}

/** "added 1 Fries, removed 2 Iced Tea" for the customer's chat line; "updated the details" otherwise. */
export function changeSummary(
  before: readonly { name: string; variantLabel: string | null; qty: number }[],
  after: readonly { name: string; variantLabel: string | null; qty: number }[],
): string {
  const count = (lines: typeof before) => {
    const m = new Map<string, number>();
    for (const l of lines) {
      const key = [l.name, l.variantLabel].filter(Boolean).join(' ');
      m.set(key, (m.get(key) ?? 0) + l.qty);
    }
    return m;
  };
  const was = count(before);
  const now = count(after);
  const parts: string[] = [];
  for (const [name, qty] of now) {
    const diff = qty - (was.get(name) ?? 0);
    if (diff > 0) parts.push(orderChangeWords.added(diff, name));
  }
  for (const [name, qty] of was) {
    const diff = qty - (now.get(name) ?? 0);
    if (diff > 0) parts.push(orderChangeWords.removed(diff, name));
  }
  return parts.length > 0 ? parts.join(', ') : orderChangeWords.details;
}

/** Ways to pay the owner can record: cash at the counter (walk-in and pickup), COD, and the shop's accounts. */
function ownerMethods(shop: PublicShop, type: OwnerOrderPayload['type']) {
  const set = new Set(methodsFor(shop, type));
  if (type !== 'delivery') set.add('cash');
  return [...set];
}

/**
 * The owner's Orders (api.md "Orders (owner)"): the board and lists, the Calendar, find, chats, change time,
 * notes, delivery, booking rules, pause, and New order and Edit order (T111). Status and payment steps go
 * through OrderSteps. The shop is the caller's (rule 12), so every id is checked as its own.
 */
@Injectable()
export class OwnerOrdersService {
  constructor(
    @Inject(Db) private readonly db: Db,
    @Inject(OrderReader) private readonly reader: OrderReader,
    @Inject(OrderBook) private readonly book: OrderBook,
    @Inject(OrderSteps) private readonly steps: OrderSteps,
    @Inject(ShopReader) private readonly shops: ShopReader,
    @Inject(CatalogReader) private readonly catalog: CatalogReader,
    @Inject(MediaStorage) private readonly storage: MediaStorage,
    @Inject(StorefrontCache) private readonly storefront: StorefrontCache,
    @Inject(MemberAccounts) private readonly accounts: MemberAccounts,
    @Inject(StampLedger) private readonly ledger: StampLedger,
  ) {}

  // ---- Lists ----------------------------------------------------------------------------------------

  async listOrders(input: {
    open?: boolean | undefined;
    from?: string | undefined;
    to?: string | undefined;
    // Any day (T126): every order that matches q, finished ones too, newest first.
    anyDay?: boolean | undefined;
    q?: string | undefined;
  }): Promise<BoardOrder[]> {
    const where: (SQL | undefined)[] = [eq(orders.tenantId, this.db.shopId)];
    const q = input.q?.trim().toLowerCase() ?? '';
    if (input.anyDay) {
      if (!q) throw new ApiFailure('invalid_input', 422);
    } else if (input.from && input.to) {
      const span = daysBetween(input.from, input.to);
      if (span < 0 || span > MAX_LIST_DAYS) throw new ApiFailure('invalid_input', 422);
      where.push(between(orders.businessDate, input.from, input.to));
    } else {
      where.push(notInArray(orders.status, FINAL));
    }
    if (q) {
      // "#012" and "012" find order 12, the way the owner reads the number.
      const numberQuery = q.replace(/^#?0*/, '');
      // 0917 123 4567, +63 917… or 917… find +639171234567 (T126).
      const phoneQuery = phoneSearchText(q);
      where.push(
        or(
          ilike(orders.customerName, likeText(q)),
          ilike(orders.customerPhone, likeText(q)),
          phoneQuery !== null ? ilike(orders.customerPhone, likeText(phoneQuery)) : undefined,
          ilike(orders.pickupCode, likeText(q)),
          numberQuery !== '' && /^\d+$/.test(numberQuery)
            ? sql`${orders.orderNo}::text like ${likeText(numberQuery)}`
            : undefined,
        ),
      );
    }
    const rows = await this.db.tx
      .select()
      .from(orders)
      .where(and(...where))
      .orderBy(input.anyDay ? desc(orders.placedAt) : asc(orders.placedAt))
      .limit(input.anyDay ? ANY_DAY_ROWS : MAX_ROWS);
    return (await this.reader.views(rows)).map((v) => this.reader.board(v));
  }

  /** The Calendar (T95): every order due in the range; cancelled and expired never show. */
  async listScheduled(
    from: string,
    to: string,
  ): Promise<{ orders: BoardOrder[]; days: DayLoad[] }> {
    const span = daysBetween(from, to);
    if (span < 0 || span > MAX_CALENDAR_DAYS) throw new ApiFailure('invalid_input', 422);
    const rows = await this.db.tx
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.tenantId, this.db.shopId),
          notInArray(orders.status, ['cancelled', 'expired']),
          sql`(${orders.dueAt} at time zone 'Asia/Manila')::date between ${from}::date and ${to}::date`,
        ),
      )
      .orderBy(asc(orders.dueAt))
      .limit(MAX_ROWS);
    const views = await this.reader.views(rows);
    const items = await this.catalog.listItems();
    const days = dayLoads(
      views.map((v) => ({
        dueAt: v.receipt.dueAt,
        status: v.receipt.status,
        lines: v.receipt.lines,
      })),
      items,
      from,
      to,
    );
    return { orders: views.map((v) => this.reader.board(v)), days };
  }

  /** "#012" is order 12, "k7 qp" is code K7QP, a scanned receipt link is its token: open orders and today's. */
  async findOrder(code: string): Promise<BoardOrder[]> {
    const parsed = parseFindInput(code);
    const raw = code.trim();
    let match: SQL | undefined;
    if (parsed?.kind === 'typed') {
      match = or(
        parsed.orderNo !== null ? eq(orders.orderNo, parsed.orderNo) : undefined,
        parsed.code !== null ? eq(orders.pickupCode, parsed.code) : undefined,
      );
    } else if (parsed?.kind === 'receipt') {
      match = eq(orders.token, parsed.token);
    } else if (raw.length >= 16 && raw.length <= 64) {
      match = eq(orders.token, raw);
    }
    if (!match) return [];
    const today = manilaDate(new Date());
    const rows = await this.db.tx
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.tenantId, this.db.shopId),
          match,
          or(notInArray(orders.status, FINAL), eq(orders.businessDate, today)),
        ),
      )
      .orderBy(desc(orders.placedAt))
      .limit(20);
    return (await this.reader.views(rows)).map((v) => this.reader.board(v));
  }

  async markSeen(orderId: string): Promise<BoardOrder> {
    const view = await this.view(orderId);
    await this.db.tx
      .update(orders)
      .set({ seenAt: sql`coalesce(${orders.seenAt}, now())` })
      .where(and(eq(orders.tenantId, this.db.shopId), eq(orders.id, view.id)));
    return this.reader.board(await this.steps.fresh(view.id));
  }

  async getOrderDetail(orderId: string): Promise<OrderView> {
    return this.view(orderId);
  }

  /** A 5-minute link to one of the shop's payment photos (private bucket). */
  async getProofUrl(path: string): Promise<{ url: string }> {
    const [file] = await this.db.tx
      .select({ path: mediaFiles.path })
      .from(paymentProofs)
      .innerJoin(
        mediaFiles,
        and(
          eq(mediaFiles.id, paymentProofs.mediaId),
          eq(mediaFiles.tenantId, paymentProofs.tenantId),
        ),
      )
      .where(
        and(
          eq(paymentProofs.tenantId, this.db.shopId),
          eq(mediaFiles.path, path),
          eq(mediaFiles.kind, 'proof'),
          isNull(mediaFiles.deletedAt),
        ),
      )
      .limit(1);
    if (!file) throw notFound();
    const url = await this.storage.signedRead('proofs', file.path, PROOF_LINK_SECONDS);
    if (!url) throw notFound();
    return { url };
  }

  /** Open orders' chats and today's finished ones with a customer or shop line: waiting first (T87). */
  async listChats(): Promise<ChatSummary[]> {
    const today = manilaDate(new Date());
    const rows = await this.db.tx
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.tenantId, this.db.shopId),
          or(notInArray(orders.status, FINAL), eq(orders.businessDate, today)),
        ),
      )
      .orderBy(desc(orders.placedAt))
      .limit(MAX_ROWS);
    const views = await this.reader.views(rows);
    return views
      .filter((v) => v.receipt.messages.some((m) => m.from !== 'system'))
      .flatMap((v) => {
        const chat = this.reader.chat(v);
        return chat ? [chat] : [];
      })
      .sort((a, b) => {
        if (a.waitingSince && b.waitingSince) return a.waitingSince.localeCompare(b.waitingSince);
        if (a.waitingSince) return -1;
        if (b.waitingSince) return 1;
        return b.last.at.localeCompare(a.last.at);
      })
      .slice(0, MAX_CHATS);
  }

  async markChatSeen(orderId: string): Promise<ChatSummary> {
    const view = await this.view(orderId);
    await this.steps.markChatSeen(view.id, new Date().toISOString());
    const chat = this.reader.chat(await this.steps.fresh(view.id));
    if (!chat) throw notFound();
    return chat;
  }

  // ---- Change time, note, delivery --------------------------------------------------------------------

  /** The days and times this order can move to: its own spot and items count as free (T85, T86). */
  async getRescheduleSchedule(orderId: string): Promise<Schedule> {
    const view = await this.view(orderId);
    return this.ownerSchedule(view.receipt.lines, view.id);
  }

  async getOwnerSchedule(
    lines: readonly { itemId: string; qty: number }[],
    orderId?: string,
  ): Promise<Schedule> {
    const except = orderId ? (await this.view(orderId)).id : null;
    return this.ownerSchedule(lines, except);
  }

  /**
   * Moves a pickup or delivery order (T85, T86). Closed days and hours always stop it; a full time, a daily
   * limit or an item's notice days need Allow anyway (`override`, Q9). Daily counts follow the order's day.
   */
  async rescheduleOrder(
    orderId: string,
    scheduledAt: string,
    override: boolean,
  ): Promise<OrderView> {
    const view = await this.steps.locked(orderId);
    if (!canReschedule(view.receipt)) throw new ApiFailure('reschedule_not_allowed', 409);
    const at = new Date(scheduledAt).toISOString();
    const shop = await this.shops.read();
    this.checkOpen(shop, at);
    await this.book.lockSlot(at);
    if (!override) {
      const sched = await this.ownerSchedule(view.receipt.lines, view.id);
      const day = sched.days.find((d) => d.date === manilaDate(at));
      const slot = day?.slots.find((s) => s.at === at);
      if (day?.state === 'too_soon') throw new ApiFailure('notice_too_short', 409);
      if (!day || day.state !== 'open' || !slot || slot.state !== 'open') {
        throw new ApiFailure('slot_full', 409);
      }
    }
    await this.moveCounts(view, view.receipt.lines, at, override);
    const times = dueTimes({
      placedAt: view.receipt.placedAt,
      scheduledAt: at,
      prepMinutes: shop.storefront.prepMinutes,
    });
    await this.db.tx
      .update(orders)
      .set({ scheduledAt: at, dueAt: times.dueAt, startBy: times.startBy })
      .where(and(eq(orders.tenantId, this.db.shopId), eq(orders.id, view.id)));
    await this.message(view.id, 'schedule', words.receipt.thread.scheduleChanged(receiptDate(at)));
    return this.steps.fresh(view.id);
  }

  async saveOwnerNote(orderId: string, note: string | null): Promise<OrderView> {
    const view = await this.view(orderId);
    await this.db.tx
      .update(orders)
      .set({ ownerNote: emptyToNull(note)?.slice(0, 300) ?? null })
      .where(and(eq(orders.tenantId, this.db.shopId), eq(orders.id, view.id)));
    return this.steps.fresh(view.id);
  }

  /** The rider the owner booked and the tracking link: each adds a line to the customer's chat. */
  async saveDeliveryInfo(
    orderId: string,
    input: {
      provider?: string | undefined;
      trackingUrl?: string | undefined;
      riderName?: string | undefined;
      riderPhone?: string | undefined;
    },
  ): Promise<OrderView> {
    const view = await this.steps.locked(orderId);
    if (view.receipt.type !== 'delivery') throw new ApiFailure('invalid_transition', 409);
    const riderName = emptyToNull(input.riderName);
    const trackingUrl = emptyToNull(input.trackingUrl);
    if (riderName) {
      await this.db.tx
        .update(orders)
        .set({
          riderName: riderName.slice(0, 60),
          riderPhone: emptyToNull(input.riderPhone)?.slice(0, 20) ?? null,
          riderProvider: emptyToNull(input.provider)?.slice(0, 40) ?? null,
        })
        .where(and(eq(orders.tenantId, this.db.shopId), eq(orders.id, view.id)));
      await this.message(view.id, 'rider', words.shop.thread.rider(riderName.slice(0, 60)));
    }
    if (trackingUrl) {
      await this.db.tx
        .update(orders)
        .set({ trackingUrl })
        .where(and(eq(orders.tenantId, this.db.shopId), eq(orders.id, view.id)));
      await this.message(view.id, 'tracking', words.shop.thread.tracking);
    }
    return this.steps.fresh(view.id);
  }

  // ---- Booking rules and pause ----------------------------------------------------------------------

  async getBookingRules(): Promise<BookingRules> {
    const [s] = await this.db.tx
      .select()
      .from(shopSettings)
      .where(eq(shopSettings.tenantId, this.db.shopId));
    if (!s) throw notFound();
    return BookingRulesSchema.parse({
      daysAhead: s.daysAhead,
      slotMinutes: s.slotMinutes,
      ordersPerSlot: s.ordersPerSlot,
      prepMinutes: s.prepMinutes,
      takeOrdersWhileClosed: s.takeOrdersWhileClosed,
    });
  }

  async saveBookingRules(rules: BookingRules): Promise<BookingRules> {
    await this.db.tx
      .update(shopSettings)
      .set({
        daysAhead: rules.daysAhead,
        slotMinutes: rules.slotMinutes,
        ordersPerSlot: rules.ordersPerSlot,
        prepMinutes: rules.prepMinutes,
        takeOrdersWhileClosed: rules.takeOrdersWhileClosed,
      })
      .where(eq(shopSettings.tenantId, this.db.shopId));
    await this.storefront.shopChanged();
    return this.getBookingRules();
  }

  /** Busy for 15 or 30 minutes, paused, or open again; customers see it at once. */
  async setPause(mode: PauseMode): Promise<OpenState> {
    const now = new Date();
    const later = (minutes: number) => new Date(now.getTime() + minutes * 60_000).toISOString();
    const change =
      mode === 'busy_15'
        ? { paused: false, busyUntil: later(15) }
        : mode === 'busy_30'
          ? { paused: false, busyUntil: later(30) }
          : mode === 'pause'
            ? { paused: true, busyUntil: null }
            : { paused: false, busyUntil: null };
    await this.db.tx
      .update(shopSettings)
      .set(change)
      .where(eq(shopSettings.tenantId, this.db.shopId));
    await this.storefront.shopChanged();
    const shop = await this.shops.read();
    return OpenStateSchema.parse(openState(shop.storefront, now));
  }

  // ---- New order and Edit order (T111) ----------------------------------------------------------------

  async quoteOwnerOrder(payload: OwnerOrderPayload, orderId?: string): Promise<Quote> {
    const editing = orderId ? await this.view(orderId) : null;
    const shop = await this.shops.read();
    return QuoteSchema.parse(await this.ownerQuote(shop, payload, editing));
  }

  async createOwnerOrder(input: CreateOwnerOrderInput): Promise<OwnerOrderCreated> {
    const shopId = this.db.shopId;
    const { payload: body, pay, handedOver, clientKey } = input;
    await this.db.tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${`order:${shopId}:${clientKey}`}, 0))`,
    );
    const [again] = await this.db.tx
      .select({
        id: orders.id,
        orderNo: orders.orderNo,
        token: orders.token,
        status: orders.status,
      })
      .from(orders)
      .where(and(eq(orders.tenantId, shopId), eq(orders.clientKey, clientKey)));
    if (again) {
      return {
        orderId: again.id,
        orderNo: again.orderNo,
        token: again.token,
        status: OrderStatusEnum.parse(again.status),
      };
    }
    if (handedOver && body.type !== 'walk_in') throw new ApiFailure('invalid_input', 422);

    const shop = await this.shops.read();
    const scheduledAt = body.type === 'walk_in' ? null : body.scheduledAt;
    if (scheduledAt) await this.book.lockSlot(scheduledAt);
    const who = await this.ownerCustomer(body);
    // The member's stamps are held until the commit while their prize is used (Q3, like Place order).
    const held = who.memberId && body.useReward ? await this.ledger.lock(who.memberId) : 0;
    const q = await this.ownerQuote(shop, body, null);
    failOnQuote(q, 'slot_full');
    const card = shop.storefront.stampCard;
    const redeemed = who.memberId && body.useReward && q.discount > 0 ? card.rule.stampsNeeded : 0;
    if (redeemed > 0) {
      // A limited prize loses one piece (S26); the last one can't go twice.
      const took = await this.db.tx.execute<{ ok: boolean }>(
        sql`select private.take_prize() as ok`,
      );
      if (took.rows[0]?.ok !== true) throw new ApiFailure('reward_all_claimed', 409);
    }
    const total = q.total;
    let paidAmount = 0;
    if (pay.kind === 'paid') paidAmount = total;
    if (pay.kind === 'part') {
      const amount = pay.amount ?? 0;
      if (amount <= 0 || amount >= total) {
        throw new ApiFailure('invalid_input', 422, {
          amount: [orderChangeWords.partInvalid(formatPeso(total))],
        });
      }
      paidAmount = amount;
    }

    const now = new Date();
    const placedAt = now.toISOString();
    const { orderNo, businessDate } = await this.book.nextOrderNo(now);
    const due = dueTimes({ placedAt, scheduledAt, prepMinutes: shop.storefront.prepMinutes });
    await this.book.takeDailyCounts(body.lines, manilaDate(due.dueAt), body.override);
    const ticket = this.book.newTicket();
    const account = shop.storefront.payments.find(
      (p) => p.id === body.paymentAccountId && p.method === body.paymentMethod,
    );
    const [order] = await this.db.tx
      .insert(orders)
      .values({
        tenantId: shopId,
        businessDate,
        orderNo,
        token: ticket.token,
        pickupCode: ticket.pickupCode,
        clientKey,
        type: body.type,
        status: 'placed',
        paymentMethod: body.paymentMethod,
        paymentStatus: paidStatusFor(total, paidAmount),
        paymentAccountId: uuidOrNull(account?.id),
        memberId: who.memberId,
        customerName: who.name,
        customerPhone: who.phone,
        customerEmail: who.email,
        ...this.deliveryColumns(body),
        placedAt,
        scheduledAt,
        dueAt: due.dueAt,
        startBy: due.startBy,
        payBy: null,
        subtotal: q.subtotal,
        discount: q.discount,
        deliveryFee: q.deliveryFee,
        total,
        rewardTitle: redeemed > 0 ? card.reward.title.slice(0, 60) : null,
        note: emptyToNull(body.note)?.slice(0, 240) ?? null,
        // The owner made it, so it is seen already (no chime, no New dot).
        seenAt: placedAt,
        lastStepAt: placedAt,
        source: 'owner',
        paidAmount,
      })
      .returning({ id: orders.id });
    if (!order) throw new ApiFailure('unknown', 500);
    await this.book.writeLines(order.id, shop, q);
    if (who.memberId && redeemed > 0) {
      await this.ledger.add(
        { memberId: who.memberId, kind: 'used', delta: -redeemed, orderId: order.id },
        held,
      );
    }
    await this.db.tx.insert(orderEvents).values({
      tenantId: shopId,
      orderId: order.id,
      status: 'placed',
      by: 'shop',
      at: placedAt,
    });
    let status: OwnerOrderCreated['status'] = 'placed';
    if (handedOver) {
      await this.steps.completeAtCounter(order.id, placedAt);
      status = 'completed';
    }
    return { orderId: order.id, orderNo, token: ticket.token, status };
  }

  /**
   * Changes a New, Preparing or Ready order (T111): `order_locked` past Ready, `proof_waiting` while a photo
   * waits, `order_changed` when someone else changed it first. Lines are written again with today's prices
   * (kept lines that sold out since stay), daily counts move with the order, and the customer's chat gets
   * one "changed" line.
   */
  async editOrder(orderId: string, input: EditOrderInput): Promise<OrderView> {
    const view = await this.steps.locked(orderId);
    const block = editBlock(view.receipt);
    if (block) throw new ApiFailure(block, 409);
    if (view.row.version !== input.version) throw new ApiFailure('order_changed', 409);
    const body = input.payload;
    const shop = await this.shops.read();
    const scheduledAt = body.type === 'walk_in' ? null : body.scheduledAt;
    if (scheduledAt && scheduledAt !== view.receipt.scheduledAt)
      await this.book.lockSlot(scheduledAt);
    const q = await this.ownerQuote(shop, body, view);
    failOnQuote(q, 'slot_full');
    const who = await this.ownerCustomer(body);
    const due = dueTimes({
      placedAt: view.receipt.placedAt,
      scheduledAt,
      prepMinutes: shop.storefront.prepMinutes,
    });
    await this.moveCounts(view, body.lines, due.dueAt, body.override);

    // The lines again, as they are now.
    const oldLines = await this.db.tx
      .select({ id: orderLines.id })
      .from(orderLines)
      .where(eq(orderLines.orderId, view.id));
    if (oldLines.length > 0) {
      await this.db.tx.delete(orderLineOptions).where(
        inArray(
          orderLineOptions.lineId,
          oldLines.map((l) => l.id),
        ),
      );
      await this.db.tx.delete(orderLines).where(eq(orderLines.orderId, view.id));
    }
    await this.book.writeLines(view.id, shop, q);

    const paid = view.row.paidAmount;
    const keepMethod = view.receipt.paymentStatus === 'paid';
    const method = keepMethod ? view.receipt.paymentMethod : body.paymentMethod;
    const account = shop.storefront.payments.find(
      (p) => p.id === body.paymentAccountId && p.method === method,
    );
    const stillTransfer = view.row.payBy !== null && method === view.row.paymentMethod;
    await this.db.tx
      .update(orders)
      .set({
        type: body.type,
        memberId: who.memberId,
        customerName: who.name,
        customerPhone: who.phone,
        customerEmail: who.email,
        ...this.deliveryColumns(body),
        scheduledAt,
        dueAt: due.dueAt,
        startBy: due.startBy,
        subtotal: q.subtotal,
        discount: q.discount,
        deliveryFee: q.deliveryFee,
        total: q.total,
        note: emptyToNull(body.note)?.slice(0, 240) ?? null,
        paymentMethod: method,
        ...(keepMethod ? {} : { paymentAccountId: uuidOrNull(account?.id) }),
        ...(stillTransfer ? {} : { payBy: null }),
        ...(view.receipt.paymentStatus === 'refunded'
          ? {}
          : { paymentStatus: paidStatusFor(q.total, paid) }),
        version: view.row.version + 1,
        editedAt: new Date().toISOString(),
      })
      .where(and(eq(orders.tenantId, this.db.shopId), eq(orders.id, view.id)));
    const after = q.lines.filter((l) => l.problems.length === 0);
    await this.message(
      view.id,
      'changed',
      orderChangeWords.changedLine(changeSummary(view.receipt.lines, after), formatPeso(q.total)),
    );
    return this.steps.fresh(view.id);
  }

  // ---- Shared ------------------------------------------------------------------------------------------

  /** The caller's order, or Not found. */
  async view(orderId: string): Promise<OrderView> {
    const id = uuidOrNull(orderId);
    const view = id ? await this.reader.byId(id) : null;
    if (!view) throw notFound();
    return view;
  }

  private async ownerSchedule(
    lines: readonly { itemId: string; qty: number }[],
    exceptId: string | null,
  ): Promise<Schedule> {
    const shop = await this.shops.read();
    return ownerScheduleDays(
      shop.storefront,
      lines,
      shop.catalog.items,
      await this.book.bookings(exceptId),
      new Date(),
    );
  }

  /** A booked time must be in the shop's hours on an open day, and still to come. */
  private checkOpen(shop: PublicShop, at: string): void {
    const date = manilaDate(at);
    const t = new Date(at).getTime();
    const inside = intervalsForDate(shop.storefront, date).some(
      (i) => t >= i.start.getTime() && t < i.end.getTime(),
    );
    if (!inside || t <= Date.now()) throw new ApiFailure('reschedule_not_allowed', 409);
  }

  /** Daily counts move from the order's old day and lines to its new ones (Allow anyway may go over). */
  private async moveCounts(
    view: OrderView,
    lines: readonly { itemId: string; qty: number }[],
    dueAt: string,
    allowOver: boolean,
  ): Promise<void> {
    await this.book.giveBackDailyCounts(
      view.receipt.lines.map((l) => ({ itemId: l.itemId, qty: l.qty })),
      manilaDate(view.receipt.dueAt),
    );
    await this.book.takeDailyCounts(lines, manilaDate(dueAt), allowOver);
  }

  private async message(
    orderId: string,
    kind: 'rider' | 'tracking' | 'schedule' | 'changed',
    text: string,
  ): Promise<void> {
    await this.db.tx.insert(orderMessages).values({
      tenantId: this.db.shopId,
      orderId,
      kind,
      from: 'shop',
      via: 'app',
      text: text.slice(0, 300),
    });
  }

  private deliveryColumns(body: OwnerOrderPayload) {
    const d = body.type === 'delivery' ? body.delivery : null;
    return {
      addressLine: d ? d.addressLine.trim() : null,
      houseNo: emptyToNull(d?.houseNo),
      floor: emptyToNull(d?.floor),
      landmark: emptyToNull(d?.landmark),
      lat: d?.spot?.lat ?? null,
      lng: d?.spot?.lng ?? null,
      zoneId: uuidOrNull(d?.zoneId),
      distanceM: null,
    };
  }

  /** The customer on an owner-made order: the picked member, or a guest ("Walk-in" without a name). */
  /** What the price check needs of the order's member (their balance and stamps on the way), or null. */
  private async memberStamps(
    body: OwnerOrderPayload,
    shop: PublicShop,
  ): Promise<{ balance: number; pendingStamps: number } | null> {
    if (body.customer.kind !== 'member') return null;
    const id = uuidOrNull(body.customer.memberId);
    const member = id ? await this.accounts.byId(id) : null;
    if (!member || member.erasedAt) return null;
    const account = await this.accounts.account(member, shop.storefront.stampCard);
    return { balance: account.balance, pendingStamps: account.pendingStamps };
  }

  private async ownerCustomer(body: OwnerOrderPayload): Promise<{
    memberId: string | null;
    name: string;
    phone: string | null;
    email: string | null;
  }> {
    const c = body.customer;
    if (c.kind === 'member') {
      const id = uuidOrNull(c.memberId);
      const [member] = id
        ? await this.db.tx
            .select({
              id: members.id,
              name: members.name,
              phone: members.phone,
              email: members.email,
            })
            .from(members)
            .where(
              and(
                eq(members.tenantId, this.db.shopId),
                eq(members.id, id),
                isNull(members.erasedAt),
              ),
            )
        : [];
      if (!member) throw notFound();
      return { memberId: member.id, name: member.name, phone: member.phone, email: member.email };
    }
    let phone: string | null = null;
    if (c.phone) {
      const checked = normalisePhPhone(c.phone);
      if (!checked.ok) {
        throw new ApiFailure('invalid_input', 422, { phone: [orderChangeWords.phoneInvalid] });
      }
      phone = checked.e164;
    }
    return { memberId: null, name: c.name.trim() || orderChangeWords.walkIn, phone, email: null };
  }

  /**
   * The owner's quote: the storefront's prices and line checks, without the customer-only limits (open now,
   * busy, paused, COD limit, minimum order). Booked times keep closed days and hours; full times, daily
   * limits and notice need Allow anyway (P6, Q9). An edit keeps lines already on the order even if they sold
   * out since, and keeps its prize.
   */
  private async ownerQuote(
    shop: PublicShop,
    body: OwnerOrderPayload,
    editing: OrderView | null,
  ): Promise<Quote> {
    const sf = shop.storefront;
    const member = await this.memberStamps(body, shop);
    const base = quote(
      // A member's prize can be used on a new order (Q3); an edit keeps the prize it had.
      { shop, now: new Date(), member },
      {
        type: body.type,
        scheduledAt: null,
        lines: body.lines,
        delivery: null,
        paymentMethod: body.paymentMethod,
        paymentAccountId: body.paymentAccountId,
        useReward: editing ? false : body.useReward && member !== null,
      },
    );
    const had = new Map<string, number>();
    for (const l of editing?.receipt.lines ?? []) {
      const key = lineIdentity(l);
      had.set(key, (had.get(key) ?? 0) + l.qty);
    }
    const lines = base.lines.map((l) =>
      l.qty <= (had.get(l.identity) ?? 0)
        ? {
            ...l,
            problems: l.problems.filter(
              (p) => p.code !== 'sold_out' && p.code !== 'sold_out_today',
            ),
          }
        : l,
    );
    const good = lines.filter((l) => l.problems.length === 0);
    const subtotal = good.reduce((sum, l) => sum + l.lineTotal, 0);
    const problems: Quote['problems'] = base.problems.filter(
      (p) => p.code === 'empty_basket' || p.code === 'reward_unavailable',
    );
    const problem = (code: Quote['problems'][number]['code']) =>
      problems.push({ code, amount: null, km: null });

    if (body.type !== 'walk_in' && !sf.orderTypes.includes(body.type))
      problem('fulfillment_unavailable');
    const pickedAccount =
      body.paymentAccountId === null ||
      sf.payments.some((p) => p.id === body.paymentAccountId && p.method === body.paymentMethod);
    if (!ownerMethods(shop, body.type).includes(body.paymentMethod) || !pickedAccount) {
      problem('payment_unavailable');
    }

    const at = body.type === 'walk_in' ? null : body.scheduledAt;
    if (body.type === 'walk_in' && body.scheduledAt) problem('slot_unavailable');
    if (at && at !== editing?.receipt.scheduledAt) {
      const date = manilaDate(at);
      const t = new Date(at).getTime();
      const closed =
        !intervalsForDate(sf, date).some((i) => t >= i.start.getTime() && t < i.end.getTime()) ||
        t <= Date.now();
      if (closed) problem('slot_unavailable');
      else if (!body.override) {
        const sched = ownerScheduleDays(
          sf,
          body.lines,
          shop.catalog.items,
          await this.book.bookings(editing?.id ?? null),
          new Date(),
        );
        const day = sched.days.find((d) => d.date === date);
        const slot = day?.slots.find((s) => s.at === new Date(at).toISOString());
        if (!day || day.state !== 'open' || !slot || slot.state !== 'open')
          problem('slot_unavailable');
      }
    }

    let fee = 0;
    if (body.type === 'delivery') {
      if (!body.delivery || body.delivery.addressLine.trim() === '') problem('zone_required');
      const zone = sf.delivery.zones.find((z) => z.id === body.delivery?.zoneId);
      fee = body.deliveryFee ?? zone?.fee ?? 0;
    }
    const discount = editing
      ? Math.min(editing.row.discount, subtotal)
      : Math.min(base.discount, subtotal);
    return {
      ...base,
      lines,
      subtotal,
      discount,
      deliveryFee: fee,
      total: Math.max(0, subtotal - discount) + fee,
      distanceM: null,
      slots: [],
      readyEstimate: at ?? base.readyEstimate,
      problems,
    };
  }
}
