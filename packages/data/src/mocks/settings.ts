// The mock back end for owner Settings (decisions T64 to T68): same names, inputs, outputs and error codes as
// docs/api.md "Settings (owner)". Shop facts live in the shop's storefront (so the storefront shows them at
// once); the owner's profile, emails, plan, stored files and exports live here, per shop.
import {
  BookingRulesSchema,
  CleanupPreviewSchema,
  CreateExportInputSchema,
  DataExportSchema,
  DeliverySettingsSchema,
  HoursSettingsSchema,
  NotificationPrefsSchema,
  OrderingSettingsSchema,
  OwnerProfileSchema,
  OwnerSettingsSchema,
  PaymentSettingsSchema,
  PlanSchema,
  PRO_PRICE_MONTHLY,
  PRO_STORAGE_BYTES,
  PROOF_KEEP_DAYS,
  SaveProfileInputSchema,
  SendCodeResultSchema,
  ShopFactsSchema,
  StorageSummarySchema,
  SubmitPlanPaymentInputSchema,
  STORAGE_KINDS,
  TRANSFER_METHODS,
  addDays,
  distanceRowProblems,
  formatManila,
  hoursProblems,
  isFinal,
  manilaDate,
  normalisePhPhone,
  planCoversUntil,
  planGraceUntil,
  planStatus,
  startingAvatar,
  words,
  type CleanupKind,
  type DataExport,
  type ErrorCode,
  type ExportRange,
  type NotificationPrefs,
  type OwnerProfile,
  type OwnerSettings,
  type PlanPayment,
  type StorageKind,
  type StorageSummary,
  type UploadKind,
} from '@smartapp/core';
import type { OwnerSettingsAdapter } from '../adapters/types';
import type { MockScenario } from './scenario-state';
import { mulberry32, token as makeToken, type Rng } from './rng';
import { addMinutes, type ShopState } from './state';
import { csv, makeZip } from './zip';

const KB = 1024;
const DAY = 86_400_000;
const RESEND_SECONDS = 60;
const PASSWORD_CODE = '123456';
// The founder checks plan payments by hand; the demo approves one after this long so the flow moves on.
const PLAN_APPROVE_MS = 15_000;
// The mock's export is ready after this long.
const EXPORT_MS = 2_500;

export interface SettingsMockDeps {
  run: <T>(area: 'settings', fn: () => T) => Promise<T>;
  requireShop: (slug: string) => ShopState;
  ownerShop: () => Promise<string>;
  ownerClaims: () => Promise<{ email: string; fullName?: string | undefined } | null>;
  now: () => Date;
  scenario: () => MockScenario;
  fail: (code: ErrorCode, status?: number, fieldErrors?: Record<string, string[]>) => never;
  seed: number;
  production: boolean;
}

interface StoredFile {
  id: string;
  kind: StorageKind;
  bytes: number;
  at: string;
  // Proofs: the order is finished (completed or cancelled), so a cleanup may delete it.
  finished: boolean;
  // Menu photos on archived items.
  archived: boolean;
  exportIds: string[];
}

interface OwnerState {
  slug: string;
  profile: OwnerProfile;
  prefs: NotificationPrefs;
  trialEndsAt: string | null;
  paidUntil: string | null;
  history: PlanPayment[];
  files: StoredFile[];
  unused: { files: number; bytes: number };
  exports: DataExport[];
  codeSentAt: string | null;
  // Bytes made on the phone for an export, kept so Download works until reload.
  exportBlobs: Map<string, string>;
}

// Each demo shop tells a different storage story (docs/demo-shops.md): how many files of each kind it keeps
// and their average size. Sizes vary per file from the seed; the totals land near 61, 128, 212, 431 and 486 MB.
interface Story {
  files: Record<StorageKind, number>;
  avgKb: Record<StorageKind, number>;
  archived: number;
  unused: number;
  // Days until the plan is due; null for a shop still on its free trial.
  paidDays: number | null;
  months: number;
}

