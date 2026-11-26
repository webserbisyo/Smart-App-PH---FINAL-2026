import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  metaEventId,
  planAmount,
  planCoversUntil,
  planGraceUntil,
  planStatus,
  PlanSchema,
  manilaDate,
  type Plan,
  type SendBillingNoteInput,
  type SendBillingPhotoInput,
  type SubmitPlanPaymentInput,
  type TrackEventName,
} from '@smartapp/core';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import type { CallerUser } from '../auth/caller.js';
import { ApiFailure } from '../common/api-failure.js';
import { Db } from '../db/db.service.js';
import { EmailOutbox } from '../email/email-outbox.service.js';
import { MediaService } from '../media/media.service.js';
import { PlanReader } from './plan-reader.js';
import { TrackWriter } from './track-writer.js';

/** The owner's request that sends a payment: Meta's client_ip_address and client_user_agent (T118 Q2). */
export interface OwnerClient {
  ip: string | null;
  ua: string | null;
}

const PersonSchema = z.object({
  full_name: z.string().nullable(),
  phone: z.string().nullable(),
});
const LeadSchema = z.object({ fbp: z.string().nullable(), fbc: z.string().nullable() });
const CountSchema = z.object({ n: z.coerce.number() });

/**
 * The owner's Plan (api.md "Settings › Plan", T67, T88, T107, T118). Sending a payment writes, in one
 * transaction, the payment, its chat line, the Activity line and its Meta events: AddPaymentInfo now, and
 * the Purchase (with Subscribe on the first payment) waiting for the founder, carrying the owner's own time,
 * IP address and browser. In help mode nothing about money can be sent (support_locked).
 */
@Injectable()
export class OwnerPlanService {
  private readonly adminEmail: string | null;
  private readonly dashboardUrl: string;

  constructor(
    @Inject(Db) private readonly db: Db,
    @Inject(PlanReader) private readonly reader: PlanReader,
    @Inject(MediaService) private readonly media: MediaService,
    @Inject(TrackWriter) private readonly track: TrackWriter,
    @Inject(EmailOutbox) private readonly email: EmailOutbox,
    @Inject(ConfigService) config: ConfigService,
  ) {
    this.adminEmail = config.get<string>('ADMIN_EMAIL') ?? null;
    const url = config.get<string>('DASHBOARD_URL') ?? 'http://localhost:5173';
    this.dashboardUrl = url.endsWith('/') ? url.slice(0, -1) : url;
  }

  async getPlan(): Promise<Plan> {
    return this.planOf(this.db.shopId);
  }

  async submitPayment(
    user: CallerUser,
    client: OwnerClient,
    input: SubmitPlanPaymentInput,
  ): Promise<Plan> {
    if (this.db.helping) throw new ApiFailure('support_locked', 403);
    const shopId = this.db.shopId;
    const book = await this.reader.book(shopId);
    const setup = await this.reader.setup();
    const proof = await this.media.fileOf(input.proofPath, ['plan_proof']);
    if (!proof) throw new ApiFailure('invalid_input', 400, { proofPath: ['invalid'] });
    const pendingNow = await this.count(sql`status = 'pending'`);
    if (pendingNow > 0) throw new ApiFailure('payment_not_pending', 409);
    const first = (await this.count(sql`status = 'approved'`)) === 0;

    const now = new Date();
    const months = input.months;
    const amount = planAmount(months, book.priceMonthly, setup.sixMonthBonus);
    const paymentId = randomUUID();
    // The id is made here: the API's role may add a payment but the unique keys answer duplicates.
    await this.db.tx.execute(sql`
      insert into public.plan_payments (id, tenant_id, months, amount, method, reference, proof_media_id,
        covers_until, created_at)
      values (${paymentId}::uuid, ${shopId}::uuid, ${months}, ${amount}, ${input.method},
        ${input.reference ?? null}, ${proof.id}::uuid, ${planCoversUntil(book.paidUntil, months, now)}::date,
        ${now.toISOString()}::timestamptz)`);
    await this.db.tx.execute(sql`
      insert into public.billing_messages (tenant_id, "from", kind, payment_id)
      values (${shopId}::uuid, 'owner', 'payment', ${paymentId}::uuid)`);

    // Meta (T118 Q1, Q2): the owner's own send is the event's time and place.
    const person = await this.personOf(user, book.city);
    const block = { isDemo: book.isDemo, isTest: book.isTest };
    const at = now.toISOString();
    const pageUrl = `${this.dashboardUrl}/settings/plan`;
    const events: TrackEventName[] = ['AddPaymentInfo', 'Purchase'];
    if (first) events.push('Subscribe');
    for (const name of events) {
      await this.track.write({
        name,
        eventId: metaEventId(name, paymentId),
        via: 'server',
        status: name === 'AddPaymentInfo' ? 'queued' : 'waiting',
        tenantId: shopId,
        planPaymentId: paymentId,
        value: amount,
        person,
        pageUrl,
        eventTime: at,
        actionSource: 'website',
        causedBy: 'owner',
        client,
        block,
      });
    }
    await this.db.tx.execute(sql`
      insert into public.shop_activity (tenant_id, kind, by, amount, events)
      values (${shopId}::uuid, 'payment_sent', 'owner', ${amount}, ${`{${events.join(',')}}`}::text[])`);

    if (this.adminEmail)
      this.email.platformAlert(
        shopId,
        'plan_payment',
        { shop: book.name, amount },
        `plan_payment:${paymentId}`,
        this.adminEmail,
      );
    return this.planOf(shopId);
  }

