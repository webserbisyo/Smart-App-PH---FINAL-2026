import { Inject, Injectable } from '@nestjs/common';
import {
  BillingMessageSchema,
  PlanPaymentSchema,
  PlatformSetupSchema,
  type BillingMessage,
  type PlanPayment,
  type PlatformSetup,
} from '@smartapp/core';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { notFound } from '../common/api-failure.js';
import { Db } from '../db/db.service.js';
import { MediaStorage } from '../media/media-storage.js';

// A receipt photo's link lives 10 minutes: long enough to look, short enough not to travel.
const PHOTO_LINK_SECONDS = 600;

export function iso(value: string | Date): string;
export function iso(value: string | Date | null): string | null;
export function iso(value: string | Date | null): string | null {
  return value ? new Date(value).toISOString() : null;
}

/** A Postgres date (`2026-12-20`) as it comes back, as the Manila day string. */
export function day(value: string | Date | null): string | null {
  if (!value) return null;
  return typeof value === 'string' ? value.slice(0, 10) : value.toISOString().slice(0, 10);
}

const TimeSchema = z.union([z.string(), z.date()]);

const BookRowSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  kind: z.string(),
  city: z.string(),
  stage: z.string(),
  is_demo: z.boolean(),
  is_test: z.boolean(),
  price_monthly: z.number(),
  storage_limit_bytes: z.coerce.number(),
  trial_ends_at: TimeSchema.nullable(),
  paid_until: TimeSchema.nullable(),
});

export interface PlanBookRow {
  id: string;
  slug: string;
  name: string;
  kind: string;
  city: string;
  stage: string;
  isDemo: boolean;
  isTest: boolean;
  priceMonthly: number;
  storageLimitBytes: number;
  trialEndsAt: string | null;
  paidUntil: string | null;
}

const PaymentRowSchema = z.object({
  id: z.string(),
  months: z.number(),
  amount: z.number(),
  method: z.string(),
  reference: z.string().nullable(),
  status: z.string(),
  reject_reason: z.string().nullable(),
  covers_until: TimeSchema,
  created_at: TimeSchema,
  decided_at: TimeSchema.nullable(),
  recorded_by: z.string().nullable(),
  bucket: z.string().nullable(),
  path: z.string().nullable(),
});

const LineRowSchema = z.object({
  id: z.string(),
  from: z.string(),
  kind: z.string(),
  payment_id: z.string().nullable(),
  text: z.string().nullable(),
  reason: z.string().nullable(),
  days: z.number().nullable(),
  seen_at: TimeSchema.nullable(),
  created_at: TimeSchema,
  reference: z.string().nullable(),
  bucket: z.string().nullable(),
  path: z.string().nullable(),
  deleted: z.boolean().nullable(),
});

const SetupRowSchema = z.object({
  price_monthly: z.number(),
  trial_days: z.number(),
  six_month_bonus: z.boolean(),
  pay_to_name: z.string(),
  pay_to_gcash: z.string(),
  pay_to_maya: z.string(),
  messenger_url: z.string().nullable(),
});

export interface AdminPaymentFacts {
  reviewedAt: string | null;
  recorded: boolean;
}

/**
 * Reads a shop's plan (T67, T88, T107): its dates and price, its payments with the receipt photo, and the
 * Billing chat. Every query names the shop, so the owner's routes (RLS to their shop) and Super Admin's
 * (app_admin) share it. Photos get short signed links; the private bucket never serves them otherwise.
 */
@Injectable()
export class PlanReader {
  constructor(
    @Inject(Db) private readonly db: Db,
    @Inject(MediaStorage) private readonly storage: MediaStorage,
  ) {}

