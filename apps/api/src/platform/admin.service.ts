import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import {
  PlatformSetupSchema,
  SUPPORT_MINUTES,
  SupportSessionSchema,
  UNDO_APPROVAL_MS,
  extendPlan,
  manilaDate,
  metaEventId,
  planCoversUntil,
  planReminderStage,
  planStatus,
  trialEndsFrom,
  type AdminLead,
  type AdminShopDetail,
  type BillingNoteInput,
  type CloseShopInput,
  type ExtendDaysInput,
  type PlanReminderStage,
  type PlatformSetup,
  type RecordPlanPaymentInput,
  type ReviewPlanPaymentInput,
  type SetTrackingInput,
  type StartSupportInput,
  type SupportSession,
  type TrackEventName,
  type TrackingSummary,
} from '@smartapp/core';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { AUTH_PROVIDER, type AuthProvider } from '../auth/auth-provider.js';
import { ApiFailure, notFound } from '../common/api-failure.js';
import { Db } from '../db/db.service.js';
import { EmailOutbox } from '../email/email-outbox.service.js';
import { StorefrontCache } from '../public/pages-cache.service.js';
import { AdminReader } from './admin-reader.js';
import { MetaSender } from './meta-sender.js';
import { PlanReader, iso } from './plan-reader.js';
import { TrackWriter, type TrackPerson } from './track-writer.js';

const TimeSchema = z.union([z.string(), z.date()]);
// The events wait a minute past Undo's 10, so a late Undo never races the sender.
const HOLD_MS = UNDO_APPROVAL_MS + 60_000;

const PaymentRowSchema = z.object({
  id: z.string(),
  status: z.string(),
  months: z.number(),
  amount: z.number(),
  created_at: TimeSchema,
});

const UndoDetailsSchema = z.object({
  paidUntil: z.string().nullable(),
  trialEndsAt: z.string().nullable(),
  amount: z.number(),
});

/**
 * Super Admin's actions (api.md "Super Admin", T88 to T92, T118). Every write runs as app_admin, leaves an
 * audit_log row, and the plan's Meta events follow the payment: approve queues the owner's waiting Purchase
 * for 10 minutes (Undo approval puts it back), not approved skips it, and money recorded by hand goes as
 * `other`. Demo and test shops never fire.
 */
@Injectable()
export class AdminService {
  constructor(
    @Inject(Db) private readonly db: Db,
    @Inject(AdminReader) private readonly reader: AdminReader,
    @Inject(PlanReader) private readonly plans: PlanReader,
    @Inject(TrackWriter) private readonly track: TrackWriter,
    @Inject(EmailOutbox) private readonly email: EmailOutbox,
    @Inject(MetaSender) private readonly meta: MetaSender,
    @Inject(StorefrontCache) private readonly cache: StorefrontCache,
    @Inject(AUTH_PROVIDER) private readonly auth: AuthProvider,
  ) {}

  // ---------- leads ----------

  async markLeadContacted(leadId: string): Promise<AdminLead> {
    const result = await this.db.tx.execute(sql`
      update public.signup_leads set contacted_at = now() where id = ${leadId}::uuid and tenant_id is null
      returning id`);
    if (result.rows.length === 0) throw notFound();
    await this.audit(null, 'lead.contacted', leadId);
    const lead = (await this.reader.leads()).find((l) => l.id === leadId);
    if (!lead) throw notFound();
    return lead;
  }

  // ---------- going live ----------

