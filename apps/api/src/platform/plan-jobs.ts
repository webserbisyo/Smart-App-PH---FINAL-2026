import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { manilaDate, planEmailWords, planReminderStage } from '@smartapp/core';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { Db, type TxScope } from '../db/db.service.js';
import { EmailSender } from '../email/email-sender.js';
import { JobsService } from '../jobs/jobs.service.js';
import { AdminService } from './admin.service.js';
import { day, iso } from './plan-reader.js';

const ADMIN: TxScope = { userId: null, shopId: null, role: 'admin' };
// D6: a sign-up that stopped after step 1 is deleted after 180 days.
const LEAD_KEEP_DAYS = 180;
const TimeSchema = z.union([z.string(), z.date()]);
const Num = z.coerce.number();

const ShopSchema = z.object({
  id: z.string(),
  trial_ends_at: TimeSchema.nullable(),
  paid_until: TimeSchema.nullable(),
  pending: z.boolean(),
});

/**
 * The plan's daily jobs (T118, phases-7-9.md tasks 7.5 and 8.6), each under its own lock so two API copies
 * never both run one:
 * - 9:00 Manila: the reminders (Q9), each stage once per end day, by email and a Billing line; a shop with a
 *   payment waiting for the founder gets none.
 * - 0:05 Manila: shops set to close at the end of their paid time close.
 * - 3:00 Manila: sign-ups that stopped after step 1 for 180 days are deleted (D6).
 * - 8:00 Manila: the founder's "all good" summary email (Q17).
 */
@Injectable()
export class PlanJobs {
  private readonly logger = new Logger('PlanJobs');
  private readonly adminEmail: string | null;

  constructor(
    @Inject(Db) private readonly db: Db,
    @Inject(JobsService) private readonly jobs: JobsService,
    @Inject(AdminService) private readonly admin: AdminService,
    @Inject(EmailSender) private readonly sender: EmailSender,
    @Inject(ConfigService) config: ConfigService,
  ) {
    this.adminEmail = config.get<string>('ADMIN_EMAIL') ?? null;
  }

  @Cron('0 9 * * *', { name: 'plan-reminders', timeZone: 'Asia/Manila' })
  async reminders(now: Date = new Date()): Promise<number> {
    let sent = 0;
    await this.jobs.runLocked('plan-reminders', async () => {
      const result = await this.db.tx.execute(sql`
        select t.id, t.trial_ends_at, t.paid_until,
          exists (select 1 from public.plan_payments p where p.tenant_id = t.id and p.status = 'pending') as pending
        from public.tenants t
        where t.stage = 'live' and not t.is_demo and t.closes_on is null`);
      for (const shop of ShopSchema.array().parse(result.rows)) {
        if (shop.pending) continue;
        const due = planReminderStage(
          { trialEndsAt: iso(shop.trial_ends_at), paidUntil: day(shop.paid_until) },
          now,
        );
        if (!due) continue;
        const key = `reminder:${due.stage}:${due.end}`;
        // Once per stage and end day: the job's own audit row says it went (the email is queued after commit).
        const seen = await this.db.tx.execute(sql`
          select 1 from public.audit_log
          where tenant_id = ${shop.id}::uuid and action = 'plan.reminder_auto' and target = ${key} limit 1`);
        if (seen.rows.length > 0) continue;
        await this.admin.sendReminder(shop.id, due.stage, 'system', key);
        await this.admin.audit(shop.id, 'plan.reminder_auto', key, { stage: due.stage });
        sent += 1;
      }
    });
    return sent;
  }

  @Cron('5 0 * * *', { name: 'plan-close-on', timeZone: 'Asia/Manila' })
  async closeDue(now: Date = new Date()): Promise<void> {
    await this.jobs.runLocked('plan-close-on', async () => {
      await this.db.tx.execute(sql`
        update public.tenants set stage = 'closed', closed_at = now(), closes_on = null, updated_at = now()
        where stage <> 'closed' and closes_on is not null and closes_on < ${manilaDate(now)}::date
          and close_reason is not null`);
    });
  }

  @Cron('0 3 * * *', { name: 'stale-leads', timeZone: 'Asia/Manila' })
  async staleLeads(): Promise<void> {
    await this.jobs.runLocked('stale-leads', async () => {
      await this.db.tx.execute(sql`
        delete from public.signup_leads
        where tenant_id is null and created_at < now() - make_interval(days => ${LEAD_KEEP_DAYS})`);
    });
  }

  @Cron('0 8 * * *', { name: 'daily-summary', timeZone: 'Asia/Manila' })
  async dailySummary(now: Date = new Date()): Promise<boolean> {
    const to = this.adminEmail;
    if (!to) return false;
    const facts = await this.db.run(ADMIN, async () => {
      const result = await this.db.tx.execute(sql`
        select
          (select count(*) from public.tenants where stage = 'live' and not is_demo and not is_test) as live,
          (select count(*) from public.plan_payments where status = 'pending') as to_check,
          (select count(*) from public.track_events
            where status = 'sent' and sent_at > now() - interval '1 day') as sent,
          (select count(*) from public.track_events where status = 'failed') as failed,
          (select count(*) from public.track_events
            where problem = 'too_old' and created_at > now() - interval '8 days') as too_old,
          exists (select 1 from public.track_events where problem = 'token_expired' and status = 'failed')
            as token_problem`);
      return z
        .array(
          z.object({
            live: Num,
            to_check: Num,
            sent: Num,
            failed: Num,
            too_old: Num,
            token_problem: z.boolean(),
          }),
        )
        .parse(result.rows)[0];
    });
    if (!facts) return false;
    const date = manilaDate(now);
    const w = planEmailWords.summary;
    const text = w.line({
      live: facts.live,
      toCheck: facts.to_check,
      sent: facts.sent,
      failed: facts.failed,
      tooOld: facts.too_old,
      tokenProblem: facts.token_problem,
    });
    const result = await this.sender.send(
      {
        to,
        subject: w.subject(date),
        text,
        html: text
          .split('\n')
          .map((line) => `<p>${line.replace(/[<>&]/g, '')}</p>`)
          .join(''),
      },
      `smartapp-summary-${date}`,
    );
    if (result !== 'sent') this.logger.warn(`Daily summary not sent: ${result}`);
    return result === 'sent';
  }
}
