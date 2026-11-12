import { describe, expect, it } from 'vitest';
import {
  HomePeriodDataSchema,
  HomeSummarySchema,
  HomeTrendsSchema,
  HEAT_MIN_DAYS,
  manilaDate,
  salesTotal,
} from '@smartapp/core';
import { setMockOwnerSlug } from '../src/mocks/store';
import { errorCode, mnl, testStore } from './helpers';

const NOW = mnl('2026-11-06 13:05');
const SHOPS = ['kanto-smash', 'kape-juan', 'lola-remy', 'aqualinis', 'tala-apparel'] as const;

function shopStore(slug: string, scenario: Parameters<typeof testStore>[1] = {}) {
  setMockOwnerSlug(slug);
  return testStore(NOW, scenario);
}

describe('ownerHome mock adapter', () => {
  it.each(SHOPS)('%s: the summary and both trends parse', async (slug) => {
    const { store } = shopStore(slug);
    const home = await store.ownerHome.getHome();
    expect(HomeSummarySchema.safeParse(home).success).toBe(true);
    expect(home.businessDate).toBe('2026-11-06');
    expect(home.today.collected + home.today.toCollect).toBe(home.today.sales);
    expect(home.pace.daysUsed).toBe(4);
    expect(home.pace.verdict).not.toBeNull();
    expect(home.hours.length).toBeGreaterThan(8);
    expect(home.best.week.length).toBe(5);
    expect(home.setup).toBeNull();
    for (const range of ['7d', '30d'] as const) {
      const t = await store.ownerHome.getHomeTrends({ range });
      expect(HomeTrendsSchema.safeParse(t).success).toBe(true);
      expect(t.days).toHaveLength(range === '7d' ? 7 : 30);
      expect(t.before).toHaveLength(t.days.length);
      expect(t.days.at(-1)?.date).toBe('2026-11-06');
      expect(t.totalsBefore.orders).toBeGreaterThan(0);
      expect(t.heatDays).toBeGreaterThanOrEqual(HEAT_MIN_DAYS);
    }
  });

  it("today's sales match the Orders list footer for today (H2)", async () => {
    const { store } = shopStore('kanto-smash');
    const home = await store.ownerHome.getHome();
    const list = await store.ownerOrders.listOrders({ slug: 'kanto-smash', date: '2026-11-06' });
    expect(home.today.sales).toBe(salesTotal(list, NOW));
    expect(home.today.orders).toBe(list.filter((o) => salesTotal([o], NOW) > 0).length);
  });

  it('member numbers match the Members page (H11)', async () => {
    const { store } = shopStore('kape-juan');
    const home = await store.ownerHome.getHome();
    const view = await store.ownerMembers.getMembersOverview();
    expect(home.members.ready).toBe(view.counts.ready);
    expect(home.members.prizesToGive).toBe(view.prizesToGive);
  });

  it('the history is the same on every read and in a new store (never stored)', async () => {
    const a = await shopStore('lola-remy').store.ownerHome.getHomeTrends({ range: '30d' });
    const b = await shopStore('lola-remy').store.ownerHome.getHomeTrends({ range: '30d' });
    expect(b).toEqual(a);
  });

  it('the 7 day totals are the 7 days added up, and the best day is one of them', async () => {
    const { store } = shopStore('tala-apparel');
    const t = await store.ownerHome.getHomeTrends({ range: '7d' });
    expect(t.totals.sales).toBe(t.days.reduce((n, d) => n + d.sales, 0));
    expect(t.days.map((d) => d.date)).toContain(t.bestDay?.date);
  });

  it('a new shop gets the checklist and empty numbers', async () => {
    const { store } = shopStore('kanto-smash', { empty: true });
    const home = await store.ownerHome.getHome();
    expect(home.today.sales).toBe(0);
    expect(home.daysWithOrders).toBe(0);
    expect(home.pace.verdict).toBeNull();
    expect(home.setup?.find((s) => s.step === 'items')?.done).toBe(false);
    expect(home.setup?.find((s) => s.step === 'first_order')?.done).toBe(false);
    const t = await store.ownerHome.getHomeTrends({ range: '7d' });
    expect(t.totals.orders).toBe(0);
    expect(t.bestDay).toBeNull();
  });

  it('a quiet morning keeps the history and waits for the usual first order', async () => {
    setMockOwnerSlug('kape-juan');
    const { store } = testStore(mnl('2026-11-06 05:30'), { ordersMode: 'empty' });
    const home = await store.ownerHome.getHome();
    expect(home.today.orders).toBe(0);
    expect(home.pace.verdict).toBeNull();
    expect(home.pace.usualFirstOrder).not.toBeNull();
    expect(home.daysWithOrders).toBeGreaterThan(50);
  });

  it('closed today: Hour by hour shows the last day with orders', async () => {
    const { store } = shopStore('aqualinis', { closed: true, ordersMode: 'empty' });
    const home = await store.ownerHome.getHome();
    expect(home.openToday).toBe(false);
    expect(home.pace.verdict).toBeNull();
    expect(home.hoursDate).toBe('2026-11-05');
  });

  it('bookings for later days show in Coming up, not in today', async () => {
    const { store } = shopStore('lola-remy');
    const home = await store.ownerHome.getHome();
    expect(home.comingUp).toHaveLength(7);
    expect(home.comingUp[0]?.date).toBe('2026-11-07');
    expect(home.comingUp.reduce((n, d) => n + d.orders, 0)).toBeGreaterThan(0);
    expect(manilaDate(home.asOf)).toBe('2026-11-06');
  });

  it('a failed read says unknown, offline says offline', async () => {
    expect(
      await errorCode(shopStore('kanto-smash', { fail: 'home' }).store.ownerHome.getHome()),
    ).toBe('unknown');
    expect(
      await errorCode(
        shopStore('kanto-smash', { offline: true }).store.ownerHome.getHomeTrends({ range: '7d' }),
      ),
    ).toBe('offline');
  });
});

