import { Inject, Injectable } from '@nestjs/common';
import {
  hasReference,
  isTransfer,
  OrderRatingSchema,
  PROOFS_PER_ORDER,
  type OrderRating,
  type OrderReceipt,
  type OrderRow,
  type Payment,
  type PaymentMethod,
} from '@smartapp/core';
import { and, desc, eq, inArray, or, sql } from 'drizzle-orm';
import type { CallerUser } from '../auth/caller.js';
import { ApiFailure, notFound } from '../common/api-failure.js';
import { Db } from '../db/db.service.js';
import { orderRatings, orders, paymentProofs, tenants } from '../db/generated/schema.js';
import { EmailOutbox } from '../email/email-outbox.service.js';
import { MediaService } from '../media/media.service.js';
import { MemberAccounts } from '../members/member-accounts.js';
import { OrderReader, type OrderView } from '../orders/order-reader.js';
import { pushOrderOf } from '../orders/order-steps.service.js';
import { platformOf, type PushSubscriptionInput } from '../push/push-endpoints.js';
import { PushOutbox } from '../push/push-outbox.service.js';
import { PushSubscriptions } from '../push/push-subscriptions.service.js';
import { ShopReader } from './shop-reader.js';

// A payment photo is taken while the order waits for its money, and only in its first week (phases-4-6).
const PROOF_DAYS = 7;
// The tokens a phone keeps for its guest orders (device storage keeps the newest ones).
export const MAX_TOKENS = 50;

/**
 * The customer's receipt link and what it does (api.md "Storefront"): read the order, send a payment photo,
 * rate a finished order. The receipt token is the only key: anyone who has the link sees that one order, and
 * a wrong token or another shop's token is Not found (rule 12).
 */
@Injectable()
export class ReceiptsService {
  constructor(
    @Inject(Db) private readonly db: Db,
    @Inject(ShopReader) private readonly shops: ShopReader,
    @Inject(OrderReader) private readonly reader: OrderReader,
    @Inject(MediaService) private readonly media: MediaService,
    @Inject(PushOutbox) private readonly push: PushOutbox,
    @Inject(PushSubscriptions) private readonly subscriptions: PushSubscriptions,
    @Inject(EmailOutbox) private readonly emails: EmailOutbox,
    @Inject(MemberAccounts) private readonly accounts: MemberAccounts,
  ) {}

  async getOrder(slug: string, token: string): Promise<OrderReceipt> {
    return (await this.order(slug, token)).receipt;
  }

  /** The guest orders this phone kept and, for a signed-in member, their own orders (newest first). */
  async listMyOrders(
    slug: string,
    tokens: readonly string[],
    user: CallerUser | null,
  ): Promise<OrderRow[]> {
    await this.shops.enterShop(slug);
    const wanted = [...new Set(tokens)].filter((t) => t.length >= 16 && t.length <= 64);
    const member = user ? await this.accounts.byUser(user.id) : null;
    const mine = [
      ...(wanted.length > 0 ? [inArray(orders.token, wanted)] : []),
      ...(member ? [eq(orders.memberId, member.id)] : []),
    ];
    if (mine.length === 0) return [];
    const rows = await this.db.tx
      .select()
      .from(orders)
      .where(and(eq(orders.tenantId, this.db.shopId), or(...mine)))
      .orderBy(desc(orders.placedAt))
      .limit(MAX_TOKENS);
    return (await this.reader.views(rows)).map((view) => this.reader.row(view));
  }

  /** Room for one payment photo in the private `proofs` bucket, while the order can still be paid. */
  async createProofUploadUrl(
    slug: string,
    token: string,
  ): Promise<{ uploadUrl: string; path: string }> {
    const view = await this.order(slug, token);
    this.checkPayable(view);
    const made = await this.media.createProofUpload();
    return { uploadUrl: made.uploadUrl, path: made.path };
  }

