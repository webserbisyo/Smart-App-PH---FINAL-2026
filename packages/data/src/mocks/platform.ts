// The mock back end for Super Admin, sign-up and going live (decisions T88 to T92): same names, inputs,
// outputs and error codes as docs/api.md "Super Admin" and "Sign-up and going live". Loaded on first use, so
// the storefront never carries it. The 5 demo shops share their plan book with owner Settings, so an approval
// here shows on the owner's Plan at once; 15 lighter shops and 6 leads fill the lists.
import {
  AdminLeadSchema,
  AdminPaymentListSchema,
  AdminShopDetailSchema,
  AdminShopListSchema,
  AdminTodaySchema,
  CloseShopInputSchema,
  CreateClientInputSchema,
  DEMO_SHOPS,
  DeleteShopInputSchema,
  ExtendDaysInputSchema,
  OwnerOnboardingSchema,
  PlatformSetupSchema,
  PRO_STORAGE_BYTES,
  RecordPlanPaymentInputSchema,
  RegisterShopInputSchema,
  ReviewPlanPaymentInputSchema,
  SetTrackingInputSchema,
  SignupLeadInputSchema,
  StartSupportInputSchema,
  SUPPORT_MINUTES,
  SupportSessionSchema,
  TrackingSummarySchema,
  TrackInputSchema,
  addDays,
  adminFlags,
  canAskToGoLive,
  extendPlan,
  manilaDate,
  maskPhone,
  metaEventId,
  planCoversUntil,
  planGraceUntil,
  planStatus,
  setupDoneCount,
  trialEndsFrom,
  type AdminFlag,
  type AdminLead,
  type AdminNeed,
  type AdminPayment,
  type AdminShopDetail,
  type AdminShopFilter,
  type AdminShopRow,
  type BillingMessage,
  type CloseReason,
  type ErrorCode,
  type OnboardingStep,
  type OwnerOnboarding,
  type PlanPayment,
  type PlanStatus,
  type ShopActivity,
  type ShopKind,
  type ShopStage,
  type SignupSource,
  type SupportSession,
  type TrackEvent,
  type TrackEventName,
  type TrackVia,
} from '@smartapp/core';
import type { OnboardingAdapter, PlatformAdapter } from '../adapters/types';
import type { PlanBook } from './settings';
import type { MockScenario } from './scenario-state';
import { mulberry32 } from './rng';
import type { PlatformSetupState } from './platform-setup';

const DAY = 86_400_000;
const HOUR = 3_600_000;
const MB = 1024 * 1024;

export interface ShopFacts {
  steps: OnboardingStep[];
  orders7d: number;
  members: number;
  lastActiveAt: string | null;
}

export interface PlatformMockDeps {
  run: <T>(area: 'platform', fn: () => T) => Promise<T>;
  fail: (code: ErrorCode, status?: number, fieldErrors?: Record<string, string[]>) => never;
  now: () => Date;
  seed: number;
  scenario: () => MockScenario;
  setup: PlatformSetupState;
  ownerShop: () => Promise<string>;
  ownerClaims: () => Promise<{ email: string; fullName?: string | undefined } | null>;
  book: (slug: string) => Promise<PlanBook>;
  billingLine: (
    from: BillingMessage['from'],
    kind: BillingMessage['kind'],
    at: string,
    extra?: Partial<Omit<BillingMessage, 'from' | 'kind' | 'at' | 'id'>>,
  ) => BillingMessage;
  storageUsed: (slug: string) => Promise<number>;
  shopFacts: (slug: string) => ShopFacts;
  support: { get: () => SupportSession | null; set: (s: SupportSession | null) => void };
}

interface PShop {
  id: string;
  slug: string;
  name: string;
  kind: ShopKind;
  city: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  stage: ShopStage;
  priceMonthly: number;
  createdAt: string;
  askedAt: string | null;
  liveAt: string | null;
  closedAt: string | null;
  closesOn: string | null;
  closeReason: CloseReason | null;
  source: SignupSource;
  facebookPage: string | null;
  storageUsedBytes: number;
  orders7d: number;
  members: number;
  lastActiveAt: string | null;
  steps: OnboardingStep[];
  activity: ShopActivity[];
  remindedAt: string | null;
  demo: boolean;
  book: PlanBook;
}

interface PaymentMeta {
  reviewedAt: string | null;
  recorded: boolean;
  note: string | null;
}

// ---------- the lighter shops (owners, cities and ads are made up) ----------

interface LightStory {
  name: string;
  kind: ShopKind;
  city: string;
  owner: string;
  stage: ShopStage;
  // Days since sign-up.
  age: number;
  // Go-live steps done (setting up only).
  done?: number;
  // live: 'trial' days left, or paid until in days (negative = late).
  trialLeft?: number;
  paidDays?: number;
  months?: number;
  pending?: { months: 1 | 3 | 6; method: 'gcash' | 'maya'; hoursAgo: number };
  campaign: string | null;
  channel: SignupSource['channel'];
  storageMb: number;
  orders7d: number;
  members: number;
  quietDays?: number;
  fb?: string;
}

