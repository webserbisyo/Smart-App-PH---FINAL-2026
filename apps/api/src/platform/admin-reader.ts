import { Inject, Injectable } from '@nestjs/common';
import {
  ADMIN_SHOP_FILTERS,
  AdminLeadSchema,
  AdminPaymentListSchema,
  AdminShopDetailSchema,
  AdminShopListSchema,
  AdminTodaySchema,
  CloseReasonEnum,
  SETUP_MIN_ITEMS,
  ShopActivitySchema,
  SignupChannelEnum,
  TrackingSummarySchema,
  UNDO_APPROVAL_MS,
  adminFlags,
  manilaDate,
  maskPhone,
  planGraceUntil,
  planStatus,
  setupDoneCount,
  type AdminLead,
  type AdminNeed,
  type AdminPayment,
  type AdminPaymentList,
  type AdminPaymentView,
  type AdminShopDetail,
  type AdminShopFilter,
  type AdminShopList,
  type AdminShopRow,
  type AdminToday,
  type OnboardingStep,
  type ShopActivity,
  type TrackingSummary,
} from '@smartapp/core';
import { sql, type SQL } from 'drizzle-orm';
import { z } from 'zod';
import { AUTH_PROVIDER, type AuthProvider } from '../auth/auth-provider.js';
import { notFound } from '../common/api-failure.js';
import { Db } from '../db/db.service.js';
import { MetaSender } from './meta-sender.js';
import { PlanReader, day, iso } from './plan-reader.js';

const DAY = 86_400_000;
const TimeSchema = z.union([z.string(), z.date()]);
const Num = z.coerce.number();

const ShopRowSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  kind: z.string(),
  city: z.string(),
  stage: z.string(),
  price_monthly: z.number(),
  storage_limit_bytes: Num,
  trial_ends_at: TimeSchema.nullable(),
  paid_until: TimeSchema.nullable(),
  created_at: TimeSchema,
  asked_at: TimeSchema.nullable(),
  live_at: TimeSchema.nullable(),
  closed_at: TimeSchema.nullable(),
  closes_on: TimeSchema.nullable(),
  close_reason: z.string().nullable(),
  channel: z.string(),
  campaign: z.string().nullable(),
  facebook_page: z.string().nullable(),
  is_demo: z.boolean(),
  is_test: z.boolean(),
  reminded_at: TimeSchema.nullable(),
  owner_id: z.string().nullable(),
  notify_email: z.string().nullable(),
  full_name: z.string().nullable(),
  phone: z.string().nullable(),
  lead_email: z.string().nullable(),
  lead_phone: z.string().nullable(),
  lead_name: z.string().nullable(),
  storage_used: Num,
  orders7d: Num,
  members: Num,
  last_active: TimeSchema.nullable(),
  step_items: z.boolean().nullable(),
  step_look: z.boolean().nullable(),
  step_hours: z.boolean().nullable(),
  step_payments: z.boolean().nullable(),
  pending_id: z.string().nullable(),
  paid_ever: z.boolean(),
});
type ShopDbRow = z.infer<typeof ShopRowSchema>;

const ActivityRowSchema = z.object({
  id: z.string(),
  at: TimeSchema,
  kind: z.string(),
  by: z.string(),
  amount: z.number().nullable(),
  days: z.number().nullable(),
  minutes: z.number().nullable(),
  reason: z.string().nullable(),
  note: z.string().nullable(),
  events: z.array(z.string()),
});

const LeadRowSchema = z.object({
  id: z.string(),
  full_name: z.string(),
  email: z.string(),
  phone: z.string(),
  created_at: TimeSchema,
  channel: z.string(),
  campaign: z.string().nullable(),
  contacted_at: TimeSchema.nullable(),
});

const EventRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  event_id: z.string(),
  event_time: TimeSchema,
  via: z.string(),
  status: z.string(),
  problem: z.string().nullable(),
  value: z.number().nullable(),
  test: z.boolean(),
  shop_name: z.string().nullable(),
  lead_phone: z.string().nullable(),
});