  async sendNote(input: SendBillingNoteInput): Promise<Plan> {
    const shopId = this.db.shopId;
    await this.db.tx.execute(sql`
      insert into public.billing_messages (tenant_id, "from", kind, text)
      values (${shopId}::uuid, 'owner', 'note', ${input.text})`);
    return this.planOf(shopId);
  }

  async sendPhoto(input: SendBillingPhotoInput): Promise<Plan> {
    const shopId = this.db.shopId;
    const file = await this.media.fileOf(input.photoPath, ['plan_proof']);
    if (!file) throw new ApiFailure('invalid_input', 400, { photoPath: ['invalid'] });
    await this.db.tx.execute(sql`
      insert into public.billing_messages (tenant_id, "from", kind, photo_media_id, reference)
      values (${shopId}::uuid, 'owner', 'photo', ${file.id}::uuid, ${input.reference ?? null})`);
    return this.planOf(shopId);
  }

  /** The owner read our lines. Help mode never marks them: the founder is not the owner. */
  async markSeen(): Promise<Plan> {
    const shopId = this.db.shopId;
    if (!this.db.helping) {
      await this.db.tx.execute(sql`
        update public.billing_messages set seen_at = now()
        where tenant_id = ${shopId}::uuid and "from" <> 'owner' and seen_at is null`);
    }
    return this.planOf(shopId);
  }

  async planOf(shopId: string): Promise<Plan> {
    const now = new Date();
    const book = await this.reader.book(shopId);
    const setup = await this.reader.setup();
    const payments = await this.reader.payments(shopId);
    const thread = await this.reader.thread(shopId);
    const plan = { trialEndsAt: book.trialEndsAt, paidUntil: book.paidUntil };
    const end = book.paidUntil ?? (book.trialEndsAt ? manilaDate(book.trialEndsAt) : null);
    return PlanSchema.parse({
      name: 'pro',
      priceMonthly: book.priceMonthly,
      sixMonthBonus: setup.sixMonthBonus,
      storageLimitBytes: book.storageLimitBytes,
      status: planStatus(plan, now),
      trialEndsAt: book.trialEndsAt,
      paidUntil: book.paidUntil,
      graceUntil: planGraceUntil(end),
      payTo: setup.payTo,
      // The schema keeps the owner's fields only (Super Admin's facts drop off).
      pending: payments.find((p) => p.status === 'pending') ?? null,
      history: payments,
      thread,
    });
  }

  private async count(where: ReturnType<typeof sql>): Promise<number> {
    const result = await this.db.tx.execute(sql`
      select count(*) as n from public.plan_payments where tenant_id = ${this.db.shopId}::uuid and ${where}`);
    return CountSchema.array().parse(result.rows)[0]?.n ?? 0;
  }

  /** Who Meta matches: the owner's email, mobile, name and city, our id for them, and their sign-up cookies. */
  private async personOf(user: CallerUser, city: string) {
    const profile = await this.db.tx.execute(
      sql`select full_name, phone from public.profiles where id = ${user.id}::uuid`,
    );
    const p = PersonSchema.array().parse(profile.rows)[0];
    const lead = await this.db.tx.execute(sql`
      select fbp, fbc from public.signup_leads where tenant_id = ${this.db.shopId}::uuid
      order by created_at desc limit 1`);
    const l = LeadSchema.array().parse(lead.rows)[0];
    return {
      email: user.email,
      phone: p?.phone ?? null,
      fullName: p?.full_name ?? user.fullName,
      city,
      externalId: user.id,
      fbp: l?.fbp ?? null,
      fbc: l?.fbc ?? null,
    };
  }
}
