// The mock back end. Same names, inputs, outputs, error codes and rules as the API will have (docs/api.md), so
// switching an area to the API later changes no screen. Customer-created data persists on the phone (N29).
import { z } from 'zod';
import {
  canAdvance,
  canCancel,
  parseFindInput,
  canRecall,
  canReschedule,
  CustomerAddressSchema,
  CustomerSessionSchema,
  dayLoads,
  dueTimes,
  earnsStamp,
  errorWords,
  formatClock,
  formatManila,
  formatPeso,
  intervalsForDate,
  isFinal,
  isTransfer,
  LatLngSchema,
  LedgerEntrySchema,
  ClaimCancelReasonEnum,
  AdjustStampsInputSchema,
  canUndo,
  changesLeftToday,
  CounterChangeSchema,
  FoundMemberSchema,
  ListCustomersInputSchema,
  memberCodeMatches,
  normaliseMemberCode,
  recentCounterStamp,
  StampCardImpactSchema,
  StampCardSettingsSchema,
  StampCardStatusEnum,
  stampImpact,
  UNDO_SECONDS,
  manilaDate,
  MemberAccountSchema,
  nextOpening,
  normalisePhPhone,
  openState,
  OrderPayloadSchema,
  OrderRatingSchema,
  OrderReceiptSchema,
  OrderRowSchema,
  OwnerOrderSchema,
  BoardOrderSchema,
  BookingRulesSchema,
  OpenStateSchema,
  scheduleDays,
  parseMapsLink,
  PaymentSchema,
  periodStart,
  ProofSchema,
  PublicShopSchema,
  QuoteSchema,
  RewardClaimSchema,
  SendCodeResultSchema,
  SHOP_PACKS,
  TEST_SHOP_PACKS,
  words,
  membersWords,
  memberQrUrl,
  applyTemplateToItem,
  buildVersions,
  defaultVariantTemplates,
  isInSync,
  unlinkChoice,
  VARIANT_LIMITS,
  CategoryDraftSchema,
  CategorySchema,
  ItemDraftSchema,
  OptionGroupDraftSchema,
  OwnerItemSchema,
  OwnerOptionGroupSchema,
  OwnerVariantTemplateSchema,
  RemoveVariantTemplateResultSchema,
  SaveVariantTemplateInputSchema,
  SaveVariantTemplateResultSchema,
  SortOrderInputSchema,
  UploadKindEnum,
  UploadResultSchema,
  type ErrorCode,
  type MemberAccount,
  type OrderPayload,
  type OrderStatus,
  type OwnerVariantTemplate,
  type PublicShop,
  type QuoteProblem,
  type SaveVariantTemplateResult,
  type ShopPack,
  type VariantTemplate,
} from '@smartapp/core';
import { ApiRequestError } from '../api-client';
import { getAuthClient, getClaims } from '../auth';
import type { DataAdapters } from '../adapters/types';
import {
  DEMO_CUSTOMER,
  demoAddresses,
  generateOrders,
  isDemoReceiptToken,
  orderableLines,
} from './activity';
import { generateCommunity } from './members';
import {
  claimIdOf,
  counterEntries,
  customerRow,
  entryIdOf,
  listPage,
  memberDetail,
  ownerClaim,
  overview,
  peopleOf,
  type Person,
} from './members-view';
import { methodsFor, quote } from './quote';
import { mulberry32, token as makeToken, type Rng } from './rng';
import { createHomeMock } from './home';
import { createSettingsMock } from './settings';
import { registerTrickleHandler } from './scenario';
import { getMockScenario, type DemoCustomerState, type MockScenario } from './scenario-state';
import {
  addMinutes,
  buildOrder,
  memberBalance,
  memberId,
  nextOrderNo,
  receiptLines,
  type MemberRecord,
  type MockState,
  type OrderRecord,
  type ShopState,
  type StoredClaim,
  type StoredLedgerEntry,
} from './state';

// Bundlers replace process.env.NODE_ENV at build time (Next and Vite), so dev-only code drops out of production.
declare const process: { env: { NODE_ENV?: string | undefined } };

export const MOCK_CODE = '123456';
const RESEND_SECONDS = 60;
const SENDS_PER_HOUR = 5;
const CODE_MINUTES = 10;
const PAY_MINUTES = 30;
const MAX_PROOFS = 3;
const UNPAID_LIMIT = 3;

export interface MockPersistence {
  load(): unknown;
  save(data: unknown): void;
}

export interface MockStoreOptions {
  seed?: number;
  // Fixed time for tests; otherwise the clock (or the ?now= scenario).
  now?: string | Date | (() => Date);
  // Overrides the scenario's latency (tests use 'none').
  latency?: MockScenario['latency'];
  persistence?: MockPersistence | null;
  // Reads the dev scenario switch; tests pass their own.
  scenario?: () => MockScenario;
  production?: boolean;
}

function fail(code: ErrorCode, status = 400, fieldErrors?: Record<string, string[]>): never {
  throw new ApiRequestError({
    status,
    code,
    message: errorWords(code),
    ...(fieldErrors ? { fieldErrors } : {}),
  });
}

const clone = <T>(value: T): T => structuredClone(value);

// Phones saved before decision T57 used "redeemed" for a used reward and "reversed" for stamps given back.
const StoredLedgerSchema = z.preprocess(
  (raw) => {
    if (typeof raw !== 'object' || raw === null || !('kind' in raw)) return raw;
    const delta = 'delta' in raw && typeof raw.delta === 'number' ? raw.delta : 0;
    if (raw.kind === 'redeemed') return { ...raw, kind: 'used' };
    if (raw.kind === 'reversed' && delta > 0) return { ...raw, kind: 'returned' };
    return raw;
  },
  LedgerEntrySchema.extend({
    id: z.string().optional(),
    note: z.string().nullable().optional(),
    byOwner: z.boolean().optional(),
    undone: z.boolean().optional(),
    clientKey: z.string().optional(),
  }),
);

const StoredClaimSchema = RewardClaimSchema.extend({
  id: z.string().optional(),
  givenAt: z.string().nullable().optional(),
  cancelledAt: z.string().nullable().optional(),
  cancelReason: ClaimCancelReasonEnum.nullable().optional(),
});

const PersistedSchema = z.object({
  session: CustomerSessionSchema.nullable(),
  codes: z.record(z.string(), z.object({ issuedAt: z.string(), sends: z.array(z.string()) })),
  orders: z.array(
    z.object({
      id: z.string(),
      slug: z.string(),
      clientKey: z.string().nullable(),
      businessDate: z.string(),
      receipt: OrderReceiptSchema,
      customerPhone: z.string(),
      customerEmail: z.string().nullable(),
      proofs: z.array(ProofSchema),
      isFirstOrder: z.boolean(),
      memberEmail: z.string().nullable(),
      redeemed: z.number(),
      stamp: z.enum(['none', 'pending', 'earned', 'reversed']),
      byCustomer: z.boolean(),
      // Older saved orders have no seen time or owner note.
      seenAt: z.string().nullable().default(null),
      ownerNote: z.string().nullable().default(null),
    }),
  ),
  members: z.array(
    z.object({
      slug: z.string(),
      email: z.string(),
      name: z.string(),
      phone: z.string(),
      memberCode: z.string(),
      joinedAt: z.string(),
      ledger: z.array(StoredLedgerSchema),
      addresses: z.array(CustomerAddressSchema),
      claims: z.array(StoredClaimSchema),
      byCustomer: z.boolean(),
      note: z.string().nullable().default(null),
    }),
  ),
  rewardsLeft: z.record(z.string(), z.number()),
});
type Persisted = z.infer<typeof PersistedSchema>;

function packFor(slug: string, production: boolean): ShopPack | null {
  const demo = Object.entries(SHOP_PACKS).find(([s]) => s === slug)?.[1];
  if (demo) return demo;
  // The NODE_ENV check is replaced at build time, so production bundles drop the test packs (N28).
  if (production || process.env.NODE_ENV === 'production') return null;
  return Object.entries(TEST_SHOP_PACKS).find(([s]) => s === slug)?.[1] ?? null;
}

function normaliseReference(ref: string): string {
  return ref.replace(/[\s-]/g, '').toUpperCase();
}

export type MockStore = DataAdapters & {
  reset(): void;
  now(): Date;
  /** For tests and the dev panel: the raw state of one shop. */
  inspect(slug: string): ShopState | null;
};

let activeMockOwnerSlug: string | null = null;

export function setMockOwnerSlug(slug: string | null): void {
  activeMockOwnerSlug = slug;
}

async function resolveOwnerShopSlug(): Promise<string> {
  if (activeMockOwnerSlug) return activeMockOwnerSlug;
  const client = getAuthClient();
  if (client) {
    try {
      const claims = await getClaims(client);
      if (claims?.demoShop) return claims.demoShop;
    } catch {
      // ignore
    }
  }
  return 'kanto-smash';
}