const LIGHT: LightStory[] = [
  {
    name: 'Bahay Kubo Silog',
    kind: 'food',
    city: 'Quezon City',
    owner: 'Maricel Santos',
    stage: 'setting_up',
    age: 4,
    done: 2,
    campaign: 'nov-launch-food',
    channel: 'facebook_ad',
    storageMb: 3,
    orders7d: 0,
    members: 0,
  },
  {
    name: 'Lutong Bahay ni Aling Nena',
    kind: 'food',
    city: 'Pasig',
    owner: 'Nena Cruz',
    stage: 'setting_up',
    age: 1,
    done: 1,
    campaign: 'nov-launch-food',
    channel: 'facebook_ad',
    storageMb: 1,
    orders7d: 0,
    members: 0,
  },
  {
    name: 'Ukay Finds PH',
    kind: 'retail',
    city: 'Baguio',
    owner: 'Jerome Abad',
    stage: 'setting_up',
    age: 2,
    done: 4,
    campaign: null,
    channel: 'direct',
    storageMb: 22,
    orders7d: 0,
    members: 0,
  },
  {
    name: 'Mang Tomas Lechon',
    kind: 'food',
    city: 'Marikina',
    owner: 'Tomas Garcia',
    stage: 'asked',
    age: 3,
    done: 4,
    campaign: 'nov-launch-food',
    channel: 'facebook_ad',
    storageMb: 18,
    orders7d: 0,
    members: 0,
    fb: 'facebook.com/mangtomaslechon',
  },
  {
    name: 'Pinoy Pet Supplies',
    kind: 'retail',
    city: 'Antipolo',
    owner: 'Liza Mendoza',
    stage: 'asked',
    age: 2,
    done: 4,
    campaign: 'retail-oct',
    channel: 'facebook_ad',
    storageMb: 31,
    orders7d: 0,
    members: 0,
  },
  {
    name: 'Sizzling Kanto',
    kind: 'food',
    city: 'Caloocan',
    owner: 'Ryan dela Cruz',
    stage: 'live',
    age: 15,
    trialLeft: 2,
    campaign: 'nov-launch-food',
    channel: 'facebook_ad',
    storageMb: 44,
    orders7d: 38,
    members: 21,
  },
  {
    name: 'Kakanin ni Lola',
    kind: 'food',
    city: 'Bulacan',
    owner: 'Rosa Bautista',
    stage: 'live',
    age: 8,
    trialLeft: 9,
    campaign: 'stamp-card-video',
    channel: 'facebook_ad',
    storageMb: 12,
    orders7d: 14,
    members: 9,
    pending: { months: 6, method: 'gcash', hoursAgo: 5 },
  },
  {
    name: 'Mga Halaman Co.',
    kind: 'retail',
    city: 'Tagaytay',
    owner: 'Carlo Ramos',
    stage: 'live',
    age: 6,
    trialLeft: 11,
    campaign: null,
    channel: 'link',
    storageMb: 64,
    orders7d: 6,
    members: 3,
  },
  {
    name: 'Brew Brothers Coffee',
    kind: 'food',
    city: 'Makati',
    owner: 'Miguel Tan',
    stage: 'live',
    age: 70,
    paidDays: 21,
    months: 2,
    campaign: 'stamp-card-video',
    channel: 'facebook_ad',
    storageMb: 151,
    orders7d: 112,
    members: 86,
  },
  {
    name: 'Tindahan ni Aling Baby',
    kind: 'retail',
    city: 'Cavite',
    owner: 'Baby Navarro',
    stage: 'live',
    age: 48,
    paidDays: 12,
    months: 1,
    campaign: null,
    channel: 'direct',
    storageMb: 47,
    orders7d: 29,
    members: 18,
  },
  {
    name: 'Island Grill',
    kind: 'food',
    city: 'Iloilo',
    owner: 'Jun Villareal',
    stage: 'live',
    age: 105,
    paidDays: 75,
    months: 1,
    campaign: 'retail-oct',
    channel: 'facebook_ad',
    storageMb: 412,
    orders7d: 64,
    members: 140,
  },
  {
    name: 'Sari-Sari Express',
    kind: 'retail',
    city: 'Davao',
    owner: 'Grace Lim',
    stage: 'live',
    age: 40,
    paidDays: 3,
    months: 1,
    campaign: 'retail-oct',
    channel: 'facebook_ad',
    storageMb: 39,
    orders7d: 22,
    members: 12,
    pending: { months: 1, method: 'maya', hoursAgo: 2 },
  },
  {
    name: 'Hotdog sa Kanto',
    kind: 'food',
    city: 'Manila',
    owner: 'Ed Pascual',
    stage: 'live',
    age: 52,
    paidDays: -4,
    months: 1,
    campaign: 'nov-launch-food',
    channel: 'facebook_ad',
    storageMb: 28,
    orders7d: 9,
    members: 7,
    quietDays: 2,
  },
  {
    name: 'Ate Joy Bakeshop',
    kind: 'food',
    city: 'Laguna',
    owner: 'Joy Aquino',
    stage: 'live',
    age: 60,
    paidDays: -12,
    months: 1,
    campaign: null,
    channel: 'link',
    storageMb: 33,
    orders7d: 0,
    members: 25,
    quietDays: 9,
  },
  {
    name: 'Retro Threads',
    kind: 'retail',
    city: 'Cebu City',
    owner: 'Paul Lim',
    stage: 'closed',
    age: 90,
    paidDays: -40,
    months: 1,
    campaign: null,
    channel: 'direct',
    storageMb: 20,
    orders7d: 0,
    members: 4,
    quietDays: 41,
  },
];

const LEADS: {
  name: string;
  phone: string;
  hoursAgo: number;
  campaign: string | null;
  channel: SignupSource['channel'];
  contacted?: boolean;
}[] = [
  {
    name: 'Arnel Domingo',
    phone: '+639171234501',
    hoursAgo: 3,
    campaign: 'nov-launch-food',
    channel: 'facebook_ad',
  },
  {
    name: 'Cherry Velasco',
    phone: '+639181234502',
    hoursAgo: 20,
    campaign: 'stamp-card-video',
    channel: 'facebook_ad',
  },
  { name: 'Dennis Uy', phone: '+639201234503', hoursAgo: 30, campaign: null, channel: 'direct' },
  {
    name: 'Faye Robles',
    phone: '+639271234504',
    hoursAgo: 52,
    campaign: 'retail-oct',
    channel: 'facebook_ad',
    contacted: true,
  },
  {
    name: 'Gilbert Castro',
    phone: '+639391234505',
    hoursAgo: 75,
    campaign: 'nov-launch-food',
    channel: 'facebook_ad',
  },
  {
    name: 'Hazel Ocampo',
    phone: '+639451234506',
    hoursAgo: 140,
    campaign: null,
    channel: 'link',
    contacted: true,
  },
];

const STEP_NAMES = ['items', 'look', 'hours', 'payments'] as const;

const slugOf = (name: string) =>
  name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/[̀-ͯ]/g, '')
    .replace(/^-|-$/g, '')
    .slice(0, 40);

const emailOf = (name: string) => `${slugOf(name).replace(/-/g, '.')}@example.com`;