  /**
   * The photo and its reference number go to the shop. A photo never marks the order paid: the payment waits
   * for the owner's check (`pending`). The same reference cannot pay two orders (`duplicate_reference`).
   */
  async submitProof(
    slug: string,
    token: string,
    input: { method: PaymentMethod; referenceNo: string; path: string },
  ): Promise<Payment> {
    const view = await this.order(slug, token, true);
    this.checkPayable(view);
    if (input.method !== view.receipt.paymentMethod && !isTransfer(input.method)) {
      throw new ApiFailure('payment_unavailable', 409);
    }
    const reference = input.referenceNo.trim();
    const file = await this.media.confirmProof(input.path);
    const [proof] = await this.db.tx
      .insert(paymentProofs)
      .values({
        tenantId: this.db.shopId,
        orderId: view.id,
        mediaId: file.id,
        referenceNo: hasReference(reference) ? reference.slice(0, 40) : null,
        status: 'pending',
      })
      .returning({ id: paymentProofs.id });
    if (!proof) throw new ApiFailure('unknown', 500);
    await this.db.tx
      .update(orders)
      .set({ paymentStatus: 'pending' })
      .where(and(eq(orders.tenantId, this.db.shopId), eq(orders.id, view.id)));
    // The owner checks it: a push to their devices (Q2) and, when they want it, an email.
    await this.push.toOwner('owner_payment', pushOrderOf(view), `pay:${proof.id}`);
    this.emails.ownerAlert(
      'payment_to_check',
      {
        orderId: view.id,
        orderNo: view.row.orderNo,
        total: view.row.total,
        shop: await this.shopName(),
      },
      `payment:${proof.id}`,
    );
    const after = await this.reader.byId(view.id);
    if (!after) throw notFound();
    return this.reader.payment(after);
  }

  /**
   * Notify me on the receipt (T13): this phone gets the order's steps. Anyone with the link may ask; the
   * push carries no more than the link already shows.
   */
  async subscribePush(
    slug: string,
    token: string,
    subscription: PushSubscriptionInput,
    userAgent: string | undefined,
  ): Promise<{ ok: true }> {
    const view = await this.order(slug, token);
    const id = await this.subscriptions.save(subscription, platformOf(userAgent), null);
    await this.subscriptions.linkOrder(id, view.id);
    return { ok: true };
  }

  /** Stars for a finished order, once. */
  async rateOrder(
    slug: string,
    token: string,
    input: { stars: number; comment: string | null },
  ): Promise<OrderRating> {
    const view = await this.order(slug, token, true);
    if (view.receipt.status !== 'completed' || view.receipt.rating) {
      throw new ApiFailure('invalid_transition', 409);
    }
    const comment = input.comment?.trim() ? input.comment.trim().slice(0, 300) : null;
    const [saved] = await this.db.tx
      .insert(orderRatings)
      .values({ tenantId: this.db.shopId, orderId: view.id, stars: input.stars, comment })
      .returning({ createdAt: orderRatings.createdAt });
    return OrderRatingSchema.parse({
      stars: input.stars,
      comment,
      at: new Date(saved?.createdAt ?? Date.now()).toISOString(),
    });
  }

  private async shopName(): Promise<string> {
    const [shop] = await this.db.tx
      .select({ name: tenants.name })
      .from(tenants)
      .where(eq(tenants.id, this.db.shopId));
    return shop?.name ?? '';
  }

  /** The order behind a receipt link; `lock` holds it until the commit (two photos at once wait in line). */
  private async order(slug: string, token: string, lock = false): Promise<OrderView> {
    await this.shops.enterShop(slug);
    if (lock && token.length <= 64) {
      await this.db.tx.execute(
        sql`select 1 from public.orders where tenant_id = ${this.db.shopId} and token = ${token} for update`,
      );
    }
    const view = await this.reader.byToken(token);
    if (!view) throw notFound();
    return view;
  }

  /** A transfer still waiting for its money, in its first week, with room for one more photo. */
  private checkPayable(view: OrderView): void {
    const r = view.receipt;
    const fresh = Date.now() - new Date(r.placedAt).getTime() <= PROOF_DAYS * 86_400_000;
    if (r.status !== 'placed' || r.paymentStatus !== 'unpaid' || !isTransfer(r.paymentMethod)) {
      throw new ApiFailure('order_not_payable', 409);
    }
    if (!fresh) throw new ApiFailure('order_not_payable', 409);
    if (view.proofs.length >= PROOFS_PER_ORDER) throw new ApiFailure('too_many_proofs', 409);
  }
}