export function createMockStore(options: MockStoreOptions = {}): MockStore {
  const seed = options.seed ?? 20261025;
  const production = options.production ?? process.env.NODE_ENV === 'production';
  const scenario = options.scenario ?? getMockScenario;
  const persistence = options.persistence ?? null;
  let rng: Rng = mulberry32(seed);

  const now = (): Date => {
    const fixed = scenario().now;
    if (fixed) return new Date(fixed);
    if (typeof options.now === 'function') return options.now();
    if (options.now) return new Date(options.now);
    return new Date();
  };

  let state: MockState = { shops: new Map(), session: null, codes: {} };
  // Which ?as= state each shop was last put in.
  let appliedAs = new Map<string, DemoCustomerState>();

  function freshShop(slug: string): ShopState | null {
    const pack = packFor(slug, production);
    if (!pack) return null;
    const { variantTemplates, ...catalog } = pack.catalog;
    const shop: PublicShop = clone({ storefront: pack.storefront, catalog });
    // "Sold out today" comes back on by itself at the next opening.
    const reopen = nextOpening(shop.storefront, now());
    for (const item of shop.catalog.items) {
      for (const v of item.variants) {
        if (v.availability === 'sold_out_today' && v.soldOutUntil === null) v.soldOutUntil = reopen;
      }
    }
    const shopRng = mulberry32(seed + slug.length * 7919 + slug.charCodeAt(0));
    const orders = generateOrders(shop, now(), shopRng);
    const community = generateCommunity(
      shop,
      orders,
      now(),
      mulberry32(seed + slug.length * 104729 + slug.charCodeAt(1)),
    );
    // A claimed prize holds its piece (D8).
    const reward = shop.storefront.stampCard.reward;
    if (reward.quantityTotal !== null && reward.quantityLeft !== null)
      reward.quantityLeft = Math.min(
        reward.quantityLeft,
        Math.max(0, reward.quantityTotal - community.piecesHeld),
      );
    return {
      shop,
      orders,
      members: community.members,
      archive: community.archive,
      variantTemplates: clone(variantTemplates),
    };
  }

  registerTrickleHandler(() => {
    const slug = activeMockOwnerSlug ?? 'kanto-smash';
    const s = state.shops.get(slug);
    if (!s || s.shop.catalog.items.length === 0) return;
    const t = now();
    const iso = t.toISOString();
    const bDate = manilaDate(iso);
    const orderNo = nextOrderNo(s, bDate);
    const customer = {
      name: 'Trickle Customer',
      phone: `+63917000${String(3000 + s.orders.length).padStart(4, '0')}`,
      email: 'trickle@example.com',
    };
    const lines = orderableLines(s.shop, t, rng, 2);
    if (lines.length === 0) return;
    const order = buildOrder(s.shop, {
      id: `${slug}-o-trickle-${Date.now()}`,
      slug,
      token: makeToken(rng),
      orderNo,
      placedAt: iso,
      type: s.shop.storefront.orderTypes[0] ?? 'pickup',
      status: 'placed',
      paymentStatus: 'paid',
      paymentMethod: s.shop.storefront.payments[0]?.method ?? 'cash',
      lines,
      customer,
      isFirstOrder: false,
    });
    s.orders.push(order);
  });

  function loadPersisted(): Persisted | null {
    if (!persistence) return null;
    const parsed = PersistedSchema.safeParse(persistence.load());
    return parsed.success ? parsed.data : null;
  }

  function persist(): void {
    if (!persistence) return;
    const data: Persisted = {
      session: state.session,
      codes: state.codes,
      orders: [...state.shops.values()].flatMap((s) => s.orders.filter((o) => o.byCustomer)),
      members: [...state.shops.values()].flatMap((s) =>
        s.members.filter((m) => m.byCustomer).map((m) => ({ ...m, note: m.note ?? null })),
      ),
      rewardsLeft: Object.fromEntries(
        [...state.shops.entries()].flatMap(([slug, s]) =>
          s.shop.storefront.stampCard.reward.quantityLeft === null
            ? []
            : [[slug, s.shop.storefront.stampCard.reward.quantityLeft]],
        ),
      ),
    };
    persistence.save(data);
  }

  let saved = loadPersisted();
  if (saved) {
    state.session = saved.session;
    state.codes = saved.codes;
  }

  function shopState(slug: string): ShopState | null {
    const existing = state.shops.get(slug);
    if (existing) return existing;
    const fresh = freshShop(slug);
    if (!fresh) return null;
    if (saved) {
      fresh.orders.push(...saved.orders.filter((o) => o.slug === slug));
      for (const m of saved.members.filter((x) => x.slug === slug)) {
        fresh.members = fresh.members.filter((x) => x.email !== m.email);
        fresh.members.push(m);
      }
      const left = saved.rewardsLeft[slug];
      if (left !== undefined) fresh.shop.storefront.stampCard.reward.quantityLeft = left;
    }
    state.shops.set(slug, fresh);
    return fresh;
  }

  function requireShop(slug: string): ShopState {
    const s = shopState(slug);
    if (!s) fail('shop_not_found', 404);
    expireUnpaid(s);
    applyDemoCustomer(slug, s);
    return s;
  }

  // Unpaid transfer orders past their deadline expire (the server runs this every minute).
  function expireUnpaid(s: ShopState): void {
    const t = now().getTime();
    for (const order of s.orders) {
      const r = order.receipt;
      if (r.status !== 'placed' || r.paymentStatus !== 'unpaid' || !isTransfer(r.paymentMethod))
        continue;
      if (!r.expiresAt || new Date(r.expiresAt).getTime() > t) continue;
      r.status = 'expired';
      r.events.push({ status: 'expired', at: r.expiresAt });
      r.messages.push({
        id: `${order.id}-expired`,
        kind: 'status',
        at: r.expiresAt,
        status: 'expired',
        proof: null,
        text: words.shop.thread.expired,
      });
      giveBackRedeemed(s, order, r.expiresAt);
    }
  }

  function memberOf(s: ShopState, email: string | null | undefined): MemberRecord | null {
    if (!email) return null;
    return s.members.find((m) => m.email === email) ?? null;
  }

  function giveBackRedeemed(s: ShopState, order: OrderRecord, at: string): void {
    const member = memberOf(s, order.memberEmail);
    if (member && order.redeemed > 0) {
      member.ledger.push({
        kind: 'returned',
        delta: order.redeemed,
        reasonCategory: null,
        orderNo: order.receipt.orderNo,
        at,
      });
      order.redeemed = 0;
    }
    if (order.stamp === 'pending') order.stamp = 'none';
  }

  // ?as= puts the demo customer (Juan dela Cruz) in a known state for this shop.
  function applyDemoCustomer(slug: string, s: ShopState): void {
    const as = scenario().as;
    if (!as || production) return;
    if (appliedAs.get(slug) === as) return;
    appliedAs.set(slug, as);
    s.members = s.members.filter((m) => m.email !== DEMO_CUSTOMER.email);
    for (const order of s.orders)
      if (order.memberEmail === DEMO_CUSTOMER.email) order.memberEmail = null;
    if (as === 'guest') {
      state.session = null;
      return;
    }
    const t = now().toISOString();
    state.session = { email: DEMO_CUSTOMER.email, verifiedAt: t };
    const needed = s.shop.storefront.stampCard.rule.stampsNeeded;
    const balance = {
      member: 3,
      'member-ready': needed,
      'member-pending': needed - 1,
      'member-capped': 4,
    }[as];
    const ledger: MemberAccount['history'] = [
      {
        kind: 'welcome',
        delta: 1,
        reasonCategory: null,
        orderNo: null,
        at: addMinutes(t, -30 * 1440),
      },
    ];
    for (let i = 1; i < balance; i += 1) {
      const at =
        as === 'member-capped' && i === balance - 1
          ? addMinutes(t, -60)
          : addMinutes(t, -(30 - i * 2) * 1440);
      ledger.push({ kind: 'earned', delta: 1, reasonCategory: null, orderNo: 100 + i, at });
    }
    s.members.push({
      slug,
      email: DEMO_CUSTOMER.email,
      name: DEMO_CUSTOMER.name,
      phone: DEMO_CUSTOMER.phone,
      memberCode: `${slug.slice(0, 2).toUpperCase()}-1234`,
      joinedAt: addMinutes(t, -30 * 1440),
      ledger,
      addresses: demoAddresses(s.shop),
      claims: [],
      byCustomer: false,
    });
    // Every demo receipt is Juan's, so My orders reaches each receipt and chat state (decision R34).
    for (const order of s.orders)
      if (isDemoReceiptToken(order.receipt.token)) order.memberEmail = DEMO_CUSTOMER.email;
    if (as === 'member-pending') {
      const open = s.orders.find((o) => o.receipt.token === 'demo-preparing');
      if (open) {
        open.memberEmail = DEMO_CUSTOMER.email;
        open.stamp = 'pending';
      }
    }
  }

  function accountFor(s: ShopState, member: MemberRecord): MemberAccount {
    const pendingOrders = s.orders.filter(
      (o) => o.memberEmail === member.email && o.stamp === 'pending' && !isFinal(o.receipt.status),
    );
    const balance = memberBalance(member);
    // An undone counter change and its undo line cancel out, so the member sees neither (T58).
    const history = [
      ...member.ledger
        .filter((e) => !(e.undone ?? false) && e.kind !== 'undone')
        .map((e) => LedgerEntrySchema.parse(e)),
      ...pendingOrders.map((o) => ({
        kind: 'pending' as const,
        delta: 1,
        reasonCategory: null,
        orderNo: o.receipt.orderNo,
        at: o.receipt.placedAt,
      })),
    ].sort((a, b) => b.at.localeCompare(a.at));
    return MemberAccountSchema.parse({
      name: member.name,
      phone: member.phone,
      email: member.email,
      balance,
      pendingStamps: pendingOrders.length,
      rewardReady:
        s.shop.storefront.stampCard.status !== 'off' &&
        balance >= s.shop.storefront.stampCard.rule.stampsNeeded,
      memberCode: member.memberCode,
      joinedAt: member.joinedAt,
      history,
      claims: [...member.claims]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((c) => RewardClaimSchema.parse(c)),
    });
  }

  function currentMember(s: ShopState): MemberRecord | null {
    return memberOf(s, state.session?.email);
  }

  // Owner Settings, storage and plan (T64 to T68); shop facts stay in the shop's storefront.
  const settingsMock = createSettingsMock({
    run: (area, fn) => run(area, fn),
    requireShop: (slug) => requireShop(slug),
    ownerShop: () => resolveOwnerShopSlug(),
    ownerClaims: async () => {
      const client = getAuthClient();
      return client ? getClaims(client) : null;
    },
    now: () => now(),
    scenario: () => scenario(),
    fail,
    seed,
    production,
  });

  // Owner Home (T69 to T71): worked out on each read from orders, members' past orders and the menu.
  const homeMock = createHomeMock({
    run: (area, fn) => run(area, fn),
    ownerShop: () => resolveOwnerShopSlug(),
    homeShop: (slug) => membersShop(slug),
    publicShop: (s) => publicShop(s),
    membersOverview: (s) => overview(s, peopleOf(s), now()),
    now: () => now(),
    scenario: () => scenario(),
    seed,
  });

  let idSeq = 0;
  function newId(prefix: string): string {
    idSeq += 1;
    return `${prefix}_${Math.random().toString(36).slice(2, 9)}${idSeq}`;
  }

  // A shop's variants; a shop made before T46 starts with the defaults for its kind.
  function templatesOf(s: ShopState): VariantTemplate[] {
    if (!s.variantTemplates) {
      s.variantTemplates = defaultVariantTemplates(s.shop.storefront.info.kind, (key) =>
        newId(`vt-${key}`),
      );
    }
    return s.variantTemplates;
  }

  // usedBy counts the items that link it; archived items do not count.
  function ownerTemplate(s: ShopState, t: VariantTemplate): OwnerVariantTemplate {
    const usedBy = s.shop.catalog.items.filter(
      (item) => item.status !== 'archived' && item.axes.some((a) => a.templateId === t.id),
    ).length;
    return OwnerVariantTemplateSchema.parse({ ...t, usedBy });
  }

  function publicShop(s: ShopState): PublicShop {
    const shop = clone(s.shop);
    const sc = scenario();
    if (!shop.storefront.info.isDemo)
      shop.catalog.items = shop.catalog.items.filter((i) => !i.sample);
    if (sc.empty) {
      shop.catalog = { categories: [], items: [], optionGroups: [] };
      shop.storefront.look.banners = [];
      shop.storefront.look.announcement = null;
    }
    if (sc.closed) shop.storefront.closures.push({ date: manilaDate(now()), reason: null });
    if (sc.noCard) shop.storefront.stampCard.status = 'off';
    return PublicShopSchema.parse(shop);
  }

  async function run<T>(
    area:
      'storefront' | 'orders' | 'account' | 'auth' | 'catalog' | 'members' | 'settings' | 'home',
    fn: () => T,
  ): Promise<T> {
    const sc = scenario();
    const latency = options.latency ?? sc.latency;
    const ms =
      latency === 'none'
        ? 0
        : latency === 'slow'
          ? 2000 + rng() * 600 - 300
          : 400 + rng() * 300 - 150;
    if (ms > 0) await new Promise((resolve) => setTimeout(resolve, ms));
    if (sc.offline) fail('offline', 0);
    if (sc.fail === 'all' || sc.fail === area) fail('unknown', 500);
    return clone(fn());
  }

  function orderByToken(s: ShopState, token: string): OrderRecord {
    const order = s.orders.find((o) => o.receipt.token === token);
    if (!order) fail('not_found', 404);
    return order;
  }

  function orderById(s: ShopState, id: string): OrderRecord {
    const order = s.orders.find((o) => o.id === id);
    if (!order) fail('not_found', 404);
    return order;
  }

  function toBoardOrder(s: ShopState, o: OrderRecord) {
    const linesCount = o.receipt.lines.length;
    const ticketLines = o.receipt.lines.slice(0, 8).map((l) => ({
      qty: l.qty,
      name: l.name,
      variantLabel: l.variantLabel,
      optionLabels: l.optionLabels,
      note: l.note || null,
      photo: s.shop.catalog.items.find((i) => i.id === l.itemId)?.photos[0] ?? null,
    }));
    const lastStepAt = o.receipt.events[o.receipt.events.length - 1]?.at ?? o.receipt.placedAt;
    const member = memberOf(s, o.memberEmail ?? o.customerEmail);
    const card = s.shop.storefront.stampCard;
    return BoardOrderSchema.parse({
      id: o.id,
      token: o.receipt.token,
      orderNo: o.receipt.orderNo,
      type: o.receipt.type,
      status: o.receipt.status,
      paymentStatus: o.receipt.paymentStatus,
      paymentMethod: o.receipt.paymentMethod,
      scheduledAt: o.receipt.scheduledAt,
      placedAt: o.receipt.placedAt,
      customerName: o.receipt.customerName,
      isFirstOrder: o.isFirstOrder,
      isMember: member !== null,
      hasReward: o.receipt.rewardTitle !== null,
      itemsSummary: o.receipt.lines.map((l) => `${l.qty} × ${l.name}`).join(', '),
      total: o.receipt.totals.total,
      dueAt: o.receipt.dueAt,
      startBy: o.receipt.startBy,
      pickupCode: o.receipt.pickupCode,
      seenAt: o.seenAt ?? null,
      lines: ticketLines,
      moreLines: Math.max(0, linesCount - 8),
      note: o.receipt.note ?? null,
      ownerNote: o.ownerNote ?? null,
      deliveryArea:
        o.receipt.type === 'delivery'
          ? (o.receipt.deliveryAddress?.split(',')[0]?.trim() ?? null)
          : null,
      lastStepAt,
      expiresAt: o.receipt.expiresAt,
      memberStamps:
        member && card.status === 'on'
          ? {
              have: Math.min(memberBalance(member), card.rule.stampsNeeded),
              goal: card.rule.stampsNeeded,
            }
          : null,
    });
  }

  function computeBookings(s: ShopState) {
    const slotCounts: Record<string, number> = {};
    const itemCounts: Record<string, Record<string, number>> = {};
    for (const o of s.orders) {
      if (o.receipt.status === 'cancelled') continue;
      if (o.receipt.scheduledAt) {
        slotCounts[o.receipt.scheduledAt] = (slotCounts[o.receipt.scheduledAt] ?? 0) + 1;
      }
      const date = manilaDate(o.receipt.dueAt);
      const dayItems = (itemCounts[date] ??= {});
      for (const l of o.receipt.lines) {
        dayItems[l.itemId] = (dayItems[l.itemId] ?? 0) + l.qty;
      }
    }
    return { slotCounts, itemCounts };
  }

  function ownerOrder(s: ShopState, o: OrderRecord) {
    const lastStepAt = o.receipt.events[o.receipt.events.length - 1]?.at ?? o.receipt.placedAt;
    return OwnerOrderSchema.parse({
      ...o.receipt,
      id: o.id,
      customerPhone: o.customerPhone,
      customerEmail: o.customerEmail,
      isFirstOrder: o.isFirstOrder,
      isMember: memberOf(s, o.memberEmail ?? o.customerEmail) !== null,
      proofs: o.proofs,
      seenAt: o.seenAt ?? null,
      ownerNote: o.ownerNote ?? null,
      lastStepAt,
    });
  }

  function payment(o: OrderRecord) {
    return PaymentSchema.parse({
      orderId: o.id,
      method: o.receipt.paymentMethod,
      status: o.receipt.paymentStatus,
      amount: o.receipt.totals.total,
      proofs: o.proofs,
    });
  }

  function addStatus(o: OrderRecord, status: OrderStatus, at: string): void {
    o.receipt.status = status;
    o.receipt.events.push({ status, at });
    o.receipt.messages.push({
      id: `${o.id}-${status}-${o.receipt.events.length}`,
      kind: 'status',
      at,
      status,
      proof: null,
      text: null,
    });
  }

  function quoteProblemCode(p: QuoteProblem): ErrorCode {
    switch (p.code) {
      case 'shop_paused':
        return 'shop_closed';
      case 'below_min_order':
      case 'empty_basket':
        return 'invalid_input';
      default:
        return p.code;
    }
  }

  const storefront: DataAdapters['storefront'] = {
    getStorefront: ({ slug }) =>
      run('storefront', () => {
        const s = shopState(slug);
        return s ? publicShop(s) : null;
      }),

    getStorefrontPreview: ({ slug, previewToken }) =>
      run('storefront', () => {
        if (!previewToken) fail('preview_expired', 410);
        return publicShop(requireShop(slug));
      }),

    getSchedule: ({ slug, lines }) =>
      run('storefront', () => {
        const s = requireShop(slug);
        const bookings = computeBookings(s);
        return scheduleDays(s.shop.storefront, lines, s.shop.catalog.items, bookings, now());
      }),

    quoteOrder: ({ slug, payload }) =>
      run('storefront', () => {
        const s = requireShop(slug);
        const at = payload.scheduledAt;
        if (at) {
          const sched = scheduleDays(
            s.shop.storefront,
            payload.lines,
            s.shop.catalog.items,
            computeBookings(s),
            now(),
          );
          const day = sched.days.find((d) => d.date === manilaDate(at));
          const slot = day?.slots.find((sl) => sl.at === at);
          if (!day || day.state !== 'open' || !slot || slot.state !== 'open') {
            fail('slot_unavailable', 409);
          }
        }
        const member = currentMember(s);
        return QuoteSchema.parse(
          quote(
            { shop: publicShop(s), now: now(), member: member ? accountFor(s, member) : null },
            payload,
          ),
        );
      }),

    placeOrder: ({ slug, payload, clientKey }) =>
      run('storefront', () => {
        const s = requireShop(slug);
        const again = s.orders.find((o) => o.clientKey === clientKey);
        if (again)
          return { orderId: again.id, orderNo: again.receipt.orderNo, token: again.receipt.token };

        const parsed = OrderPayloadSchema.safeParse(payload);
        if (!parsed.success) fail('invalid_input', 422);
        const body: OrderPayload = parsed.data;
        const phone = normalisePhPhone(body.customer.phone);
        if (!phone.ok) fail('invalid_input', 422, { phone: [words.shop.phoneInvalid] });

        const at = body.scheduledAt;
        if (at) {
          const sched = scheduleDays(
            s.shop.storefront,
            body.lines,
            s.shop.catalog.items,
            computeBookings(s),
            now(),
          );
          const day = sched.days.find((d) => d.date === manilaDate(at));
          const slot = day?.slots.find((sl) => sl.at === at);
          if (!day || day.state !== 'open' || !slot || slot.state !== 'open') {
            fail('slot_unavailable', 409);
          }
        }

        const member = currentMember(s);
        const account = member ? accountFor(s, member) : null;
        const q = quote({ shop: publicShop(s), now: now(), member: account }, body);
        const flagged = q.lines.find((l) => l.problems.length > 0);
        if (flagged) {
          const code = flagged.problems[0]?.code;
          fail(
            code === 'sold_out' || code === 'sold_out_today'
              ? 'out_of_stock'
              : code === 'item_missing' || code === 'variant_missing'
                ? 'item_unavailable'
                : 'invalid_options',
            409,
          );
        }
        const first = q.problems[0];
        if (first) fail(quoteProblemCode(first), 409);

        const t = now();
        const since = t.getTime() - PAY_MINUTES * 60_000;
        const unpaid = s.orders.filter(
          (o) =>
            o.customerPhone === phone.e164 &&
            o.receipt.status === 'placed' &&
            o.receipt.paymentStatus === 'unpaid' &&
            new Date(o.receipt.placedAt).getTime() >= since,
        );
        if (unpaid.length >= UNPAID_LIMIT) fail('rate_limited', 429);

        const iso = t.toISOString();
        const card = s.shop.storefront.stampCard;
        const redeemed = body.useReward && q.discount > 0 ? card.rule.stampsNeeded : 0;
        const orderNo = nextOrderNo(s, manilaDate(t));
        const record = buildOrder(s.shop, {
          id: `${slug}-c-${makeToken(rng).slice(0, 10)}`,
          slug,
          token: makeToken(rng),
          orderNo,
          placedAt: iso,
          type: body.type,
          status: 'placed',
          paymentStatus: q.total === 0 ? 'paid' : 'unpaid',
          paymentMethod: body.paymentMethod,
          lines: body.lines,
          customer: { name: body.customer.name, phone: phone.e164, email: body.customer.email },
          scheduledAt: body.scheduledAt,
          deliveryAddress: body.delivery
            ? [
                body.delivery.houseNo,
                body.delivery.floor,
                body.delivery.addressLine,
                body.delivery.landmark,
              ]
                .filter(Boolean)
                .join(', ')
            : null,
          deliveryFee: q.deliveryFee,
          discount: q.discount,
          rewardTitle: redeemed > 0 ? card.reward.title : null,
          expiresAt:
            isTransfer(body.paymentMethod) && q.total > 0 ? addMinutes(iso, PAY_MINUTES) : null,
          note: body.note,
          clientKey,
          isFirstOrder: !s.orders.some((o) => o.customerPhone === phone.e164),
          memberEmail: member?.email ?? null,
          redeemed,
          stamp:
            member && card.status === 'on' && q.subtotal >= card.rule.minOrderTotal
              ? 'pending'
              : 'none',
          byCustomer: true,
        });
        if (member && redeemed > 0) {
          member.ledger.push({
            kind: 'used',
            delta: -redeemed,
            reasonCategory: null,
            orderNo,
            at: iso,
          });
        }
        s.orders.push(record);
        persist();
        return { orderId: record.id, orderNo, token: record.receipt.token };
      }),

    getOrder: ({ slug, token }) =>
      run('storefront', () =>
        OrderReceiptSchema.parse(orderByToken(requireShop(slug), token).receipt),
      ),

    listMyOrders: ({ slug, tokens }) =>
      run('storefront', () => {
        const s = requireShop(slug);
        const member = currentMember(s);
        return s.orders
          .filter(
            (o) =>
              tokens.includes(o.receipt.token) ||
              (member !== null && o.memberEmail === member.email),
          )
          .sort((a, b) => b.receipt.placedAt.localeCompare(a.receipt.placedAt))
          .map((o) =>
            OrderRowSchema.parse({
              slug,
              token: o.receipt.token,
              orderNo: o.receipt.orderNo,
              type: o.receipt.type,
              status: o.receipt.status,
              paymentStatus: o.receipt.paymentStatus,
              total: o.receipt.totals.total,
              placedAt: o.receipt.placedAt,
              scheduledAt: o.receipt.scheduledAt,
              itemCount: o.receipt.lines.reduce((n, l) => n + l.qty, 0),
              summary: o.receipt.lines.map((l) => `${l.qty} × ${l.name}`).join(', '),
              photos: o.receipt.lines
                .flatMap((l) => {
                  const photo = s.shop.catalog.items.find((i) => i.id === l.itemId)?.photos[0];
                  return photo ? [photo] : [];
                })
                .slice(0, 3),
              paymentMethod: o.receipt.paymentMethod,
              expiresAt: o.receipt.expiresAt,
              ratingStars: o.receipt.rating?.stars ?? null,
            }),
          );
      }),

    createProofUploadUrl: ({ slug, token }) =>
      run('storefront', () => {
        const order = orderByToken(requireShop(slug), token);
        const n = order.proofs.length + 1;
        if (n > MAX_PROOFS) fail('too_many_proofs', 409);
        const path = `proofs/${slug}/${order.id}/${n}-${makeToken(rng).slice(0, 6)}.webp`;
        return { uploadUrl: `mock://upload/${path}`, path };
      }),

    submitProof: ({ slug, token, method, referenceNo, path }) =>
      run('storefront', () => {
        const s = requireShop(slug);
        const order = orderByToken(s, token);
        const r = order.receipt;
        if (r.status !== 'placed' || r.paymentStatus !== 'unpaid' || !isTransfer(r.paymentMethod))
          fail('order_not_payable', 409);
        if (order.proofs.length >= MAX_PROOFS) fail('too_many_proofs', 409);
        if (method !== r.paymentMethod && !isTransfer(method)) fail('payment_unavailable', 409);
        const ref = normaliseReference(referenceNo);
        if (!ref) fail('invalid_input', 422, { referenceNo: [errorWords('invalid_input')] });
        const used = s.orders.some((o) =>
          o.proofs.some(
            (p) => p.status !== 'rejected' && normaliseReference(p.referenceNo) === ref,
          ),
        );
        if (used) fail('duplicate_reference', 409);
        const at = now().toISOString();
        const proof = {
          id: `${order.id}-p${order.proofs.length + 1}`,
          status: 'pending' as const,
          referenceNo: referenceNo.trim(),
          path,
          uploadedAt: at,
          rejectReason: null,
        };
        order.proofs.push(proof);
        // The screenshot counts toward the shop's storage, and always goes through (T66).
        void settingsMock.recordProof(slug, 150 * 1024);
        // A proof never marks an order paid: only the owner's check does.
        r.paymentStatus = 'pending';
        r.messages.push({
          id: `${proof.id}-m`,
          kind: 'proof',
          at,
          status: null,
          proof,
          text: null,
        });
        persist();
        return payment(order);
      }),

    rateOrder: ({ slug, token, stars, comment }) =>
      run('storefront', () => {
        const order = orderByToken(requireShop(slug), token);
        if (order.receipt.status !== 'completed') fail('invalid_transition', 409);
        const rating = OrderRatingSchema.parse({
          stars,
          comment: comment?.trim() ? comment.trim() : null,
          at: now().toISOString(),
        });
        order.receipt.rating = rating;
        persist();
        return rating;
      }),

    subscribePush: ({ slug, token }) =>
      run('storefront', () => {
        orderByToken(requireShop(slug), token);
        return { ok: true as const };
      }),

    resolveMapsLink: ({ url }) =>
      run('storefront', () => {
        const spot = parseMapsLink(url);
        if (!spot) fail('invalid_input', 422, { url: [words.shop.mapsShortLink] });
        return LatLngSchema.parse(spot);
      }),

    joinAsMember: ({ slug, name, phone, orderToken }) =>
      run('account', () => {
        const s = requireShop(slug);
        const session = state.session;
        if (!session) fail('not_signed_in', 401);
        const normal = normalisePhPhone(phone);
        if (!normal.ok) fail('invalid_input', 422, { phone: [words.shop.phoneInvalid] });
        const existing = memberOf(s, session.email);
        if (existing) return accountFor(s, existing);
        if (s.members.some((m) => m.phone === normal.e164)) fail('phone_in_use', 409);
        const card = s.shop.storefront.stampCard;
        const at = now().toISOString();
        const member: MemberRecord = {
          slug,
          email: session.email,
          name: name.trim(),
          phone: normal.e164,
          memberCode: `${slug.slice(0, 2).toUpperCase()}-${String(Math.floor(rng() * 9000) + 1000)}`,
          joinedAt: at,
          ledger:
            // Only an On card gives the welcome stamp (M3); paused stops new stamps (M1).
            card.status === 'on' && card.rule.welcomeStamps > 0
              ? [
                  {
                    kind: 'welcome',
                    delta: card.rule.welcomeStamps,
                    reasonCategory: null,
                    orderNo: null,
                    at,
                  },
                ]
              : [],
          addresses: [],
          claims: [],
          byCustomer: true,
        };
        s.members.push(member);
        // A guest order links only by its token or the same email, never by phone alone (P8).
        for (const o of s.orders) {
          if (o.memberEmail) continue;
          if (o.receipt.token === orderToken || o.customerEmail === session.email) {
            o.memberEmail = session.email;
            if (
              !isFinal(o.receipt.status) &&
              card.status === 'on' &&
              o.receipt.totals.subtotal >= card.rule.minOrderTotal
            )
              o.stamp = 'pending';
          }
        }
        persist();
        return accountFor(s, member);
      }),

    getMyAccount: ({ slug }) =>
      run('account', () => {
        const s = requireShop(slug);
        const member = currentMember(s);
        return member ? accountFor(s, member) : null;
      }),

    saveAddress: ({ slug, address }) =>
      run('account', () => {
        const s = requireShop(slug);
        const member = currentMember(s);
        if (!member) fail('not_signed_in', 401);
        const parsed = CustomerAddressSchema.parse(address);
        member.addresses = [...member.addresses.filter((a) => a.id !== parsed.id), parsed];
        member.byCustomer = true;
        persist();
        return member.addresses;
      }),

    removeAddress: ({ slug, id }) =>
      run('account', () => {
        const s = requireShop(slug);
        const member = currentMember(s);
        if (!member) fail('not_signed_in', 401);
        member.addresses = member.addresses.filter((a) => a.id !== id);
        persist();
        return member.addresses;
      }),

    claimReward: ({ slug }) =>
      run('account', () => {
        const s = requireShop(slug);
        const member = currentMember(s);
        if (!member) fail('not_signed_in', 401);
        const card = s.shop.storefront.stampCard;
        // Paused stops new stamps only; a ready prize can still be claimed (M1).
        if (card.status === 'off' || card.reward.kind !== 'custom') fail('reward_unavailable', 409);
        if (memberBalance(member) < card.rule.stampsNeeded) fail('stamps_insufficient', 409);
        // One step, so two claims for the last piece can't both win.
        if (card.reward.quantityLeft !== null && card.reward.quantityLeft <= 0)
          fail('reward_all_claimed', 409);
        if (card.reward.onePerCustomer && member.claims.some((c) => c.status !== 'cancelled'))
          fail('reward_unavailable', 409);
        if (card.reward.quantityLeft !== null) card.reward.quantityLeft -= 1;
        const at = now().toISOString();
        const code = `${slug.slice(0, 2).toUpperCase()}-${makeToken(rng).slice(0, 6).toUpperCase()}`;
        const claim = RewardClaimSchema.parse({
          code,
          status: 'pending',
          // Member and prize QR both open /m/<code> (M13).
          qrUrl: memberQrUrl(code),
          title: card.reward.title,
          createdAt: at,
        });
        member.claims.push({ ...claim, id: newId('claim'), givenAt: null, cancelledAt: null });
        member.ledger.push({
          id: newId('l'),
          kind: 'claimed',
          delta: -card.rule.stampsNeeded,
          reasonCategory: null,
          orderNo: null,
          at,
        });
        member.byCustomer = true;
        persist();
        return claim;
      }),
  };

  const customerAuth: DataAdapters['customerAuth'] = {
    sendCustomerCode: ({ email }) =>
      run('auth', () => {
        const key = email.trim().toLowerCase();
        const t = now();
        const record = state.codes[key] ?? { issuedAt: t.toISOString(), sends: [] };
        const recent = record.sends.filter(
          (at) => t.getTime() - new Date(at).getTime() < 3_600_000,
        );
        const last = recent[recent.length - 1];
        if (last && t.getTime() - new Date(last).getTime() < RESEND_SECONDS * 1000)
          fail('rate_limited', 429);
        if (recent.length >= SENDS_PER_HOUR) fail('rate_limited', 429);
        const iso = t.toISOString();
        state.codes[key] = { issuedAt: iso, sends: [...recent, iso] };
        persist();
        return SendCodeResultSchema.parse({
          sentAt: iso,
          resendAt: addMinutes(iso, RESEND_SECONDS / 60),
          devCode: production ? null : MOCK_CODE,
        });
      }),

    verifyCustomerCode: ({ email, code }) =>
      run('auth', () => {
        const key = email.trim().toLowerCase();
        const record = state.codes[key];
        if (!record) fail('invalid_code', 400);
        if (now().getTime() - new Date(record.issuedAt).getTime() > CODE_MINUTES * 60_000)
          fail('code_expired', 400);
        if (code.replace(/\s/g, '') !== MOCK_CODE) fail('invalid_code', 400);
        state.session = { email: key, verifiedAt: now().toISOString() };
        persist();
        return { email: key };
      }),

    signOutCustomer: () =>
      run('auth', () => {
        state.session = null;
        persist();
      }),
  };

  const ownerOrders: DataAdapters['ownerOrders'] = {
    listOrders: (input) =>
      run('orders', () => {
        const s = requireShop(input.slug);
        if (scenario().empty || scenario().ordersMode === 'empty') return [];
        let list =
          'open' in input
            ? s.orders.filter((o) => !isFinal(o.receipt.status))
            : s.orders.filter((o) => o.businessDate === input.date);
        if (input.q) {
          const query = input.q.trim().toLowerCase();
          // "#012" and "012" find order 12, the way the owner reads the number.
          const numberQuery = query.replace(/^#?0*/, '');
          list = list.filter((o) => {
            const matchesNo = numberQuery !== '' && String(o.receipt.orderNo).includes(numberQuery);
            const matchesName = o.receipt.customerName.toLowerCase().includes(query);
            const matchesPhone = o.customerPhone.toLowerCase().includes(query);
            const matchesCode = o.receipt.pickupCode.toLowerCase().includes(query);
            return matchesNo || matchesName || matchesPhone || matchesCode;
          });
        }
        return list
          .sort((a, b) => a.receipt.placedAt.localeCompare(b.receipt.placedAt))
          .map((o) => toBoardOrder(s, o));
      }),

    listScheduled: ({ slug, from, to }) =>
      run('orders', () => {
        const s = requireShop(slug);
        if (scenario().empty || scenario().ordersMode === 'empty') return { orders: [], days: [] };
        const scheduled = s.orders
          .filter(
            (o) =>
              // Open and done orders (the calendar's Show done); cancelled and expired never show.
              o.receipt.status !== 'cancelled' &&
              o.receipt.status !== 'expired' &&
              o.receipt.scheduledAt !== null &&
              manilaDate(o.receipt.dueAt) >= from &&
              manilaDate(o.receipt.dueAt) <= to,
          )
          .sort((a, b) => a.receipt.dueAt.localeCompare(b.receipt.dueAt))
          .map((o) => toBoardOrder(s, o));
        const days = dayLoads(
          s.orders.map((o) => ({
            dueAt: o.receipt.dueAt,
            status: o.receipt.status,
            lines: o.receipt.lines,
          })),
          s.shop.catalog.items,
          from,
          to,
        );
        return { orders: scheduled, days };
      }),

    findOrder: ({ slug, code }) =>
      run('orders', () => {
        const s = requireShop(slug);
        if (scenario().empty || scenario().ordersMode === 'empty') return [];
        // The same reading as the dialog: "#012" is order 12, "k7 qp" is code K7QP, a token is a scanned QR.
        const parsed = parseFindInput(code);
        const token = code.trim();
        const todayDate = manilaDate(now());
        const matches = s.orders.filter((o) => {
          const codeMatch = parsed
            ? parsed.kind === 'typed' &&
              (o.receipt.orderNo === parsed.orderNo || o.receipt.pickupCode === parsed.code)
            : token.length >= 8 && o.receipt.token === token;
          if (!codeMatch) return false;
          return !isFinal(o.receipt.status) || o.businessDate === todayDate;
        });
        return matches.map((o) => toBoardOrder(s, o));
      }),

    markSeen: ({ slug, orderId }) =>
      run('orders', () => {
        const s = requireShop(slug);
        const order = orderById(s, orderId);
        if (!order.seenAt) {
          order.seenAt = now().toISOString();
          persist();
        }
        return toBoardOrder(s, order);
      }),

    getOrderDetail: ({ slug, orderId }) =>
      run('orders', () => {
        const s = requireShop(slug);
        return ownerOrder(s, orderById(s, orderId));
      }),

    getProofUrl: ({ slug, path }) =>
      run('orders', () => {
        requireShop(slug);
        return `https://example.com/mock-proofs/${encodeURIComponent(path)}`;
      }),

    reviewPayment: ({ slug, orderId, approve, rejectReason }) =>
      run('orders', () => {
        const s = requireShop(slug);
        const order = orderById(s, orderId);
        if (order.receipt.paymentStatus !== 'pending') fail('payment_not_pending', 409);
        const proof = [...order.proofs].reverse().find((p) => p.status === 'pending');
        const at = now().toISOString();
        if (approve) {
          order.receipt.paymentStatus = 'paid';
          if (proof) proof.status = 'approved';
          order.receipt.messages.push({
            id: `${order.id}-paid-${order.proofs.length}`,
            kind: 'status',
            at,
            status: null,
            proof: null,
            text: words.shop.thread.paymentApproved,
          });
        } else {
          const reason = rejectReason?.trim();
          if (!reason) fail('invalid_input', 422, { rejectReason: [errorWords('invalid_input')] });
          order.receipt.paymentStatus = 'unpaid';
          if (proof) {
            proof.status = 'rejected';
            proof.rejectReason = reason;
          }
          // Rejecting restarts the unpaid timer.
          order.receipt.expiresAt = addMinutes(at, PAY_MINUTES);
          order.receipt.messages.push({
            id: `${order.id}-rej-${order.proofs.length}`,
            kind: 'status',
            at,
            status: null,
            proof: null,
            text: words.shop.thread.paymentRejected(reason),
          });
        }
        // Keep the thread's proof copies in step with the proof list.
        for (const m of order.receipt.messages) {
          const p = m.proof ? order.proofs.find((x) => x.id === m.proof?.id) : undefined;
          if (p) m.proof = clone(p);
        }
        persist();
        return payment(order);
      }),

    recordPayment: ({ slug, orderId, method }) =>
      run('orders', () => {
        const s = requireShop(slug);
        const order = orderById(s, orderId);
        if (order.receipt.paymentStatus === 'paid') fail('already_paid', 409);
        if (method !== 'cash' && method !== 'cod') fail('payment_unavailable', 409);
        order.receipt.paymentMethod = method;
        order.receipt.paymentStatus = 'paid';
        order.receipt.expiresAt = null;
        order.receipt.payment = null;
        persist();
        return payment(order);
      }),

    advanceOrder: ({ slug, orderId, toStatus, trackingUrl }) =>
      run('orders', () => {
        const s = requireShop(slug);
        const order = orderById(s, orderId);
        const r = order.receipt;
        const check = canAdvance(r, toStatus);
        if (!check.ok) fail(check.code, 409);
        const at = now().toISOString();
        if (trackingUrl) r.trackingUrl = trackingUrl;
        addStatus(order, toStatus, at);
        if (toStatus === 'completed') {
          const member = memberOf(s, order.memberEmail);
          const card = s.shop.storefront.stampCard;
          if (member && order.stamp === 'pending' && card.status === 'on') {
            const from = card.rule.period
              ? new Date(periodStart(card.rule.period, now())).getTime()
              : 0;
            const earned = member.ledger.filter(
              (e) => e.kind === 'earned' && new Date(e.at).getTime() >= from,
            ).length;
            if (earnsStamp(card.rule, r.totals.subtotal, earned).earns) {
              member.ledger.push({
                kind: 'earned',
                delta: 1,
                reasonCategory: null,
                orderNo: r.orderNo,
                at,
              });
              order.stamp = 'earned';
            } else {
              order.stamp = 'none';
            }
          }
        }
        persist();
        return ownerOrder(s, order);
      }),

    recallOrder: ({ slug, orderId }) =>
      run('orders', () => {
        const s = requireShop(slug);
        const order = orderById(s, orderId);
        const lastStepAt =
          order.receipt.events[order.receipt.events.length - 1]?.at ?? order.receipt.placedAt;
        if (!canRecall({ status: order.receipt.status, lastStepAt }, now())) {
          fail('recall_expired', 409);
        }
        if (order.receipt.events.length <= 1) {
          fail('invalid_transition', 409);
        }
        order.receipt.events.pop();
        const prevEvent = order.receipt.events[order.receipt.events.length - 1]!;
        order.receipt.status = prevEvent.status;
        const lastStatusMsgIdx = order.receipt.messages.map((m) => m.kind).lastIndexOf('status');
        if (lastStatusMsgIdx >= 0) {
          order.receipt.messages.splice(lastStatusMsgIdx, 1);
        }
        persist();
        return ownerOrder(s, order);
      }),

    rescheduleOrder: ({ slug, orderId, scheduledAt, override }) =>
      run('orders', () => {
        const s = requireShop(slug);
        const order = orderById(s, orderId);
        if (!canReschedule(order.receipt)) {
          fail('reschedule_not_allowed', 409);
        }
        const date = manilaDate(scheduledAt);
        const intervals = intervalsForDate(s.shop.storefront, date);
        const isClosure = s.shop.storefront.closures.some((c) => c.date === date);
        if (isClosure || intervals.length === 0) {
          fail('reschedule_not_allowed', 409, {
            scheduledAt: ['Shop is closed on that day'],
          });
        }
        const slotTime = new Date(scheduledAt).getTime();
        const inside = intervals.some(
          (inv) => slotTime >= inv.start.getTime() && slotTime < inv.end.getTime(),
        );
        if (!inside) {
          fail('reschedule_not_allowed', 409, {
            scheduledAt: ['Time is outside opening hours'],
          });
        }
        if (!override) {
          const sched = scheduleDays(
            s.shop.storefront,
            order.receipt.lines,
            s.shop.catalog.items,
            computeBookings(s),
            now(),
          );
          const day = sched.days.find((d) => d.date === date);
          const slot = day?.slots.find((sl) => sl.at === scheduledAt);
          if (!day || day.state !== 'open' || !slot || slot.state !== 'open') {
            fail('slot_full', 409);
          }
        }
        const times = dueTimes({
          placedAt: order.receipt.placedAt,
          scheduledAt,
          prepMinutes: s.shop.storefront.prepMinutes ?? 20,
        });
        order.receipt.scheduledAt = scheduledAt;
        order.receipt.dueAt = times.dueAt;
        order.receipt.startBy = times.startBy;
        const formattedDate = `${formatManila(scheduledAt, 'day')} ${formatClock(scheduledAt)}`;
        order.receipt.messages.push({
          id: `${order.id}-schedule-${Date.now()}`,
          kind: 'schedule',
          at: now().toISOString(),
          status: null,
          proof: null,
          text: words.receipt.thread.scheduleChanged(formattedDate),
        });
        persist();
        return ownerOrder(s, order);
      }),

    saveOwnerNote: ({ slug, orderId, note }) =>
      run('orders', () => {
        const s = requireShop(slug);
        const order = orderById(s, orderId);
        order.ownerNote = note ? note.trim().slice(0, 300) : null;
        persist();
        return ownerOrder(s, order);
      }),

    cancelOrder: ({ slug, orderId, reason }) =>
      run('orders', () => {
        const s = requireShop(slug);
        const order = orderById(s, orderId);
        const r = order.receipt;
        if (!canCancel(r.status)) fail('invalid_transition', 409);
        const why = reason.trim();
        if (!why) fail('invalid_input', 422, { reason: [errorWords('invalid_input')] });
        const at = now().toISOString();
        addStatus(order, 'cancelled', at);
        r.cancelReason = why;
        if (r.paymentStatus === 'paid') {
          r.paymentStatus = 'refunded';
          r.refund = { amount: r.totals.total, reason: why, at };
          r.messages.push({
            id: `${order.id}-refund`,
            kind: 'status',
            at,
            status: null,
            proof: null,
            text: words.shop.thread.refunded(formatPeso(r.totals.total), why),
          });
        } else {
          r.messages.push({
            id: `${order.id}-cancel`,
            kind: 'status',
            at,
            status: null,
            proof: null,
            text: words.shop.thread.cancelled(why),
          });
        }
        giveBackRedeemed(s, order, at);
        persist();
        return ownerOrder(s, order);
      }),

    saveDeliveryInfo: ({ slug, orderId, provider, trackingUrl, riderName, riderPhone }) =>
      run('orders', () => {
        const s = requireShop(slug);
        const order = orderById(s, orderId);
        const r = order.receipt;
        if (r.type !== 'delivery') fail('invalid_transition', 409);
        const at = now().toISOString();
        if (riderName) {
          r.rider = {
            name: riderName.trim(),
            phone: riderPhone?.trim() || null,
            provider: provider?.trim() || null,
          };
          r.messages.push({
            id: `${order.id}-rider-${r.messages.length}`,
            kind: 'rider',
            at,
            status: null,
            proof: null,
            text: words.shop.thread.rider(riderName.trim()),
          });
        }
        if (trackingUrl) {
          r.trackingUrl = z.url().parse(trackingUrl);
          r.messages.push({
            id: `${order.id}-track-${r.messages.length}`,
            kind: 'tracking',
            at,
            status: null,
            proof: null,
            text: words.shop.thread.tracking,
          });
        }
        persist();
        return ownerOrder(s, order);
      }),

    getBookingRules: ({ slug }) =>
      run('orders', () => {
        const s = requireShop(slug);
        const sf = s.shop.storefront;
        return BookingRulesSchema.parse({
          daysAhead: sf.daysAhead ?? 1,
          slotMinutes: sf.slotMinutes ?? 30,
          ordersPerSlot: sf.ordersPerSlot ?? null,
          prepMinutes: sf.prepMinutes ?? 20,
          takeOrdersWhileClosed: sf.takeOrdersWhileClosed ?? false,
        });
      }),

    saveBookingRules: ({ slug, rules }) =>
      run('orders', () => {
        const s = requireShop(slug);
        const parsed = BookingRulesSchema.parse(rules);
        s.shop.storefront.daysAhead = parsed.daysAhead;
        s.shop.storefront.slotMinutes = parsed.slotMinutes;
        s.shop.storefront.ordersPerSlot = parsed.ordersPerSlot;
        s.shop.storefront.prepMinutes = parsed.prepMinutes;
        s.shop.storefront.takeOrdersWhileClosed = parsed.takeOrdersWhileClosed;
        persist();
        return parsed;
      }),

    setPause: ({ slug, mode }) =>
      run('orders', () => {
        const s = requireShop(slug);
        const t = now();
        switch (mode) {
          case 'busy_15':
            s.shop.storefront.pause.paused = false;
            s.shop.storefront.pause.busyUntil = addMinutes(t.toISOString(), 15);
            break;
          case 'busy_30':
            s.shop.storefront.pause.paused = false;
            s.shop.storefront.pause.busyUntil = addMinutes(t.toISOString(), 30);
            break;
          case 'pause':
            s.shop.storefront.pause.paused = true;
            s.shop.storefront.pause.busyUntil = null;
            break;
          case 'resume':
            s.shop.storefront.pause.paused = false;
            s.shop.storefront.pause.busyUntil = null;
            break;
        }
        persist();
        return OpenStateSchema.parse(openState(s.shop.storefront, t));
      }),
  };

  const ownerSamples: DataAdapters['ownerSamples'] = {
    applySamplePack: ({ slug, packSlug }) =>
      run('orders', () => {
        const s = requireShop(slug);
        const pack = packFor(packSlug, true);
        if (!pack) fail('not_found', 404);
        const { variantTemplates, ...catalog } = clone(pack.catalog);
        s.shop.catalog = catalog;
        // The shop keeps its own variants and gains the pack's that it does not have yet.
        const own = s.variantTemplates ?? [];
        s.variantTemplates = [
          ...own,
          ...variantTemplates.filter((t) => !own.some((o) => o.id === t.id)),
        ];
        s.shop.storefront.look = {
          ...clone(pack.storefront.look),
          brandColor: s.shop.storefront.look.brandColor,
        };
        s.shop.storefront.stampCard = clone(pack.storefront.stampCard);
        return publicShop(s);
      }),

    // Removes every sample: the shop then looks like test-blank (tested).
    clearSamples: ({ slug }) =>
      run('orders', () => {
        const s = requireShop(slug);
        const items = s.shop.catalog.items.filter((i) => !i.sample);
        const usedCategories = new Set(items.map((i) => i.categoryId));
        const usedGroups = new Set(items.flatMap((i) => i.optionGroupIds));
        s.shop.catalog = {
          items,
          categories: s.shop.catalog.categories.filter((c) => usedCategories.has(c.id)),
          optionGroups: s.shop.catalog.optionGroups.filter((g) => usedGroups.has(g.id)),
        };
        // Defaults stay; sample variants go unless a remaining item still links them.
        const linked = new Set(items.flatMap((i) => i.axes.map((a) => a.templateId)));
        s.variantTemplates = (s.variantTemplates ?? []).filter(
          (t) => !t.sample || linked.has(t.id),
        );
        s.shop.storefront.info.logo = null;
        s.shop.storefront.info.tagline = null;
        s.shop.storefront.info.about = null;
        s.shop.storefront.look.banners = [];
        s.shop.storefront.look.announcement = null;
        s.shop.storefront.stampCard.status = 'off';
        return publicShop(s);
      }),
  };

  function isRewardItem(s: ShopState, itemId: string): boolean {
    const reward = s.shop.storefront.stampCard.reward;
    return reward.kind === 'free_item' && reward.itemId === itemId;
  }

  const ownerCatalog: DataAdapters['ownerCatalog'] = {
    listCategories: async () => {
      const slug = await resolveOwnerShopSlug();
      return run('catalog', () => {
        const s = requireShop(slug);
        // The dev Empty switch shows the first-run screens (decision T45).
        if (scenario().empty) return [];
        return s.shop.catalog.categories
          .map((c) => CategorySchema.parse(c))
          .sort((a, b) => a.sort - b.sort);
      });
    },

    saveCategory: async (input) => {
      const slug = await resolveOwnerShopSlug();
      const draft = CategoryDraftSchema.parse(input);
      return run('catalog', () => {
        const s = requireShop(slug);
        if (draft.id) {
          const existing = s.shop.catalog.categories.find((c) => c.id === draft.id);
          if (!existing) fail('not_found', 404);
          existing.name = draft.name;
          existing.icon = draft.icon;
          return CategorySchema.parse(existing);
        }
        const maxSort = s.shop.catalog.categories.reduce((m, c) => Math.max(m, c.sort), -1);
        const newCat = {
          id: `cat_${Math.random().toString(36).slice(2, 9)}`,
          name: draft.name,
          icon: draft.icon,
          sort: maxSort + 1,
        };
        s.shop.catalog.categories.push(newCat);
        return CategorySchema.parse(newCat);
      });
    },

    removeCategory: async ({ id }) => {
      const slug = await resolveOwnerShopSlug();
      return run('catalog', () => {
        const s = requireShop(slug);
        const hasItems = s.shop.catalog.items.some((i) => i.categoryId === id);
        if (hasItems) {
          fail('category_not_empty', 400);
        }
        s.shop.catalog.categories = s.shop.catalog.categories.filter((c) => c.id !== id);
      });
    },

    listItems: async () => {
      const slug = await resolveOwnerShopSlug();
      return run('catalog', () => {
        const s = requireShop(slug);
        // The dev Empty switch shows the first-run screens (decision T45).
        if (scenario().empty) return [];
        return s.shop.catalog.items.map((item) => {
          const hasOrders = s.orders.some((o) => o.receipt.lines.some((l) => l.itemId === item.id));
          return OwnerItemSchema.parse({ ...item, hasOrders });
        });
      });
    },

    saveItem: async ({ id, draft }) => {
      const slug = await resolveOwnerShopSlug();
      const parsed = ItemDraftSchema.parse(draft);
      return run('catalog', () => {
        const s = requireShop(slug);
        const reward = s.shop.storefront.stampCard.reward;
        if (reward.kind === 'free_item' && reward.itemId === id && reward.variantId) {
          if (!parsed.variants.some((v) => v.id === reward.variantId)) {
            fail('variant_is_reward', 400);
          }
          if (parsed.status !== 'active') fail('item_is_reward', 409);
        }
        for (const axis of parsed.axes) {
          if (axis.templateId) {
            const tmpl = s.variantTemplates?.find((t) => t.id === axis.templateId);
            if (!tmpl || !isInSync(axis, tmpl)) fail('invalid_input', 400);
          }
        }
        // The server owns every price: base + option changes, or the special price.
        const priced = buildVersions(parsed.axes, parsed.variants, parsed.basePrice);
        if (id) {
          const existing = s.shop.catalog.items.find((i) => i.id === id);
          if (!existing) fail('not_found', 404);
          const hasOrders = s.orders.some((o) => o.receipt.lines.some((l) => l.itemId === id));
          existing.name = parsed.name;
          existing.description = parsed.description;
          existing.categoryId = parsed.categoryId;
          existing.photos = parsed.photos;
          existing.basePrice = parsed.basePrice;
          existing.axes = parsed.axes;
          existing.variants = priced;
          existing.optionGroupIds = parsed.optionGroupIds;
          existing.pairingIds = parsed.pairingIds;
          existing.featured = parsed.featured;
          existing.isNew = parsed.isNew;
          existing.status = parsed.status;
          return OwnerItemSchema.parse({ ...existing, hasOrders });
        }
        const newItemId = `item_${Math.random().toString(36).slice(2, 9)}`;
        const variants = priced.map((v, i) => ({
          ...v,
          id: v.id ? v.id : `${newItemId}_var_${i + 1}`,
        }));
        const newItem = {
          id: newItemId,
          categoryId: parsed.categoryId,
          name: parsed.name,
          description: parsed.description,
          photos: parsed.photos,
          basePrice: parsed.basePrice,
          axes: parsed.axes,
          variants,
          optionGroupIds: parsed.optionGroupIds,
          pairingIds: parsed.pairingIds,
          featured: parsed.featured,
          isNew: parsed.isNew,
          noticeDays: parsed.noticeDays,
          dailyLimit: parsed.dailyLimit,
          status: parsed.status,
          sample: false,
        };
        s.shop.catalog.items.push(newItem);
        return OwnerItemSchema.parse({ ...newItem, hasOrders: false });
      });
    },

    removeItem: async ({ id }) => {
      const slug = await resolveOwnerShopSlug();
      return run('catalog', () => {
        const s = requireShop(slug);
        const item = s.shop.catalog.items.find((i) => i.id === id);
        if (!item) fail('not_found', 404);
        const hasOrders = s.orders.some((o) => o.receipt.lines.some((l) => l.itemId === id));
        if (hasOrders) {
          fail('item_has_orders', 400);
        }
        if (isRewardItem(s, id)) fail('item_is_reward', 409);
        s.shop.catalog.items = s.shop.catalog.items.filter((i) => i.id !== id);
      });
    },

    setItemStatus: async ({ id, status }) => {
      const slug = await resolveOwnerShopSlug();
      return run('catalog', () => {
        const s = requireShop(slug);
        const item = s.shop.catalog.items.find((i) => i.id === id);
        if (!item) fail('not_found', 404);
        // The prize item can't be hidden or archived while it is the prize (M10).
        if (status !== 'active' && isRewardItem(s, id)) fail('item_is_reward', 409);
        const hasOrders = s.orders.some((o) => o.receipt.lines.some((l) => l.itemId === id));
        item.status = status;
        return OwnerItemSchema.parse({ ...item, hasOrders });
      });
    },

    setSoldOut: async ({ variantId, availability, soldOutUntil }) => {
      const slug = await resolveOwnerShopSlug();
      return run('catalog', () => {
        const s = requireShop(slug);
        const item = s.shop.catalog.items.find((i) => i.variants.some((v) => v.id === variantId));
        if (!item) fail('not_found', 404);
        const variant = item.variants.find((v) => v.id === variantId);
        if (!variant) fail('not_found', 404);
        variant.availability = availability;
        variant.soldOutUntil =
          soldOutUntil ??
          (availability === 'sold_out_today' ? nextOpening(s.shop.storefront, now()) : null);
        const hasOrders = s.orders.some((o) => o.receipt.lines.some((l) => l.itemId === item.id));
        return OwnerItemSchema.parse({ ...item, hasOrders });
      });
    },

    listOptionGroups: async () => {
      const slug = await resolveOwnerShopSlug();
      return run('catalog', () => {
        const s = requireShop(slug);
        // The dev Empty switch shows the first-run screens (decision T45).
        if (scenario().empty) return [];
        return s.shop.catalog.optionGroups.map((group) => {
          const usedBy = s.shop.catalog.items.filter((i) =>
            i.optionGroupIds.includes(group.id),
          ).length;
          return OwnerOptionGroupSchema.parse({ ...group, usedBy });
        });
      });
    },

    saveOptionGroup: async (input) => {
      const slug = await resolveOwnerShopSlug();
      const parsed = OptionGroupDraftSchema.parse(input);
      return run('catalog', () => {
        const s = requireShop(slug);
        const options = parsed.options.map((opt, i) => ({
          ...opt,
          id: opt.id ?? `opt_${Math.random().toString(36).slice(2, 9)}_${i}`,
        }));
        if (parsed.id) {
          const existing = s.shop.catalog.optionGroups.find((g) => g.id === parsed.id);
          if (!existing) fail('not_found', 404);
          existing.name = parsed.name;
          existing.min = parsed.min;
          existing.max = parsed.max;
          existing.options = options;
          const usedBy = s.shop.catalog.items.filter((i) =>
            i.optionGroupIds.includes(parsed.id!),
          ).length;
          return OwnerOptionGroupSchema.parse({ ...existing, usedBy });
        }
        const newGroup = {
          id: `grp_${Math.random().toString(36).slice(2, 9)}`,
          name: parsed.name,
          min: parsed.min,
          max: parsed.max,
          options,
        };
        s.shop.catalog.optionGroups.push(newGroup);
        return OwnerOptionGroupSchema.parse({ ...newGroup, usedBy: 0 });
      });
    },

    removeOptionGroup: async ({ id }) => {
      const slug = await resolveOwnerShopSlug();
      return run('catalog', () => {
        const s = requireShop(slug);
        for (const item of s.shop.catalog.items) {
          item.optionGroupIds = item.optionGroupIds.filter((gid) => gid !== id);
        }
        s.shop.catalog.optionGroups = s.shop.catalog.optionGroups.filter((g) => g.id !== id);
      });
    },

    listVariantTemplates: async () => {
      const slug = await resolveOwnerShopSlug();
      return run('catalog', () => {
        const s = requireShop(slug);
        if (scenario().empty) return [];
        return templatesOf(s).map((t) => ownerTemplate(s, t));
      });
    },

    saveVariantTemplate: async (input) => {
      const slug = await resolveOwnerShopSlug();
      const { draft, applyToItems } = SaveVariantTemplateInputSchema.parse(input);
      return run('catalog', () => {
        const s = requireShop(slug);
        const templates = templatesOf(s);
        const options = draft.options.map((opt) => ({
          id: opt.id ?? newId('opt'),
          name: opt.name,
        }));
        const result: SaveVariantTemplateResult = {
          template: { id: '', name: '', options: [], sample: false, usedBy: 0 },
          updatedItemIds: [],
          unlinkedItemIds: [],
          skippedItemIds: [],
          soldOutItemIds: [],
        };

        if (!draft.id) {
          if (templates.length >= VARIANT_LIMITS.templates) fail('invalid_input', 400);
          const created: VariantTemplate = {
            id: newId('vt'),
            name: draft.name,
            options,
            sample: false,
          };
          templates.push(created);
          return SaveVariantTemplateResultSchema.parse({
            ...result,
            template: ownerTemplate(s, created),
          });
        }

        const index = templates.findIndex((t) => t.id === draft.id);
        const before = templates[index];
        if (!before) fail('not_found', 404);
        const after: VariantTemplate = {
          id: before.id,
          name: draft.name,
          options,
          sample: before.sample,
        };
        const mode = applyToItems ? 'update' : 'keep';

        // Work on copies first, so a blocked prize leaves every item as it was.
        const nextItems = s.shop.catalog.items.map((item) => {
          const applied = applyTemplateToItem(item, before, after, mode);
          if (applied.outcome === 'updated') result.updatedItemIds.push(item.id);
          if (applied.outcome === 'unlinked') result.unlinkedItemIds.push(item.id);
          if (applied.outcome === 'skipped') result.skippedItemIds.push(item.id);
          if (applied.soldOut) result.soldOutItemIds.push(item.id);
          return applied.item;
        });
        const reward = s.shop.storefront.stampCard.reward;
        if (reward.kind === 'free_item' && reward.variantId) {
          const prizeItem = nextItems.find((i) => i.id === reward.itemId);
          if (prizeItem && !prizeItem.variants.some((v) => v.id === reward.variantId)) {
            fail('variant_is_reward', 400);
          }
        }
        s.shop.catalog.items = nextItems;
        templates[index] = after;
        return SaveVariantTemplateResultSchema.parse({
          ...result,
          template: ownerTemplate(s, after),
        });
      });
    },

    removeVariantTemplate: async ({ id }) => {
      const slug = await resolveOwnerShopSlug();
      return run('catalog', () => {
        const s = requireShop(slug);
        const templates = templatesOf(s);
        if (!templates.some((t) => t.id === id)) fail('not_found', 404);
        const unlinkedItemIds: string[] = [];
        for (const item of s.shop.catalog.items) {
          if (!item.axes.some((a) => a.templateId === id)) continue;
          item.axes = item.axes.map((a) => (a.templateId === id ? unlinkChoice(a) : a));
          unlinkedItemIds.push(item.id);
        }
        s.variantTemplates = templates.filter((t) => t.id !== id);
        return RemoveVariantTemplateResultSchema.parse({ unlinkedItemIds });
      });
    },

    saveSortOrder: async (input) => {
      const slug = await resolveOwnerShopSlug();
      const { kind, ids } = SortOrderInputSchema.parse(input);
      return run('catalog', () => {
        const s = requireShop(slug);
        if (kind === 'category') {
          const catMap = new Map(s.shop.catalog.categories.map((c) => [c.id, c]));
          const sorted: typeof s.shop.catalog.categories = [];
          ids.forEach((id, idx) => {
            const cat = catMap.get(id);
            if (cat) {
              cat.sort = idx;
              sorted.push(cat);
              catMap.delete(id);
            }
          });
          let curSort = sorted.length;
          for (const rem of catMap.values()) {
            rem.sort = curSort++;
            sorted.push(rem);
          }
          s.shop.catalog.categories = sorted;
        } else if (kind === 'item') {
          const itemMap = new Map(s.shop.catalog.items.map((i) => [i.id, i]));
          const sorted: typeof s.shop.catalog.items = [];
          for (const id of ids) {
            const item = itemMap.get(id);
            if (item) {
              sorted.push(item);
              itemMap.delete(id);
            }
          }
          for (const rem of itemMap.values()) {
            sorted.push(rem);
          }
          s.shop.catalog.items = sorted;
        }
      });
    },

    createUploadUrl: async ({ kind, bytes }) => {
      UploadKindEnum.parse(kind);
      // NestJS checks the shop's storage before it signs an upload (T66).
      await settingsMock.reserveUpload(kind, bytes);
      return run('catalog', () => {
        const path = `uploads/${kind}/${Date.now()}-${makeToken(rng).slice(0, 6)}.webp`;
        return UploadResultSchema.parse({ uploadUrl: `mock://upload/${path}`, path });
      });
    },
  };

  // Owner Members (decisions T57 to T60). The shop comes from the owner's login, like the catalog.
  async function ownerShop(): Promise<string> {
    return resolveOwnerShopSlug();
  }

  function membersShop(slug: string): ShopState {
    const s = requireShop(slug);
    if (scenario().empty) {
      s.members = [];
      s.archive = [];
    }
    return s;
  }

  function personById(s: ShopState, customerId: string): Person {
    const person = peopleOf(s).find((p) => p.id === customerId);
    if (!person) fail('not_found', 404);
    return person;
  }

  function memberById(s: ShopState, customerId: string): MemberRecord {
    const member = s.members.find((m) => memberId(m) === customerId);
    if (!member) fail('not_found', 404);
    return member;
  }

  function detailOf(s: ShopState, member: MemberRecord) {
    return memberDetail(s, personById(s, memberId(member)), now());
  }

  function cardOf(s: ShopState) {
    return StampCardSettingsSchema.parse(s.shop.storefront.stampCard);
  }

  function counterChange(s: ShopState, member: MemberRecord, entry: StoredLedgerEntry) {
    const index = member.ledger.indexOf(entry);
    return CounterChangeSchema.parse({
      member: detailOf(s, member),
      entryId: entryIdOf(member, entry, index),
      undoUntil: new Date(new Date(entry.at).getTime() + UNDO_SECONDS * 1000).toISOString(),
    });
  }

  function claimById(s: ShopState, claimId: string): { member: MemberRecord; claim: StoredClaim } {
    for (const member of s.members) {
      const claim = member.claims.find((c) => claimIdOf(member, c) === claimId);
      if (claim) return { member, claim };
    }
    fail('not_found', 404);
  }

  function capCheck(member: MemberRecord): void {
    if (changesLeftToday(counterEntries(member), now()) <= 0) fail('stamp_cap_reached', 429);
  }

  /** A prize handed over at once at the counter, or a claim for later; both hold a piece (D8). */
  function newClaim(s: ShopState, member: MemberRecord, at: string, given: boolean): StoredClaim {
    const card = s.shop.storefront.stampCard;
    if (card.reward.quantityLeft !== null && card.reward.quantityLeft <= 0)
      fail('reward_all_claimed', 409);
    if (card.reward.onePerCustomer && member.claims.some((c) => c.status !== 'cancelled'))
      fail('reward_unavailable', 409);
    if (card.reward.quantityLeft !== null) card.reward.quantityLeft -= 1;
    const code = `${s.shop.storefront.slug.slice(0, 2).toUpperCase()}-${makeToken(rng).slice(0, 6).toUpperCase()}`;
    const claim: StoredClaim = {
      id: newId('claim'),
      code,
      status: given ? 'given' : 'pending',
      qrUrl: memberQrUrl(code),
      title: card.reward.title,
      createdAt: at,
      givenAt: given ? at : null,
      cancelledAt: null,
      cancelReason: null,
    };
    member.claims.push(claim);
    return claim;
  }

  const ownerMembers: DataAdapters['ownerMembers'] = {
    getStampCard: async () => {
      const slug = await ownerShop();
      return run('members', () => cardOf(requireShop(slug)));
    },

    previewStampCardChange: async (input) => {
      const slug = await ownerShop();
      const next = StampCardSettingsSchema.parse(input);
      return run('members', () => {
        const s = membersShop(slug);
        const card = s.shop.storefront.stampCard;
        const impact = stampImpact(
          s.members.map((m) => memberBalance(m)),
          card.rule.stampsNeeded,
          next.rule.stampsNeeded,
        );
        return StampCardImpactSchema.parse({
          ...impact,
          pendingClaims: s.members.flatMap((m) => m.claims).filter((c) => c.status === 'pending')
            .length,
        });
      });
    },

    saveStampCard: async (input) => {
      const slug = await ownerShop();
      const parsed = StampCardSettingsSchema.safeParse(input);
      if (!parsed.success) fail('invalid_input', 422);
      const next = parsed.data;
      return run('members', () => {
        const s = requireShop(slug);
        const card = s.shop.storefront.stampCard;
        if (next.reward.kind === 'free_item') {
          const item = s.shop.catalog.items.find((i) => i.id === next.reward.itemId);
          if (
            !item ||
            item.status !== 'active' ||
            !item.variants.some((v) => v.id === next.reward.variantId)
          )
            fail('item_unavailable', 409);
        }
        // Pieces can be added, never set below what claims already hold (M7). Only custom prizes have pieces.
        const held =
          card.reward.quantityTotal !== null && card.reward.quantityLeft !== null
            ? card.reward.quantityTotal - card.reward.quantityLeft
            : 0;
        const total = next.reward.kind === 'custom' ? next.reward.quantityTotal : null;
        if (total !== null && total < held)
          fail('invalid_input', 422, { quantityTotal: [membersWords.piecesBelowHeld(held)] });
        s.shop.storefront.stampCard = {
          status: next.status,
          rule: next.rule,
          reward: {
            ...next.reward,
            quantityTotal: total,
            quantityLeft: total === null ? null : total - held,
          },
        };
        persist();
        return cardOf(s);
      });
    },

    setStampCardStatus: async ({ status }) => {
      const slug = await ownerShop();
      return run('members', () => {
        const s = requireShop(slug);
        s.shop.storefront.stampCard.status = StampCardStatusEnum.parse(status);
        persist();
        return cardOf(s);
      });
    },

    getMembersOverview: async () => {
      const slug = await ownerShop();
      return run('members', () => {
        const s = membersShop(slug);
        const t = now();
        return overview(s, peopleOf(s), t);
      });
    },

    listCustomers: async (input) => {
      const slug = await ownerShop();
      const parsed = ListCustomersInputSchema.parse(input);
      return run('members', () => {
        const s = membersShop(slug);
        const t = now();
        return listPage(
          peopleOf(s).map((p) => customerRow(s, p, t)),
          parsed,
        );
      });
    },

    getMember: async ({ customerId }) => {
      const slug = await ownerShop();
      return run('members', () => {
        const s = membersShop(slug);
        return memberDetail(s, personById(s, customerId), now());
      });
    },

    findMember: async ({ code }) => {
      const slug = await ownerShop();
      return run('members', () => {
        const s = membersShop(slug);
        const typed = normaliseMemberCode(code);
        // A prize code opens its member with the claim to give (M13); a member code matches exactly (D7).
        for (const member of s.members) {
          const claim = member.claims.find((c) => normaliseMemberCode(c.code) === typed);
          if (claim)
            return FoundMemberSchema.parse({
              customerId: memberId(member),
              claimId: claim.status === 'pending' ? claimIdOf(member, claim) : null,
            });
        }
        const member = s.members.find((m) => memberCodeMatches(m.memberCode, code));
        if (!member) fail('not_found', 404);
        return FoundMemberSchema.parse({ customerId: memberId(member), claimId: null });
      });
    },

    giveStamp: async ({ customerId, clientKey, confirmRecent }) => {
      const slug = await ownerShop();
      return run('members', () => {
        const s = membersShop(slug);
        const member = memberById(s, customerId);
        // A retry of the same tap returns the first result (D2).
        const again = member.ledger.find((e) => e.clientKey === clientKey);
        if (again) return counterChange(s, member, again);
        if (s.shop.storefront.stampCard.status !== 'on') fail('stamp_card_off', 409);
        capCheck(member);
        if (!confirmRecent && recentCounterStamp(counterEntries(member), now()) !== null)
          fail('stamp_recent', 409);
        const entry: StoredLedgerEntry = {
          id: newId('l'),
          kind: 'given',
          delta: 1,
          reasonCategory: 'counter_purchase',
          orderNo: null,
          at: now().toISOString(),
          note: null,
          byOwner: true,
          undone: false,
          clientKey,
        };
        member.ledger.push(entry);
        persist();
        return counterChange(s, member, entry);
      });
    },

    undoChange: async ({ customerId, entryId }) => {
      const slug = await ownerShop();
      return run('members', () => {
        const s = membersShop(slug);
        const member = memberById(s, customerId);
        const index = member.ledger.findIndex((e, i) => entryIdOf(member, e, i) === entryId);
        const entry = member.ledger[index];
        if (!entry) fail('not_found', 404);
        const undoable =
          (entry.byOwner ?? false) &&
          !(entry.undone ?? false) &&
          (entry.kind === 'given' || entry.kind === 'used' || entry.kind === 'claimed');
        if (!undoable || !canUndo(entry.at, now())) fail('undo_expired', 409);
        if (memberBalance(member) - entry.delta < 0) fail('undo_expired', 409);
        if (entry.kind === 'claimed') {
          // The prize handed over by mistake goes back on the shelf.
          const claim = [...member.claims].reverse().find((c) => c.createdAt === entry.at);
          if (claim) {
            claim.status = 'cancelled';
            claim.cancelledAt = now().toISOString();
            claim.cancelReason = 'other';
          }
          const reward = s.shop.storefront.stampCard.reward;
          if (reward.quantityLeft !== null) reward.quantityLeft += 1;
        }
        entry.undone = true;
        member.ledger.push({
          id: newId('l'),
          kind: 'undone',
          delta: -entry.delta,
          reasonCategory: entry.reasonCategory,
          orderNo: null,
          at: now().toISOString(),
          note: null,
          byOwner: true,
          undone: true,
        });
        persist();
        return detailOf(s, member);
      });
    },

    adjustStamps: async (input) => {
      const slug = await ownerShop();
      const parsed = AdjustStampsInputSchema.parse(input);
      return run('members', () => {
        const s = membersShop(slug);
        const member = memberById(s, parsed.customerId);
        const card = s.shop.storefront.stampCard;
        if (parsed.delta > 0 && card.status !== 'on') fail('stamp_card_off', 409);
        capCheck(member);
        // Never below 0 (M6).
        if (memberBalance(member) + parsed.delta < 0) fail('stamps_insufficient', 409);
        member.ledger.push({
          id: newId('l'),
          kind: parsed.delta > 0 ? 'given' : 'removed',
          delta: parsed.delta,
          reasonCategory: parsed.reason,
          orderNo: null,
          at: now().toISOString(),
          note: parsed.note ? parsed.note : null,
          byOwner: true,
          undone: false,
        });
        persist();
        return detailOf(s, member);
      });
    },

    useReward: async ({ customerId, clientKey }) => {
      const slug = await ownerShop();
      return run('members', () => {
        const s = membersShop(slug);
        const member = memberById(s, customerId);
        const again = member.ledger.find((e) => e.clientKey === clientKey);
        if (again) return counterChange(s, member, again);
        const card = s.shop.storefront.stampCard;
        // Paused keeps ready rewards usable (M1); Off stops using (M2).
        if (card.status === 'off') fail('reward_unavailable', 409);
        const goal = card.rule.stampsNeeded;
        if (memberBalance(member) < goal) fail('stamps_insufficient', 409);
        const at = now().toISOString();
        if (card.reward.kind === 'custom') newClaim(s, member, at, true);
        const entry: StoredLedgerEntry = {
          id: newId('l'),
          kind: card.reward.kind === 'custom' ? 'claimed' : 'used',
          delta: -goal,
          reasonCategory: null,
          orderNo: null,
          at,
          note: null,
          byOwner: true,
          undone: false,
          clientKey,
        };
        member.ledger.push(entry);
        persist();
        return counterChange(s, member, entry);
      });
    },

    saveMemberNote: async ({ customerId, note }) => {
      const slug = await ownerShop();
      const clean = note?.trim() ? note.trim() : null;
      if (clean !== null && clean.length > 300) fail('invalid_input', 422);
      return run('members', () => {
        const s = membersShop(slug);
        const member = memberById(s, customerId);
        member.note = clean;
        persist();
        return detailOf(s, member);
      });
    },

    listRewardClaims: async () => {
      const slug = await ownerShop();
      return run('members', () => {
        const s = membersShop(slug);
        // Waiting longest first, then the rest newest first.
        return s.members
          .flatMap((m) => m.claims.map((c) => ownerClaim(m, c)))
          .sort((a, b) =>
            a.status === 'pending' && b.status === 'pending'
              ? a.createdAt.localeCompare(b.createdAt)
              : a.status === 'pending'
                ? -1
                : b.status === 'pending'
                  ? 1
                  : b.createdAt.localeCompare(a.createdAt),
          );
      });
    },

    giveClaim: async ({ claimId }) => {
      const slug = await ownerShop();
      return run('members', () => {
        const s = membersShop(slug);
        const { member, claim } = claimById(s, claimId);
        if (claim.status !== 'pending') fail('claim_not_pending', 409);
        claim.status = 'given';
        claim.givenAt = now().toISOString();
        persist();
        return ownerClaim(member, claim);
      });
    },

    cancelClaim: async ({ claimId, reason }) => {
      const slug = await ownerShop();
      const why = ClaimCancelReasonEnum.parse(reason);
      return run('members', () => {
        const s = membersShop(slug);
        const { member, claim } = claimById(s, claimId);
        if (claim.status !== 'pending') fail('claim_not_pending', 409);
        const at = now().toISOString();
        claim.status = 'cancelled';
        claim.cancelledAt = at;
        claim.cancelReason = why;
        // The stamps and the piece come back (M7).
        const taken = member.ledger.find((e) => e.kind === 'claimed' && e.at === claim.createdAt);
        member.ledger.push({
          id: newId('l'),
          kind: 'returned',
          delta: taken ? -taken.delta : s.shop.storefront.stampCard.rule.stampsNeeded,
          reasonCategory: null,
          orderNo: null,
          at,
          note: null,
          byOwner: true,
          undone: false,
        });
        const reward = s.shop.storefront.stampCard.reward;
        if (reward.quantityLeft !== null && reward.quantityTotal !== null)
          reward.quantityLeft = Math.min(reward.quantityTotal, reward.quantityLeft + 1);
        persist();
        return ownerClaim(member, claim);
      });
    },
  };

  return {
    storefront,
    customerAuth,
    ownerOrders,
    ownerSamples,
    ownerCatalog,
    ownerMembers,
    ownerSettings: settingsMock.adapter,
    ownerHome: homeMock.adapter,
    now,
    reset() {
      state = { shops: new Map(), session: null, codes: {} };
      settingsMock.reset();
      homeMock.reset();
      appliedAs = new Map();
      saved = null;
      rng = mulberry32(seed);
      persistence?.save(null);
    },
    inspect: (slug) => shopState(slug),
  };
}

/** Methods an order type allows (cash for walk-in and pickup, COD for delivery). */
export { methodsFor, receiptLines };
