import { Inject, Injectable } from '@nestjs/common';
import {
  balanceOf,
  canAdvance,
  canCancel,
  canRecall,
  errorWords,
  isTransfer,
  manilaDate,
  OrderStatusEnum,
  PAY_WINDOW_MINUTES,
  paidStatusFor,
  pushWords,
  type OrderStatus,
  type Payment,
  type PaymentMethod,
} from '@smartapp/core';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { ApiFailure, notFound } from '../common/api-failure.js';
import { Db } from '../db/db.service.js';
import { orderEvents, orders, paymentProofs } from '../db/generated/schema.js';
import { StampLedger } from '../members/stamp-ledger.js';
import { orderNoText } from '../push/push-messages.js';
import { PushOutbox, type PushOrder } from '../push/push-outbox.service.js';
import { ShopReader } from '../public/shop-reader.js';
import { OrderBook, uuidOrNull } from './order-book.js';
import { OrderReader, type OrderView } from './order-reader.js';

const REASON_MAX = 200;

/**
 * Every step an order takes after it is placed (phases-4-6 section 3): advance, recall, cancel, expire, and
 * the payment steps. Each one locks the order's row first, checks core's rule, writes `order_events`, and
 * gives back what the order held (daily counts now; stamps used and a limited prize with phase 6) once, in
 * the same transaction.
 */
@Injectable()
export class OrderSteps {
  constructor(
    @Inject(Db) private readonly db: Db,
    @Inject(OrderReader) private readonly reader: OrderReader,
    @Inject(OrderBook) private readonly book: OrderBook,
    @Inject(PushOutbox) private readonly push: PushOutbox,
    @Inject(StampLedger) private readonly ledger: StampLedger,
    @Inject(ShopReader) private readonly shops: ShopReader,
  ) {}

  /** The order, locked until the commit; another shop's id or a bad id is Not found. */
  async locked(orderId: string): Promise<OrderView> {
    const id = uuidOrNull(orderId);
    if (!id) throw notFound();
    await this.db.tx.execute(
      sql`select 1 from public.orders where tenant_id = ${this.db.shopId} and id = ${id}::uuid for update`,
    );
    const view = await this.reader.byId(id);
    if (!view) throw notFound();
    return view;
  }

  /** Re-reads an order after a change. */
  async fresh(orderId: string): Promise<OrderView> {
    const view = await this.reader.byId(orderId);
    if (!view) throw notFound();
    return view;
  }

  /** Any later step for the order's type (T55); `not_paid` keeps an unpaid transfer in New. */
  async advance(orderId: string, to: OrderStatus, trackingUrl?: string): Promise<OrderView> {
    const view = await this.locked(orderId);
    const r = view.receipt;
    const check = canAdvance(
      {
        status: r.status,
        type: r.type,
        paymentStatus: r.paymentStatus,
        paymentMethod: r.paymentMethod,
      },
      to,
    );
    if (!check.ok) throw new ApiFailure(check.code, 409);
    const at = new Date().toISOString();
    const eventId = await this.step(view.id, to, 'shop', at);
    await this.push.orderStep(pushOrderOf(view), to, eventId);
    if (to === 'completed') await this.earnStamp(view, eventId);
    if (trackingUrl) {
      await this.db.tx
        .update(orders)
        .set({ trackingUrl })
        .where(and(eq(orders.tenantId, this.db.shopId), eq(orders.id, view.id)));
    }
    return this.fresh(view.id);
  }

  /** Takes back the last step within 10 seconds (the owner's Undo). */
  async recall(orderId: string): Promise<OrderView> {
    const view = await this.locked(orderId);
    if (!canRecall({ status: view.receipt.status, lastStepAt: view.lastStepAt }, new Date())) {
      throw new ApiFailure('recall_expired', 409);
    }
    const events = await this.db.tx
      .select({ id: orderEvents.id, status: orderEvents.status, at: orderEvents.at })
      .from(orderEvents)
      .where(and(eq(orderEvents.orderId, view.id), isNull(orderEvents.undoneAt)))
      .orderBy(desc(orderEvents.at), desc(orderEvents.id))
      .limit(2);
    const [last, before] = events;
    if (!last || !before) throw new ApiFailure('invalid_transition', 409);
    await this.db.tx
      .update(orderEvents)
      .set({ undoneAt: new Date().toISOString() })
      .where(eq(orderEvents.id, last.id));
    await this.db.tx
      .update(orders)
      .set({ status: OrderStatusEnum.parse(before.status), lastStepAt: before.at })
      .where(and(eq(orders.tenantId, this.db.shopId), eq(orders.id, view.id)));
    return this.fresh(view.id);
  }

