import { Inject, Injectable } from '@nestjs/common';
import {
  NEWS_INBOX_DAYS,
  NewsLinkKindEnum,
  newsPath,
  ShopNewsItemSchema,
  type ShopNewsItem,
} from '@smartapp/core';
import { and, eq, sql } from 'drizzle-orm';
import type { CallerUser } from '../auth/caller.js';
import { Db } from '../db/db.service.js';
import { pushSubscriptions, tenants } from '../db/generated/schema.js';
import { MediaService } from '../media/media.service.js';
import { uuidOrNull } from '../orders/order-book.js';
import { ShopReader } from '../public/shop-reader.js';
import { platformOf, type PushSubscriptionInput } from '../push/push-endpoints.js';
import { PushSubscriptions } from '../push/push-subscriptions.service.js';
import { MemberAccounts } from './member-accounts.js';

/**
 * The customer's side of Push News (T106, P5): this phone's news yes or no, the shop's news of the last 30
 * days, and "opened" when a news push is tapped. The phone is known only by its push address: a phone with
 * no subscription has news off.
 */
@Injectable()
export class ShopNewsService {
  constructor(
    @Inject(Db) private readonly db: Db,
    @Inject(ShopReader) private readonly shops: ShopReader,
    @Inject(PushSubscriptions) private readonly subscriptions: PushSubscriptions,
    @Inject(MemberAccounts) private readonly accounts: MemberAccounts,
    @Inject(MediaService) private readonly media: MediaService,
  ) {}

  async choice(slug: string, endpoint: string): Promise<{ news: boolean }> {
    await this.shops.enterShop(slug);
    const [row] = await this.db.tx
      .select({ news: pushSubscriptions.news })
      .from(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.tenantId, this.db.shopId),
          eq(pushSubscriptions.endpoint, endpoint),
        ),
      );
    return { news: row?.news === true };
  }

  /**
   * News on or off for this phone. A signed-in member's phone is marked as theirs, so the member groups reach
   * it. Turning news off from a news push counts as "stopped" on that news.
   */
  async setChoice(
    slug: string,
    input: { subscription: PushSubscriptionInput; news: boolean },
    user: CallerUser | null,
    userAgent: string | undefined,
  ): Promise<{ news: boolean }> {
    await this.shops.enterShop(slug);
    const id = await this.subscriptions.save(input.subscription, platformOf(userAgent), null);
    const member = user ? await this.accounts.byUser(user.id) : null;
    await this.db.tx.execute(sql`
      update public.push_subscriptions
      set news_changed_at = case when news is distinct from ${input.news} then now() else news_changed_at end,
        news = ${input.news}
      where tenant_id = ${this.db.shopId} and id = ${id}::uuid`);
    if (member) await this.subscriptions.linkMember(id, member.id);
    if (!input.news) {
      await this.db.tx.execute(sql`
        update public.push_deliveries set stopped_at = now()
        where id = (
          select d.id from public.push_deliveries d
          where d.tenant_id = ${this.db.shopId} and d.subscription_id = ${id}::uuid and d.status = 'sent'
            and d.stopped_at is null and d.sent_at > now() - interval '7 days'
          order by d.sent_at desc
          limit 1)`);
    }
    return { news: input.news };
  }

  /** Sent news of the last 30 days, newest first. */
  async inbox(slug: string): Promise<ShopNewsItem[]> {
    await this.shops.enterShop(slug);
    const [shop] = await this.db.tx
      .select({ slug: tenants.slug })
      .from(tenants)
      .where(eq(tenants.id, this.db.shopId));
    const shopSlug = shop?.slug ?? slug;
    const rows = await this.db.tx.execute<{
      id: string;
      title: string;
      body: string;
      image_media_id: string | null;
      link_kind: string;
      link_item_id: string | null;
      sent_at: string;
    }>(sql`
      select id, title, body, image_media_id, link_kind, link_item_id, sent_at
      from public.push_campaigns
      where tenant_id = ${this.db.shopId} and status = 'sent'
        and sent_at > now() - make_interval(days => ${NEWS_INBOX_DAYS})
      order by sent_at desc
      limit 30`);
    return Promise.all(
      rows.rows.map(async (r) =>
        ShopNewsItemSchema.parse({
          id: r.id,
          title: r.title,
          body: r.body,
          imageUrl: await this.media.refById(r.image_media_id),
          path: newsPath(shopSlug, {
            kind: NewsLinkKindEnum.parse(r.link_kind),
            itemId: r.link_item_id,
          }),
          sentAt: new Date(r.sent_at).toISOString(),
        }),
      ),
    );
  }

  /** A news push was tapped (its delivery id rides in the link); once, and only for a sent push. */
  async opened(slug: string, deliveryId: string): Promise<{ ok: true }> {
    await this.shops.enterShop(slug);
    const id = uuidOrNull(deliveryId);
    if (id) {
      await this.db.tx.execute(sql`
        update public.push_deliveries set opened_at = now()
        where tenant_id = ${this.db.shopId} and id = ${id}::uuid and status = 'sent' and opened_at is null`);
    }
    return { ok: true };
  }
}
