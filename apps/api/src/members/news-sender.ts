import { Inject, Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import {
  isQuietTime,
  NewsAudienceEnum,
  NewsLinkKindEnum,
  newsPath,
  outOfQuiet,
} from '@smartapp/core';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { Db } from '../db/db.service.js';
import { JobsService, type JobOutcome } from '../jobs/jobs.service.js';
import { mapLimit, PUSH_MAX_ATTEMPTS } from '../push/push-delivery.service.js';
import { pushMessage } from '../push/push-messages.js';
import { PushOutbox } from '../push/push-outbox.service.js';
import { PushSender, type PushResult } from '../push/push-sender.js';
import { NewsAudiences } from './news-audience.js';

// A news waits on a phone that is off for a day at most, then it is old news.
const NEWS_TTL_SECONDS = 24 * 3600;
const START_BATCH = 20;
const SEND_BATCH = 50;
// At most this many pushes per run; the next run (30 s later) carries on.
const SEND_PER_RUN = 1000;
const PARALLEL = 8;

const DueSchema = z.array(z.object({ id: z.string(), tenant_id: z.string() }));

const CampaignSchema = z.object({
  id: z.string(),
  audience: NewsAudienceEnum,
  link_kind: NewsLinkKindEnum,
  link_item_id: z.string().nullable(),
  item_ok: z.boolean(),
  paused: z.boolean(),
  lapsed: z.boolean(),
});

const QueuedSchema = z.object({
  id: z.string(),
  campaign_id: z.string(),
  subscription_id: z.string().nullable(),
  attempts: z.number(),
  endpoint: z.string().nullable(),
  p256dh: z.string().nullable(),
  auth: z.string().nullable(),
  news: z.boolean().nullable(),
  title: z.string(),
  body: z.string(),
  link_kind: NewsLinkKindEnum,
  link_item_id: z.string().nullable(),
  slug: z.string(),
});
type Queued = z.infer<typeof QueuedSchema>;
type Outcome = PushResult | 'drop';

/**
 * Sends the owner's news (T106, D5): every 30 seconds, and right after a news set for now. A due news first
 * checks it can still go (shop paused, plan lapsed, linked item gone: it waits with the reason; quiet hours:
 * it moves to 8 AM), then gets one push_deliveries row per phone in its audience, which is the send queue.
 * The whole run holds one job lock, so two API copies never send the same push. Logs counts only (rule 12).
 */
@Injectable()
export class NewsSender {
  private readonly logger = new Logger('News');
  private running: Promise<JobOutcome> | null = null;
  private again = false;

  constructor(
    @Inject(Db) private readonly db: Db,
    @Inject(JobsService) private readonly jobs: JobsService,
    @Inject(NewsAudiences) private readonly audiences: NewsAudiences,
    @Inject(PushSender) private readonly sender: PushSender,
    @Inject(PushOutbox) private readonly outbox: PushOutbox,
  ) {}

  @Interval('push-news', 30_000)
  async tick(): Promise<void> {
    await this.runOnce();
  }

  /** After a news set for now commits: run at once (or once more, when a run is going). */
  runSoon(): void {
    if (this.running) {
      this.again = true;
      return;
    }
    void this.runOnce();
  }

  /** One run: start the due news, send what is queued, close the news that are done. */
  async runOnce(now: Date = new Date()): Promise<JobOutcome> {
    if (this.running) return this.running;
    this.running = this.jobs.runLocked('push-news', async () => {
      await this.startDue(now);
      await this.sendQueued();
      await this.finish();
    });
    try {
      return await this.running;
    } finally {
      this.running = null;
      if (this.again) {
        this.again = false;
        void this.runOnce();
      }
    }
  }

  private async startDue(now: Date): Promise<void> {
    const due = DueSchema.parse(
      (
        await this.db.tx.execute(sql`
          select id, tenant_id from public.push_campaigns
          where status = 'scheduled' and send_at <= ${now.toISOString()}::timestamptz
          order by send_at
          limit ${START_BATCH}
          for update skip locked`)
      ).rows,
    );
    for (const row of due) {
      await this.db.useShop(row.tenant_id);
      await this.start(row.id, now);
    }
  }

  private async start(campaignId: string, now: Date): Promise<void> {
    const shopId = this.db.shopId;
    // A plan lapses when the shop is closed, or its paid time and its trial both ended.
    const found = CampaignSchema.safeParse(
      (
        await this.db.tx.execute(sql`
          select c.id, c.audience, c.link_kind, c.link_item_id,
            (c.link_kind <> 'item' or exists (
              select 1 from public.items i
              where i.tenant_id = c.tenant_id and i.id = c.link_item_id and i.status = 'active')) as item_ok,
            coalesce(ss.paused, false) as paused,
            (t.stage = 'closed' or (t.paid_until is not null
              and t.paid_until < (now() at time zone 'Asia/Manila')::date
              and (t.trial_ends_at is null or t.trial_ends_at < now()))) as lapsed
          from public.push_campaigns c
          join public.tenants t on t.id = c.tenant_id
          left join public.shop_settings ss on ss.tenant_id = c.tenant_id
          where c.tenant_id = ${shopId}::uuid and c.id = ${campaignId}::uuid`)
      ).rows[0],
    );
    if (!found.success) return;
    const c = found.data;
    const wait = c.paused
      ? 'shop_paused'
      : c.lapsed
        ? 'plan_lapsed'
        : c.item_ok
          ? null
          : 'link_gone';
    if (wait) {
      await this.db.tx.execute(sql`
        update public.push_campaigns set status = 'waiting', wait_reason = ${wait}, updated_at = now()
        where id = ${c.id}::uuid`);
      return;
    }
    // A run that came late into quiet hours moves the news to 8 AM instead of waking anyone.
    if (isQuietTime(now)) {
      await this.db.tx.execute(sql`
        update public.push_campaigns set send_at = ${outOfQuiet(now).toISOString()}::timestamptz
        where id = ${c.id}::uuid`);
      return;
    }
    const phones = NewsAudiences.pick(await this.audiences.load(), c.audience);
    if (phones.length > 0) {
      await this.db.tx.execute(sql`
        insert into public.push_deliveries (tenant_id, campaign_id, subscription_id, member_id, platform)
        select ${shopId}::uuid, ${c.id}::uuid, x.subscription_id, x.member_id, x.platform
        from jsonb_to_recordset(${JSON.stringify(
          phones.map((p) => ({
            subscription_id: p.id,
            member_id: p.memberId,
            platform: p.platform,
          })),
        )}::jsonb) as x(subscription_id uuid, member_id uuid, platform text)
        on conflict (campaign_id, subscription_id) do nothing`);
    }
    await this.db.tx.execute(sql`
      update public.push_campaigns set status = 'sending', phones = ${phones.length}, updated_at = now()
      where id = ${c.id}::uuid`);
  }

  private async sendQueued(): Promise<void> {
    const tried = new Set<string>();
    let sent = 0;
    let gone = 0;
    let failed = 0;
    while (tried.size < SEND_PER_RUN && !this.jobs.isStopping()) {
      const skip = `{${[...tried].join(',')}}`;
      const batch = z.array(QueuedSchema).parse(
        (
          await this.db.tx.execute(sql`
            select d.id, d.campaign_id, d.subscription_id, d.attempts,
              s.endpoint, s.p256dh, s.auth, s.news,
              c.title, c.body, c.link_kind, c.link_item_id, t.slug
            from public.push_deliveries d
            join public.push_campaigns c on c.tenant_id = d.tenant_id and c.id = d.campaign_id
            join public.tenants t on t.id = d.tenant_id
            left join public.push_subscriptions s on s.tenant_id = d.tenant_id and s.id = d.subscription_id
            where d.status = 'queued' and c.status = 'sending' and not (d.id = any(${skip}::uuid[]))
            order by d.created_at
            limit ${SEND_BATCH}
            for update of d skip locked`)
        ).rows,
      );
      if (batch.length === 0) break;
      for (const row of batch) tried.add(row.id);
      const outcomes = await mapLimit(batch, PARALLEL, (row) => this.deliver(row));
      const counts = await this.settle(batch, outcomes);
      sent += counts.sent;
      gone += counts.gone;
      failed += counts.failed;
    }
    if (sent + gone + failed > 0) {
      this.logger.log(`News pushes: ${sent} sent, ${gone} gone, ${failed} failed`);
    }
  }

  private deliver(row: Queued): Promise<Outcome> {
    // The phone turned news off (or went) after the news was queued: it is not sent.
    if (!row.endpoint || !row.p256dh || !row.auth || row.news !== true) {
      return Promise.resolve('drop');
    }
    const path = `${newsPath(row.slug, { kind: row.link_kind, itemId: row.link_item_id })}&d=${row.id}`;
    const message = pushMessage({
      title: row.title,
      body: row.body,
      navigate: this.outbox.shopUrl(row.slug, path),
      tag: `news-${row.campaign_id.replace(/-/g, '').slice(0, 24)}`,
    });
    return this.sender.send(
      { endpoint: row.endpoint, p256dh: row.p256dh, auth: row.auth },
      JSON.stringify(message),
      { ttl: NEWS_TTL_SECONDS, urgency: 'normal', topic: null },
    );
  }

  private async settle(
    rows: readonly Queued[],
    outcomes: readonly Outcome[],
  ): Promise<{ sent: number; gone: number; failed: number }> {
    const ids = (want: (o: Outcome, row: Queued) => boolean) =>
      rows.filter((row, i) => {
        const o = outcomes[i];
        return o !== undefined && want(o, row);
      });
    const list = (values: readonly (string | null)[]) =>
      `{${[...new Set(values.filter((v): v is string => v !== null))].join(',')}}`;
    const sent = ids((o) => o === 'sent');
    const gone = ids((o) => o === 'gone');
    const failed = ids(
      (o, row) =>
        o === 'drop' || o === 'gone' || (o === 'retry' && row.attempts + 1 >= PUSH_MAX_ATTEMPTS),
    );
    const retried = ids((o, row) => o === 'retry' && row.attempts + 1 < PUSH_MAX_ATTEMPTS);
    if (sent.length > 0) {
      await this.db.tx.execute(sql`
        update public.push_deliveries set status = 'sent', sent_at = now(), attempts = attempts + 1
        where id = any(${list(sent.map((r) => r.id))}::uuid[])`);
      await this.db.tx.execute(sql`
        update public.push_subscriptions set last_ok_at = now(), fail_count = 0
        where id = any(${list(sent.map((r) => r.subscription_id))}::uuid[])`);
    }
    if (failed.length > 0) {
      await this.db.tx.execute(sql`
        update public.push_deliveries set status = 'failed', attempts = least(attempts + 1, 10)
        where id = any(${list(failed.map((r) => r.id))}::uuid[])`);
    }
    if (retried.length > 0) {
      await this.db.tx.execute(sql`
        update public.push_deliveries set attempts = attempts + 1
        where id = any(${list(retried.map((r) => r.id))}::uuid[])`);
      await this.db.tx.execute(sql`
        update public.push_subscriptions set fail_count = least(fail_count + 1, 100)
        where id = any(${list(retried.map((r) => r.subscription_id))}::uuid[])`);
    }
    if (gone.length > 0) {
      // The phone dropped it (404 or 410): its subscription goes; the delivery row stays for the counts.
      await this.db.tx.execute(sql`
        delete from public.push_subscriptions
        where id = any(${list(gone.map((r) => r.subscription_id))}::uuid[])`);
    }
    return { sent: sent.length, gone: gone.length, failed: failed.length - gone.length };
  }

  /** A news whose every phone was tried is sent. */
  private async finish(): Promise<void> {
    await this.db.tx.execute(sql`
      update public.push_campaigns c set status = 'sent', sent_at = now(), updated_at = now()
      where c.status = 'sending' and not exists (
        select 1 from public.push_deliveries d where d.campaign_id = c.id and d.status = 'queued')`);
  }
}