  /**
   * Cancels an open order with a reason. Whatever was paid goes back as a refund line (a part payment too,
   * T111), and the order's daily counts are given back.
   */
  async cancel(orderId: string, reason: string): Promise<OrderView> {
    const view = await this.locked(orderId);
    if (!canCancel(view.receipt.status)) throw new ApiFailure('invalid_transition', 409);
    const why = reason.trim().slice(0, REASON_MAX);
    if (!why) {
      throw new ApiFailure('invalid_input', 422, { reason: [errorWords('invalid_input')] });
    }
    const at = new Date().toISOString();
    const paid = view.row.paidAmount;
    // The reason first: a cancelled order always carries one (CHECK).
    await this.db.tx
      .update(orders)
      .set({
        cancelReason: why,
        payBy: null,
        ...(paid > 0
          ? {
              paymentStatus: 'refunded',
              refundAmount: Math.min(paid, view.row.total),
              refundReason: why,
              refundedAt: at,
            }
          : {}),
      })
      .where(and(eq(orders.tenantId, this.db.shopId), eq(orders.id, view.id)));
    const eventId = await this.step(view.id, 'cancelled', 'shop', at);
    await this.push.orderStep(pushOrderOf(view), 'cancelled', eventId);
    await this.giveBack(view);
    return this.fresh(view.id);
  }

  /** The expiry job: an unpaid transfer past its pay-by time with no photo waiting (by the system). */
  async expire(orderId: string): Promise<boolean> {
    const view = await this.locked(orderId);
    const r = view.receipt;
    const payBy = view.row.payBy;
    if (
      r.status !== 'placed' ||
      r.paymentStatus !== 'unpaid' ||
      !isTransfer(r.paymentMethod) ||
      !payBy ||
      new Date(payBy).getTime() > Date.now()
    ) {
      return false;
    }
    const eventId = await this.step(view.id, 'expired', 'system', new Date().toISOString());
    await this.push.orderStep(pushOrderOf(view), 'expired', eventId);
    await this.db.tx
      .update(orders)
      .set({ payBy: null })
      .where(and(eq(orders.tenantId, this.db.shopId), eq(orders.id, view.id)));
    await this.giveBack(view);
    return true;
  }

  /**
   * The owner's answer to the waiting payment photo. Yes marks it paid; No needs a reason, sends the order
   * back to unpaid and gives the customer a fresh 30 minutes. Answering also marks the chat seen (T87).
   */
  async reviewPayment(
    orderId: string,
    approve: boolean,
    rejectReason: string | undefined,
  ): Promise<Payment> {
    const view = await this.locked(orderId);
    if (view.receipt.paymentStatus !== 'pending') {
      throw new ApiFailure('payment_not_pending', 409);
    }
    const reason = rejectReason?.trim().slice(0, REASON_MAX) ?? '';
    if (!approve && !reason) {
      throw new ApiFailure('invalid_input', 422, { rejectReason: [errorWords('invalid_input')] });
    }
    const now = new Date();
    const at = now.toISOString();
    const [proof] = await this.db.tx
      .select({ id: paymentProofs.id })
      .from(paymentProofs)
      .where(and(eq(paymentProofs.orderId, view.id), eq(paymentProofs.status, 'pending')))
      .orderBy(desc(paymentProofs.createdAt))
      .limit(1);
    if (proof) {
      await this.db.tx
        .update(paymentProofs)
        .set({
          status: approve ? 'approved' : 'rejected',
          rejectReason: approve ? null : reason,
          decidedAt: at,
          decidedBy: this.db.scope.userId,
          seenAt: sql`coalesce(${paymentProofs.seenAt}, ${at}::timestamptz)`,
        })
        .where(eq(paymentProofs.id, proof.id));
    }
    await this.db.tx
      .update(orders)
      .set(
        approve
          ? { paymentStatus: 'paid', paidAmount: view.row.total, payBy: null }
          : {
              paymentStatus: 'unpaid',
              payBy: new Date(now.getTime() + PAY_WINDOW_MINUTES * 60_000).toISOString(),
            },
      )
      .where(and(eq(orders.tenantId, this.db.shopId), eq(orders.id, view.id)));
    await this.markChatSeen(view.id, at);
    if (!approve && proof) await this.push.proofRejected(pushOrderOf(view), proof.id);
    return this.reader.payment(await this.fresh(view.id));
  }

  /**
   * Money taken by hand: cash or COD on a customer's order; any way on the owner's own order or for the rest
   * after an edit (T111). `amount` is what was paid now; left out, all that is left.
   */
  async recordPayment(
    orderId: string,
    method: PaymentMethod,
    amount: number | undefined,
  ): Promise<Payment> {
    const view = await this.locked(orderId);
    const total = view.row.total;
    const paid = view.row.paidAmount;
    if (view.receipt.paymentStatus === 'paid' || paid >= total) {
      throw new ApiFailure('already_paid', 409);
    }
    if (view.receipt.paymentStatus === 'refunded') throw new ApiFailure('invalid_transition', 409);
    const ownerMade = view.row.source === 'owner';
    if (!ownerMade && paid === 0 && method !== 'cash' && method !== 'cod') {
      throw new ApiFailure('payment_unavailable', 409);
    }
    const add = amount ?? total - paid;
    if (!Number.isInteger(add) || add <= 0 || paid + add > total) {
      throw new ApiFailure('invalid_input', 422);
    }
    const paidAmount = paid + add;
    const status = paidStatusFor(total, paidAmount);
    await this.db.tx
      .update(orders)
      .set({
        paidAmount,
        paymentMethod: method,
        paymentStatus: status,
        // A pay-by time belongs to an unpaid transfer only.
        ...(status === 'paid' || !isTransfer(method) ? { payBy: null } : {}),
      })
      .where(and(eq(orders.tenantId, this.db.shopId), eq(orders.id, view.id)));
    return this.reader.payment(await this.fresh(view.id));
  }

