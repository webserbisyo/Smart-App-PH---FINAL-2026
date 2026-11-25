import { Inject, Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { Db } from '../db/db.service.js';
import { orderPush, pushSubscriptions } from '../db/generated/schema.js';
import type { PushPlatform, PushSubscriptionInput } from './push-endpoints.js';

const FoundSchema = z.array(
  z.object({
    id: z.string(),
    p256dh: z.string(),
    auth: z.string(),
    user_id: z.string().nullable(),
    platform: z.string(),
  }),
);

/**
 * Keeps the phones and laptops that asked for pushes (section 5 step 2): one row per address per shop
 * (`unique (tenant_id, endpoint)`), a customer's or an owner's (X6). Runs in the request's shop.
 */
@Injectable()
export class PushSubscriptions {
  constructor(@Inject(Db) private readonly db: Db) {}

  /** The subscription's row, made or refreshed; `userId` marks an owner's device. */
  async save(
    input: PushSubscriptionInput,
    platform: PushPlatform,
    userId: string | null,
  ): Promise<string> {
    const shopId = this.db.shopId;
    // Plain SQL: the generated name of the p256dh column does not map back to it.
    const found = FoundSchema.parse(
      (
        await this.db.tx.execute(sql`
          select id, p256dh, auth, user_id, platform from public.push_subscriptions
          where tenant_id = ${shopId}::uuid and endpoint = ${input.endpoint}`)
      ).rows,
    )[0];
    const sameKeys = found?.p256dh === input.keys.p256dh && found.auth === input.keys.auth;
    if (found && sameKeys && (userId === null || found.user_id === userId)) {
      if (found.platform !== platform) {
        await this.db.tx
          .update(pushSubscriptions)
          .set({ platform })
          .where(eq(pushSubscriptions.id, found.id));
      }
      return found.id;
    }
    // New keys for the same address (the browser made it again), or an owner taking this device: start over.
    if (found) await this.db.tx.delete(pushSubscriptions).where(eq(pushSubscriptions.id, found.id));
    const made = z.array(z.object({ id: z.string() })).parse(
      (
        await this.db.tx.execute(sql`
            insert into public.push_subscriptions (tenant_id, endpoint, p256dh, auth, platform, user_id)
            values (${shopId}::uuid, ${input.endpoint}, ${input.keys.p256dh}, ${input.keys.auth},
              ${platform}, ${userId}::uuid)
            returning id`)
      ).rows,
    )[0];
    if (!made) throw new Error('The subscription was not saved.');
    return made.id;
  }

  /** This phone gets the order's steps (Notify me on the receipt). */
  async linkOrder(subscriptionId: string, orderId: string): Promise<void> {
    await this.db.tx
      .insert(orderPush)
      .values({ tenantId: this.db.shopId, orderId, subscriptionId })
      .onConflictDoNothing();
  }

  /** The phone belongs to this member (signed in on it). */
  async linkMember(subscriptionId: string, memberId: string): Promise<void> {
    await this.db.tx
      .update(pushSubscriptions)
      .set({ memberId })
      .where(
        and(
          eq(pushSubscriptions.tenantId, this.db.shopId),
          eq(pushSubscriptions.id, subscriptionId),
        ),
      );
  }

  /** The owner turned alerts off on this device (or signed out): its row goes. */
  async removeOwnerDevice(endpoint: string, userId: string): Promise<void> {
    await this.db.tx
      .delete(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.tenantId, this.db.shopId),
          eq(pushSubscriptions.endpoint, endpoint),
          eq(pushSubscriptions.userId, userId),
        ),
      );
  }

  /** Whether this device already gets the owner's alerts. */
  async isOwnerDevice(endpoint: string, userId: string): Promise<boolean> {
    const [found] = await this.db.tx
      .select({ id: pushSubscriptions.id })
      .from(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.tenantId, this.db.shopId),
          eq(pushSubscriptions.endpoint, endpoint),
          eq(pushSubscriptions.userId, userId),
        ),
      );
    return found !== undefined;
  }
}