  async approveGoLive(shopId: string): Promise<AdminShopDetail> {
    const book = await this.plans.book(shopId);
    if (book.stage !== 'asked' && book.stage !== 'setting_up')
      throw new ApiFailure('invalid_transition', 409);
    const setup = await this.plans.setup();
    const now = new Date();
    // The trial starts now, not at sign-up (T89).
    const trialEndsAt = book.paidUntil ? book.trialEndsAt : trialEndsFrom(now, setup.trialDays);
    await this.db.tx.execute(sql`
      update public.tenants set stage = 'live', live_at = now(), asked_at = coalesce(asked_at, now()),
        trial_ends_at = ${trialEndsAt}::timestamptz, updated_at = now()
      where id = ${shopId}::uuid`);
    await this.line(shopId, 'system', 'live');
    // StartTrial (T118 Q3): the founder's approval, system_generated, no IP address or browser.
    await this.track.write({
      name: 'StartTrial',
      eventId: metaEventId('StartTrial', shopId),
      via: 'server',
      status: 'queued',
      tenantId: shopId,
      person: await this.ownerPerson(shopId, book.city),
      actionSource: 'system_generated',
      causedBy: 'admin',
      block: { isDemo: book.isDemo, isTest: book.isTest },
    });
    await this.activity(shopId, 'approved', { events: ['StartTrial'] });
    await this.audit(shopId, 'shop.approve', shopId);
    this.email.platformAlert(
      shopId,
      'shop_live',
      { shop: book.name, until: trialEndsAt ? manilaDate(trialEndsAt) : book.paidUntil },
      `shop_live:${shopId}`,
      'owners',
    );
    await this.db.useShop(shopId);
    await this.cache.shopChanged();
    return this.reader.detail(shopId, false);
  }

  // ---------- plan payments ----------

  async reviewPayment(input: ReviewPlanPaymentInput): Promise<AdminShopDetail> {
    const shopId = input.shopId;
    const book = await this.plans.book(shopId);
    const payment = await this.payment(shopId, input.paymentId);
    if (payment.status !== 'pending') throw new ApiFailure('payment_not_pending', 409);

    if (input.verdict === 'reject') {
      await this.db.tx.execute(sql`
        update public.plan_payments set status = 'rejected', reject_reason = ${input.reason},
          decided_at = now(), decided_by = ${this.db.userId}::uuid
        where id = ${payment.id}::uuid`);
      await this.line(shopId, 'admin', 'rejected', { paymentId: payment.id, reason: input.reason });
      // Not approved: the waiting Purchase never goes (T118 section 4.2).
      await this.db.tx.execute(sql`
        update public.track_events set status = 'skipped', problem = 'not_approved',
          client_ip = null, client_ua = null
        where plan_payment_id = ${payment.id}::uuid and status = 'waiting'`);
      await this.activity(shopId, 'payment_rejected', {
        amount: payment.amount,
        reason: input.reason,
      });
      await this.audit(shopId, 'payment.reject', payment.id, { reason: input.reason });
      this.email.platformAlert(
        shopId,
        'plan_answer',
        { shop: book.name, verdict: 'rejected', reason: input.reason, amount: payment.amount },
        `plan_answer:${payment.id}`,
        'plan',
      );
      return this.reader.detail(shopId, false);
    }

    const changed = input.amount !== null && input.amount !== payment.amount;
    if (changed && !input.amountReason)
      throw new ApiFailure('invalid_input', 400, { amountReason: ['required'] });
    const amount = changed && input.amount !== null ? input.amount : payment.amount;
    const note = changed ? input.amountReason : null;
    const coversUntil = planCoversUntil(
      book.paidUntil,
      payment.months,
      new Date(),
      book.trialEndsAt,
    );
    await this.db.tx.execute(sql`
      update public.plan_payments set status = 'approved', amount = ${amount},
        covers_until = ${coversUntil}::date, decided_at = now(), decided_by = ${this.db.userId}::uuid
      where id = ${payment.id}::uuid`);
    await this.db.tx.execute(sql`
      update public.tenants set paid_until = ${coversUntil}::date, trial_ends_at = null, updated_at = now()
      where id = ${shopId}::uuid`);
    await this.line(shopId, 'admin', 'approved', { paymentId: payment.id, text: note });
    // The owner's waiting events go after the 10 minutes, with the true amount (T118 Q1, Q4).
    const sendAfter = new Date(Date.now() + HOLD_MS).toISOString();
    const moved = await this.db.tx.execute(sql`
      update public.track_events set status = 'queued', value = ${amount},
        send_after = ${sendAfter}::timestamptz
      where plan_payment_id = ${payment.id}::uuid and status = 'waiting'
      returning name`);
    const events = z
      .array(z.object({ name: z.string() }))
      .parse(moved.rows)
      .map((r) => r.name);
    await this.activity(shopId, 'payment_approved', { amount, note, events });
    await this.audit(shopId, 'payment.approve', payment.id, {
      paidUntil: book.paidUntil,
      trialEndsAt: book.trialEndsAt,
      amount: payment.amount,
    });
    this.email.platformAlert(
      shopId,
      'plan_answer',
      { shop: book.name, verdict: 'approved', amount, until: coversUntil },
      `plan_answer:${payment.id}`,
      'plan',
      HOLD_MS,
    );
    await this.storefrontChanged(shopId);
    return this.reader.detail(shopId, false);
  }