const PHONE = /^\+639\d{9}$/;
const phoneOrNull = (value: string | null) => (value && PHONE.test(value) ? value : null);

/** The shop list's base query: one row per shop with its owner, numbers and setup steps. */
function shopsQuery(where: SQL): SQL {
  return sql`
    select t.id, t.slug, t.name, t.kind, t.city, t.stage, t.price_monthly, t.storage_limit_bytes,
      t.trial_ends_at, t.paid_until, t.created_at, t.asked_at, t.live_at, t.closed_at, t.closes_on,
      t.close_reason, t.channel, t.campaign, t.facebook_page, t.is_demo, t.is_test, t.reminded_at,
      o.user_id as owner_id, o.notify_email, p.full_name, p.phone,
      l.email as lead_email, l.phone as lead_phone, l.full_name as lead_name,
      coalesce((select sum(m.bytes) from public.media_files m
        where m.tenant_id = t.id and m.deleted_at is null and m.kind <> 'plan_proof'), 0) as storage_used,
      (select count(*) from public.orders x
        where x.tenant_id = t.id and x.created_at > now() - interval '7 days') as orders7d,
      (select count(*) from public.members x where x.tenant_id = t.id) as members,
      (select max(x.created_at) from public.orders x where x.tenant_id = t.id) as last_active,
      ((select count(*) from public.items i where i.tenant_id = t.id and i.status = 'active')
        >= ${SETUP_MIN_ITEMS}) as step_items,
      (select coalesce(jsonb_typeof(c.published -> 'logo'), 'null') <> 'null'
        from public.storefront_content c where c.tenant_id = t.id) as step_look,
      exists (select 1 from public.opening_hours h where h.tenant_id = t.id) as step_hours,
      exists (select 1 from public.payment_accounts a
        where a.tenant_id = t.id and a.removed_at is null) as step_payments,
      (select pp.id from public.plan_payments pp
        where pp.tenant_id = t.id and pp.status = 'pending' limit 1) as pending_id,
      exists (select 1 from public.plan_payments pp
        where pp.tenant_id = t.id and pp.status = 'approved') as paid_ever
    from public.tenants t
    left join lateral (
      select tm.user_id, tm.notify_email from public.tenant_members tm
      where tm.tenant_id = t.id and tm.role = 'owner' order by tm.created_at limit 1
    ) o on true
    left join public.profiles p on p.id = o.user_id
    left join lateral (
      select sl.email, sl.phone, sl.full_name from public.signup_leads sl
      where sl.tenant_id = t.id order by sl.created_at desc limit 1
    ) l on true
    ${where}
    order by t.created_at desc`;
}

function stepsOf(r: ShopDbRow): OnboardingStep[] {
  return [
    { step: 'items', done: r.step_items === true },
    { step: 'look', done: r.step_look === true },
    { step: 'hours', done: r.step_hours === true },
    { step: 'payments', done: r.step_payments === true },
  ];
}

function needsYou(r: AdminShopRow): boolean {
  return (
    r.pending !== null ||
    r.stage === 'asked' ||
    r.planStatus === 'overdue' ||
    r.flags.includes('stuck_setup')
  );
}

export function matchesFilter(r: AdminShopRow, filter: AdminShopFilter): boolean {
  switch (filter) {
    case 'needs_you':
      return needsYou(r);
    case 'leads':
      return false;
    case 'setting_up':
      return r.stage === 'setting_up' || r.stage === 'asked';
    case 'trial':
    case 'active':
    case 'due':
    case 'overdue':
    case 'paused':
      return r.stage === 'live' && r.planStatus === filter;
    case 'closed':
      return r.stage === 'closed';
    case 'all':
      return true;
  }
}

