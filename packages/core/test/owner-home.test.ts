import { describe, expect, it } from 'vitest';
import {
  bestSellers,
  bucketDays,
  buildHomePeriod,
  buildHomeTrends,
  clampPeriod,
  countsAsSale,
  heatExtremes,
  homeNeeds,
  homePace,
  hourBars,
  idleItemCount,
  manilaToDate,
  median,
  needsProofCheck,
  paceVerdict,
  periodDates,
  periodOf,
  salesTotal,
  setupSteps,
  type HomeItem,
  type HomeSale,
  type NeedOrder,
} from '../src/index.js';

const at = (date: string, clock: string): string => manilaToDate(date, clock).toISOString();

function sale(placedAt: string, total: number, patch: Partial<HomeSale> = {}): HomeSale {
  return {
    placedAt,
    total,
    type: 'pickup',
    method: 'gcash',
    paid: true,
    member: false,
    lines: [{ itemId: 'a', name: 'Adobo', qty: 1, lineTotal: total }],
    ...patch,
  };
}

const base = {
  status: 'placed',
  paymentStatus: 'unpaid',
  paymentMethod: 'cash',
  expiresAt: null,
} as const;

describe('sales rule (H2)', () => {
  const now = at('2026-11-06', '12:00');
  it('leaves out cancelled, expired and transfers whose pay window ended', () => {
    expect(countsAsSale(base, now)).toBe(true);
    expect(countsAsSale({ ...base, status: 'cancelled' }, now)).toBe(false);
    expect(countsAsSale({ ...base, status: 'expired' }, now)).toBe(false);
    const late = { ...base, paymentMethod: 'gcash', expiresAt: at('2026-11-06', '11:30') } as const;
    expect(countsAsSale(late, now)).toBe(false);
    expect(countsAsSale({ ...late, expiresAt: at('2026-11-06', '12:30') }, now)).toBe(true);
    expect(
      salesTotal(
        [
          { ...base, total: 100 },
          { ...base, status: 'cancelled', total: 50 },
        ],
        now,
      ),
    ).toBe(100);
  });

  it('a sent transfer needs a check', () => {
    expect(
      needsProofCheck({ status: 'placed', paymentStatus: 'pending', paymentMethod: 'gcash' }),
    ).toBe(true);
    expect(
      needsProofCheck({ status: 'placed', paymentStatus: 'pending', paymentMethod: 'cash' }),
    ).toBe(false);
    expect(
      needsProofCheck({ status: 'placed', paymentStatus: 'unpaid', paymentMethod: 'gcash' }),
    ).toBe(false);
  });
});

describe('median and pace (H5, H6)', () => {
  it('takes the middle value', () => {
    expect(median([])).toBeNull();
    expect(median([5, 1, 3])).toBe(3);
    expect(median([1, 2, 3, 10])).toBe(2.5);
  });

  it('words today against a usual day, 10% either way', () => {
    expect(paceVerdict(1000, null)).toBeNull();
    expect(paceVerdict(0, 0)).toBeNull();
    expect(paceVerdict(50, 0)).toBe('ahead');
    expect(paceVerdict(1111, 1000)).toBe('ahead');
    expect(paceVerdict(1100, 1000)).toBe('about');
    expect(paceVerdict(900, 1000)).toBe('about');
    expect(paceVerdict(899, 1000)).toBe('behind');
  });

  it('needs 3 of the last 4 same weekdays and adds up to the same minute', () => {
    const today = '2026-11-06';
    const weeks = ['2026-10-30', '2026-10-23', '2026-10-16'];
    const sales = weeks.flatMap((d, i) => [
      sale(at(d, '09:00'), 1000 * (i + 1)),
      sale(at(d, '15:00'), 5000),
    ]);
    const days = bucketDays(sales);
    const pace = homePace(days, today, 12 * 60, 2500);
    expect(pace.daysUsed).toBe(3);
    expect(pace.usualByNow).toBe(2000);
    expect(pace.usualDay).toBe(7000);
    expect(pace.usualFirstOrder).toBe('09:00');
    expect(pace.verdict).toBe('ahead');
    const two = homePace(bucketDays(sales.slice(2)), today, 12 * 60, 2500);
    expect(two.daysUsed).toBe(2);
    expect(two.verdict).toBeNull();
    expect(two.usualByNow).toBeNull();
  });
});

describe('hour by hour (H7)', () => {
  it('covers open hours and stretches to an order outside them', () => {
    const sf = { hours: [{ day: 5, open: '10:00', close: '14:00' }], closures: [] };
    const days = bucketDays([sale(at('2026-11-06', '16:20'), 300)]);
    const bars = hourBars(days, '2026-11-06', sf);
    expect(bars.map((b) => b.hour)).toEqual([10, 11, 12, 13, 14, 15, 16]);
    expect(bars.at(-1)?.orders).toBe(1);
  });
});