const STORIES: Record<string, Story> = {
  aqualinis: {
    files: { menu: 70, proofs: 320, look: 10, qr: 2, profile: 0 },
    avgKb: { menu: 190, proofs: 140, look: 300, qr: 90, profile: 20 },
    archived: 0,
    unused: 3,
    paidDays: null,
    months: 0,
  },
  'kape-juan': {
    files: { menu: 180, proofs: 600, look: 18, qr: 3, profile: 0 },
    avgKb: { menu: 200, proofs: 145, look: 330, qr: 90, profile: 20 },
    archived: 14,
    unused: 5,
    paidDays: 18,
    months: 4,
  },
  'kanto-smash': {
    files: { menu: 300, proofs: 930, look: 36, qr: 4, profile: 0 },
    avgKb: { menu: 215, proofs: 148, look: 340, qr: 250, profile: 20 },
    archived: 30,
    unused: 10,
    paidDays: 30,
    months: 3,
  },
  'tala-apparel': {
    files: { menu: 1500, proofs: 560, look: 30, qr: 2, profile: 0 },
    avgKb: { menu: 230, proofs: 150, look: 330, qr: 90, profile: 20 },
    archived: 380,
    unused: 15,
    paidDays: 25,
    months: 6,
  },
  'lola-remy': {
    files: { menu: 420, proofs: 2600, look: 50, qr: 3, profile: 0 },
    avgKb: { menu: 200, proofs: 150, look: 330, qr: 100, profile: 20 },
    archived: 60,
    unused: 40,
    paidDays: 3,
    months: 5,
  },
};

const DEFAULT_STORY: Story = {
  files: { menu: 40, proofs: 120, look: 6, qr: 1, profile: 0 },
  avgKb: { menu: 190, proofs: 140, look: 300, qr: 90, profile: 20 },
  archived: 0,
  unused: 2,
  paidDays: 30,
  months: 1,
};

// Smart App PH's own pay-to numbers in the demo; sample numbers until the founder sets real ones.
const PAY_TO = { accountName: 'Smart App PH', gcash: '0917 000 0399', maya: '0917 000 0399' };

function hashOf(text: string): number {
  let hash = 0;
  for (const char of text) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash;
}

function uploadStorageKind(kind: UploadKind): StorageKind | null {
  switch (kind) {
    case 'item':
      return 'menu';
    case 'logo':
    case 'banner':
    case 'category':
      return 'look';
    case 'qr':
      return 'qr';
    case 'avatar':
      return 'profile';
    case 'plan_proof':
      return null;
  }
}

function monthStart(date: string): string {
  return `${date.slice(0, 7)}-01`;
}

function inRange(range: ExportRange, at: string, now: Date): boolean {
  const day = manilaDate(at);
  const today = manilaDate(now);
  if (range === 'everything') return true;
  const thisMonth = monthStart(today);
  if (range === 'this_month') return day >= thisMonth;
  const lastMonth = monthStart(addDays(thisMonth, -1));
  return day >= lastMonth && day < thisMonth;
}

