import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Interval } from '@nestjs/schedule';
import {
  billingWords,
  formatManila,
  formatPeso,
  planEmailWords,
  PLAN_REMINDER_STAGES,
  PlanRejectReasonEnum,
  pushWords,
} from '@smartapp/core';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { AUTH_PROVIDER, type AuthProvider } from '../auth/auth-provider.js';
import { Db, type TxScope } from '../db/db.service.js';
import { JobsService } from '../jobs/jobs.service.js';
import { mapLimit } from '../push/push-delivery.service.js';
import { orderNoText } from '../push/push-messages.js';
import { EmailSender, type EmailMessage, type EmailResult } from './email-sender.js';

const ADMIN: TxScope = { userId: null, shopId: null, role: 'admin' };
const MAX_ATTEMPTS = 4;
const BATCH = 20;
const PARALLEL = 4;

export type OwnerEmailKind = 'new_order' | 'payment_to_check';
// The plan's emails (T118, task 7.8). plan_payment goes to the founder; the rest to the shop's owners.
export type PlatformEmailKind =
  'shop_live' | 'plan_reminder' | 'plan_answer' | 'help_started' | 'plan_payment';

// Names and numbers only, like the order emails.
export const PlatformEmailSchema = z.object({
  shop: z.string(),
  amount: z.number().int().nullable().default(null),
  // A Manila day: the trial's end, the paid-until day.
  until: z.string().nullable().default(null),
  stage: z.enum(PLAN_REMINDER_STAGES).nullable().default(null),
  reason: PlanRejectReasonEnum.nullable().default(null),
  verdict: z.enum(['approved', 'rejected']).nullable().default(null),
  minutes: z.number().int().nullable().default(null),
});
export type PlatformEmail = z.input<typeof PlatformEmailSchema>;

// Ids and numbers only: an email row never keeps a customer's name, phone or address.
const OrderEmailSchema = z.object({
  orderId: z.uuid(),
  orderNo: z.number().int(),
  total: z.number().int(),
  shop: z.string(),
});
type OrderEmail = z.infer<typeof OrderEmailSchema>;

const RecipientSchema = z.object({ user_id: z.string(), notify_email: z.string().nullable() });

const ClaimedSchema = z.object({
  id: z.string(),
  kind: z.string(),
  to_email: z.string(),
  payload: z.unknown(),
  attempts: z.number(),
});
type Claimed = z.infer<typeof ClaimedSchema>;

/**
 * The owner's emails (launch phase 5, section 7 task 8): a new order and a payment photo to check, when the
 * owner has them on in Settings › Notifications. They are queued after the order's commit (the owner's own
 * address can sit in Supabase Auth, which needs a call outside the database), sent at once, and the 30-second
 * job sends the rest with up to 3 retries. Push is the fast alert; email is the backup (R3).
 */
@Injectable()
export class EmailOutbox {
  private readonly logger = new Logger('Email');
  private readonly dashboardUrl: string;

  constructor(
    @Inject(Db) private readonly db: Db,
    @Inject(EmailSender) private readonly sender: EmailSender,
    @Inject(AUTH_PROVIDER) private readonly auth: AuthProvider,
    @Inject(JobsService) private readonly jobs: JobsService,
    @Inject(ConfigService) config: ConfigService,
  ) {
    const url = config.get<string>('DASHBOARD_URL') ?? 'http://localhost:5173';
    this.dashboardUrl = url.endsWith('/') ? url.slice(0, -1) : url;
  }

  /** Called inside the order's transaction: the email is queued once that commits. */
  ownerAlert(kind: OwnerEmailKind, email: OrderEmail, key: string): void {
    const shopId = this.db.shopId;
    this.db.afterCommit(async () => {
      const ids = await this.enqueue(shopId, kind, email, key);
      if (ids.length > 0) await this.sendDue(ids);
    });
  }

  /**
   * Queues a plan email once the caller's transaction commits, and sends it at once. `owners` = every owner of
   * the shop; `plan` = the owners who keep plan emails on (Settings › Notifications); else one address.
   */
  platformAlert(
    shopId: string,
    kind: PlatformEmailKind,
    email: PlatformEmail,
    key: string,
    to: 'owners' | 'plan' | string,
    // Held back (an approval's 10 minutes for Undo, T118 Q4); the 30-second job sends it then.
    delayMs = 0,
  ): void {
    this.db.afterCommit(async () => {
      const ids = await this.enqueuePlatform(shopId, kind, email, key, to, delayMs);
      if (ids.length > 0) await this.sendDue(ids);
    });
  }

