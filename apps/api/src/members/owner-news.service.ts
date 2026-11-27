import { Inject, Injectable } from '@nestjs/common';
import {
  errorWords,
  isQuietTime,
  NEWS_AUDIENCES,
  NEWS_QUIET_FROM,
  NEWS_QUIET_UNTIL,
  NEWS_WEEK_LIMIT,
  NewsAudienceEnum,
  NewsLinkKindEnum,
  newsDayUsed,
  newsNextFree,
  NewsOverviewSchema,
  newsPath,
  newsSendBlock,
  NewsStatusEnum,
  NewsWaitReasonEnum,
  newsWeekUsed,
  outOfQuiet,
  OwnerNewsSchema,
  PushSettingsSchema,
  clockMinutes,
  type NewsOverview,
  type NewsResults,
  type NewsSlot,
  type NewsTestInput,
  type OwnerNews,
  type PushSettings,
  type SaveNewsInput,
} from '@smartapp/core';
import { and, desc, eq, sql } from 'drizzle-orm';
import { ApiFailure, notFound } from '../common/api-failure.js';
import { Db } from '../db/db.service.js';
import { items, pushCampaigns, shopSettings, tenants } from '../db/generated/schema.js';
import { MediaService } from '../media/media.service.js';
import { uuidOrNull } from '../orders/order-book.js';
import { pushMessage } from '../push/push-messages.js';
import { PushOutbox } from '../push/push-outbox.service.js';
import { PushSender } from '../push/push-sender.js';
import { NewsAudiences } from './news-audience.js';
import { NewsSender } from './news-sender.js';

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;
const LIST_MAX = 100;
// Best times come from the last 8 weeks of orders.
const BEST_DAYS = 56;
const BEST_SHOWN = 3;
// The order of the list: what needs the owner first.
const LIST_ORDER: Record<OwnerNews['status'], number> = {
  sending: 0,
  waiting: 1,
  scheduled: 2,
  draft: 3,
  sent: 4,
  canceled: 5,
};

type Campaign = typeof pushCampaigns.$inferSelect;

interface Counted {
  sent: number;
  android: number;
  ios: number;
  opened: number;
  stopped: number;
  done: number;
  ordered: number;
  sales: number;
}

const iso = (value: string | null) => (value ? new Date(value).toISOString() : null);
const num = (value: unknown) => Number(value ?? 0);

/**
 * The owner's Push News (api.md "News (owner)", T106, P1 to P14): write, schedule, cancel and read news, the
 * week and day limits and quiet hours from the rules in core, and the two automatic pushes. Results are
 * worked out from push_deliveries and orders on each read (no summary columns).
 */
@Injectable()
export class OwnerNewsService {
  constructor(
    @Inject(Db) private readonly db: Db,
    @Inject(NewsAudiences) private readonly audiences: NewsAudiences,
    @Inject(MediaService) private readonly media: MediaService,
    @Inject(PushSender) private readonly sender: PushSender,
    @Inject(PushOutbox) private readonly outbox: PushOutbox,
    @Inject(NewsSender) private readonly news: NewsSender,
  ) {}