describe('best sellers and idle items (H9)', () => {
  const items: HomeItem[] = [
    {
      id: 'a',
      name: 'Adobo',
      photo: null,
      status: 'active',
      isNew: false,
      addedAt: null,
      soldOut: false,
    },
    {
      id: 'b',
      name: 'Bibingka',
      photo: null,
      status: 'active',
      isNew: false,
      addedAt: null,
      soldOut: true,
    },
    {
      id: 'c',
      name: 'Champorado',
      photo: null,
      status: 'active',
      isNew: true,
      addedAt: null,
      soldOut: false,
    },
    {
      id: 'd',
      name: 'Dinuguan',
      photo: null,
      status: 'active',
      isNew: false,
      addedAt: null,
      soldOut: false,
    },
    {
      id: 'e',
      name: 'Ensaymada',
      photo: null,
      status: 'hidden',
      isNew: false,
      addedAt: null,
      soldOut: false,
    },
  ];
  const now = new Date(at('2026-11-06', '12:00'));
  it('ranks by quantity with variants grouped, then by sales', () => {
    const list = bestSellers(
      [
        sale(now.toISOString(), 200, {
          lines: [
            { itemId: 'a', name: 'Adobo', qty: 1, lineTotal: 100 },
            { itemId: 'a', name: 'Adobo', qty: 1, lineTotal: 100 },
            { itemId: 'b', name: 'Bibingka', qty: 2, lineTotal: 300 },
          ],
        }),
      ],
      items,
    );
    expect(list.map((b) => [b.itemId, b.qty])).toEqual([
      ['b', 2],
      ['a', 2],
    ]);
    expect(list[0]?.soldOut).toBe(true);
  });

  it('counts active items without a sale in 14 days, New items left out', () => {
    const sales = [
      sale(at('2026-11-01', '10:00'), 100),
      sale(at('2026-10-01', '10:00'), 100, {
        lines: [{ itemId: 'd', name: 'Dinuguan', qty: 1, lineTotal: 100 }],
      }),
    ];
    // b and d: no sale in 14 days; c is New; e is hidden.
    expect(idleItemCount(sales, items, now)).toBe(2);
  });
});

describe('needs you (H8)', () => {
  const now = at('2026-11-06', '12:00');
  const order = (id: string, patch: Partial<NeedOrder> = {}): NeedOrder => ({
    id,
    type: 'pickup',
    status: 'placed',
    paymentStatus: 'unpaid',
    paymentMethod: 'cash',
    expiresAt: null,
    dueAt: at('2026-11-06', '12:30'),
    startBy: at('2026-11-06', '11:50'),
    lastStepAt: at('2026-11-06', '11:50'),
    seenAt: null,
    ...patch,
  });
  it('sorts worst first, leaves out zero rows and shows an order in one row', () => {
    const needs = homeNeeds({
      orders: [
        order('check', { paymentMethod: 'gcash', paymentStatus: 'pending' }),
        order('late', { status: 'preparing', dueAt: at('2026-11-06', '11:40') }),
        order('late-unseen', { dueAt: at('2026-11-06', '11:55') }),
        order('unseen'),
        order('ready', {
          status: 'ready',
          lastStepAt: at('2026-11-06', '11:30'),
          seenAt: now,
        }),
        order('cancelled', { status: 'cancelled' }),
      ],
      now,
      prizesToGive: 2,
      soldOut: 0,
      noticeTomorrow: 1,
      plan: false,
      storage: true,
    });
    expect(needs.map((n) => [n.kind, n.count])).toEqual([
      ['to_check', 1],
      ['late', 2],
      ['unseen', 1],
      ['waiting', 1],
      ['prizes', 2],
      ['bookings', 1],
      ['storage', 1],
    ]);
    expect(needs[0]?.orderId).toBe('check');
    expect(needs[1]?.orderId).toBeNull();
  });
});

describe('trends (H12, H13) and setup', () => {
  it('rolls the window to today and averages 4 weeks into the heat map', () => {
    const now = new Date(at('2026-11-06', '20:00'));
    const sales = Array.from({ length: 28 }, (_, i) => {
      const d = new Date(now.getTime() - (i + 1) * 86_400_000);
      return sale(d.toISOString(), 100);
    });
    sales.push(sale(now.toISOString(), 500));
    const t = buildHomeTrends({ now, range: '7d', sales, joinedAt: [now.toISOString()] });
    expect(t.days.at(-1)).toEqual({ date: '2026-11-06', sales: 500, orders: 1, joined: 1 });
    expect(t.totals.orders).toBe(7);
    expect(t.totalsBefore.orders).toBe(7);
    expect(t.bestDay?.date).toBe('2026-11-06');
    expect(t.heatDays).toBe(28);
    expect(t.heat[5]?.[20]).toBe(1);
    expect(heatExtremes(t.heat).busiest).toEqual({ weekday: 0, hour: 20 });
  });

  it('the checklist goes away once every step is done', () => {
    const all = {
      activeItems: 5,
      hasLogo: true,
      hasBrandColour: true,
      hours: 7,
      payments: 2,
      stampCardOn: true,
      anyOrder: true,
    };
    expect(setupSteps(all)).toBeNull();
    expect(setupSteps({ ...all, activeItems: 4 })?.find((s) => !s.done)?.step).toBe('items');
  });
});

