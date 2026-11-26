import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, Interval } from '@nestjs/schedule';
import { META_SEND_WINDOW_MS, metaEventTime } from '@smartapp/core';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { Db, type TxScope } from '../db/db.service.js';
import { JobsService } from '../jobs/jobs.service.js';
import { MetaGraph, type MetaServerEvent } from './meta-graph.js';

const ADMIN: TxScope = { userId: null, shopId: null, role: 'admin' };
const BATCH = 20;
// A timeout or Meta's own trouble is tried 5 times (1, 5, 15, 60 minutes apart), then shown as failed.
const MAX_ATTEMPTS = 5;
// Rows are kept 13 months (T118 Q13); an IP address and browser never outlive a week (failed rows).
const KEEP_MONTHS = 13;
const CLIENT_KEEP_DAYS = 8;

const ClaimedSchema = z.object({
  id: z.string(),
  event_id: z.string(),
  name: z.string(),
  action_source: z.string(),
  event_time: z.union([z.string(), z.date()]),
  value: z.number().nullable(),
  user_data: z.record(z.string(), z.string()),
  page_url: z.string().nullable(),
  test: z.boolean(),
  client_ip: z.string().nullable(),
  client_ua: z.string().nullable(),
  attempts: z.number(),
});
type Claimed = z.infer<typeof ClaimedSchema>;

const SettingsSchema = z.object({ tracking_sending: z.boolean() });

// Hashed fields Meta takes as lists; fbp and fbc are its own cookies and go as they are.
const LIST_FIELDS = ['em', 'ph', 'fn', 'ln', 'ct', 'country', 'external_id'] as const;

/** One row in Meta's shape (T90, T118): the true time, the owner's own IP and browser, pesos. */
export function metaEventOf(row: Claimed, now: Date): MetaServerEvent {
  const userData: Record<string, string | string[]> = {};
  for (const field of LIST_FIELDS) {
    const value = row.user_data[field];
    if (value) userData[field] = [value];
  }
  if (row.user_data['fbp']) userData['fbp'] = row.user_data['fbp'];
  if (row.user_data['fbc']) userData['fbc'] = row.user_data['fbc'];
  if (row.client_ip) userData['client_ip_address'] = row.client_ip;
  if (row.client_ua) userData['client_user_agent'] = row.client_ua;
  return {
    event_name: row.name,
    event_time: metaEventTime(new Date(row.event_time), now),
    event_id: row.event_id,
    action_source: row.action_source,
    ...(row.action_source === 'website' && row.page_url ? { event_source_url: row.page_url } : {}),
    user_data: userData,
    ...(row.value !== null ? { custom_data: { currency: 'PHP', value: row.value / 100 } } : {}),
  };
}

/**
 * The Meta outbox worker (T90, T118 section 4.5). Every 30 seconds it sends the due rows one per request:
 * an event past Meta's 7 days (less an hour) is skipped as too old, never sent with a moved time; an expired
 * token stops the batch and shows on Tracking; a refused event is not tried again; a timeout is tried up to 5
 * times. A sent row drops its IP address and browser.
 */
@Injectable()
export class MetaSender {
  private readonly logger = new Logger('Meta');
  private readonly testCode: string | null;

  constructor(
    @Inject(Db) private readonly db: Db,
    @Inject(MetaGraph) private readonly graph: MetaGraph,
    @Inject(JobsService) private readonly jobs: JobsService,
    @Inject(ConfigService) config: ConfigService,
  ) {
    this.testCode = config.get<string>('META_TEST_EVENT_CODE') ?? null;
  }

  get connected(): boolean {
    return this.graph.connected;
  }

  @Interval('meta-sender', 30_000)
  async tick(): Promise<void> {
    if (this.jobs.isStopping()) return;
    try {
      while ((await this.sendDue()) === BATCH && !this.jobs.isStopping()) {
        // Another full batch is waiting.
      }
    } catch (error) {
      this.logger.error(`Meta sender failed: ${error instanceof Error ? error.name : 'error'}`);
    }
  }