  /** Takes the newest approval back within its 10 minutes (T118 Q4): nothing has reached Meta or the owner. */
  async undoApproval(shopId: string, paymentId: string): Promise<AdminShopDetail> {
    const payment = await this.payment(shopId, paymentId);
    const open = await this.reader.undoOf(shopId);
    if (!open || open.paymentId !== payment.id || payment.status !== 'approved')
      throw new ApiFailure('approval_undo_expired', 409);
    const before = await this.db.tx.execute(sql`
      select details from public.audit_log
      where action = 'payment.approve' and target = ${payment.id} order by at desc limit 1`);
    const parsed = z.array(z.object({ details: UndoDetailsSchema })).parse(before.rows)[0];
    if (!parsed) throw new ApiFailure('approval_undo_expired', 409);
    const prev = parsed.details;
    await this.db.tx.execute(sql`
      update public.plan_payments set status = 'pending', amount = ${prev.amount},
        covers_until = ${planCoversUntil(prev.paidUntil, payment.months, new Date(), prev.trialEndsAt)}::date,
        decided_at = null, decided_by = null
      where id = ${payment.id}::uuid`);
    await this.db.tx.execute(sql`
      update public.tenants set paid_until = ${prev.paidUntil}::date,
        trial_ends_at = ${prev.trialEndsAt}::timestamptz, updated_at = now()
      where id = ${shopId}::uuid`);
    await this.db.tx.execute(sql`
      delete from public.billing_messages
      where tenant_id = ${shopId}::uuid and payment_id = ${payment.id}::uuid and kind = 'approved'`);
    await this.db.tx.execute(sql`
      update public.track_events set status = 'waiting', value = ${prev.amount}
      where plan_payment_id = ${payment.id}::uuid and status = 'queued'`);
    // The held "Payment received" email never goes.
    await this.db.tx.execute(sql`
      delete from public.notification_outbox
      where tenant_id = ${shopId}::uuid and kind = 'plan_answer' and status = 'queued'
        and dedupe_key like ${`plan_answer:${payment.id}:%`}`);
    await this.activity(shopId, 'payment_undone', { amount: prev.amount });
    await this.audit(shopId, 'payment.undo', payment.id);
    await this.storefrontChanged(shopId);
    return this.reader.detail(shopId, false);
  }

  async setTestShop(shopId: string, isTest: boolean): Promise<AdminShopDetail> {
    const result = await this.db.tx.execute(sql`
      update public.tenants set is_test = ${isTest}, updated_at = now() where id = ${shopId}::uuid
      returning id`);
    if (result.rows.length === 0) throw notFound();
    await this.audit(shopId, 'shop.test', shopId, { isTest });
    return this.reader.detail(shopId, false);
  }