  async overview(): Promise<NewsOverview> {
    const now = new Date();
    const all = await this.audiences.load();
    const counts = NewsAudiences.counts(all);
    const campaigns = await this.campaigns();
    const results = await this.results();
    const list = await Promise.all(campaigns.map((c) => this.view(c, counts, results)));
    const slots = slotsOf(campaigns, null);
    const recent = list.filter(
      (n) => n.status === 'sent' && n.sentAt && now.getTime() - Date.parse(n.sentAt) < 30 * DAY,
    );
    const fresh = await this.db.tx.execute<{ n: number }>(sql`
      select count(*)::int as n from public.push_subscriptions
      where tenant_id = ${this.db.shopId} and news and news_changed_at > now() - interval '7 days'`);
    list.sort(
      (a, b) =>
        LIST_ORDER[a.status] - LIST_ORDER[b.status] ||
        (b.sentAt ?? b.sendAt ?? b.updatedAt).localeCompare(a.sentAt ?? a.sendAt ?? a.updatedAt),
    );
    return NewsOverviewSchema.parse({
      phones: counts.everyone,
      memberPhones: counts.members,
      guestPhones: counts.everyone - counts.members,
      newThisWeek: num(fresh.rows[0]?.n),
      weekUsed: Math.min(NEWS_WEEK_LIMIT, newsWeekUsed(slots, now)),
      nextFreeAt: newsNextFree(slots, now)?.toISOString() ?? null,
      dayUsed: newsDayUsed(slots, now),
      last30: {
        news: recent.length,
        ordered: recent.reduce((sum, n) => sum + (n.results?.ordered ?? 0), 0),
        sales: recent.reduce((sum, n) => sum + (n.results?.sales ?? 0), 0),
      },
      audiences: NEWS_AUDIENCES.map((audience) => ({ audience, phones: counts[audience] })),
      auto: await this.pushSettings(),
      bestTimes: await this.bestTimes(),
      news: list,
    });
  }

  async get(newsId: string): Promise<OwnerNews> {
    const campaign = await this.find(newsId);
    const counts = NewsAudiences.counts(await this.audiences.load());
    return this.view(campaign, counts, await this.results(campaign.id));
  }