  async enqueuePlatform(
    shopId: string,
    kind: PlatformEmailKind,
    email: PlatformEmail,
    key: string,
    to: 'owners' | 'plan' | string,
    delayMs = 0,
  ): Promise<string[]> {
    let recipients: { userId: string; to: string }[];
    if (to === 'owners' || to === 'plan') {
      const flag = to === 'plan' ? sql`and notify_plan_payment` : sql``;
      const members = await this.db.run(ADMIN, async () => {
        const result = await this.db.tx.execute(sql`
          select user_id, notify_email from public.tenant_members where tenant_id = ${shopId}::uuid ${flag}`);
        return z.array(RecipientSchema).parse(result.rows);
      });
      recipients = [];
      for (const m of members) {
        const address = m.notify_email ?? (await this.auth.getUserEmail(m.user_id));
        if (address) recipients.push({ userId: m.user_id, to: address.toLowerCase() });
      }
    } else {
      recipients = [{ userId: 'founder', to: to.toLowerCase() }];
    }
    return this.insertRows(
      shopId,
      kind,
      PlatformEmailSchema.parse(email),
      key,
      recipients,
      delayMs,
    );
  }

  private async insertRows(
    shopId: string,
    kind: string,
    payload: unknown,
    key: string,
    recipients: readonly { userId: string; to: string }[],
    delayMs = 0,
  ): Promise<string[]> {
    if (recipients.length === 0) return [];
    return this.db.run(ADMIN, async () => {
      const ids: string[] = [];
      for (const r of recipients) {
        const result = await this.db.tx.execute(sql`
          insert into public.notification_outbox (tenant_id, kind, to_email, payload, dedupe_key, send_after)
          values (${shopId}::uuid, ${kind}, ${r.to}, ${JSON.stringify(payload)}::jsonb, ${`${key}:${r.userId}`.slice(0, 120)},
            now() + make_interval(secs => ${delayMs / 1000}))
          on conflict (tenant_id, dedupe_key) do nothing
          returning id`);
        ids.push(
          ...z
            .array(z.object({ id: z.string() }))
            .parse(result.rows)
            .map((row) => row.id),
        );
      }
      return ids;
    });
  }

  /** Writes one row per owner who wants this email; answers the new rows. */
  async enqueue(
    shopId: string,
    kind: OwnerEmailKind,
    email: OrderEmail,
    key: string,
  ): Promise<string[]> {
    const flag = kind === 'new_order' ? sql`notify_new_order` : sql`notify_payment_to_check`;
    const members = await this.db.run(ADMIN, async () => {
      const result = await this.db.tx.execute(sql`
        select user_id, notify_email from public.tenant_members where tenant_id = ${shopId}::uuid and ${flag}`);
      return z.array(RecipientSchema).parse(result.rows);
    });
    const recipients: { userId: string; to: string }[] = [];
    for (const m of members) {
      const to = m.notify_email ?? (await this.auth.getUserEmail(m.user_id));
      if (to) recipients.push({ userId: m.user_id, to: to.toLowerCase() });
    }
    return this.insertRows(shopId, kind, email, key, recipients);
  }

  @Interval('email-outbox', 30_000)
  async tick(): Promise<void> {
    if (this.jobs.isStopping()) return;
    try {
      while ((await this.sendDue()) === BATCH && !this.jobs.isStopping()) {
        // Another full batch is waiting.
      }
    } catch (error) {
      this.logger.error(`Email outbox failed: ${error instanceof Error ? error.name : 'error'}`);
    }
  }

  /** Sends the due rows (only `ids` when given); answers how many it claimed. */
  async sendDue(ids?: readonly string[]): Promise<number> {
    const claimed = await this.db.run(ADMIN, () => this.claim(ids));
    if (claimed.length === 0) return 0;
    const outcomes = await mapLimit(claimed, PARALLEL, (row) => this.deliver(row));
    await this.db.run(ADMIN, async () => {
      const done = (want: (o: EmailResult | 'drop', row: Claimed) => boolean) =>
        `{${claimed
          .filter((row, i) => want(outcomes[i] ?? 'drop', row))
          .map((r) => r.id)
          .join(',')}}`;
      await this.db.tx.execute(sql`
        update public.notification_outbox set status = 'sent', sent_at = now()
        where id = any(${done((o) => o === 'sent')}::uuid[])`);
      await this.db.tx.execute(sql`
        update public.notification_outbox set status = 'failed'
        where id = any(${done((o, row) => o === 'refused' || o === 'drop' || (o === 'retry' && row.attempts >= MAX_ATTEMPTS))}::uuid[])`);
    });
    return claimed.length;
  }