  /** Money taken outside the app (T90): approved at once, sent to Meta as `other`, never with an IP address. */
  async recordPayment(input: RecordPlanPaymentInput): Promise<AdminShopDetail> {
    const shopId = input.shopId;
    const book = await this.plans.book(shopId);
    const first = !(await this.plans.payments(shopId)).some((p) => p.status === 'approved');
    const coversUntil = planCoversUntil(book.paidUntil, input.months, new Date(), book.trialEndsAt);
    const paymentId = randomUUID();
    await this.db.tx.execute(sql`
      insert into public.plan_payments (id, tenant_id, months, amount, method, reference, status,
        covers_until, recorded_by, decided_at, decided_by)
      values (${paymentId}::uuid, ${shopId}::uuid, ${input.months}, ${input.amount}, ${input.method},
        ${input.reference}, 'approved', ${coversUntil}::date, ${this.db.userId}::uuid, now(),
        ${this.db.userId}::uuid)`);
    await this.db.tx.execute(sql`
      update public.tenants set paid_until = ${coversUntil}::date, trial_ends_at = null, updated_at = now()
      where id = ${shopId}::uuid`);
    await this.line(shopId, 'admin', 'approved', { paymentId, text: input.note });
    const person = await this.ownerPerson(shopId, book.city);
    const events: TrackEventName[] = first ? ['Subscribe', 'Purchase'] : ['Purchase'];
    for (const name of events) {
      await this.track.write({
        name,
        eventId: metaEventId(name, paymentId),
        via: 'server',
        status: 'queued',
        tenantId: shopId,
        planPaymentId: paymentId,
        value: input.amount,
        person,
        actionSource: 'other',
        causedBy: 'admin',
        block: { isDemo: book.isDemo, isTest: book.isTest },
      });
    }
    await this.activity(shopId, 'payment_recorded', {
      amount: input.amount,
      note: input.note,
      events,
    });
    await this.audit(shopId, 'payment.record', paymentId, { amount: input.amount });
    this.email.platformAlert(
      shopId,
      'plan_answer',
      { shop: book.name, verdict: 'approved', amount: input.amount, until: coversUntil },
      `plan_answer:${paymentId}`,
      'plan',
    );
    await this.storefrontChanged(shopId);
    return this.reader.detail(shopId, false);
  }

  async extend(input: ExtendDaysInput): Promise<AdminShopDetail> {
    const book = await this.plans.book(input.shopId);
    if (book.stage !== 'live') throw new ApiFailure('invalid_transition', 409);
    const next = extendPlan(book, input.days, new Date());
    await this.db.tx.execute(sql`
      update public.tenants set trial_ends_at = ${next.trialEndsAt}::timestamptz,
        paid_until = ${next.paidUntil}::date, updated_at = now()
      where id = ${input.shopId}::uuid`);
    await this.line(input.shopId, 'admin', 'extra_days', { days: input.days });
    await this.activity(input.shopId, 'extra_days', { days: input.days, note: input.reason });
    await this.audit(input.shopId, 'plan.extra_days', input.shopId, {
      days: input.days,
      reason: input.reason,
    });
    await this.storefrontChanged(input.shopId);
    return this.reader.detail(input.shopId, false);
  }

  /** A reminder by hand: the same email the daily job sends, for where the plan stands today. */
  async remind(shopId: string): Promise<AdminShopDetail> {
    const book = await this.plans.book(shopId);
    if (book.stage !== 'live') throw new ApiFailure('invalid_transition', 409);
    await this.sendReminder(shopId, manualStage(book), 'admin', `reminder:manual:${Date.now()}`);
    await this.audit(shopId, 'plan.reminder', shopId);
    return this.reader.detail(shopId, false);
  }

  /** Shared with the daily job: the email, a Billing line, an Activity line and reminded_at. */
  async sendReminder(
    shopId: string,
    stage: PlanReminderStage,
    by: 'admin' | 'system',
    key: string,
  ): Promise<void> {
    const book = await this.plans.book(shopId);
    const end = book.paidUntil ?? (book.trialEndsAt ? manilaDate(book.trialEndsAt) : null);
    await this.db.tx.execute(
      sql`update public.tenants set reminded_at = now() where id = ${shopId}::uuid`,
    );
    await this.line(shopId, by === 'admin' ? 'admin' : 'system', 'reminder');
    await this.activity(shopId, 'reminder', { reason: stage }, by);
    this.email.platformAlert(
      shopId,
      'plan_reminder',
      { shop: book.name, stage, until: end, amount: book.priceMonthly },
      key,
      'owners',
    );
  }