  /**
   * A new news or a change to one not yet sent. Draft keeps it; now sends in the next minute (or at 8 AM in
   * quiet hours); later at `sendAt`. The limits count every news that is set, sending or sent (P5).
   */
  async save(newsId: string | null, input: SaveNewsInput): Promise<OwnerNews> {
    // Help mode can write a draft for the owner, never send one (api.md "News").
    if (this.db.helping && input.mode !== 'draft') throw new ApiFailure('support_locked', 403);
    const now = new Date();
    // One save at a time per shop, so two tabs never both take the week's last news.
    await this.db.tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${`news:${this.db.shopId}`}))`,
    );
    const existing = newsId ? await this.find(newsId, true) : null;
    if (existing && (existing.status === 'sent' || existing.status === 'sending')) {
      throw new ApiFailure('news_already_sent', 409);
    }
    const sending = input.mode !== 'draft';
    const title = input.title.trim();
    const body = input.body.trim();
    // The database keeps a body on every news, a draft too.
    if (!body) {
      throw new ApiFailure('invalid_input', 422, { body: [errorWords('invalid_input')] });
    }
    const itemId = input.link.kind === 'item' ? await this.activeItem(input.link.itemId) : null;
    if (sending && input.link.kind === 'item' && !itemId) {
      throw new ApiFailure('news_link_gone', 422);
    }
    const image = input.imageUrl
      ? await this.media.fileOf(input.imageUrl, ['news_photo', 'item'])
      : null;
    if (input.imageUrl && !image) {
      throw new ApiFailure('invalid_input', 422, { imageUrl: [errorWords('invalid_input')] });
    }
    const counts = NewsAudiences.counts(await this.audiences.load());
    if (sending && counts[input.audience] === 0) throw new ApiFailure('news_no_audience', 422);

    let sendAt: Date | null = null;
    if (input.mode === 'now') sendAt = outOfQuiet(now);
    if (input.mode === 'later') {
      if (!input.sendAt) throw new ApiFailure('invalid_input', 422);
      sendAt = new Date(input.sendAt);
      if (sendAt.getTime() < now.getTime() - MINUTE) throw new ApiFailure('invalid_input', 422);
      if (isQuietTime(sendAt)) throw new ApiFailure('news_quiet_hours', 422);
    }
    if (sendAt) {
      const block = newsSendBlock(slotsOf(await this.campaigns(), existing?.id ?? null), sendAt);
      if (block === 'week') throw new ApiFailure('news_week_limit', 422);
      if (block === 'day') throw new ApiFailure('news_day_limit', 422);
    }
    const copiedFrom = input.copiedFromId ? uuidOrNull(input.copiedFromId) : null;
    const values = {
      title,
      body,
      imageMediaId: image?.id ?? null,
      linkKind: input.link.kind,
      linkItemId: itemId,
      audience: input.audience,
      status: sending ? 'scheduled' : 'draft',
      waitReason: null,
      sendAt: sendAt?.toISOString() ?? null,
      sentAt: null,
      phones: counts[input.audience],
      updatedAt: now.toISOString(),
    };
    let id: string;
    if (existing) {
      await this.db.tx
        .update(pushCampaigns)
        .set(values)
        .where(and(eq(pushCampaigns.tenantId, this.db.shopId), eq(pushCampaigns.id, existing.id)));
      id = existing.id;
    } else {
      const copied = copiedFrom ? await this.find(copiedFrom).catch(() => null) : null;
      const [made] = await this.db.tx
        .insert(pushCampaigns)
        .values({
          ...values,
          tenantId: this.db.shopId,
          copiedFromId: copied?.id ?? null,
          createdBy: this.db.scope.userId,
        })
        .returning({ id: pushCampaigns.id });
      if (!made) throw new ApiFailure('unknown', 500);
      id = made.id;
    }
    // A news due now goes out right after the commit instead of waiting for the next run.
    if (sendAt && sendAt.getTime() <= now.getTime()) {
      this.db.afterCommit(() => {
        this.news.runSoon();
        return Promise.resolve();
      });
    }
    return this.get(id);
  }

  /** Back to a draft: a scheduled or waiting news is not sent. */
  async cancel(newsId: string): Promise<OwnerNews> {
    const campaign = await this.find(newsId, true);
    if (campaign.status === 'sent' || campaign.status === 'sending') {
      throw new ApiFailure('news_already_sent', 409);
    }
    await this.db.tx
      .update(pushCampaigns)
      .set({ status: 'draft', waitReason: null, sendAt: null, updatedAt: new Date().toISOString() })
      .where(and(eq(pushCampaigns.tenantId, this.db.shopId), eq(pushCampaigns.id, campaign.id)));
    return this.get(campaign.id);
  }

  /** Only a draft (or a cancelled news) can go; sent news stay for the results. */
  async remove(newsId: string): Promise<{ ok: true }> {
    const campaign = await this.find(newsId, true);
    if (campaign.status !== 'draft' && campaign.status !== 'canceled') {
      throw new ApiFailure('news_already_sent', 409);
    }
    await this.db.tx
      .delete(pushCampaigns)
      .where(and(eq(pushCampaigns.tenantId, this.db.shopId), eq(pushCampaigns.id, campaign.id)));
    return { ok: true };
  }

  /** "Send me a test": the owner's own devices with alerts on get it now; it never counts. */
  async test(input: NewsTestInput): Promise<{ ok: true }> {
    const userId = this.db.userId;
    const [shop] = await this.db.tx
      .select({ slug: tenants.slug })
      .from(tenants)
      .where(eq(tenants.id, this.db.shopId));
    if (!shop) throw notFound();
    const devices = await this.db.tx.execute<{ endpoint: string; p256dh: string; auth: string }>(
      sql`select endpoint, p256dh, auth from public.push_subscriptions
        where tenant_id = ${this.db.shopId} and user_id = ${userId}::uuid`,
    );
    const message = JSON.stringify(
      pushMessage({
        title: input.title.trim(),
        body: input.body.trim(),
        navigate: this.outbox.shopUrl(
          shop.slug,
          newsPath(shop.slug, { kind: 'home', itemId: null }),
        ),
        tag: 'news-test',
      }),
    );
    const targets = devices.rows.map((d) => ({
      endpoint: d.endpoint,
      p256dh: d.p256dh,
      auth: d.auth,
    }));
    this.db.afterCommit(async () => {
      for (const target of targets) {
        await this.sender.send(target, message, { ttl: 3600, urgency: 'normal', topic: null });
      }
    });
    return { ok: true };
  }

  async pushSettings(): Promise<PushSettings> {
    const [row] = await this.db.tx
      .select({
        stampAdded: shopSettings.pushStampAdded,
        rewardReady: shopSettings.pushRewardReady,
      })
      .from(shopSettings)
      .where(eq(shopSettings.tenantId, this.db.shopId));
    return PushSettingsSchema.parse(row ?? { stampAdded: true, rewardReady: true });
  }

  async savePushSettings(input: PushSettings): Promise<PushSettings> {
    await this.db.tx
      .update(shopSettings)
      .set({
        pushStampAdded: input.stampAdded,
        pushRewardReady: input.rewardReady,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(shopSettings.tenantId, this.db.shopId));
    return this.pushSettings();
  }

  // ---- Reads -----------------------------------------------------------------------------------

  private campaigns(): Promise<Campaign[]> {
    return this.db.tx
      .select()
      .from(pushCampaigns)
      .where(eq(pushCampaigns.tenantId, this.db.shopId))
      .orderBy(desc(pushCampaigns.createdAt))
      .limit(LIST_MAX);
  }

  private async find(newsId: string, lock = false): Promise<Campaign> {
    const id = uuidOrNull(newsId);
    if (!id) throw notFound();
    const query = this.db.tx
      .select()
      .from(pushCampaigns)
      .where(and(eq(pushCampaigns.tenantId, this.db.shopId), eq(pushCampaigns.id, id)));
    const [row] = lock ? await query.for('update') : await query;
    if (!row) throw notFound();
    return row;
  }

  private async activeItem(itemId: string | null): Promise<string | null> {
    const id = itemId ? uuidOrNull(itemId) : null;
    if (!id) return null;
    const [row] = await this.db.tx
      .select({ id: items.id })
      .from(items)
      .where(and(eq(items.tenantId, this.db.shopId), eq(items.id, id), eq(items.status, 'active')));
    return row?.id ?? null;
  }

  /** Per news: phones reached, by kind, opened, stopped, and orders within 24 hours of opening. */
  private async results(onlyId?: string): Promise<Map<string, Counted>> {
    const only = onlyId ? sql`and d.campaign_id = ${onlyId}::uuid` : sql``;
    const counted = await this.db.tx.execute<{
      campaign_id: string;
      sent: number;
      android: number;
      ios: number;
      opened: number;
      stopped: number;
      done: number;
    }>(sql`
      select d.campaign_id,
        count(*) filter (where d.status = 'sent')::int as sent,
        count(*) filter (where d.status = 'sent' and d.platform = 'android')::int as android,
        count(*) filter (where d.status = 'sent' and d.platform = 'ios')::int as ios,
        count(*) filter (where d.opened_at is not null)::int as opened,
        count(*) filter (where d.stopped_at is not null)::int as stopped,
        count(*) filter (where d.status <> 'queued')::int as done
      from public.push_deliveries d
      where d.tenant_id = ${this.db.shopId} ${only}
      group by d.campaign_id`);
    const ordered = await this.db.tx.execute<{
      campaign_id: string;
      ordered: number;
      sales: number;
    }>(
      sql`
      select x.campaign_id, count(*)::int as ordered, coalesce(sum(x.total), 0)::int as sales
      from (
        select distinct d.campaign_id, o.id, o.total
        from public.push_deliveries d
        join public.orders o on o.tenant_id = d.tenant_id
          and o.placed_at >= d.opened_at and o.placed_at < d.opened_at + interval '24 hours'
          and o.status not in ('cancelled', 'expired')
          and (o.member_id = d.member_id or exists (
            select 1 from public.order_push p
            where p.tenant_id = o.tenant_id and p.order_id = o.id and p.subscription_id = d.subscription_id))
        where d.tenant_id = ${this.db.shopId} and d.opened_at is not null ${only}
      ) x
      group by x.campaign_id`,
    );
    const out = new Map<string, Counted>();
    for (const r of counted.rows) {
      out.set(r.campaign_id, {
        sent: num(r.sent),
        android: num(r.android),
        ios: num(r.ios),
        opened: num(r.opened),
        stopped: num(r.stopped),
        done: num(r.done),
        ordered: 0,
        sales: 0,
      });
    }
    for (const r of ordered.rows) {
      const row = out.get(r.campaign_id);
      if (row) {
        row.ordered = num(r.ordered);
        row.sales = num(r.sales);
      }
    }
    return out;
  }

  private async view(
    c: Campaign,
    counts: Record<SaveNewsInput['audience'], number>,
    results: Map<string, Counted>,
  ): Promise<OwnerNews> {
    const audience = NewsAudienceEnum.parse(c.audience);
    const status = NewsStatusEnum.parse(c.status);
    const r = results.get(c.id);
    const itemName = c.linkItemId ? await this.itemName(c.linkItemId) : null;
    const done: NewsResults | null =
      status === 'sent'
        ? {
            sent: r?.sent ?? 0,
            android: r?.android ?? 0,
            ios: r?.ios ?? 0,
            opened: r?.opened ?? 0,
            ordered: r?.ordered ?? 0,
            sales: r?.sales ?? 0,
            stopped: r?.stopped ?? 0,
          }
        : null;
    return OwnerNewsSchema.parse({
      id: c.id,
      title: c.title,
      body: c.body,
      imageUrl: await this.media.refById(c.imageMediaId),
      link: { kind: NewsLinkKindEnum.parse(c.linkKind), itemId: c.linkItemId },
      itemName,
      audience,
      status,
      waitReason: c.waitReason ? NewsWaitReasonEnum.parse(c.waitReason) : null,
      sendAt: iso(c.sendAt),
      sentAt: iso(c.sentAt),
      updatedAt: iso(c.updatedAt) ?? new Date().toISOString(),
      // Before it goes: the phones it would reach now. Once it went: the phones it was for.
      phones: status === 'sent' || status === 'sending' ? c.phones : counts[audience],
      progress: status === 'sending' ? (r?.done ?? 0) : null,
      results: done,
      copiedFromId: c.copiedFromId,
    });
  }

  private async itemName(itemId: string): Promise<string | null> {
    const [row] = await this.db.tx
      .select({ name: items.name })
      .from(items)
      .where(and(eq(items.tenantId, this.db.shopId), eq(items.id, itemId)));
    return row?.name ?? null;
  }

  /** The shop's busiest order hours outside quiet hours, as Manila "HH:00", busiest first. */
  private async bestTimes(): Promise<string[]> {
    const from = Math.ceil(clockMinutes(NEWS_QUIET_UNTIL) / 60);
    const until = Math.floor(clockMinutes(NEWS_QUIET_FROM) / 60);
    const result = await this.db.tx.execute<{ hour: number }>(sql`
      select h.hour from (
        select extract(hour from placed_at at time zone 'Asia/Manila')::int as hour, count(*) as n
        from public.orders
        where tenant_id = ${this.db.shopId} and placed_at > now() - make_interval(days => ${BEST_DAYS})
          and status not in ('cancelled', 'expired')
        group by 1
      ) h
      where h.hour >= ${from} and h.hour < ${until}
      order by h.n desc, h.hour
      limit ${BEST_SHOWN}`);
    return result.rows.map((r) => `${String(num(r.hour)).padStart(2, '0')}:00`);
  }
}

/** The news that count toward the limits, at the time they went or will go. */
function slotsOf(campaigns: readonly Campaign[], except: string | null): NewsSlot[] {
  return campaigns
    .filter((c) => c.id !== except)
    .map((c) => ({ status: NewsStatusEnum.parse(c.status), at: iso(c.sentAt ?? c.sendAt) }));
}
