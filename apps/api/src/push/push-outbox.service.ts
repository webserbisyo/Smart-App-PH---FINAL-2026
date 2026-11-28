import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { pushWords, type OrderStatus, type OrderType } from '@smartapp/core';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { Db } from '../db/db.service.js';
import { tenants } from '../db/generated/schema.js';
import type { OutboxPayload } from './push-delivery.service.js';
import { PushDelivery } from './push-delivery.service.js';
import {
  orderNoText,
  ownerNewOrder,
  ownerPayment,
  pushMessage,
  statusBody,
  topicOf,
} from './push-messages.js';

// The owner's Undo lasts 10 seconds; an order step's push waits a little longer, so an undone step never goes.
export const STEP_PUSH_DELAY_MS = 11_000;
const HOUR = 3600;

/** What a push needs to know about the order (no phone, no address). */
export interface PushOrder {
  id: string;
  orderNo: number;
  type: OrderType;
  token: string;
  total: number;
  customerName: string;
}

type PushKind =
  'order_status' | 'owner_new_order' | 'owner_payment' | 'stamp_added' | 'reward_ready';

const IdsSchema = z.array(z.object({ id: z.string() }));

/**
 * Queues pushes inside the request's transaction (section 5, X5): the change and its push commit together,
 * so a rolled-back order never sends one. Each row goes out after the commit (`PushDelivery`), and the
 * 30-second job sends whatever is left.
 */
@Injectable()
export class PushOutbox {
  private readonly storefrontUrl: string;
  private readonly dashboardUrl: string;
  private readonly shopDomain: string | undefined;

  constructor(
    @Inject(Db) private readonly db: Db,
    @Inject(PushDelivery) private readonly delivery: PushDelivery,
    @Inject(ConfigService) config: ConfigService,
  ) {
    this.storefrontUrl = trimSlash(config.get<string>('STOREFRONT_URL') ?? 'http://localhost:3000');
    this.dashboardUrl = trimSlash(config.get<string>('DASHBOARD_URL') ?? 'http://localhost:5173');
    this.shopDomain = config.get<string>('SHOP_DOMAIN');
  }

  /** An order step (accepted, ready, on the way, cancelled, expired) to the phones that asked for it. */
  async orderStep(order: PushOrder, status: OrderStatus, eventId: string): Promise<void> {
    const body = statusBody(status, order.type, order.orderNo);
    if (!body) return;
    await this.toCustomer(order, body, `status:${eventId}`, eventId);
  }

  /**
   * A finished order that earned a stamp (T106): one push with the stamp, or with the reward when the card is
   * now full. It waits like a step, so an undone Complete never sends it.
   */
  async orderDone(
    order: PushOrder,
    kind: 'stamp_added' | 'reward_ready',
    body: string,
    eventId: string,
  ): Promise<void> {
    await this.toCustomer(order, body, `done:${eventId}`, eventId, kind);
  }

  /** The owner said No to the payment photo: the customer can send another one. */
  async proofRejected(order: PushOrder, proofId: string): Promise<void> {
    await this.toCustomer(
      order,
      pushWords.status.proofRejected(orderNoText(order.orderNo)),
      `proof:${proofId}`,
      undefined,
    );
  }

  /**
   * A new storefront order or a payment photo to check, to every device the shop's owner turned on (Q2).
   * `holdUntil`: an order placed while the shop is closed waits for the opening (T129), so the owner's
   * phone doesn't buzz at 1:30 AM; it still lives an hour after it is sent.
   */
  async toOwner(
    kind: 'owner_new_order' | 'owner_payment',
    order: PushOrder,
    key: string,
    holdUntil: string | null = null,
  ): Promise<void> {
    const heldMs = holdUntil ? Math.max(0, new Date(holdUntil).getTime() - Date.now()) : 0;
    const ttl = HOUR + Math.ceil(heldMs / 1000);
    const words = kind === 'owner_new_order' ? ownerNewOrder(order) : ownerPayment(order);
    const payload: OutboxPayload = {
      message: {
        ...pushMessage({
          title: words.title,
          body: words.body,
          navigate: `${this.dashboardUrl}/orders/${order.id}`,
          tag: `order-${topicOf(order.id)}`,
        }),
      },
    };
    const result = await this.db.tx.execute(sql`
      insert into public.push_outbox
        (tenant_id, subscription_id, kind, payload, dedupe_key, topic, ttl_seconds, urgency, send_after)
      select s.tenant_id, s.id, ${kind}, ${JSON.stringify(payload)}::jsonb, ${key}, null, ${ttl}, 'high',
        now() + make_interval(secs => ${heldMs / 1000})
      from public.push_subscriptions s
      join public.tenant_members m on m.tenant_id = s.tenant_id and m.user_id = s.user_id
      where s.tenant_id = ${this.db.shopId} and s.user_id is not null
      on conflict (tenant_id, subscription_id, dedupe_key) do nothing
      returning id`);
    // A held push is sent by the 30-second outbox sweep once its time comes.
    if (heldMs === 0) this.sendAfterCommit(result.rows, 0);
  }

  private async toCustomer(
    order: PushOrder,
    body: string,
    key: string,
    eventId: string | undefined,
    kind: PushKind = 'order_status',
  ): Promise<void> {
    const shop = await this.shop();
    const payload: OutboxPayload = {
      message: {
        ...pushMessage({
          title: shop.name,
          body,
          navigate: this.receiptUrl(shop.slug, order.token),
          tag: `order-${topicOf(order.id)}`,
        }),
      },
      ...(eventId ? { eventId } : {}),
    };
    const result = await this.db.tx.execute(sql`
      insert into public.push_outbox
        (tenant_id, subscription_id, kind, payload, dedupe_key, topic, ttl_seconds, urgency, send_after)
      select p.tenant_id, p.subscription_id, ${kind}, ${JSON.stringify(payload)}::jsonb, ${key},
        ${topicOf(order.id)}, ${HOUR}, 'high',
        now() + make_interval(secs => ${eventId ? STEP_PUSH_DELAY_MS / 1000 : 0})
      from public.order_push p
      where p.tenant_id = ${this.db.shopId} and p.order_id = ${order.id}::uuid
      on conflict (tenant_id, subscription_id, dedupe_key) do nothing
      returning id`);
    this.sendAfterCommit(result.rows, eventId ? STEP_PUSH_DELAY_MS : 0);
  }

  /**
   * The receipt on the shop's own address. The path keeps the shop's name, so the link also works from the
   * backup address's worker (it opens the path on its own address).
   */
  private receiptUrl(slug: string, token: string): string {
    return this.shopUrl(slug, `/${slug}/o/${encodeURIComponent(token)}`);
  }

  /** A path on the shop's own address (its subdomain when there is one). */
  shopUrl(slug: string, path: string): string {
    return this.shopDomain
      ? `https://${slug}.${this.shopDomain}${path}`
      : `${this.storefrontUrl}${path}`;
  }

  private async shop(): Promise<{ slug: string; name: string }> {
    const [shop] = await this.db.tx
      .select({ slug: tenants.slug, name: tenants.name })
      .from(tenants)
      .where(eq(tenants.id, this.db.shopId));
    if (!shop) throw new Error('The shop of this transaction was not found.');
    return shop;
  }

  private sendAfterCommit(rows: unknown, afterMs: number): void {
    const ids = IdsSchema.parse(rows).map((r) => r.id);
    if (ids.length === 0) return;
    this.db.afterCommit(() => {
      this.delivery.sendSoon(ids, afterMs);
      return Promise.resolve();
    });
  }
}

function trimSlash(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}