  async note(input: BillingNoteInput): Promise<AdminShopDetail> {
    await this.plans.book(input.shopId);
    await this.line(input.shopId, 'admin', 'note', { text: input.text });
    await this.audit(input.shopId, 'billing.note', input.shopId);
    return this.reader.detail(input.shopId, false);
  }

  // ---------- closing ----------

  async close(input: CloseShopInput): Promise<AdminShopDetail> {
    const book = await this.plans.book(input.shopId);
    if (book.stage === 'closed') throw new ApiFailure('invalid_transition', 409);
    const today = manilaDate(new Date());
    if (input.when === 'period_end' && book.paidUntil && book.paidUntil >= today) {
      await this.db.tx.execute(sql`
        update public.tenants set closes_on = ${book.paidUntil}::date, close_reason = ${input.reason},
          updated_at = now()
        where id = ${input.shopId}::uuid`);
    } else {
      await this.db.tx.execute(sql`
        update public.tenants set stage = 'closed', closed_at = now(), closes_on = null,
          close_reason = ${input.reason}, updated_at = now()
        where id = ${input.shopId}::uuid`);
    }
    await this.activity(input.shopId, 'closed', { reason: input.reason, note: input.note });
    await this.audit(input.shopId, 'shop.close', input.shopId, {
      reason: input.reason,
      when: input.when,
    });
    await this.db.useShop(input.shopId);
    await this.cache.shopChanged();
    return this.reader.detail(input.shopId, false);
  }

  async reopen(shopId: string): Promise<AdminShopDetail> {
    await this.plans.book(shopId);
    await this.db.tx.execute(sql`
      update public.tenants set stage = case when live_at is not null then 'live' else 'setting_up' end,
        closed_at = null, closes_on = null, close_reason = null, updated_at = now()
      where id = ${shopId}::uuid`);
    await this.activity(shopId, 'reopened', {});
    await this.audit(shopId, 'shop.reopen', shopId);
    await this.db.useShop(shopId);
    await this.cache.shopChanged();
    return this.reader.detail(shopId, false);
  }

  /** Only a closed, real shop, and only when the founder types its name. */
  async remove(shopId: string, confirmName: string): Promise<{ ok: true }> {
    const book = await this.plans.book(shopId);
    if (book.stage !== 'closed' || book.isDemo) throw new ApiFailure('invalid_transition', 409);
    if (confirmName.trim().toLowerCase() !== book.name.toLowerCase())
      throw new ApiFailure('name_mismatch', 400, { confirmName: ['mismatch'] });
    await this.audit(null, 'shop.delete', shopId, { slug: book.slug });
    await this.db.tx.execute(sql`delete from public.tenants where id = ${shopId}::uuid`);
    return { ok: true };
  }

  /** The new shop's Activity line and audit row (the shop itself is made through sign-up's own steps). */
  async markCreatedByAdmin(shopId: string): Promise<AdminShopDetail> {
    await this.activity(shopId, 'created_by_admin', {});
    await this.audit(shopId, 'shop.create', shopId);
    return this.reader.detail(shopId, false);
  }

  // ---------- help mode (T91, D8) ----------