export function createSettingsMock(deps: SettingsMockDeps) {
  const { run, requireShop, ownerShop, now, scenario } = deps;
  // Typed here so a failed check narrows like a throw.
  const fail: SettingsMockDeps['fail'] = deps.fail;
  let owners = new Map<string, OwnerState>();
  let seq = 0;
  const id = (prefix: string) => {
    seq += 1;
    return `${prefix}_${seq.toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
  };

  function seedFiles(slug: string, story: Story, rng: Rng): StoredFile[] {
    const t = now().getTime();
    const files: StoredFile[] = [];
    for (const kind of STORAGE_KINDS) {
      for (let i = 0; i < story.files[kind]; i++) {
        // ±25 % around the average, so no two shops look typed in.
        const bytes = Math.round(story.avgKb[kind] * KB * (0.75 + rng() * 0.5));
        // Proofs arrive over the last 30 days; the newest few are on open orders.
        const ageDays = kind === 'proofs' ? rng() * (PROOF_KEEP_DAYS - 0.5) : 30 + rng() * 300;
        files.push({
          id: `${slug}-${kind}-${i}`,
          kind,
          bytes,
          at: new Date(t - ageDays * DAY).toISOString(),
          finished: kind === 'proofs' ? ageDays > 0.6 : false,
          archived: kind === 'menu' && i < story.archived,
          exportIds: [],
        });
      }
    }
    return files;
  }

  async function owner(slug: string): Promise<OwnerState> {
    const existing = owners.get(slug);
    if (existing) return existing;
    const s = requireShop(slug);
    const story = STORIES[slug] ?? DEFAULT_STORY;
    const rng = mulberry32(deps.seed + hashOf(slug));
    const claims = await deps.ownerClaims().catch(() => null);
    const name = claims?.fullName?.trim() || words.shell.myShop;
    const email = claims?.email ?? `owner@${slug}.example.com`;
    const today = manilaDate(now());
    const paidUntil = story.paidDays === null ? null : addDays(today, story.paidDays);
    const history: PlanPayment[] = [];
    for (let m = 0; m < story.months; m++) {
      const covers = paidUntil ? addDays(paidUntil, -30 * m) : today;
      history.push({
        id: `${slug}-plan-${m}`,
        months: 1,
        amount: PRO_PRICE_MONTHLY,
        method: m % 3 === 2 ? 'maya' : 'gcash',
        reference: String(1_000_000_000_000 + Math.floor(rng() * 8_999_999_999_999)),
        status: 'approved',
        submittedAt: new Date(
          now().getTime() - (30 * m + 31 - (story.paidDays ?? 0)) * DAY,
        ).toISOString(),
        coversUntil: covers,
      });
    }
    const state: OwnerState = {
      slug,
      profile: OwnerProfileSchema.parse({ name, email, avatar: startingAvatar(name) }),
      prefs: { newOrder: true, paymentToCheck: true, storage: true, planPayment: true, email },
      trialEndsAt:
        story.paidDays === null ? new Date(now().getTime() + 9 * DAY).toISOString() : null,
      paidUntil,
      history,
      files: seedFiles(s.shop.storefront.slug, story, rng),
      unused: {
        files: story.unused,
        bytes: Math.round(story.unused * 150 * KB * (0.8 + rng() * 0.4)),
      },
      exports: [],
      codeSentAt: null,
      exportBlobs: new Map(),
    };
    owners.set(slug, state);
    return state;
  }

  // ---------- settings read and saves ----------

  function bookedCounts(s: ShopState) {
    const t = now().getTime();
    const booked = (type: 'pickup' | 'delivery') =>
      s.orders.filter(
        (o) =>
          o.receipt.type === type &&
          o.receipt.scheduledAt !== null &&
          new Date(o.receipt.scheduledAt).getTime() > t &&
          !isFinal(o.receipt.status),
      ).length;
    return { pickup: booked('pickup'), delivery: booked('delivery') };
  }

  function settingsOf(s: ShopState): OwnerSettings {
    const sf = s.shop.storefront;
    return OwnerSettingsSchema.parse({
      slug: sf.slug,
      kind: sf.info.kind,
      isDemo: sf.info.isDemo,
      shop: { name: sf.info.name, contact: sf.info.contact },
      hours: { hours: sf.hours, closures: sf.closures },
      ordering: {
        orderTypes: sf.orderTypes,
        rules: BookingRulesSchema.parse({
          daysAhead: sf.daysAhead,
          slotMinutes: sf.slotMinutes,
          ordersPerSlot: sf.ordersPerSlot,
          prepMinutes: sf.prepMinutes,
          takeOrdersWhileClosed: sf.takeOrdersWhileClosed,
        }),
      },
      delivery: sf.delivery,
      payments: { payments: sf.payments, codMaxTotal: sf.codMaxTotal },
      booked: bookedCounts(s),
    });
  }

  async function shopNow(): Promise<ShopState> {
    return requireShop(await ownerShop());
  }

  // ---------- storage ----------

  function proofFiles(o: OwnerState) {
    return o.files.filter((f) => f.kind === 'proofs');
  }

  function oldProofs(o: OwnerState) {
    const cutoff = now().getTime() - 7 * DAY;
    return proofFiles(o).filter((f) => f.finished && new Date(f.at).getTime() < cutoff);
  }

  function lastReadyExport(o: OwnerState): DataExport | null {
    const latest = o.exports[o.exports.length - 1];
    return latest && latest.status === 'ready' ? latest : null;
  }

  function exportedProofs(o: OwnerState) {
    const latest = lastReadyExport(o);
    if (!latest || !latest.parts.proofs) return [];
    return proofFiles(o).filter((f) => f.finished && f.exportIds.includes(latest.id));
  }

  function cleanupFiles(o: OwnerState, kind: CleanupKind): StoredFile[] {
    if (kind === 'old_proofs') return oldProofs(o);
    if (kind === 'archived_photos') return o.files.filter((f) => f.kind === 'menu' && f.archived);
    return exportedProofs(o);
  }

  const sum = (files: readonly StoredFile[]) => files.reduce((total, f) => total + f.bytes, 0);

  function refreshExports(o: OwnerState): void {
    const t = now().getTime();
    for (const e of o.exports) {
      if (e.status === 'preparing' && new Date(e.createdAt).getTime() + EXPORT_MS <= t)
        finish(o, e);
      if (e.status === 'ready' && e.expiresAt && new Date(e.expiresAt).getTime() <= t) {
        e.status = 'expired';
        e.url = null;
      }
    }
  }

  function summaryOf(o: OwnerState): StorageSummary {
    refreshExports(o);
    const kinds = STORAGE_KINDS.map((kind) => {
      const files = o.files.filter((f) => f.kind === kind);
      return { kind, bytes: sum(files), files: files.length };
    });
    let used = kinds.reduce((total, k) => total + k.bytes, 0) + o.unused.bytes;
    // Dev scenario: a shop over its limit (proofs still came in).
    if (scenario().storage === 'full' && used < PRO_STORAGE_BYTES + 12 * KB * KB) {
      const extra = PRO_STORAGE_BYTES + 12 * KB * KB - used;
      const proofs = kinds.find((k) => k.kind === 'proofs');
      if (proofs) proofs.bytes += extra;
      used += extra;
    }
    const cleanups = (['old_proofs', 'archived_photos'] as const).map((kind) => {
      const files = cleanupFiles(o, kind);
      return { kind, files: files.length, bytes: sum(files) };
    });
    return StorageSummarySchema.parse({
      usedBytes: used,
      limitBytes: PRO_STORAGE_BYTES,
      kinds,
      cleanups,
      unusedUploads: o.unused,
      proofDays: PROOF_KEEP_DAYS,
      lastExport: o.exports[o.exports.length - 1] ?? null,
    });
  }

  function cleanupToken(files: readonly StoredFile[]): string {
    return `${files.length}-${sum(files)}-${hashOf(files.map((f) => f.id).join(','))}`;
  }

  // ---------- exports ----------

  function finish(o: OwnerState, e: DataExport): void {
    if (scenario().exportFails) {
      e.status = 'failed';
      return;
    }
    const s = requireShop(o.slug);
    const t = now();
    const orders = s.orders.filter((x) => inRange(e.range, x.receipt.placedAt, t));
    const archived = (s.archive ?? []).filter((x) => inRange(e.range, x.placedAt, t));
    const entries = [];
    const peso = (centavos: number) => (centavos / 100).toFixed(2);
    if (e.parts.orders) {
      entries.push({
        name: 'orders.csv',
        text: csv([
          ['Order', 'Placed (Manila)', 'Type', 'Status', 'Customer', 'Items', 'Total (PHP)'],
          ...orders.map((x) => [
            x.receipt.orderNo,
            formatManila(x.receipt.placedAt, 'datetime'),
            words.shop.orderType[x.receipt.type],
            words.shop.orderStatus[x.receipt.status],
            x.receipt.customerName,
            x.receipt.lines.map((l) => `${l.qty} × ${l.name}`).join('; '),
            peso(x.receipt.totals.total),
          ]),
          ...archived.map((x) => [
            x.orderNo,
            formatManila(x.placedAt, 'datetime'),
            '',
            words.shop.orderStatus[x.status],
            x.customerName,
            x.lines.map((l) => `${l.qty} × ${l.name}`).join('; '),
            peso(x.total),
          ]),
        ]),
      });
    }
    if (e.parts.payments) {
      entries.push({
        name: 'payments.csv',
        text: csv([
          ['Order', 'Method', 'Status', 'Reference', 'Sent (Manila)', 'Amount (PHP)'],
          ...orders.flatMap((x) =>
            x.proofs.map((p) => [
              x.receipt.orderNo,
              words.shop.paymentMethod[x.receipt.paymentMethod],
              p.status,
              p.referenceNo,
              formatManila(p.uploadedAt, 'datetime'),
              peso(x.receipt.totals.total),
            ]),
          ),
        ]),
      });
    }
    const proofs = e.parts.proofs ? proofFiles(o).filter((f) => inRange(e.range, f.at, t)) : [];
    if (e.parts.proofs) {
      for (const f of proofs) f.exportIds.push(e.id);
      // The demo has no real screenshots, so the ZIP lists them; the real export holds the photos.
      entries.push({
        name: 'proofs/list.csv',
        text: csv([
          ['File', 'Sent (Manila)', 'Size (KB)'],
          ...proofs.map((f) => [
            `${f.id}.webp`,
            formatManila(f.at, 'datetime'),
            Math.round(f.bytes / KB),
          ]),
        ]),
      });
    }
    const zip = makeZip(entries, t);
    let url: string | null = null;
    if (
      typeof URL !== 'undefined' &&
      typeof URL.createObjectURL === 'function' &&
      typeof Blob !== 'undefined'
    ) {
      url = URL.createObjectURL(new Blob([zip], { type: 'application/zip' }));
      o.exportBlobs.set(e.id, url);
    }
    e.status = 'ready';
    e.orderRows = orders.length + archived.length;
    e.proofFiles = proofs.length;
    e.bytes = zip.length + sum(proofs);
    e.readyAt = t.toISOString();
    e.expiresAt = new Date(t.getTime() + DAY).toISOString();
    e.url = url;
  }

  async function current(): Promise<{ s: ShopState; o: OwnerState }> {
    const slug = await ownerShop();
    const s = requireShop(slug);
    return { s, o: await owner(slug) };
  }

  // ---------- plan ----------

  function planOf(o: OwnerState) {
    const t = now();
    const today = manilaDate(t);
    // A payment the founder hasn't checked: the demo approves it after a short wait.
    for (const p of o.history) {
      if (
        p.status === 'pending' &&
        new Date(p.submittedAt).getTime() + PLAN_APPROVE_MS <= t.getTime()
      ) {
        p.status = 'approved';
        o.paidUntil = p.coversUntil;
        o.trialEndsAt = null;
      }
    }
    let trialEndsAt = o.trialEndsAt;
    let paidUntil = o.paidUntil;
    switch (scenario().plan) {
      case 'trial':
        trialEndsAt = new Date(t.getTime() + 10 * DAY).toISOString();
        paidUntil = null;
        break;
      case 'due':
        trialEndsAt = null;
        paidUntil = addDays(today, 3);
        break;
      case 'overdue':
        trialEndsAt = null;
        paidUntil = addDays(today, -2);
        break;
      case 'paused':
        trialEndsAt = null;
        paidUntil = addDays(today, -10);
        break;
      case 'default':
        break;
    }
    const pending = o.history.find((p) => p.status === 'pending') ?? null;
    const end = paidUntil ?? (trialEndsAt ? manilaDate(trialEndsAt) : null);
    return PlanSchema.parse({
      name: 'pro',
      priceMonthly: PRO_PRICE_MONTHLY,
      storageLimitBytes: PRO_STORAGE_BYTES,
      status: planStatus({ trialEndsAt, paidUntil }, t),
      trialEndsAt,
      paidUntil,
      graceUntil: planGraceUntil(end),
      payTo: PAY_TO,
      pending,
      history: [...o.history].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)),
    });
  }

  const adapter: OwnerSettingsAdapter = {
    getSettings: async () => {
      const s = await shopNow();
      return run('settings', () => settingsOf(s));
    },

    saveShopFacts: async (input) => {
      const s = await shopNow();
      return run('settings', () => {
        const parsed = ShopFactsSchema.safeParse(input);
        if (!parsed.success) fail('invalid_input', 400);
        const phone = parsed.data.contact.phone;
        if (phone && !normalisePhPhone(phone).ok)
          fail('invalid_input', 400, { phone: ['invalid'] });
        const info = s.shop.storefront.info;
        info.name = parsed.data.name;
        info.contact = parsed.data.contact;
        return settingsOf(s);
      });
    },

    saveHours: async (input) => {
      const s = await shopNow();
      return run('settings', () => {
        const parsed = HoursSettingsSchema.safeParse(input);
        if (!parsed.success) fail('invalid_input', 400);
        const problems = hoursProblems(parsed.data.hours);
        if (problems.size > 0)
          fail(
            'hours_overlap',
            400,
            Object.fromEntries([...problems].map(([i, p]) => [`hours.${i}`, [p]])),
          );
        const dates = new Set<string>();
        const closures = parsed.data.closures
          .filter((c) => (dates.has(c.date) ? false : (dates.add(c.date), true)))
          .sort((a, b) => a.date.localeCompare(b.date));
        s.shop.storefront.hours = parsed.data.hours;
        s.shop.storefront.closures = closures;
        return settingsOf(s);
      });
    },

    saveOrdering: async (input) => {
      const s = await shopNow();
      return run('settings', () => {
        if (input.orderTypes.length === 0) fail('last_order_type', 400);
        const parsed = OrderingSettingsSchema.safeParse(input);
        if (!parsed.success) fail('invalid_input', 400);
        const sf = s.shop.storefront;
        sf.orderTypes = [...new Set(parsed.data.orderTypes)];
        sf.daysAhead = parsed.data.rules.daysAhead;
        sf.slotMinutes = parsed.data.rules.slotMinutes;
        sf.ordersPerSlot = parsed.data.rules.ordersPerSlot;
        sf.prepMinutes = parsed.data.rules.prepMinutes;
        sf.takeOrdersWhileClosed = parsed.data.rules.takeOrdersWhileClosed;
        return settingsOf(s);
      });
    },

    saveDelivery: async (input) => {
      const s = await shopNow();
      return run('settings', () => {
        const parsed = DeliverySettingsSchema.safeParse(input);
        if (!parsed.success) fail('invalid_input', 400);
        const problems = distanceRowProblems(parsed.data.distance);
        if (problems.size > 0)
          fail(
            'invalid_input',
            400,
            Object.fromEntries([...problems].map(([i, p]) => [`distance.${i}`, [p]])),
          );
        s.shop.storefront.delivery = parsed.data;
        return settingsOf(s);
      });
    },

    savePayments: async (input) => {
      const s = await shopNow();
      return run('settings', () => {
        if (input.payments.length === 0) fail('last_payment_method', 400);
        const parsed = PaymentSettingsSchema.safeParse(input);
        if (!parsed.success) fail('invalid_input', 400);
        const missing = parsed.data.payments.filter(
          (p) =>
            TRANSFER_METHODS.some((m) => m === p.method) &&
            p.method !== 'qr_ph' &&
            (!p.accountName || !p.accountNumber),
        );
        if (missing.length > 0)
          fail(
            'invalid_input',
            400,
            Object.fromEntries(missing.map((p) => [p.method, ['missing']])),
          );
        s.shop.storefront.payments = parsed.data.payments;
        s.shop.storefront.codMaxTotal = parsed.data.codMaxTotal;
        return settingsOf(s);
      });
    },

    getProfile: async () => {
      const { o } = await current();
      return run('settings', () => o.profile);
    },

    saveProfile: async (input) => {
      const { o } = await current();
      return run('settings', () => {
        const parsed = SaveProfileInputSchema.safeParse(input);
        if (!parsed.success) fail('invalid_input', 400);
        o.profile = { ...o.profile, ...parsed.data };
        // A photo is a stored file; a face or initials uses none (T68).
        o.files = o.files.filter((f) => f.kind !== 'profile');
        if (parsed.data.avatar.kind === 'photo')
          o.files.push({
            id: `${o.slug}-profile-${id('p')}`,
            kind: 'profile',
            bytes: parsed.data.avatar.bytes,
            at: now().toISOString(),
            finished: false,
            archived: false,
            exportIds: [],
          });
        return o.profile;
      });
    },

    sendPasswordCode: async () => {
      const { o } = await current();
      return run('settings', () => {
        const t = now();
        if (o.codeSentAt && t.getTime() - new Date(o.codeSentAt).getTime() < RESEND_SECONDS * 1000)
          fail('rate_limited', 429);
        o.codeSentAt = t.toISOString();
        return SendCodeResultSchema.parse({
          sentAt: o.codeSentAt,
          resendAt: addMinutes(o.codeSentAt, RESEND_SECONDS / 60),
          devCode: deps.production ? null : PASSWORD_CODE,
        });
      });
    },

    resetPasswordWithCode: async ({ code, newPassword }) => {
      const { o } = await current();
      return run('settings', () => {
        if (!o.codeSentAt) fail('invalid_code', 400);
        if (now().getTime() - new Date(o.codeSentAt).getTime() > 10 * 60_000)
          fail('code_expired', 400);
        if (code.replace(/\s/g, '') !== PASSWORD_CODE) fail('invalid_code', 400);
        if (newPassword.length < 8) fail('weak_password', 400);
        o.codeSentAt = null;
        return { ok: true as const };
      });
    },

    signOutEverywhere: async () => {
      await current();
      return run('settings', () => ({ ok: true as const }));
    },

    requestAccountDelete: async () => {
      await current();
      return run('settings', () => ({ ok: true as const }));
    },

    getNotificationPrefs: async () => {
      const { o } = await current();
      return run('settings', () => o.prefs);
    },

    saveNotificationPrefs: async (input) => {
      const { o } = await current();
      return run('settings', () => {
        const parsed = NotificationPrefsSchema.safeParse(input);
        if (!parsed.success) fail('invalid_input', 400, { email: ['invalid'] });
        o.prefs = parsed.data;
        return o.prefs;
      });
    },

    getPlan: async () => {
      const { o } = await current();
      return run('settings', () => planOf(o));
    },

    submitPlanPayment: async (input) => {
      const { o } = await current();
      return run('settings', () => {
        const parsed = SubmitPlanPaymentInputSchema.safeParse(input);
        if (!parsed.success) fail('invalid_input', 400, { reference: ['invalid'] });
        const ref = parsed.data.reference.replace(/[\s-]/g, '');
        if (
          o.history.some(
            (p) => p.reference.replace(/[\s-]/g, '') === ref && p.status !== 'rejected',
          )
        )
          fail('duplicate_reference', 409);
        if (o.history.some((p) => p.status === 'pending')) fail('payment_not_pending', 409);
        o.history.push({
          id: id('plan'),
          months: parsed.data.months,
          amount: PRO_PRICE_MONTHLY * parsed.data.months,
          method: parsed.data.method,
          reference: parsed.data.reference,
          status: 'pending',
          submittedAt: now().toISOString(),
          coversUntil: planCoversUntil(o.paidUntil, parsed.data.months, now()),
        });
        return planOf(o);
      });
    },

    getStorage: async () => {
      const { o } = await current();
      return run('settings', () => summaryOf(o));
    },

    previewCleanup: async ({ kind }) => {
      const { o } = await current();
      return run('settings', () => {
        refreshExports(o);
        const files = cleanupFiles(o, kind);
        const latest = lastReadyExport(o);
        const savedCopy =
          files.length > 0 &&
          files.every(
            (f) => f.kind !== 'proofs' || (latest !== null && f.exportIds.includes(latest.id)),
          );
        return CleanupPreviewSchema.parse({
          kind,
          files: files.length,
          bytes: sum(files),
          savedCopy: kind === 'archived_photos' ? true : savedCopy,
          token: cleanupToken(files),
        });
      });
    },

    runCleanup: async ({ kind, token }) => {
      const { o } = await current();
      return run('settings', () => {
        const files = cleanupFiles(o, kind);
        if (cleanupToken(files) !== token) fail('cleanup_changed', 409);
        const gone = new Set(files.map((f) => f.id));
        o.files = o.files.filter((f) => !gone.has(f.id));
        return summaryOf(o);
      });
    },

    createExport: async (input) => {
      const { o } = await current();
      return run('settings', () => {
        const parsed = CreateExportInputSchema.safeParse(input);
        if (!parsed.success) fail('invalid_input', 400);
        const t = now();
        const stamp = manilaDate(t);
        const e = DataExportSchema.parse({
          id: id('export'),
          range: parsed.data.range,
          parts: parsed.data.parts,
          status: 'preparing',
          fileName: `${o.slug}-${parsed.data.range === 'everything' ? 'all' : stamp.slice(0, 7)}-${makeToken(mulberry32(t.getTime())).slice(0, 4).toLowerCase()}.zip`,
          bytes: null,
          orderRows: 0,
          proofFiles: 0,
          createdAt: t.toISOString(),
          readyAt: null,
          expiresAt: null,
          url: null,
        });
        o.exports.push(e);
        return e;
      });
    },

    getExport: async ({ id: exportId }) => {
      const { o } = await current();
      return run('settings', () => {
        refreshExports(o);
        const e = o.exports.find((x) => x.id === exportId);
        if (!e) fail('not_found', 404);
        return e;
      });
    },
  };

  return {
    adapter,
    /**
     * Checks room for an upload (T66) and records the file. Proofs and plan receipts never count against
     * the limit; anything else waits when storage is full.
     */
    async reserveUpload(kind: UploadKind, bytes: number | undefined): Promise<void> {
      const target = uploadStorageKind(kind);
      if (!target) return;
      const { o } = await current();
      const summary = summaryOf(o);
      const size = Math.max(0, bytes ?? 150 * KB);
      if (summary.usedBytes + size > summary.limitBytes) fail('storage_full', 409);
      o.files.push({
        id: `${o.slug}-${target}-${id('u')}`,
        kind: target,
        bytes: size,
        at: now().toISOString(),
        finished: false,
        archived: false,
        exportIds: [],
      });
    },
    /** A customer's proof always goes through (T66), even when the shop is full. */
    async recordProof(slug: string, bytes: number): Promise<void> {
      const o = await owner(slug);
      o.files.push({
        id: `${slug}-proofs-${id('c')}`,
        kind: 'proofs',
        bytes,
        at: now().toISOString(),
        finished: false,
        archived: false,
        exportIds: [],
      });
    },
    reset(): void {
      for (const o of owners.values())
        for (const url of o.exportBlobs.values()) URL.revokeObjectURL(url);
      owners = new Map();
    },
  };
}