describe('one period (T83)', () => {
  const now = at('2026-11-12', '15:00');
  const sf = { hours: [{ day: 4, open: '10:00', close: '14:00' }], closures: [] };

  it('turns quick picks into dates and keeps custom dates inside the kept history', () => {
    expect(periodDates('today', '2026-11-12')).toEqual({ from: '2026-11-12', to: '2026-11-12' });
    expect(periodDates('yesterday', '2026-11-12')).toEqual({
      from: '2026-11-11',
      to: '2026-11-11',
    });
    expect(periodDates('7d', '2026-11-12')).toEqual({ from: '2026-11-06', to: '2026-11-12' });
    expect(periodDates('30d', '2026-11-12')).toEqual({ from: '2026-10-14', to: '2026-11-12' });
    expect(periodDates('month', '2026-11-12')).toEqual({ from: '2026-11-01', to: '2026-11-12' });
    expect(clampPeriod({ from: '2026-12-01', to: '2026-01-01' }, '2026-11-12')).toEqual({
      from: '2026-09-14',
      to: '2026-11-12',
    });
    expect(periodOf({ from: '2026-11-06', to: '2026-11-12' }, '2026-11-12')).toBe('7d');
    expect(periodOf({ from: '2026-11-05', to: '2026-11-12' }, '2026-11-12')).toBe('custom');
  });

  it('splits money into cash in the drawer, transfers, to check and to collect', () => {
    const sales = [
      sale(at('2026-11-12', '10:15'), 10000, { method: 'cash' }),
      sale(at('2026-11-12', '11:15'), 20000, { method: 'gcash' }),
      sale(at('2026-11-12', '11:45'), 5000, { method: 'maya', paid: false }),
      sale(at('2026-11-12', '16:10'), 3000, { method: 'cod', paid: false, member: true }),
      sale(at('2026-11-11', '12:00'), 99900),
    ];
    const p = buildHomePeriod({
      now,
      dates: { from: '2026-11-12', to: '2026-11-12' },
      storefront: sf,
      sales,
      items: [],
    });
    expect(p.step).toBe('hour');
    expect(p.money).toEqual({
      sales: 38000,
      orders: 4,
      average: 9500,
      cash: 10000,
      transfers: 20000,
      toCheck: 5000,
      toCheckOrders: 1,
      toCollect: 3000,
    });
    // Open 10 to 2, stretched to the 4 PM order.
    expect(p.slots.map((s) => s.hour)).toEqual([10, 11, 12, 13, 14, 15, 16]);
    expect(p.busiestHour).toBe(11);
    expect(p.busiestDay).toBeNull();
    expect(p.mix.buyers).toEqual([
      { buyer: 'member', orders: 1, sales: 3000 },
      { buyer: 'guest', orders: 3, sales: 35000 },
    ]);
    expect(p.earliest).toBe('2026-09-14');
  });

  it('gives one slot per day for a longer period and names the busiest day', () => {
    const sales = [
      sale(at('2026-11-10', '12:00'), 5000),
      sale(at('2026-11-11', '12:00'), 9000),
      sale(at('2026-11-11', '13:00'), 1000),
    ];
    const p = buildHomePeriod({
      now,
      dates: { from: '2026-11-06', to: '2026-11-12' },
      storefront: sf,
      sales,
      items: [],
    });
    expect(p.step).toBe('day');
    expect(p.slots).toHaveLength(7);
    expect(p.slots.find((s) => s.date === '2026-11-11')).toMatchObject({ sales: 10000, orders: 2 });
    expect(p.busiestDay).toBe('2026-11-11');
    expect(p.busiestHour).toBe(12);
    expect(p.money.average).toBe(5000);
  });

  it('says nothing about averages or the busiest times with no orders', () => {
    const p = buildHomePeriod({
      now,
      dates: { from: '2026-11-11', to: '2026-11-11' },
      storefront: sf,
      sales: [],
      items: [],
    });
    expect(p.money.average).toBeNull();
    expect(p.busiestHour).toBeNull();
    expect(p.mix.buyers).toEqual([]);
    expect(p.slots.map((s) => s.hour)).toEqual([]);
  });
});