  async startSupport(input: StartSupportInput): Promise<SupportSession> {
    const book = await this.plans.book(input.shopId);
    if (book.stage === 'closed') throw notFound();
    // One open session per founder: a new one ends the old.
    await this.db.tx.execute(sql`
      update public.support_sessions set ended_at = now()
      where admin_user_id = ${this.db.userId}::uuid and ended_at is null`);
    const id = randomUUID();
    const result = await this.db.tx.execute(sql`
      insert into public.support_sessions (id, tenant_id, admin_user_id, reason, ends_at)
      values (${id}::uuid, ${input.shopId}::uuid, ${this.db.userId}::uuid, ${input.reason},
        now() + make_interval(mins => ${SUPPORT_MINUTES}))
      returning started_at, ends_at`);
    const row = z
      .array(z.object({ started_at: TimeSchema, ends_at: TimeSchema }))
      .parse(result.rows)[0];
    if (!row) throw new ApiFailure('unknown', 500);
    await this.line(input.shopId, 'system', 'support');
    await this.activity(input.shopId, 'support', {
      minutes: SUPPORT_MINUTES,
      reason: input.reason,
    });
    await this.audit(input.shopId, 'support.start', id, { reason: input.reason }, id);
    this.email.platformAlert(
      input.shopId,
      'help_started',
      { shop: book.name, minutes: SUPPORT_MINUTES },
      `help_started:${id}`,
      'owners',
    );
    return SupportSessionSchema.parse({
      id,
      shopId: input.shopId,
      slug: book.slug,
      shopName: book.name,
      reason: input.reason,
      startedAt: iso(row.started_at),
      endsAt: iso(row.ends_at),
    });
  }

  async endSupport(): Promise<{ ok: true }> {
    const result = await this.db.tx.execute(sql`
      update public.support_sessions set ended_at = now()
      where admin_user_id = ${this.db.userId}::uuid and ended_at is null
      returning id, tenant_id`);
    for (const row of z
      .array(z.object({ id: z.string(), tenant_id: z.string() }))
      .parse(result.rows))
      await this.audit(row.tenant_id, 'support.end', row.id, {}, row.id);
    return { ok: true };
  }

  // ---------- tracking ----------

  async setTracking(input: SetTrackingInput): Promise<TrackingSummary> {
    await this.db.tx.execute(sql`
      update public.platform_settings set tracking_sending = ${input.sending},
        tracking_test_mode = ${input.testMode}, updated_at = now()`);
    await this.audit(null, 'tracking.set', null, input);
    return this.reader.tracking();
  }

  /** Failed events still inside Meta's window go back in the queue (after the token is replaced). */
  async retryTracking(): Promise<TrackingSummary> {
    await this.db.tx.execute(sql`
      update public.track_events set status = 'queued', problem = null, attempts = 0, send_after = now()
      where status = 'failed'`);
    await this.audit(null, 'tracking.retry', null);
    this.db.afterCommit(async () => {
      await this.meta.sendDue();
    });
    return this.reader.tracking();
  }

  /** One PageView marked as a test, for Events Manager's Test events tab. */
  async sendTestEvent(): Promise<TrackingSummary> {
    const id = randomUUID();
    await this.db.tx.execute(sql`
      insert into public.track_events (event_id, name, via, status, test, action_source, caused_by)
      values (${metaEventId('PageView', `test-${id}`)}, 'PageView', 'server', 'queued', true,
        'system_generated', 'admin')`);
    await this.audit(null, 'tracking.test', null);
    this.db.afterCommit(async () => {
      await this.meta.sendDue();
    });
    return this.reader.tracking();
  }

  // ---------- setup ----------

  async saveSetup(input: PlatformSetup): Promise<PlatformSetup> {
    await this.db.tx.execute(sql`
      update public.platform_settings set price_monthly = ${input.priceMonthly},
        trial_days = ${input.trialDays}, six_month_bonus = ${input.sixMonthBonus},
        pay_to_name = ${input.payTo.accountName}, pay_to_gcash = ${input.payTo.gcash},
        pay_to_maya = ${input.payTo.maya}, messenger_url = ${input.messengerUrl}, updated_at = now()`);
    await this.audit(null, 'setup.save', null, { priceMonthly: input.priceMonthly });
    return PlatformSetupSchema.parse(await this.plans.setup());
  }

  // ---------- helpers ----------

  /**
   * A plan change can pause or unpause the shop's page (T118 Q11), so the storefront's cached page is read
   * again (audit F-34).
   */
  private async storefrontChanged(shopId: string): Promise<void> {
    await this.db.useShop(shopId);
    await this.cache.shopChanged();
  }