describe('ownerHome period (T83)', () => {
  it.each(SHOPS)('%s: today, 7 days and a month parse and add up', async (slug) => {
    const { store } = shopStore(slug);
    const home = await store.ownerHome.getHome();
    const today = await store.ownerHome.getHomePeriod({ from: '2026-11-06', to: '2026-11-06' });
    expect(HomePeriodDataSchema.safeParse(today).success).toBe(true);
    expect(today.step).toBe('hour');
    // Same sales rule as the summary and the Orders footer (H2).
    expect(today.money.sales).toBe(home.today.sales);
    const m = today.money;
    expect(m.cash + m.transfers + m.toCheck + m.toCollect).toBe(m.sales);
    expect(today.slots.reduce((n, s) => n + s.sales, 0)).toBe(m.sales);
    const week = await store.ownerHome.getHomePeriod({ from: '2026-10-31', to: '2026-11-06' });
    expect(week.step).toBe('day');
    expect(week.slots).toHaveLength(7);
    expect(week.slots.reduce((n, s) => n + s.orders, 0)).toBe(week.money.orders);
    expect(week.mix.buyers.reduce((n, b) => n + b.sales, 0)).toBe(week.money.sales);
    expect(week.busiestDay).not.toBeNull();
  });

  it('keeps a picked period inside the kept history', async () => {
    const { store } = shopStore('kanto-smash');
    const p = await store.ownerHome.getHomePeriod({ from: '2025-01-01', to: '2027-01-01' });
    expect(p.from).toBe(p.earliest);
    expect(p.to).toBe('2026-11-06');
    expect(p.slots).toHaveLength(60);
  });

  it('a new shop gets an empty period, not an error', async () => {
    const { store } = shopStore('kanto-smash', { empty: true });
    const p = await store.ownerHome.getHomePeriod({ from: '2026-10-31', to: '2026-11-06' });
    expect(p.money.orders).toBe(0);
    expect(p.busiestDay).toBeNull();
    expect(p.best).toEqual([]);
  });
});