  async book(shopId: string): Promise<PlanBookRow> {
    const result = await this.db.tx.execute(sql`
      select id, slug, name, kind, city, stage, is_demo, is_test, price_monthly, storage_limit_bytes,
        trial_ends_at, paid_until
      from public.tenants where id = ${shopId}::uuid`);
    const row = BookRowSchema.array().parse(result.rows)[0];
    if (!row) throw notFound();
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      kind: row.kind,
      city: row.city,
      stage: row.stage,
      isDemo: row.is_demo,
      isTest: row.is_test,
      priceMonthly: row.price_monthly,
      storageLimitBytes: row.storage_limit_bytes,
      trialEndsAt: iso(row.trial_ends_at),
      paidUntil: day(row.paid_until),
    };
  }

  async setup(): Promise<PlatformSetup & { trialDays: number }> {
    const result = await this.db.tx.execute(sql`
      select price_monthly, trial_days, six_month_bonus, pay_to_name, pay_to_gcash, pay_to_maya, messenger_url
      from public.platform_settings limit 1`);
    const row = SetupRowSchema.array().parse(result.rows)[0];
    if (!row) throw notFound();
    return PlatformSetupSchema.parse({
      priceMonthly: row.price_monthly,
      trialDays: row.trial_days,
      sixMonthBonus: row.six_month_bonus,
      payTo: {
        accountName: row.pay_to_name,
        gcash: row.pay_to_gcash || '-',
        maya: row.pay_to_maya || '-',
      },
      messengerUrl: row.messenger_url ?? 'https://m.me/',
    });
  }

  /** Newest first, with the facts Super Admin shows beside each. */
  async payments(shopId: string): Promise<(PlanPayment & AdminPaymentFacts)[]> {
    const result = await this.db.tx.execute(sql`
      select p.id, p.months, p.amount, p.method, p.reference, p.status, p.reject_reason, p.covers_until,
        p.created_at, p.decided_at, p.recorded_by, m.bucket, m.path
      from public.plan_payments p
      left join public.media_files m on m.id = p.proof_media_id and m.deleted_at is null
      where p.tenant_id = ${shopId}::uuid
      order by p.created_at desc`);
    const rows = PaymentRowSchema.array().parse(result.rows);
    return Promise.all(
      rows.map(async (r) => ({
        ...PlanPaymentSchema.parse({
          id: r.id,
          months: r.months,
          amount: r.amount,
          method: r.method,
          reference: r.reference,
          status: r.status,
          submittedAt: iso(r.created_at),
          coversUntil: day(r.covers_until),
          rejectReason: r.reject_reason,
          proofUrl: await this.photoUrl(r.bucket, r.path),
        }),
        reviewedAt: iso(r.decided_at),
        recorded: r.recorded_by !== null,
      })),
    );
  }

  /** The Billing chat, oldest first. A deleted photo keeps its line without a link. */
  async thread(shopId: string): Promise<BillingMessage[]> {
    const result = await this.db.tx.execute(sql`
      select b.id, b."from", b.kind, b.payment_id, b.text, b.reason, b.days, b.seen_at, b.created_at,
        b.reference, m.bucket, m.path, (m.deleted_at is not null) as deleted
      from public.billing_messages b
      left join public.media_files m on m.id = b.photo_media_id
      where b.tenant_id = ${shopId}::uuid
      order by b.created_at, b.id`);
    const rows = LineRowSchema.array().parse(result.rows);
    return Promise.all(
      rows.map(async (r) =>
        BillingMessageSchema.parse({
          id: r.id,
          at: iso(r.created_at),
          from: r.from,
          kind: r.kind,
          paymentId: r.payment_id,
          text: r.text,
          reason: r.reason,
          days: r.days,
          photoPath: r.path,
          photoUrl: r.deleted ? null : await this.photoUrl(r.bucket, r.path),
          reference: r.reference,
          seenAt: iso(r.seen_at),
        }),
      ),
    );
  }

  private async photoUrl(bucket: string | null, path: string | null): Promise<string | null> {
    if (bucket !== 'plan-proofs' || !path) return null;
    return this.storage.signedRead('plan-proofs', path, PHOTO_LINK_SECONDS);
  }
}