  /** The change was handed back after an edit made a paid order smaller (T111). */
  async recordGiveBack(orderId: string): Promise<Payment> {
    const view = await this.locked(orderId);
    const { back } = balanceOf({ total: view.row.total, paidAmount: view.row.paidAmount });
    if (back <= 0) throw new ApiFailure('invalid_input', 422);
    await this.db.tx
      .update(orders)
      .set({ paidAmount: view.row.total })
      .where(and(eq(orders.tenantId, this.db.shopId), eq(orders.id, view.id)));
    return this.reader.payment(await this.fresh(view.id));
  }

  /** The customer's photos and lines count as seen by the shop, and so does the order. */
  async markChatSeen(orderId: string, at: string): Promise<void> {
    await this.db.tx.execute(sql`
      update public.payment_proofs set seen_at = ${at}::timestamptz
      where tenant_id = ${this.db.shopId} and order_id = ${orderId}::uuid and seen_at is null`);
    await this.db.tx.execute(sql`
      update public.order_messages set seen_at = ${at}::timestamptz
      where tenant_id = ${this.db.shopId} and order_id = ${orderId}::uuid and "from" = 'customer'
        and seen_at is null`);
    await this.db.tx.execute(sql`
      update public.orders set seen_at = coalesce(seen_at, ${at}::timestamptz)
      where tenant_id = ${this.db.shopId} and id = ${orderId}::uuid`);
  }

  /** Writes one status step and moves the order to it; answers the step's id (its push waits on it). */
  async step(
    orderId: string,
    status: OrderStatus,
    by: 'customer' | 'shop' | 'system',
    at: string,
  ): Promise<string> {
    const [event] = await this.db.tx
      .insert(orderEvents)
      .values({ tenantId: this.db.shopId, orderId, status, by, at })
      .returning({ id: orderEvents.id });
    if (!event) throw new ApiFailure('unknown', 500);
    await this.db.tx
      .update(orders)
      .set({ status, lastStepAt: at })
      .where(and(eq(orders.tenantId, this.db.shopId), eq(orders.id, orderId)));
    return event.id;
  }

  /**
   * What a cancelled or expired order held goes back once: each item's count for its day, the stamps its
   * reward used, and a limited prize's piece.
   */
  private async giveBack(view: OrderView): Promise<void> {
    await this.book.giveBackDailyCounts(
      view.receipt.lines.map((l) => ({ itemId: l.itemId, qty: l.qty })),
      manilaDate(view.receipt.dueAt),
    );
    if (await this.ledger.giveBackUsed(view.id)) {
      await this.db.tx.execute(sql`select private.give_back_prize()`);
    }
  }

  /**
   * A finished member order earns its stamp (S20), and the Completed push goes out with it (T106) when the
   * shop keeps those pushes on. Undo keeps the stamp; completing again never adds a second one.
   */
  private async earnStamp(view: OrderView, eventId: string): Promise<void> {
    const card = await this.shops.stampCard();
    const earned = await this.ledger.earnForOrder(
      { id: view.id, memberId: view.row.memberId, subtotal: view.row.subtotal },
      card,
      new Date(),
    );
    if (!earned.earned) return;
    const settings = await this.db.tx.execute<{ stamp: boolean; reward: boolean }>(sql`
      select push_stamp_added as stamp, push_reward_ready as reward
      from public.shop_settings where tenant_id = ${this.db.shopId}`);
    const wants = settings.rows[0];
    const goal = card.rule.stampsNeeded;
    const no = orderNoText(view.row.orderNo);
    const ready = earned.balance >= goal && earned.balance - 1 < goal;
    if (ready && wants?.reward !== false) {
      const body = pushWords.status.doneReward(no, card.reward.title);
      await this.push.orderDone(pushOrderOf(view), 'reward_ready', body, eventId);
    } else if (wants?.stamp !== false) {
      const body = pushWords.status.doneStamp(no, Math.min(earned.balance, goal), goal);
      await this.push.orderDone(pushOrderOf(view), 'stamp_added', body, eventId);
    }
  }
}

/** What a push may say about an order: its number, type, link, total and the customer's first name. */
export function pushOrderOf(view: OrderView): PushOrder {
  return {
    id: view.id,
    orderNo: view.row.orderNo,
    type: view.receipt.type,
    token: view.row.token,
    total: view.row.total,
    customerName: view.row.customerName,
  };
}