  /** Sends the due rows (only `ids` when given); answers how many it claimed. */
  async sendDue(ids?: readonly string[], now: Date = new Date()): Promise<number> {
    const sending = await this.db.run(ADMIN, async () => {
      await this.skipTooOld(now);
      const result = await this.db.tx.execute(
        sql`select tracking_sending from public.platform_settings limit 1`,
      );
      return SettingsSchema.array().parse(result.rows)[0]?.tracking_sending === true;
    });
    // Off, or no pixel and token yet: events wait (and turn too old after 7 days).
    if (!sending || !this.graph.connected) return 0;
    const claimed = await this.db.run(ADMIN, () => this.claim(ids));
    for (const row of claimed) {
      const result = await this.graph.send(metaEventOf(row, now), row.test ? this.testCode : null);
      const trace = result.fbtraceId;
      await this.db.run(ADMIN, async () => {
        if (result.kind === 'sent') {
          await this.db.tx.execute(sql`
            update public.track_events set status = 'sent', sent_at = now(), problem = null,
              fbtrace_id = ${trace}, client_ip = null, client_ua = null
            where id = ${row.id}::uuid`);
        } else if (result.kind === 'token' || result.kind === 'rejected') {
          const problem = result.kind === 'token' ? 'token_expired' : 'rejected';
          await this.db.tx.execute(sql`
            update public.track_events set status = 'failed', problem = ${problem}, fbtrace_id = ${trace}
            where id = ${row.id}::uuid`);
        } else if (row.attempts >= MAX_ATTEMPTS) {
          await this.db.tx.execute(sql`
            update public.track_events set status = 'failed', problem = 'timeout', fbtrace_id = ${trace}
            where id = ${row.id}::uuid`);
        }
      });
      // An expired token fails every event the same way: stop and let the founder fix it.
      if (result.kind === 'token') {
        this.logger.warn('Meta refused the access token; sending stopped until it is replaced');
        break;
      }
    }
    return claimed.length;
  }

  /** Waiting, queued or failed rows past Meta's window are skipped as too old (their time stays true). */
  private async skipTooOld(now: Date): Promise<void> {
    const cutoff = new Date(now.getTime() - META_SEND_WINDOW_MS).toISOString();
    await this.db.tx.execute(sql`
      update public.track_events
      set status = 'skipped', problem = 'too_old', client_ip = null, client_ua = null
      where status in ('waiting', 'queued', 'failed') and event_time < ${cutoff}::timestamptz`);
  }

  private async claim(ids: readonly string[] | undefined): Promise<Claimed[]> {
    const only = ids ? sql`and e.id = any(${`{${ids.join(',')}}`}::uuid[])` : sql``;
    const result = await this.db.tx.execute(sql`
      with due as (
        select e.id from public.track_events e
        where e.status = 'queued' and e.send_after <= now() ${only}
        order by e.send_after
        limit ${BATCH}
        for update skip locked
      )
      update public.track_events e
      set attempts = least(e.attempts + 1, 10),
          send_after = now() + case e.attempts
            when 0 then interval '1 minute' when 1 then interval '5 minutes'
            when 2 then interval '15 minutes' else interval '60 minutes' end
      from due where e.id = due.id
      returning e.id, e.event_id, e.name, e.action_source, e.event_time, e.value, e.user_data, e.page_url,
        e.test, host(e.client_ip) as client_ip, e.client_ua, e.attempts`);
    return z.array(ClaimedSchema).parse(result.rows);
  }

  /** Daily at 3:30 Manila: rows older than 13 months go, and no IP address or browser outlives a week. */
  @Cron('30 3 * * *', { name: 'meta-retention', timeZone: 'Asia/Manila' })
  async cleanUp(): Promise<void> {
    await this.jobs.runLocked('meta-retention', async () => {
      await this.db.tx.execute(sql`
        delete from public.track_events where created_at < now() - make_interval(months => ${KEEP_MONTHS})`);
      await this.db.tx.execute(sql`
        update public.track_events set client_ip = null, client_ua = null
        where (client_ip is not null or client_ua is not null)
          and created_at < now() - make_interval(days => ${CLIENT_KEEP_DAYS})`);
    });
  }
}