const dayStart = (date: string) => new Date(`${date}T00:00:00+08:00`).toISOString();
const daysBetween = (from: string, to: string) =>
  Math.round(
    (new Date(`${to}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime()) / DAY,
  );

/**
 * What Super Admin reads (api.md "Super Admin", T88 to T92, T118): the shop list with its chips, one shop,
 * Today, leads, payments and Tracking. Runs as app_admin; the shapes are the mock's, so the screens do not
 * change when the area moves to the API.
 */
@Injectable()
export class AdminReader {
  // The owner's sign-in email from Supabase Auth, kept a few minutes (the list would call it per shop).
  private readonly emails = new Map<string, { email: string | null; until: number }>();

  constructor(
    @Inject(Db) private readonly db: Db,
    @Inject(PlanReader) private readonly plans: PlanReader,
    @Inject(AUTH_PROVIDER) private readonly auth: AuthProvider,
    @Inject(MetaSender) private readonly meta: MetaSender,
  ) {}

  async rows(where: SQL = sql``): Promise<{ row: AdminShopRow; db: ShopDbRow }[]> {
    const result = await this.db.tx.execute(shopsQuery(where));
    const rows = ShopRowSchema.array().parse(result.rows);
    const pending = new Map<string, AdminPayment>();
    if (rows.some((r) => r.pending_id))
      for (const p of await this.payments(sql`where p.status = 'pending'`))
        pending.set(p.shopId, p);
    const now = new Date();
    const out: { row: AdminShopRow; db: ShopDbRow }[] = [];
    for (const r of rows) {
      const trialEndsAt = iso(r.trial_ends_at);
      const paidUntil = day(r.paid_until);
      const end = paidUntil ?? (trialEndsAt ? manilaDate(trialEndsAt) : null);
      const steps = stepsOf(r);
      const storageUsed = r.storage_used;
      const lastActive = iso(r.last_active);
      const createdAt = iso(r.created_at);
      const stage =
        r.stage === 'asked' || r.stage === 'live' || r.stage === 'closed' ? r.stage : 'setting_up';
      const ownerEmail =
        r.notify_email ?? r.lead_email ?? (r.owner_id ? await this.ownerEmail(r.owner_id) : null);
      const p = pending.get(r.id) ?? null;
      const row: AdminShopRow = {
        id: r.id,
        slug: r.slug,
        name: r.name,
        kind: r.kind === 'retail' ? 'retail' : 'food',
        city: r.city,
        ownerName: r.full_name ?? r.lead_name ?? 'Owner',
        ownerEmail: ownerEmail ?? 'unknown@webserbisyo.com',
        ownerPhone: phoneOrNull(r.phone) ?? phoneOrNull(r.lead_phone),
        stage,
        planStatus: stage === 'live' ? planStatus({ trialEndsAt, paidUntil }, now) : null,
        trialEndsAt,
        paidUntil,
        graceUntil: planGraceUntil(end),
        priceMonthly: r.price_monthly,
        storageUsedBytes: storageUsed,
        storageLimitBytes: r.storage_limit_bytes,
        orders7d: r.orders7d,
        members: r.members,
        lastActiveAt: lastActive,
        createdAt,
        askedAt: iso(r.asked_at),
        liveAt: iso(r.live_at),
        closedAt: iso(r.closed_at),
        closesOn: day(r.closes_on),
        source: {
          channel: SignupChannelEnum.catch('direct').parse(r.channel),
          campaign: r.campaign,
        },
        flags: adminFlags(
          {
            stage,
            createdAt,
            lastActiveAt: lastActive,
            storageUsedBytes: storageUsed,
            storageLimitBytes: r.storage_limit_bytes,
          },
          now,
        ),
        pending: p
          ? {
              id: p.id,
              months: p.months,
              amount: p.amount,
              method: p.method,
              reference: p.reference,
              status: p.status,
              submittedAt: p.submittedAt,
              coversUntil: p.coversUntil,
              rejectReason: p.rejectReason,
              proofUrl: p.proofUrl,
            }
          : null,
        setupDone: setupDoneCount(steps),
        hasDemoData: r.is_demo,
        isTest: r.is_test,
      };
      out.push({ row, db: r });
    }
    return out;
  }

  async list(filter: AdminShopFilter, q: string): Promise<AdminShopList> {
    const all = (await this.rows()).map((r) => r.row);
    const leads = await this.openLeadCount();
    const counts = Object.fromEntries(
      ADMIN_SHOP_FILTERS.map((f) => [
        f,
        f === 'leads' ? leads : all.filter((r) => matchesFilter(r, f)).length,
      ]),
    );
    const query = q.trim().toLowerCase();
    const digits = query.replace(/\D/g, '');
    const rows = all
      .filter((r) => matchesFilter(r, filter))
      .filter(
        (r) =>
          query === '' ||
          r.name.toLowerCase().includes(query) ||
          r.ownerName.toLowerCase().includes(query) ||
          r.ownerEmail.includes(query) ||
          r.city.toLowerCase().includes(query) ||
          (digits.length >= 4 && (r.ownerPhone ?? '').replace(/^\+63/, '0').includes(digits)),
      );
    return AdminShopListSchema.parse({ rows, counts });
  }

  /** One shop with its payments, chat and Activity. Opening it marks the owner's lines seen. */
  async detail(shopId: string, markSeen = true): Promise<AdminShopDetail> {
    const [found] = await this.rows(sql`where t.id = ${shopId}::uuid`);
    if (!found) throw notFound();
    if (markSeen)
      await this.db.tx.execute(sql`
        update public.billing_messages set seen_at = now()
        where tenant_id = ${shopId}::uuid and "from" = 'owner' and seen_at is null`);
    const payments = await this.plans.payments(shopId);
    const thread = await this.plans.thread(shopId);
    const activity = await this.activity(shopId);
    return AdminShopDetailSchema.parse({
      ...found.row,
      facebookPage: found.db.facebook_page,
      steps: stepsOf(found.db),
      closeReason: CloseReasonEnum.nullable().catch(null).parse(found.db.close_reason),
      payments,
      thread,
      activity,
      remindedAt: iso(found.db.reminded_at),
      undo: await this.undoOf(shopId),
    });
  }

  /** The newest approval still inside its 10 minutes (T118 Q4), from the approval's audit row. */
  async undoOf(shopId: string): Promise<{ paymentId: string; until: string } | null> {
    const result = await this.db.tx.execute(sql`
      select a.target, a.at from public.audit_log a
      join public.plan_payments p on p.id::text = a.target and p.status = 'approved'
      where a.tenant_id = ${shopId}::uuid and a.action = 'payment.approve'
        and a.at > now() - make_interval(secs => ${UNDO_APPROVAL_MS / 1000})
        and not exists (select 1 from public.audit_log u
          where u.action = 'payment.undo' and u.target = a.target and u.at > a.at)
      order by a.at desc limit 1`);
    const row = z.array(z.object({ target: z.string(), at: TimeSchema })).parse(result.rows)[0];
    if (!row) return null;
    return {
      paymentId: row.target,
      until: new Date(new Date(row.at).getTime() + UNDO_APPROVAL_MS).toISOString(),
    };
  }

  async activity(shopId: string): Promise<ShopActivity[]> {
    const result = await this.db.tx.execute(sql`
      select id, at, kind, by, amount, days, minutes, reason, note,
        array_remove(events, '') as events
      from public.shop_activity where tenant_id = ${shopId}::uuid order by at desc limit 200`);
    return ActivityRowSchema.array()
      .parse(result.rows)
      .map((r) =>
        ShopActivitySchema.parse({
          id: r.id,
          at: iso(r.at),
          kind: r.kind,
          by: r.by,
          amount: r.amount,
          days: r.days,
          minutes: r.minutes,
          reason: r.reason,
          note: r.note,
          events: r.events,
        }),
      );
  }

  async leads(): Promise<AdminLead[]> {
    const result = await this.db.tx.execute(sql`
      select id, full_name, email, phone, created_at, channel, campaign, contacted_at
      from public.signup_leads where tenant_id is null order by created_at desc limit 500`);
    return LeadRowSchema.array()
      .parse(result.rows)
      .map((l) =>
        AdminLeadSchema.parse({
          id: l.id,
          fullName: l.full_name,
          email: l.email,
          phone: l.phone,
          createdAt: iso(l.created_at),
          source: { channel: l.channel, campaign: l.campaign },
          contactedAt: iso(l.contacted_at),
        }),
      );
  }

  /** Every shop's plan payments, newest first; `where` narrows them (alias p). */
  async payments(where: SQL = sql``): Promise<AdminPayment[]> {
    const result = await this.db.tx.execute(sql`
      select p.tenant_id, p.id, t.name, t.is_test,
        (select b.text from public.billing_messages b
          where b.payment_id = p.id and b.kind = 'approved' order by b.created_at desc limit 1) as note
      from public.plan_payments p join public.tenants t on t.id = p.tenant_id
      ${where}
      order by p.created_at desc limit 500`);
    const rows = z
      .array(
        z.object({
          tenant_id: z.string(),
          id: z.string(),
          name: z.string(),
          is_test: z.boolean(),
          note: z.string().nullable(),
        }),
      )
      .parse(result.rows);
    const byShop = new Map<string, Awaited<ReturnType<PlanReader['payments']>>>();
    const out: AdminPayment[] = [];
    for (const r of rows) {
      let list = byShop.get(r.tenant_id);
      if (!list) {
        list = await this.plans.payments(r.tenant_id);
        byShop.set(r.tenant_id, list);
      }
      const p = list.find((x) => x.id === r.id);
      if (!p) continue;
      out.push({
        ...p,
        shopId: r.tenant_id,
        shopName: r.name,
        note: r.note ? r.note.slice(0, 120) : null,
      });
    }
    return out;
  }

  async paymentList(view: AdminPaymentView): Promise<AdminPaymentList> {
    const all = await this.payments();
    const toCheck = all.filter((p) => p.status === 'pending');
    return AdminPaymentListSchema.parse({
      // To check: oldest first, so a payment near Meta's 7 days is seen first (T118).
      rows: view === 'to_check' ? [...toCheck].reverse() : all,
      toCheck: toCheck.length,
      monthTotal: await this.monthTotal(),
    });
  }

  /** Approved this Manila month, test shops left out (T118 Q7). */
  async monthTotal(): Promise<number> {
    const month = manilaDate(new Date()).slice(0, 7);
    const result = await this.db.tx.execute(sql`
      select coalesce(sum(p.amount), 0) as total from public.plan_payments p
      join public.tenants t on t.id = p.tenant_id
      where p.status = 'approved' and not t.is_test
        and to_char(p.decided_at at time zone 'Asia/Manila', 'YYYY-MM') = ${month}`);
    return z.array(z.object({ total: Num })).parse(result.rows)[0]?.total ?? 0;
  }

  async today(): Promise<AdminToday> {
    const rows = (await this.rows()).map((r) => r.row);
    const counted = rows.filter((r) => !r.isTest && !r.hasDemoData);
    const paying = (r: AdminShopRow) =>
      r.stage === 'live' && r.paidUntil !== null && r.planStatus !== 'paused';
    const funnel = await this.db.tx.execute(sql`
      select
        (select count(*) from public.track_events
          where name = 'PageView' and created_at > now() - interval '30 days') as visits,
        (select count(*) from public.signup_leads where created_at > now() - interval '30 days') as leads,
        (select count(*) from public.tenants
          where created_at > now() - interval '30 days' and not is_demo and not is_test) as signed_up,
        (select count(*) from public.tenants where created_at > now() - interval '30 days'
          and not is_demo and not is_test and live_at is not null) as live,
        (select count(distinct t.id) from public.tenants t join public.plan_payments p on p.tenant_id = t.id
          where t.created_at > now() - interval '30 days' and not t.is_demo and not t.is_test
            and p.status = 'approved') as paying,
        (select count(*) from public.track_events where status = 'failed') as failed`);
    const f = z
      .array(
        z.object({
          visits: Num,
          leads: Num,
          signed_up: Num,
          live: Num,
          paying: Num,
          failed: Num,
        }),
      )
      .parse(funnel.rows)[0];
    return AdminTodaySchema.parse({
      needs: this.needs(rows, f?.failed ?? 0),
      liveShops: counted.filter((r) => r.stage === 'live').length,
      payingShops: counted.filter(paying).length,
      collectedThisMonth: await this.monthTotal(),
      monthlyRunRate: counted.filter(paying).reduce((sum, r) => sum + r.priceMonthly, 0),
      funnel: {
        visits: f?.visits ?? 0,
        // Every sign-up starts as a lead (step 1), so the leads count already holds the shops.
        leads: Math.max(f?.leads ?? 0, f?.signed_up ?? 0),
        signedUp: f?.signed_up ?? 0,
        live: f?.live ?? 0,
        paying: f?.paying ?? 0,
      },
    });
  }

  private needs(rows: AdminShopRow[], failed: number): AdminNeed[] {
    const today = manilaDate(new Date());
    const out: AdminNeed[] = [];
    const base = {
      shopId: null,
      shopName: null,
      amount: null,
      months: null,
      count: null,
      until: null,
      campaign: null,
    };
    for (const r of rows) {
      const shop = { shopId: r.id, shopName: r.name };
      if (r.pending)
        out.push({
          ...base,
          ...shop,
          kind: 'payment',
          at: r.pending.submittedAt,
          amount: r.pending.amount,
          months: r.pending.months,
        });
      if (r.stage === 'asked')
        out.push({ ...base, ...shop, kind: 'go_live', at: r.askedAt ?? r.createdAt });
      if (r.stage !== 'live') {
        if (r.flags.includes('stuck_setup'))
          out.push({ ...base, ...shop, kind: 'stuck', at: r.createdAt, count: r.setupDone });
        continue;
      }
      if (r.planStatus === 'overdue' && r.paidUntil)
        out.push({
          ...base,
          ...shop,
          kind: 'overdue',
          at: dayStart(r.paidUntil),
          count: daysBetween(r.paidUntil, today),
          until: r.graceUntil,
        });
      if (r.planStatus === 'trial' && r.trialEndsAt && !r.pending) {
        const left = daysBetween(today, manilaDate(r.trialEndsAt));
        if (left <= 3)
          out.push({
            ...base,
            ...shop,
            kind: 'trial_ending',
            at: r.trialEndsAt,
            count: Math.max(0, left),
            until: manilaDate(r.trialEndsAt),
          });
      }
      if (r.planStatus === 'due' && r.paidUntil && !r.pending)
        out.push({
          ...base,
          ...shop,
          kind: 'due',
          at: dayStart(r.paidUntil),
          count: Math.max(0, daysBetween(today, r.paidUntil)),
          until: r.paidUntil,
        });
      if (r.flags.includes('storage_high'))
        out.push({
          ...base,
          ...shop,
          kind: 'storage',
          at: new Date().toISOString(),
          count: Math.round((r.storageUsedBytes / r.storageLimitBytes) * 100),
        });
    }
    if (failed > 0)
      out.push({ ...base, kind: 'tracking_failed', at: new Date().toISOString(), count: failed });
    const order = [
      'payment',
      'go_live',
      'tracking_failed',
      'overdue',
      'trial_ending',
      'due',
      'storage',
      'stuck',
    ];
    return out.sort(
      (a, b) => order.indexOf(a.kind) - order.indexOf(b.kind) || a.at.localeCompare(b.at),
    );
  }

  async tracking(): Promise<TrackingSummary> {
    const settings = await this.db.tx.execute(
      sql`select tracking_sending, tracking_test_mode from public.platform_settings limit 1`,
    );
    const s = z
      .array(z.object({ tracking_sending: z.boolean(), tracking_test_mode: z.boolean() }))
      .parse(settings.rows)[0];
    const events = await this.db.tx.execute(sql`
      select e.id, e.name, e.event_id, e.event_time, e.via, e.status, e.problem, e.value, e.test,
        t.name as shop_name, l.phone as lead_phone
      from public.track_events e
      left join public.tenants t on t.id = e.tenant_id
      left join public.signup_leads l on l.id = e.lead_id
      order by e.created_at desc limit 60`);
    const facts = await this.db.tx.execute(sql`
      select (select max(sent_at) from public.track_events where status = 'sent') as last_sent,
        (select count(*) from public.track_events where status = 'failed') as failed`);
    const fact = z
      .array(z.object({ last_sent: TimeSchema.nullable(), failed: Num }))
      .parse(facts.rows)[0];
    return TrackingSummarySchema.parse({
      connected: this.meta.connected,
      sending: s?.tracking_sending ?? false,
      testMode: s?.tracking_test_mode ?? true,
      lastEventAt: iso(fact?.last_sent ?? null),
      byAd: await this.byAd(),
      events: EventRowSchema.array()
        .parse(events.rows)
        .map((e) => ({
          id: e.id,
          name: e.name,
          eventId: e.event_id,
          at: iso(e.event_time),
          via: e.via,
          status: e.status,
          // The shop's name, or a lead's masked mobile: never a person's details in full.
          subject: (e.shop_name ?? (e.lead_phone ? maskPhone(e.lead_phone) : maskPhone(''))).slice(
            0,
            80,
          ),
          value: e.value,
          problem: e.problem,
          test: e.test,
        })),
      failed: fact?.failed ?? 0,
    });
  }

  private async byAd() {
    const result = await this.db.tx.execute(sql`
      with l as (
        select campaign, count(*) as leads from public.signup_leads group by campaign
      ), s as (
        select t.campaign, count(*) as signed_up, count(t.live_at) as live,
          count(distinct p.tenant_id) as paying
        from public.tenants t
        left join public.plan_payments p on p.tenant_id = t.id and p.status = 'approved'
        where not t.is_demo and not t.is_test
        group by t.campaign
      )
      select coalesce(l.campaign, s.campaign) as campaign, coalesce(l.leads, 0) as leads,
        coalesce(s.signed_up, 0) as signed_up, coalesce(s.live, 0) as live, coalesce(s.paying, 0) as paying
      from l full join s on l.campaign is not distinct from s.campaign
      order by (coalesce(l.campaign, s.campaign) is null), coalesce(l.leads, 0) desc
      limit 30`);
    return z
      .array(
        z.object({
          campaign: z.string().nullable(),
          leads: Num,
          signed_up: Num,
          live: Num,
          paying: Num,
        }),
      )
      .parse(result.rows)
      .map((r) => ({
        campaign: r.campaign,
        leads: Math.max(r.leads, r.signed_up),
        signedUp: r.signed_up,
        live: r.live,
        paying: r.paying,
      }));
  }

  private async openLeadCount(): Promise<number> {
    const result = await this.db.tx.execute(
      sql`select count(*) as n from public.signup_leads where tenant_id is null`,
    );
    return z.array(z.object({ n: Num })).parse(result.rows)[0]?.n ?? 0;
  }

  private async ownerEmail(userId: string): Promise<string | null> {
    const hit = this.emails.get(userId);
    if (hit && hit.until > Date.now()) return hit.email;
    const email = await this.auth.getUserEmail(userId);
    this.emails.set(userId, { email, until: Date.now() + 10 * 60_000 });
    return email;
  }
}