  private async payment(shopId: string, paymentId: string) {
    const result = await this.db.tx.execute(sql`
      select id, status, months, amount, created_at from public.plan_payments
      where id = ${paymentId}::uuid and tenant_id = ${shopId}::uuid`);
    const row = PaymentRowSchema.array().parse(result.rows)[0];
    if (!row) throw notFound();
    return row;
  }

  private async line(
    shopId: string,
    from: 'admin' | 'system',
    kind: string,
    extra: {
      paymentId?: string;
      text?: string | null;
      reason?: string;
      days?: number;
    } = {},
  ): Promise<void> {
    await this.db.tx.execute(sql`
      insert into public.billing_messages (tenant_id, "from", kind, payment_id, text, reason, days)
      values (${shopId}::uuid, ${from}, ${kind}, ${extra.paymentId ?? null}::uuid, ${extra.text ?? null},
        ${extra.reason ?? null}, ${extra.days ?? null})`);
  }

  private async activity(
    shopId: string,
    kind: string,
    extra: {
      amount?: number;
      days?: number;
      minutes?: number;
      reason?: string;
      note?: string | null;
      events?: readonly string[];
    },
    by: 'admin' | 'system' = 'admin',
  ): Promise<void> {
    await this.db.tx.execute(sql`
      insert into public.shop_activity (tenant_id, kind, by, amount, days, minutes, reason, note, events)
      values (${shopId}::uuid, ${kind}, ${by}, ${extra.amount ?? null}, ${extra.days ?? null},
        ${extra.minutes ?? null}, ${extra.reason ?? null}, ${extra.note ?? null},
        ${`{${(extra.events ?? []).join(',')}}`}::text[])`);
  }

  async audit(
    shopId: string | null,
    action: string,
    target: string | null,
    details: Record<string, unknown> = {},
    supportSessionId: string | null = null,
  ): Promise<void> {
    await this.db.tx.execute(sql`
      insert into public.audit_log (actor_user_id, tenant_id, support_session_id, action, target, details)
      values (${this.db.scope.userId}::uuid, ${shopId}::uuid, ${supportSessionId}::uuid, ${action}, ${target},
        ${JSON.stringify(details)}::jsonb)`);
  }

  /** Who Meta matches for the shop's owner (their email, mobile, name, city and our id for them). */
  private async ownerPerson(shopId: string, city: string): Promise<TrackPerson> {
    const result = await this.db.tx.execute(sql`
      select tm.user_id, p.full_name, coalesce(p.phone, l.phone) as phone, l.fbp, l.fbc, l.email
      from public.tenant_members tm
      left join public.profiles p on p.id = tm.user_id
      left join lateral (select sl.phone, sl.fbp, sl.fbc, sl.email from public.signup_leads sl
        where sl.tenant_id = tm.tenant_id order by sl.created_at desc limit 1) l on true
      where tm.tenant_id = ${shopId}::uuid and tm.role = 'owner' order by tm.created_at limit 1`);
    const row = z
      .array(
        z.object({
          user_id: z.string(),
          full_name: z.string().nullable(),
          phone: z.string().nullable(),
          fbp: z.string().nullable(),
          fbc: z.string().nullable(),
          email: z.string().nullable(),
        }),
      )
      .parse(result.rows)[0];
    if (!row) return { city };
    const email = row.email ?? (await this.auth.getUserEmail(row.user_id));
    return {
      email,
      phone: row.phone,
      fullName: row.full_name,
      city,
      externalId: row.user_id,
      fbp: row.fbp,
      fbc: row.fbc,
    };
  }
}

/** The stage for a reminder sent by hand on any day (the email names the date, so it stays true). */
function manualStage(book: {
  trialEndsAt: string | null;
  paidUntil: string | null;
}): PlanReminderStage {
  const now = new Date();
  const due = planReminderStage(book, now);
  if (due) return due.stage;
  switch (planStatus(book, now)) {
    case 'trial':
      return 'trial_3d';
    case 'overdue':
      return 'grace_3d';
    case 'paused':
      return 'paused';
    default:
      return 'due_7d';
  }
}