  private async claim(ids: readonly string[] | undefined): Promise<Claimed[]> {
    const only = ids ? sql`and o.id = any(${`{${ids.join(',')}}`}::uuid[])` : sql``;
    const result = await this.db.tx.execute(sql`
      with due as (
        select o.id from public.notification_outbox o
        where o.status = 'queued' and o.send_after <= now() ${only}
        order by o.send_after
        limit ${BATCH}
        for update skip locked
      )
      update public.notification_outbox o
      set attempts = o.attempts + 1,
          send_after = now() + case o.attempts
            when 0 then interval '1 minute' when 1 then interval '5 minutes' else interval '15 minutes' end
      from due where o.id = due.id
      returning o.id, o.kind, o.to_email, o.payload, o.attempts`);
    return z.array(ClaimedSchema).parse(result.rows);
  }

  private async deliver(row: Claimed): Promise<EmailResult | 'drop'> {
    const message = this.render(row);
    if (!message) return 'drop';
    return this.sender.send(message, `smartapp-${row.id}`);
  }

  /** The words for one row; null for a kind this sender does not write yet. */
  render(row: { kind: string; to_email: string; payload: unknown }): EmailMessage | null {
    if (row.kind !== 'new_order' && row.kind !== 'payment_to_check')
      return this.renderPlatform(row);
    const data = OrderEmailSchema.safeParse(row.payload);
    if (!data.success) return null;
    const w = pushWords.email;
    const no = orderNoText(data.data.orderNo);
    const total = formatPeso(data.data.total);
    let subject: string;
    let line: string;
    if (row.kind === 'new_order') {
      subject = w.newOrderSubject(data.data.shop, no);
      line = w.newOrderLine(no, total);
    } else if (row.kind === 'payment_to_check') {
      subject = w.paymentSubject(data.data.shop, no);
      line = w.paymentLine(no, total);
    } else {
      return null;
    }
    const link = `${this.dashboardUrl}/orders/${data.data.orderId}`;
    const why = w.why(data.data.shop);
    return {
      to: row.to_email,
      subject,
      text: `${line}\n\n${w.open}: ${link}\n\n${why}`,
      html: [
        `<p>${escapeHtml(line)}</p>`,
        `<p><a href="${escapeHtml(link)}">${escapeHtml(w.open)}</a></p>`,
        `<p><small>${escapeHtml(why)}</small></p>`,
      ].join(''),
    };
  }

  private renderPlatform(row: {
    kind: string;
    to_email: string;
    payload: unknown;
  }): EmailMessage | null {
    const data = PlatformEmailSchema.safeParse(row.payload);
    if (!data.success) return null;
    const m = platformMessage(row.kind, data.data);
    if (!m) return null;
    const w = planEmailWords;
    const link = m.admin ? `${this.dashboardUrl}/admin` : `${this.dashboardUrl}/settings/plan`;
    const open = m.admin ? w.openAdmin : w.open;
    const lines = [m.line, ...(m.extra ? [m.extra] : [])];
    return {
      to: row.to_email,
      subject: m.subject,
      text: `${lines.join('\n\n')}\n\n${open}: ${link}\n\n${w.sign}`,
      html: [
        ...lines.map((l) => `<p>${escapeHtml(l)}</p>`),
        `<p><a href="${escapeHtml(link)}">${escapeHtml(open)}</a></p>`,
        `<p><small>${escapeHtml(w.sign)}</small></p>`,
      ].join(''),
    };
  }
}

/** The plan emails' words (task 7.8); null for a kind or shape we do not know. */
function platformMessage(
  kind: string,
  e: z.infer<typeof PlatformEmailSchema>,
): { subject: string; line: string; extra: string | null; admin: boolean } | null {
  const w = planEmailWords;
  const amount = e.amount !== null ? formatPeso(e.amount) : '';
  const until = e.until ? formatManila(`${e.until}T12:00:00+08:00`, 'date') : '';
  switch (kind) {
    case 'shop_live':
      return {
        subject: w.shopLive.subject(e.shop),
        line: w.shopLive.line(e.shop, until),
        extra: null,
        admin: false,
      };
    case 'plan_reminder': {
      if (!e.stage) return null;
      const r = w.reminder[e.stage];
      return { subject: r.subject(until), line: r.line(until, amount), extra: null, admin: false };
    }
    case 'plan_answer':
      if (e.verdict === 'approved')
        return {
          subject: w.approved.subject,
          line: w.approved.line(amount, until),
          extra: w.approved.note,
          admin: false,
        };
      if (e.verdict === 'rejected' && e.reason)
        return {
          subject: w.rejected.subject,
          line: w.rejected.line(billingWords.reasons[e.reason]),
          extra: null,
          admin: false,
        };
      return null;
    case 'help_started':
      return {
        subject: w.helpStarted.subject,
        line: w.helpStarted.line(e.minutes ?? 60),
        extra: null,
        admin: false,
      };
    case 'plan_payment':
      return {
        subject: w.planPayment.subject(e.shop),
        line: w.planPayment.line(e.shop, amount),
        extra: null,
        admin: true,
      };
    default:
      return null;
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
