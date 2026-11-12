// The mock back end for owner Home (decisions T69 to T71): same names, inputs and outputs as docs/api.md
// "Home (owner)". Every number is worked out on each read from orders, members' past orders, the stamp
// history and the menu, with the shared rules in @smartapp/core (H14: nothing is stored).
import {
  buildHomePeriod,
  buildHomeSummary,
  buildHomeTrends,
  countsAsSale,
  HomePeriodDataSchema,
  HomeRangeEnum,
  IsoDateSchema,
  HomeSummarySchema,
  HomeTrendsSchema,
  isFinal,
  manilaDate,
  setupSteps,
  sharePercent,
  variantAvailability,
  type HomeBooking,
  type HomeItem,
  type HomeMembers,
  type HomeSale,
  type MembersOverview,
  type PublicShop,
} from '@smartapp/core';
import type { OwnerHomeAdapter } from '../adapters/types';
import { pastSales, saleOfOrder } from './history';
import type { MockScenario } from './scenario-state';
import type { ShopState } from './state';

export interface HomeMockDeps {
  run: <T>(area: 'home', fn: () => T) => Promise<T>;
  ownerShop: () => Promise<string>;
  // The shop with the scenario applied (empty clears members and past orders).
  homeShop: (slug: string) => ShopState;
  publicShop: (s: ShopState) => PublicShop;
  membersOverview: (s: ShopState) => MembersOverview;
  now: () => Date;
  scenario: () => MockScenario;
  seed: number;
}

const STAMP_KINDS = new Set(['earned', 'given']);

function homeItems(shop: PublicShop, now: Date): HomeItem[] {
  return shop.catalog.items.map((i) => ({
    id: i.id,
    name: i.name,
    photo: i.photos[0] ?? null,
    status: i.status,
    isNew: i.isNew,
    addedAt: null,
    soldOut: i.variants.every((v) => variantAvailability(v, now) !== 'available'),
  }));
}

function membersToday(
  s: ShopState,
  shop: PublicShop,
  overview: MembersOverview,
  todaySales: readonly HomeSale[],
  now: Date,
): HomeMembers {
  const today = manilaDate(now);
  const isToday = (at: string): boolean => manilaDate(at) === today && at <= now.toISOString();
  let stamps = 0;
  let rewardsUsed = 0;
  for (const m of s.members) {
    for (const e of m.ledger) {
      if ((e.undone ?? false) || !isToday(e.at)) continue;
      if (STAMP_KINDS.has(e.kind) && e.delta > 0) stamps += e.delta;
      if (e.kind === 'used') rewardsUsed += 1;
    }
    for (const c of m.claims)
      if (c.status === 'given' && c.givenAt && isToday(c.givenAt)) rewardsUsed += 1;
  }
  const sales = todaySales.reduce((n, x) => n + x.total, 0);
  const memberSales = todaySales.reduce((n, x) => (x.member ? n + x.total : n), 0);
  return {
    cardOn: shop.storefront.stampCard.status !== 'off',
    joined: s.members.filter((m) => isToday(m.joinedAt)).length,
    stamps,
    rewardsUsed,
    ready: overview.counts.ready ?? 0,
    prizesToGive: overview.prizesToGive,
    memberShare: sharePercent(memberSales, sales),
  };
}

export function createHomeMock(deps: HomeMockDeps): {
  adapter: OwnerHomeAdapter;
  reset: () => void;
} {
  // Past days don't change during a day, so each shop's history is made once per business day.
  const cache = new Map<string, HomeSale[]>();

  function history(s: ShopState, shop: PublicShop, now: Date): HomeSale[] {
    const key = `${shop.storefront.slug}|${manilaDate(now)}`;
    let past = cache.get(key);
    if (!past) {
      past = pastSales(s, shop, deps.seed, now);
      cache.set(key, past);
    }
    return past;
  }

  interface Read {
    s: ShopState;
    shop: PublicShop;
    now: Date;
    sales: HomeSale[];
    todaySales: HomeSale[];
    bookings: HomeBooking[];
  }

  function read(slug: string): Read {
    const now = deps.now();
    const sc = deps.scenario();
    const s = deps.homeShop(slug);
    const shop = deps.publicShop(s);
    const today = manilaDate(now);
    const noOrders = sc.empty || sc.ordersMode === 'empty';
    const live = noOrders ? [] : s.orders.filter((o) => countsAsSale(o.receipt, now));
    const todaySales = live
      .filter((o) => o.businessDate === today && o.receipt.placedAt <= now.toISOString())
      .map(saleOfOrder);
    const past = sc.empty ? [] : history(s, shop, now);
    const notice = new Set(shop.catalog.items.filter((i) => i.noticeDays > 0).map((i) => i.id));
    const bookings = live
      .filter((o) => !isFinal(o.receipt.status) && manilaDate(o.receipt.dueAt) > today)
      .map((o) => ({
        dueAt: o.receipt.dueAt,
        total: o.receipt.totals.total,
        needsNotice: o.receipt.lines.some((l) => notice.has(l.itemId)),
      }));
    return { s, shop, now, sales: [...past, ...todaySales], todaySales, bookings };
  }

  const adapter: OwnerHomeAdapter = {
    getHome: async () => {
      const slug = await deps.ownerShop();
      return deps.run('home', () => {
        const r = read(slug);
        const overview = deps.membersOverview(r.s);
        const items = homeItems(r.shop, r.now);
        const sf = r.shop.storefront;
        return HomeSummarySchema.parse(
          buildHomeSummary({
            now: r.now,
            storefront: sf,
            sales: r.sales,
            bookings: r.bookings,
            items,
            members: membersToday(r.s, r.shop, overview, r.todaySales, r.now),
            joinedAt: r.s.members.map((m) => m.joinedAt),
            setup: setupSteps({
              activeItems: items.filter((i) => i.status === 'active').length,
              hasLogo: sf.info.logo !== null,
              hasBrandColour: sf.look.brandColor.length > 0,
              hours: sf.hours.length,
              payments: sf.payments.length,
              stampCardOn: sf.stampCard.status !== 'off',
              anyOrder: r.sales.length > 0,
            }),
          }),
        );
      });
    },

    getHomeTrends: async (input) => {
      const slug = await deps.ownerShop();
      const range = HomeRangeEnum.parse(input.range);
      return deps.run('home', () => {
        const r = read(slug);
        return HomeTrendsSchema.parse(
          buildHomeTrends({
            now: r.now,
            range,
            sales: r.sales,
            joinedAt: r.s.members.map((m) => m.joinedAt),
          }),
        );
      });
    },

    getHomePeriod: async (input) => {
      const slug = await deps.ownerShop();
      const dates = { from: IsoDateSchema.parse(input.from), to: IsoDateSchema.parse(input.to) };
      return deps.run('home', () => {
        const r = read(slug);
        return HomePeriodDataSchema.parse(
          buildHomePeriod({
            now: r.now,
            dates,
            storefront: r.shop.storefront,
            sales: r.sales,
            items: homeItems(r.shop, r.now),
          }),
        );
      });
    },
  };

  return { adapter, reset: () => cache.clear() };
}