export function createPlatformMock(deps: PlatformMockDeps) {
  const { run, now, setup } = deps;
  const fail: PlatformMockDeps['fail'] = deps.fail;
  const rng = mulberry32(deps.seed + 88);
  let seq = 0;
  const id = (prefix: string) => {
    seq += 1;
    return `${prefix}_${seq.toString(36)}${Math.floor(rng() * 1e6).toString(36)}`;
  };
  const ago = (ms: number) => new Date(now().getTime() - ms).toISOString();
  const ref = () => String(1_000_000_000_000 + Math.floor(rng() * 8_999_999_999_999));

  const shops = new Map<string, PShop>();
  const leads: (AdminLead & { convertedAt: string | null })[] = [];
  const meta = new Map<string, PaymentMeta>();
  const events: TrackEvent[] = [];
  const tracking = { sending: true, testMode: false };
  // Visits to the sign-up page in the last 30 days (from the PageView events the server sent).
  let visits = 412;
  // New accounts made in this browser, by email: the shop each one registered.
  const byEmail = new Map<string, string>();

  function activity(
    s: PShop,
    kind: ShopActivity['kind'],
    by: ShopActivity['by'],
    at: string,
    extra: Partial<Omit<ShopActivity, 'id' | 'kind' | 'by' | 'at'>> = {},
  ): void {
    s.activity.push({
      id: id('act'),
      at,
      kind,
      by,
      amount: null,
      days: null,
      minutes: null,
      reason: null,
      note: null,
      events: [],
      ...extra,
    });
  }

  function track(
    name: TrackEventName,
    base: string,
    subject: string,
    at: string,
    via: TrackVia,
    value: number | null = null,
  ): TrackEventName {
    const off = !tracking.sending;
    events.push({
      id: id('ev'),
      name,
      eventId: metaEventId(name, base),
      at,
      via,
      status: off ? 'skipped' : 'sent',
      subject,
      value,
      problem: off ? 'off' : null,
      test: tracking.testMode,
    });
    return name;
  }

  function steps(done: number): OnboardingStep[] {
    return STEP_NAMES.map((step, i) => ({ step, done: i < done }));
  }

  // ---------- seed ----------

  async function seedDemo(): Promise<void> {
    const ownerSlug = await deps.ownerShop().catch(() => null);
    for (const [i, d] of DEMO_SHOPS.entries()) {
      const book = await deps.book(d.slug);
      const facts = deps.shopFacts(d.slug);
      const firstPay = [...book.history].sort((a, b) =>
        a.submittedAt.localeCompare(b.submittedAt),
      )[0];
      const liveAt = firstPay
        ? ago(now().getTime() - new Date(firstPay.submittedAt).getTime() + 14 * DAY)
        : ago(5 * DAY);
      const s: PShop = {
        id: `shop_${d.slug}`,
        slug: d.slug,
        name: d.name,
        kind: d.kind,
        city: d.city,
        ownerName: d.ownerName,
        ownerEmail: emailOf(d.ownerName),
        ownerPhone: `+63917555${String(1000 + i * 37).slice(0, 4)}`,
        stage: 'live',
        priceMonthly: setup.priceMonthly,
        createdAt: ago(new Date(now()).getTime() - new Date(liveAt).getTime() + 2 * DAY),
        askedAt: ago(new Date(now()).getTime() - new Date(liveAt).getTime() + 6 * HOUR),
        liveAt,
        closedAt: null,
        closesOn: null,
        closeReason: null,
        source: {
          channel: i % 2 === 0 ? 'facebook_ad' : 'direct',
          campaign: i % 2 === 0 ? 'nov-launch-food' : null,
        },
        facebookPage: null,
        storageUsedBytes: await deps.storageUsed(d.slug),
        orders7d: facts.orders7d,
        members: facts.members,
        lastActiveAt: facts.lastActiveAt ?? ago(2 * HOUR),
        steps: facts.steps,
        activity: [],
        remindedAt: null,
        demo: true,
        book,
      };
      activity(s, 'signed_up', 'owner', s.createdAt, { events: ['CompleteRegistration'] });
      activity(s, 'asked', 'owner', s.askedAt ?? s.createdAt, { events: ['SubmitApplication'] });
      activity(s, 'approved', 'admin', liveAt, { events: ['StartTrial'] });
      for (const p of book.history) {
        meta.set(p.id, {
          reviewedAt: new Date(new Date(p.submittedAt).getTime() + 3 * HOUR).toISOString(),
          recorded: false,
          note: null,
        });
        activity(s, 'payment_approved', 'admin', new Date(p.submittedAt).toISOString(), {
          amount: p.amount,
          events: ['Purchase'],
        });
      }
      // The dev switch ?mock=stage-setting-up or stage-asked puts the owner's own shop back before going live.
      const stage = deps.scenario().stage;
      if (d.slug === ownerSlug && stage !== 'live') {
        s.stage = stage;
        s.liveAt = null;
        s.askedAt = stage === 'asked' ? ago(3 * HOUR) : null;
        s.createdAt = ago(DAY);
        s.activity = s.activity.filter(
          (a) => a.kind === 'signed_up' || (stage === 'asked' && a.kind === 'asked'),
        );
      }
      shops.set(s.id, s);
    }
  }

  function seedLight(): void {
    const t = now().getTime();
    const today = manilaDate(now());
    for (const [i, l] of LIGHT.entries()) {
      const createdAt = ago(l.age * DAY + (i % 5) * HOUR);
      const liveAt = l.stage === 'live' || l.stage === 'closed' ? ago((l.age - 1) * DAY) : null;
      const book: PlanBook = { trialEndsAt: null, paidUntil: null, history: [], thread: [] };
      if (l.trialLeft !== undefined)
        book.trialEndsAt = new Date(t + l.trialLeft * DAY).toISOString();
      if (l.paidDays !== undefined) {
        book.paidUntil = addDays(today, l.paidDays);
        for (let m = 0; m < (l.months ?? 1); m++) {
          // Paid a day before the month it covers began, never later than yesterday.
          const at = new Date(
            Math.min(t - (30 * (m + 1) - l.paidDays + 1) * DAY, t - (m + 1) * DAY),
          ).toISOString();
          // A shop paid far ahead paid for 3 months at once.
          const span = l.paidDays > 30 && m === 0 ? 3 : 1;
          const p: PlanPayment = {
            id: `pay_${i}_${m}`,
            months: span,
            amount: setup.priceMonthly * span,
            method: m % 2 === 0 ? 'gcash' : 'maya',
            reference: ref(),
            status: 'approved',
            submittedAt: at,
            coversUntil: addDays(book.paidUntil, -30 * m),
            rejectReason: null,
            proofUrl: null,
          };
          book.history.push(p);
          meta.set(p.id, {
            reviewedAt: new Date(new Date(at).getTime() + 2 * HOUR).toISOString(),
            recorded: false,
            note: null,
          });
        }
      }
      if (liveAt) book.thread.push(deps.billingLine('system', 'live', liveAt));
      for (const p of [...book.history].reverse()) {
        book.thread.push(
          deps.billingLine('owner', 'payment', p.submittedAt, { paymentId: p.id }),
          deps.billingLine('admin', 'approved', meta.get(p.id)?.reviewedAt ?? p.submittedAt, {
            paymentId: p.id,
          }),
        );
      }
      if (l.pending) {
        const amount =
          (l.pending.months === 6 && setup.sixMonthBonus ? 5 : l.pending.months) *
          setup.priceMonthly;
        const at = ago(l.pending.hoursAgo * HOUR);
        const p: PlanPayment = {
          id: `pay_${i}_p`,
          months: l.pending.months,
          amount,
          method: l.pending.method,
          reference: ref(),
          status: 'pending',
          submittedAt: at,
          coversUntil: planCoversUntil(book.paidUntil, l.pending.months, now()),
          rejectReason: null,
          proofUrl: null,
        };
        book.history.push(p);
        meta.set(p.id, { reviewedAt: null, recorded: false, note: null });
        book.thread.push(deps.billingLine('owner', 'payment', at, { paymentId: p.id }));
      }
      if (l.paidDays !== undefined && l.paidDays < 0 && l.stage === 'live') {
        book.thread.push(deps.billingLine('admin', 'reminder', ago(2 * DAY)));
      }
      const s: PShop = {
        id: `shop_l${i}`,
        slug: slugOf(l.name),
        name: l.name,
        kind: l.kind,
        city: l.city,
        ownerName: l.owner,
        ownerEmail: emailOf(l.owner),
        ownerPhone: `+639${String(170_000_000 + i * 7_654_321).slice(0, 9)}`,
        stage: l.stage,
        priceMonthly: setup.priceMonthly,
        createdAt,
        askedAt: l.stage === 'setting_up' ? null : ago((l.age - 0.5) * DAY),
        liveAt,
        closedAt: l.stage === 'closed' ? ago(30 * DAY) : null,
        closesOn: null,
        closeReason: l.stage === 'closed' ? 'not_paying' : null,
        source: { channel: l.channel, campaign: l.campaign },
        facebookPage: l.fb ?? null,
        storageUsedBytes: l.storageMb * MB,
        orders7d: l.orders7d,
        members: l.members,
        lastActiveAt: ago(((l.quietDays ?? 0) + rng() * 0.5) * DAY),
        steps: steps(l.done ?? 4),
        activity: [],
        remindedAt: l.paidDays !== undefined && l.paidDays < 0 ? ago(2 * DAY) : null,
        demo: false,
        book,
      };
      activity(s, 'signed_up', 'owner', createdAt, {
        events: l.channel === 'facebook_ad' ? ['CompleteRegistration'] : [],
      });
      if (s.askedAt) activity(s, 'asked', 'owner', s.askedAt, { events: ['SubmitApplication'] });
      if (liveAt) activity(s, 'approved', 'admin', liveAt, { events: ['StartTrial'] });
      for (const p of book.history) {
        if (p.status === 'approved')
          activity(s, 'payment_approved', 'admin', meta.get(p.id)?.reviewedAt ?? p.submittedAt, {
            amount: p.amount,
            events: ['Purchase'],
          });
        else
          activity(s, 'payment_sent', 'owner', p.submittedAt, {
            amount: p.amount,
            events: ['AddPaymentInfo'],
          });
      }
      if (s.remindedAt) activity(s, 'reminder', 'admin', s.remindedAt);
      if (s.closedAt) activity(s, 'closed', 'admin', s.closedAt, { reason: 'not_paying' });
      shops.set(s.id, s);
    }
  }

  function seedLeads(): void {
    for (const [i, l] of LEADS.entries()) {
      leads.push({
        id: `lead_${i}`,
        fullName: l.name,
        email: emailOf(l.name),
        phone: l.phone,
        createdAt: ago(l.hoursAgo * HOUR),
        source: { channel: l.channel, campaign: l.campaign },
        contactedAt: l.contacted ? ago((l.hoursAgo - 4) * HOUR) : null,
        convertedAt: null,
      });
    }
  }

  // The event log: what each lead and shop sent to Meta in the last 7 days, newest first on the screen.
  function seedEvents(): void {
    const weekAgo = now().getTime() - 7 * DAY;
    const within = (at: string) => new Date(at).getTime() >= weekAgo;
    for (let i = 0; i < 18; i++) {
      const at = ago((i * 9 + rng() * 6) * HOUR);
      track('PageView', `seed${i}`, maskPhone(''), at, i % 3 === 0 ? 'browser' : 'browser_server');
    }
    for (const l of leads) {
      if (within(l.createdAt))
        track('Lead', l.id, maskPhone(l.phone), l.createdAt, 'browser_server');
    }
    for (const s of shops.values()) {
      if (s.demo) continue;
      for (const a of s.activity) {
        if (!within(a.at)) continue;
        for (const name of a.events) {
          const via: TrackVia = name === 'CompleteRegistration' ? 'browser_server' : 'server';
          track(name, `${s.id}:${a.id}`, s.name, a.at, via, a.amount);
        }
      }
    }
    // Two that Meta did not take (a timeout), so Retry has something to do.
    const failed = events
      .filter((e) => e.name === 'Purchase' || e.name === 'StartTrial')
      .slice(0, 2);
    for (const e of failed) {
      e.status = 'failed';
      e.problem = 'timeout';
    }
  }

  let ready: Promise<void> | null = null;
  const init = () =>
    (ready ??= (async () => {
      await seedDemo();
      seedLight();
      seedLeads();
      seedEvents();
    })());

  // ---------- reading ----------

  function statusOf(s: PShop): PlanStatus | null {
    if (s.stage !== 'live') return null;
    return planStatus({ trialEndsAt: s.book.trialEndsAt, paidUntil: s.book.paidUntil }, now());
  }

  function pendingOf(s: PShop): PlanPayment | null {
    return s.book.history.find((p) => p.status === 'pending') ?? null;
  }

  function rowOf(s: PShop): AdminShopRow {
    if (s.demo) {
      const facts = deps.shopFacts(s.slug);
      s.steps = facts.steps;
      s.orders7d = facts.orders7d;
      s.members = facts.members;
    }
    const end = s.book.paidUntil ?? (s.book.trialEndsAt ? manilaDate(s.book.trialEndsAt) : null);
    const flags: AdminFlag[] = adminFlags(
      {
        stage: s.stage,
        createdAt: s.createdAt,
        lastActiveAt: s.lastActiveAt,
        storageUsedBytes: s.storageUsedBytes,
        storageLimitBytes: PRO_STORAGE_BYTES,
      },
      now(),
    );
    return {
      id: s.id,
      slug: s.slug,
      name: s.name,
      kind: s.kind,
      city: s.city,
      ownerName: s.ownerName,
      ownerEmail: s.ownerEmail,
      ownerPhone: s.ownerPhone,
      stage: s.stage,
      planStatus: statusOf(s),
      trialEndsAt: s.book.trialEndsAt,
      paidUntil: s.book.paidUntil,
      graceUntil: planGraceUntil(end),
      priceMonthly: s.priceMonthly,
      storageUsedBytes: s.storageUsedBytes,
      storageLimitBytes: PRO_STORAGE_BYTES,
      orders7d: s.orders7d,
      members: s.members,
      lastActiveAt: s.lastActiveAt,
      createdAt: s.createdAt,
      askedAt: s.askedAt,
      liveAt: s.liveAt,
      closedAt: s.closedAt,
      closesOn: s.closesOn,
      source: s.source,
      flags,
      pending: pendingOf(s),
      setupDone: setupDoneCount(s.steps),
      hasDemoData: s.demo,
    };
  }

  function detailOf(s: PShop): AdminShopDetail {
    return AdminShopDetailSchema.parse({
      ...rowOf(s),
      facebookPage: s.facebookPage,
      steps: s.steps,
      closeReason: s.closeReason,
      payments: [...s.book.history].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)),
      thread: s.book.thread,
      activity: [...s.activity].sort((a, b) => b.at.localeCompare(a.at)),
      remindedAt: s.remindedAt,
    });
  }

  function needsYou(r: AdminShopRow): boolean {
    return (
      r.pending !== null ||
      r.stage === 'asked' ||
      r.planStatus === 'overdue' ||
      r.flags.includes('stuck_setup')
    );
  }

  function matches(r: AdminShopRow, filter: AdminShopFilter): boolean {
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

  function shopById(shopId: string): PShop {
    const s = shops.get(shopId);
    if (!s) fail('not_found', 404);
    return s;
  }

  function openLeads() {
    return leads.filter((l) => l.convertedAt === null);
  }

  function adminPayments(): AdminPayment[] {
    const out: AdminPayment[] = [];
    for (const s of shops.values()) {
      for (const p of s.book.history) {
        const m = meta.get(p.id) ?? { reviewedAt: null, recorded: false, note: null };
        out.push({ ...p, shopId: s.id, shopName: s.name, ...m });
      }
    }
    return out.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  }

  function monthTotal(): number {
    const month = manilaDate(now()).slice(0, 7);
    return adminPayments()
      .filter(
        (p) =>
          p.status === 'approved' && p.reviewedAt && manilaDate(p.reviewedAt).slice(0, 7) === month,
      )
      .reduce((sum, p) => sum + p.amount, 0);
  }

  function isPaying(r: AdminShopRow): boolean {
    return r.stage === 'live' && r.paidUntil !== null && r.planStatus !== 'paused';
  }

  // A Manila day as the instant it starts.
  const dayStart = (date: string) => new Date(`${date}T00:00:00+08:00`).toISOString();

  function daysBetween(from: string, to: string): number {
    return Math.round(
      (new Date(`${to}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime()) / DAY,
    );
  }

  function needs(rows: AdminShopRow[]): AdminNeed[] {
    const today = manilaDate(now());
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
            count: left,
            until: manilaDate(r.trialEndsAt),
          });
      }
      if (r.planStatus === 'due' && r.paidUntil && !r.pending)
        out.push({
          ...base,
          ...shop,
          kind: 'due',
          at: dayStart(r.paidUntil),
          count: daysBetween(today, r.paidUntil),
          until: r.paidUntil,
        });
      if (r.flags.includes('storage_high'))
        out.push({
          ...base,
          ...shop,
          kind: 'storage',
          at: now().toISOString(),
          count: Math.round((r.storageUsedBytes / r.storageLimitBytes) * 100),
        });
    }
    const failed = events.filter((e) => e.status === 'failed').length;
    if (failed > 0)
      out.push({ ...base, kind: 'tracking_failed', at: now().toISOString(), count: failed });
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

  function byAd() {
    const map = new Map<
      string | null,
      { leads: number; signedUp: number; live: number; paying: number }
    >();
    const get = (c: string | null) => {
      let v = map.get(c);
      if (!v) {
        v = { leads: 0, signedUp: 0, live: 0, paying: 0 };
        map.set(c, v);
      }
      return v;
    };
    for (const l of leads) get(l.source.campaign).leads += 1;
    for (const s of shops.values()) {
      if (s.demo) continue;
      const r = rowOf(s);
      const v = get(s.source.campaign);
      v.leads += 1;
      v.signedUp += 1;
      if (r.liveAt) v.live += 1;
      if (s.book.history.some((p) => p.status === 'approved')) v.paying += 1;
    }
    return [...map.entries()]
      .map(([campaign, v]) => ({ campaign, ...v }))
      .sort((a, b) => (a.campaign === null ? 1 : b.campaign === null ? -1 : b.leads - a.leads));
  }

  function trackingSummary() {
    const sorted = [...events].sort((a, b) => b.at.localeCompare(a.at));
    return TrackingSummarySchema.parse({
      connected: true,
      sending: tracking.sending,
      testMode: tracking.testMode,
      lastEventAt: sorted.find((e) => e.status === 'sent')?.at ?? null,
      byAd: byAd(),
      events: sorted.slice(0, 60),
      failed: events.filter((e) => e.status === 'failed').length,
    });
  }

  // ---------- the owner's own shop ----------

  async function ownersShop(): Promise<PShop> {
    await init();
    const claims = await deps.ownerClaims().catch(() => null);
    const made = claims ? byEmail.get(claims.email) : undefined;
    if (made) {
      const s = shops.get(made);
      if (s) return s;
    }
    const slug = await deps.ownerShop();
    const s = [...shops.values()].find((x) => x.slug === slug);
    if (!s) fail('not_found', 404);
    return s;
  }

  function onboardingOf(s: PShop): OwnerOnboarding {
    if (s.demo) s.steps = deps.shopFacts(s.slug).steps;
    return OwnerOnboardingSchema.parse({
      stage: s.stage,
      askedAt: s.askedAt,
      liveAt: s.liveAt,
      steps: s.steps,
      helpedNow: deps.support.get()?.shopId === s.id,
    });
  }

  const onboarding: OnboardingAdapter = {
    saveSignupLead: async (input) => {
      await init();
      return run('platform', () => {
        const parsed = SignupLeadInputSchema.safeParse(input);
        if (!parsed.success) fail('invalid_input', 400);
        const d = parsed.data;
        if ([...shops.values()].some((s) => s.ownerEmail === d.email))
          fail('email_taken', 409, { email: ['taken'] });
        const at = now().toISOString();
        const existing = leads.find((l) => l.email === d.email && l.convertedAt === null);
        const lead = existing ?? {
          id: id('lead'),
          fullName: d.fullName,
          email: d.email,
          phone: d.phone,
          createdAt: at,
          source: d.source,
          contactedAt: null,
          convertedAt: null,
        };
        lead.fullName = d.fullName;
        lead.phone = d.phone;
        if (!existing) leads.push(lead);
        // The browser sent its Lead with the same id; Meta keeps one (T90).
        events.push({
          id: id('ev'),
          name: 'Lead',
          eventId: d.eventId,
          at,
          via: 'browser_server',
          status: tracking.sending ? 'sent' : 'skipped',
          subject: maskPhone(d.phone),
          value: null,
          problem: tracking.sending ? null : 'off',
          test: tracking.testMode,
        });
        return { leadId: lead.id };
      });
    },

    registerShop: async (input) => {
      await init();
      const claims = await deps.ownerClaims().catch(() => null);
      return run('platform', () => {
        if (!claims) fail('not_signed_in', 401);
        const parsed = RegisterShopInputSchema.safeParse(input);
        if (!parsed.success) fail('invalid_input', 400);
        const d = parsed.data;
        const lead = leads.find((l) => l.id === d.leadId) ?? null;
        const at = now().toISOString();
        if (lead) lead.convertedAt = at;
        const s: PShop = {
          id: id('shop'),
          slug: slugOf(d.shop.shopName) || id('shop'),
          name: d.shop.shopName,
          kind: d.shop.kind,
          city: d.shop.city,
          ownerName: lead?.fullName ?? claims.fullName ?? claims.email,
          ownerEmail: claims.email,
          ownerPhone: lead?.phone ?? '+639170000000',
          stage: 'setting_up',
          priceMonthly: setup.priceMonthly,
          createdAt: at,
          askedAt: null,
          liveAt: null,
          closedAt: null,
          closesOn: null,
          closeReason: null,
          source: lead?.source ?? { channel: 'direct', campaign: null },
          facebookPage: d.shop.facebookPage,
          storageUsedBytes: 0,
          orders7d: 0,
          members: 0,
          lastActiveAt: at,
          steps: steps(0),
          activity: [],
          remindedAt: null,
          demo: false,
          book: { trialEndsAt: null, paidUntil: null, history: [], thread: [] },
        };
        events.push({
          id: id('ev'),
          name: 'CompleteRegistration',
          eventId: d.eventId,
          at,
          via: 'browser_server',
          status: tracking.sending ? 'sent' : 'skipped',
          subject: s.name,
          value: null,
          problem: tracking.sending ? null : 'off',
          test: tracking.testMode,
        });
        activity(s, 'signed_up', 'owner', at, { events: ['CompleteRegistration'] });
        shops.set(s.id, s);
        byEmail.set(claims.email, s.id);
        return onboardingOf(s);
      });
    },

    trackEvent: async (input) => {
      await init();
      return run('platform', () => {
        const parsed = TrackInputSchema.safeParse(input);
        if (!parsed.success) fail('invalid_input', 400);
        if (parsed.data.name === 'PageView') visits += 1;
        events.push({
          id: id('ev'),
          name: parsed.data.name,
          eventId: parsed.data.eventId,
          at: now().toISOString(),
          via: 'browser_server',
          status: tracking.sending ? 'sent' : 'skipped',
          subject: maskPhone(''),
          value: null,
          problem: tracking.sending ? null : 'off',
          test: tracking.testMode,
        });
        return { ok: true as const };
      });
    },

    getOnboarding: async () => {
      const s = await ownersShop();
      return run('platform', () => onboardingOf(s));
    },

    askToGoLive: async () => {
      const s = await ownersShop();
      return run('platform', () => {
        if (s.demo) s.steps = deps.shopFacts(s.slug).steps;
        if (!canAskToGoLive(s.stage, s.steps)) fail('setup_incomplete', 409);
        const at = now().toISOString();
        s.stage = 'asked';
        s.askedAt = at;
        activity(s, 'asked', 'owner', at, {
          events: [track('SubmitApplication', s.id, s.name, at, 'server')],
        });
        return onboardingOf(s);
      });
    },
  };

  // ---------- Super Admin ----------

  const platform: PlatformAdapter = {
    getAdminToday: async () => {
      await init();
      return run('platform', () => {
        const rows = [...shops.values()].map(rowOf);
        const since = now().getTime() - 30 * DAY;
        const recent = rows.filter(
          (r) => new Date(r.createdAt).getTime() >= since && !shops.get(r.id)?.demo,
        );
        const recentLeads = leads.filter((l) => new Date(l.createdAt).getTime() >= since);
        return AdminTodaySchema.parse({
          needs: needs(rows),
          liveShops: rows.filter((r) => r.stage === 'live').length,
          payingShops: rows.filter(isPaying).length,
          collectedThisMonth: monthTotal(),
          monthlyRunRate: rows.filter(isPaying).reduce((sum, r) => sum + r.priceMonthly, 0),
          funnel: {
            visits,
            leads: recentLeads.length + recent.length,
            signedUp: recent.length,
            live: recent.filter((r) => r.liveAt !== null).length,
            paying: recent.filter((r) =>
              shops.get(r.id)?.book.history.some((p) => p.status === 'approved'),
            ).length,
          },
        });
      });
    },

    listAdminShops: async (input) => {
      await init();
      return run('platform', () => {
        const filter = input.filter;
        const q = (input.q ?? '').trim().toLowerCase();
        const rows = [...shops.values()].map(rowOf);
        const counts = Object.fromEntries(
          (
            [
              'needs_you',
              'leads',
              'setting_up',
              'trial',
              'active',
              'due',
              'overdue',
              'paused',
              'closed',
              'all',
            ] as const
          ).map((f) => [
            f,
            f === 'leads' ? openLeads().length : rows.filter((r) => matches(r, f)).length,
          ]),
        );
        const digits = q.replace(/\D/g, '');
        const found = rows
          .filter((r) => matches(r, filter))
          .filter(
            (r) =>
              q === '' ||
              r.name.toLowerCase().includes(q) ||
              r.ownerName.toLowerCase().includes(q) ||
              r.ownerEmail.includes(q) ||
              r.city.toLowerCase().includes(q) ||
              (digits.length >= 4 && r.ownerPhone.replace(/^\+63/, '0').includes(digits)),
          )
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        return AdminShopListSchema.parse({ rows: found, counts });
      });
    },

    getAdminShop: async ({ shopId }) => {
      await init();
      return run('platform', () => detailOf(shopById(shopId)));
    },

    listLeads: async () => {
      await init();
      return run('platform', () =>
        openLeads()
          .map((l) => AdminLeadSchema.parse(l))
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      );
    },

    markLeadContacted: async ({ leadId }) => {
      await init();
      return run('platform', () => {
        const lead = leads.find((l) => l.id === leadId);
        if (!lead) fail('not_found', 404);
        lead.contactedAt = now().toISOString();
        return AdminLeadSchema.parse(lead);
      });
    },

    approveGoLive: async ({ shopId }) => {
      await init();
      return run('platform', () => {
        const s = shopById(shopId);
        if (s.stage !== 'asked' && s.stage !== 'setting_up') fail('invalid_transition', 409);
        const at = now().toISOString();
        s.stage = 'live';
        s.liveAt = at;
        s.askedAt ??= at;
        // The trial starts now, not at sign-up (T89).
        if (!s.book.paidUntil) s.book.trialEndsAt = trialEndsFrom(now(), setup.trialDays);
        s.book.thread.push(deps.billingLine('system', 'live', at));
        activity(s, 'approved', 'admin', at, {
          events: [track('StartTrial', s.id, s.name, at, 'server')],
        });
        return detailOf(s);
      });
    },

    reviewPlanPayment: async (input) => {
      await init();
      return run('platform', () => {
        const parsed = ReviewPlanPaymentInputSchema.safeParse(input);
        if (!parsed.success) fail('invalid_input', 400);
        const d = parsed.data;
        const s = shopById(d.shopId);
        const p = s.book.history.find((x) => x.id === d.paymentId);
        if (!p) fail('not_found', 404);
        if (p.status !== 'pending') fail('payment_not_pending', 409);
        const at = now().toISOString();
        const m = meta.get(p.id) ?? { reviewedAt: null, recorded: false, note: null };
        m.reviewedAt = at;
        meta.set(p.id, m);
        if (d.verdict === 'reject') {
          p.status = 'rejected';
          p.rejectReason = d.reason;
          s.book.thread.push(
            deps.billingLine('admin', 'rejected', at, { paymentId: p.id, reason: d.reason }),
          );
          activity(s, 'payment_rejected', 'admin', at, { amount: p.amount, reason: d.reason });
          return detailOf(s);
        }
        if (d.amount !== null && d.amount !== p.amount) {
          if (!d.amountReason) fail('invalid_input', 400, { amountReason: ['required'] });
          p.amount = d.amount;
          m.note = d.amountReason;
        }
        const first = !s.book.history.some((x) => x.status === 'approved');
        p.status = 'approved';
        p.coversUntil = planCoversUntil(s.book.paidUntil, p.months, now());
        s.book.paidUntil = p.coversUntil;
        s.book.trialEndsAt = null;
        s.book.thread.push(
          deps.billingLine('admin', 'approved', at, { paymentId: p.id, text: m.note }),
        );
        const sent: TrackEventName[] = [];
        if (first) sent.push(track('Subscribe', p.id, s.name, at, 'server', p.amount));
        sent.push(track('Purchase', p.id, s.name, at, 'server', p.amount));
        activity(s, 'payment_approved', 'admin', at, {
          amount: p.amount,
          note: m.note,
          events: sent,
        });
        return detailOf(s);
      });
    },

    recordPlanPayment: async (input) => {
      await init();
      return run('platform', () => {
        const parsed = RecordPlanPaymentInputSchema.safeParse(input);
        if (!parsed.success) fail('invalid_input', 400);
        const d = parsed.data;
        const s = shopById(d.shopId);
        const clean = (r: string) => r.replace(/[\s-]/g, '').toUpperCase();
        if (
          s.book.history.some(
            (p) => clean(p.reference) === clean(d.reference) && p.status !== 'rejected',
          )
        )
          fail('duplicate_reference', 409);
        const at = now().toISOString();
        const first = !s.book.history.some((x) => x.status === 'approved');
        const p: PlanPayment = {
          id: id('pay'),
          months: d.months,
          amount: d.amount,
          method: d.method,
          reference: d.reference,
          status: 'approved',
          submittedAt: at,
          coversUntil: planCoversUntil(s.book.paidUntil, d.months, now()),
          rejectReason: null,
          proofUrl: null,
        };
        s.book.history.push(p);
        meta.set(p.id, { reviewedAt: at, recorded: true, note: d.note });
        s.book.paidUntil = p.coversUntil;
        s.book.trialEndsAt = null;
        s.book.thread.push(
          deps.billingLine('admin', 'approved', at, { paymentId: p.id, text: d.note }),
        );
        // Money taken outside the app goes to Meta as "other", not as a website event (T90).
        const sent: TrackEventName[] = [];
        if (first) sent.push(track('Subscribe', p.id, s.name, at, 'server', p.amount));
        sent.push(track('Purchase', p.id, s.name, at, 'server', p.amount));
        activity(s, 'payment_recorded', 'admin', at, {
          amount: p.amount,
          note: d.note,
          events: sent,
        });
        return detailOf(s);
      });
    },

    extendPlan: async (input) => {
      await init();
      return run('platform', () => {
        const parsed = ExtendDaysInputSchema.safeParse(input);
        if (!parsed.success) fail('invalid_input', 400);
        const d = parsed.data;
        const s = shopById(d.shopId);
        if (s.stage !== 'live') fail('invalid_transition', 409);
        const next = extendPlan(s.book, d.days, now());
        s.book.trialEndsAt = next.trialEndsAt;
        s.book.paidUntil = next.paidUntil;
        const at = now().toISOString();
        s.book.thread.push(deps.billingLine('admin', 'extra_days', at, { days: d.days }));
        activity(s, 'extra_days', 'admin', at, { days: d.days, note: d.reason });
        return detailOf(s);
      });
    },

    sendPlanReminder: async ({ shopId }) => {
      await init();
      return run('platform', () => {
        const s = shopById(shopId);
        const at = now().toISOString();
        s.remindedAt = at;
        s.book.thread.push(deps.billingLine('admin', 'reminder', at));
        activity(s, 'reminder', 'admin', at);
        return detailOf(s);
      });
    },

    sendBillingNote: async ({ shopId, text }) => {
      await init();
      return run('platform', () => {
        const s = shopById(shopId);
        const clean = text.trim();
        if (clean.length === 0 || clean.length > 300)
          fail('invalid_input', 400, { text: ['invalid'] });
        s.book.thread.push(deps.billingLine('admin', 'note', now().toISOString(), { text: clean }));
        return detailOf(s);
      });
    },

    closeShop: async (input) => {
      await init();
      return run('platform', () => {
        const parsed = CloseShopInputSchema.safeParse(input);
        if (!parsed.success) fail('invalid_input', 400);
        const d = parsed.data;
        const s = shopById(d.shopId);
        if (s.stage === 'closed') fail('invalid_transition', 409);
        const at = now().toISOString();
        s.closeReason = d.reason;
        if (d.when === 'period_end' && s.book.paidUntil && s.book.paidUntil >= manilaDate(now())) {
          s.closesOn = s.book.paidUntil;
        } else {
          s.stage = 'closed';
          s.closedAt = at;
          s.closesOn = null;
        }
        activity(s, 'closed', 'admin', at, { reason: d.reason, note: d.note });
        return detailOf(s);
      });
    },

    reopenShop: async ({ shopId }) => {
      await init();
      return run('platform', () => {
        const s = shopById(shopId);
        const at = now().toISOString();
        s.stage = s.liveAt ? 'live' : 'setting_up';
        s.closedAt = null;
        s.closesOn = null;
        s.closeReason = null;
        activity(s, 'reopened', 'admin', at);
        return detailOf(s);
      });
    },

    deleteShop: async (input) => {
      await init();
      return run('platform', () => {
        const parsed = DeleteShopInputSchema.safeParse(input);
        if (!parsed.success) fail('invalid_input', 400);
        const s = shopById(parsed.data.shopId);
        if (s.stage !== 'closed' || s.demo) fail('invalid_transition', 409);
        if (parsed.data.confirmName.trim().toLowerCase() !== s.name.toLowerCase())
          fail('name_mismatch', 400, { confirmName: ['mismatch'] });
        shops.delete(s.id);
        return { ok: true as const };
      });
    },

    createClientShop: async (input) => {
      await init();
      return run('platform', () => {
        const parsed = CreateClientInputSchema.safeParse(input);
        if (!parsed.success) fail('invalid_input', 400);
        const d = parsed.data;
        if ([...shops.values()].some((s) => s.ownerEmail === d.email))
          fail('email_taken', 409, { email: ['taken'] });
        const at = now().toISOString();
        const s: PShop = {
          id: id('shop'),
          slug: slugOf(d.shopName),
          name: d.shopName,
          kind: d.kind,
          city: d.city,
          ownerName: d.fullName,
          ownerEmail: d.email,
          ownerPhone: d.phone,
          stage: 'setting_up',
          priceMonthly: setup.priceMonthly,
          createdAt: at,
          askedAt: null,
          liveAt: null,
          closedAt: null,
          closesOn: null,
          closeReason: null,
          source: { channel: 'direct', campaign: null },
          facebookPage: null,
          storageUsedBytes: 0,
          orders7d: 0,
          members: 0,
          lastActiveAt: null,
          steps: steps(0),
          activity: [],
          remindedAt: null,
          demo: false,
          book: { trialEndsAt: null, paidUntil: null, history: [], thread: [] },
        };
        activity(s, 'created_by_admin', 'admin', at);
        shops.set(s.id, s);
        return detailOf(s);
      });
    },

    startSupport: async (input) => {
      await init();
      return run('platform', () => {
        const parsed = StartSupportInputSchema.safeParse(input);
        if (!parsed.success) fail('invalid_input', 400);
        const s = shopById(parsed.data.shopId);
        // The mock can only open the 5 demo shops (the others have no menu or orders to show).
        if (!s.demo || s.stage === 'closed') fail('not_found', 404);
        const t = now();
        const session = SupportSessionSchema.parse({
          id: id('sup'),
          shopId: s.id,
          slug: s.slug,
          shopName: s.name,
          reason: parsed.data.reason,
          startedAt: t.toISOString(),
          endsAt: new Date(t.getTime() + SUPPORT_MINUTES * 60_000).toISOString(),
        });
        deps.support.set(session);
        s.book.thread.push(deps.billingLine('system', 'support', session.startedAt));
        activity(s, 'support', 'admin', session.startedAt, {
          minutes: SUPPORT_MINUTES,
          reason: parsed.data.reason,
        });
        return session;
      });
    },

    endSupport: async () => {
      await init();
      return run('platform', () => {
        deps.support.set(null);
        return { ok: true as const };
      });
    },

    listAdminPayments: async ({ view }) => {
      await init();
      return run('platform', () => {
        const all = adminPayments();
        const toCheck = all.filter((p) => p.status === 'pending');
        return AdminPaymentListSchema.parse({
          rows: view === 'to_check' ? toCheck.reverse() : all,
          toCheck: toCheck.length,
          monthTotal: monthTotal(),
        });
      });
    },

    getTracking: async () => {
      await init();
      return run('platform', () => trackingSummary());
    },

    setTracking: async (input) => {
      await init();
      return run('platform', () => {
        const parsed = SetTrackingInputSchema.safeParse(input);
        if (!parsed.success) fail('invalid_input', 400);
        tracking.sending = parsed.data.sending;
        tracking.testMode = parsed.data.testMode;
        return trackingSummary();
      });
    },

    retryTrackEvents: async () => {
      await init();
      return run('platform', () => {
        for (const e of events) {
          if (e.status !== 'failed') continue;
          e.status = 'sent';
          e.problem = null;
        }
        return trackingSummary();
      });
    },

    sendTestEvent: async () => {
      await init();
      return run('platform', () => {
        const at = now().toISOString();
        events.push({
          id: id('ev'),
          name: 'PageView',
          eventId: metaEventId('PageView', id('test')),
          at,
          via: 'server',
          status: 'sent',
          subject: maskPhone(''),
          value: null,
          problem: null,
          test: true,
        });
        return trackingSummary();
      });
    },

    getPlatformSetup: async () => {
      await init();
      return run('platform', () => PlatformSetupSchema.parse(setup));
    },

    savePlatformSetup: async (input) => {
      await init();
      return run('platform', () => {
        const parsed = PlatformSetupSchema.safeParse(input);
        if (!parsed.success) fail('invalid_input', 400);
        // New shops sign up at the new price; shops already signed up keep theirs (T92).
        Object.assign(setup, parsed.data);
        return PlatformSetupSchema.parse(setup);
      });
    },
  };

  return { onboarding, platform };
}

export type PlatformMock = ReturnType<typeof createPlatformMock>;
