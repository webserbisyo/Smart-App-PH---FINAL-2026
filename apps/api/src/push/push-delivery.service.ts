import { Inject, Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { Db, type TxScope } from '../db/db.service.js';
import { JobsService } from '../jobs/jobs.service.js';
import { PushSender, type PushResult } from './push-sender.js';

const ADMIN: TxScope = { userId: null, shopId: null, role: 'admin' };
// One send plus 3 retries (section 5), waiting 1, 5 and 15 minutes between them.
export const PUSH_MAX_ATTEMPTS = 4;
const BATCH = 50;
const PARALLEL = 8;

// What a push_outbox row keeps: the message the phone gets, and (for an order step) the step it belongs to,
// so an owner's Undo within 10 seconds stops the push before it goes.
export const OutboxPayloadSchema = z.object({
  message: z.record(z.string(), z.unknown()),
  eventId: z.uuid().optional(),
});
export type OutboxPayload = z.infer<typeof OutboxPayloadSchema>;

const ClaimedSchema = z.object({
  id: z.string(),
  subscription_id: z.string(),
  payload: z.unknown(),
  topic: z.string().nullable(),
  ttl_seconds: z.number(),
  urgency: z.enum(['normal', 'high']),
  attempts: z.number(),
  stale: z.boolean(),
  endpoint: z.string().nullable(),
  p256dh: z.string().nullable(),
  auth: z.string().nullable(),
  undone: z.boolean(),
});
type Claimed = z.infer<typeof ClaimedSchema>;

type Outcome = PushResult | 'drop';

/**
 * Sends what `push_outbox` holds (section 5): right after the commit that queued it, and every 30 seconds
 * for the rest. Rows are claimed with `for update skip locked` and their next try is set before sending, so two
 * API copies never send the same push and a crash mid-send only means a later retry. Runs as app_admin
 * because it works across shops; it logs counts only, never an address or a message (rule 12).
 */
@Injectable()
export class PushDelivery {
  private readonly logger = new Logger('Push');

  constructor(
    @Inject(Db) private readonly db: Db,
    @Inject(PushSender) private readonly sender: PushSender,
    @Inject(JobsService) private readonly jobs: JobsService,
  ) {}

  /** After a commit: these rows go once their wait is over (an order step waits out the 10 s Undo). */
  sendSoon(ids: readonly string[], afterMs: number): void {
    if (ids.length === 0) return;
    const go = () => {
      void this.sendDue(ids).catch((error: unknown) => {
        this.logger.warn(`Push send failed: ${error instanceof Error ? error.name : 'error'}`);
      });
    };
    if (afterMs <= 0) go();
    else setTimeout(go, afterMs).unref();
  }

  @Interval('push-outbox', 30_000)
  async tick(): Promise<void> {
    if (this.jobs.isStopping()) return;
    try {
      while ((await this.sendDue()) === BATCH && !this.jobs.isStopping()) {
        // Another full batch is waiting.
      }
    } catch (error) {
      this.logger.error(`Push outbox failed: ${error instanceof Error ? error.name : 'error'}`);
    }
  }

  /** Sends the due rows (only `ids` when given); answers how many it claimed. */
  async sendDue(ids?: readonly string[]): Promise<number> {
    const claimed = await this.db.run(ADMIN, () => this.claim(ids));
    if (claimed.length === 0) return 0;
    const outcomes = await mapLimit(claimed, PARALLEL, (row) => this.deliver(row));
    await this.db.run(ADMIN, () => this.settle(claimed, outcomes));
    return claimed.length;
  }

  private async claim(ids: readonly string[] | undefined): Promise<Claimed[]> {
    const only = ids ? sql`and o.id = any(${`{${ids.join(',')}}`}::uuid[])` : sql``;
    const result = await this.db.tx.execute(sql`
      with due as (
        select o.id from public.push_outbox o
        where o.status = 'queued' and o.send_after <= now() ${only}
        order by o.send_after
        limit ${BATCH}
        for update skip locked
      ), claimed as (
        update public.push_outbox o
        set attempts = o.attempts + 1,
            send_after = now() + case o.attempts
              when 0 then interval '1 minute' when 1 then interval '5 minutes' else interval '15 minutes' end
        from due where o.id = due.id
        returning o.id, o.tenant_id, o.subscription_id, o.payload, o.topic, o.ttl_seconds, o.urgency,
          o.attempts, o.created_at
      )
      select c.id, c.subscription_id, c.payload, c.topic, c.ttl_seconds, c.urgency, c.attempts,
        c.created_at + make_interval(secs => c.ttl_seconds) < now() as stale,
        s.endpoint, s.p256dh, s.auth,
        coalesce(e.undone_at is not null, false) as undone
      from claimed c
      left join public.push_subscriptions s on s.tenant_id = c.tenant_id and s.id = c.subscription_id
      left join public.order_events e
        on e.tenant_id = c.tenant_id and e.id::text = (c.payload ->> 'eventId')`);
    return z.array(ClaimedSchema).parse(result.rows);
  }

  private async deliver(row: Claimed): Promise<Outcome> {
    const payload = OutboxPayloadSchema.safeParse(row.payload);
    // An undone step, a push past its time to live, or a broken row is dropped, never sent late.
    if (!payload.success || row.stale || row.undone) return 'drop';
    if (!row.endpoint || !row.p256dh || !row.auth) return 'gone';
    return this.sender.send(
      { endpoint: row.endpoint, p256dh: row.p256dh, auth: row.auth },
      JSON.stringify(payload.data.message),
      { ttl: row.ttl_seconds, urgency: row.urgency, topic: row.topic },
    );
  }

  private async settle(rows: readonly Claimed[], outcomes: readonly Outcome[]): Promise<void> {
    const pick = (want: (o: Outcome, row: Claimed) => boolean) =>
      rows.filter((row, i) => {
        const outcome = outcomes[i];
        return outcome !== undefined && want(outcome, row);
      });
    const sent = pick((o) => o === 'sent');
    const gone = pick((o) => o === 'gone');
    const failed = pick(
      (o, row) => o === 'drop' || (o === 'retry' && row.attempts >= PUSH_MAX_ATTEMPTS),
    );
    const retried = pick((o) => o === 'retry');
    const list = (values: readonly string[]) => `{${[...new Set(values)].join(',')}}`;

    if (sent.length > 0) {
      await this.db.tx.execute(sql`
        update public.push_outbox set status = 'sent', sent_at = now()
        where id = any(${list(sent.map((r) => r.id))}::uuid[])`);
      await this.db.tx.execute(sql`
        update public.push_subscriptions set last_ok_at = now(), fail_count = 0
        where id = any(${list(sent.map((r) => r.subscription_id))}::uuid[])`);
    }
    if (failed.length > 0) {
      await this.db.tx.execute(sql`
        update public.push_outbox set status = 'failed'
        where id = any(${list(failed.map((r) => r.id))}::uuid[])`);
    }
    if (retried.length > 0) {
      await this.db.tx.execute(sql`
        update public.push_subscriptions set fail_count = least(fail_count + 1, 100)
        where id = any(${list(retried.map((r) => r.subscription_id))}::uuid[])`);
    }
    if (gone.length > 0) {
      // The phone dropped it (404 or 410): the subscription goes, and with it its waiting pushes.
      await this.db.tx.execute(sql`
        delete from public.push_subscriptions
        where id = any(${list(gone.map((r) => r.subscription_id))}::uuid[])`);
    }
    if (sent.length + gone.length + failed.length > 0) {
      this.logger.log(`Pushes: ${sent.length} sent, ${gone.length} gone, ${failed.length} failed`);
    }
  }
}

/** Runs `fn` over `items`, at most `limit` at a time, keeping their order. */
export async function mapLimit<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      const item = items[index];
      if (item !== undefined) results[index] = await fn(item);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
