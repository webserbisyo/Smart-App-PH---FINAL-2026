import { describe, expect, it } from 'vitest';
import { SHOP_PACKS, type BoardOrder } from '@smartapp/core';
import {
  closedWords,
  dayFacts,
  hasRoom,
  isClosedDay,
  isFullDay,
  rangeLabel,
  timeGroups,
  weekDays,
  weekStartOf,
  type ScheduleRules,
} from '../src/features/orders/calendar-facts';
import { OrdersSearchSchema } from '../src/features/orders/search';

// Manila time helper: "2026-11-13 12:00" → ISO UTC. 2026-11-13 is a Friday.
const mnl = (local: string) => new Date(`${local.replace(' ', 'T')}:00+08:00`).toISOString();

let n = 0;
function order(dueAt: string, patch: Partial<BoardOrder> = {}): BoardOrder {
  n += 1;
  return {
    id: `o${n}`,
    token: `t${n}`,
    orderNo: n,
    type: 'pickup',
    status: 'placed',
    paymentStatus: 'paid',
    paymentMethod: 'gcash',
    scheduledAt: dueAt,
    placedAt: mnl('2026-11-12 09:00'),
    customerName: `Customer ${n}`,
    isFirstOrder: false,
    isMember: false,
    hasReward: false,
    itemsSummary: '1 × Burger',
    total: 10000,
    dueAt,
    startBy: dueAt,
    pickupCode: 'ABCD',
    seenAt: null,
    lines: [],
    moreLines: 0,
    note: null,
    ownerNote: null,
    deliveryArea: null,
    lastStepAt: dueAt,
    expiresAt: null,
    memberStamps: null,
    ...patch,
  };
}

const kanto: ScheduleRules = SHOP_PACKS['kanto-smash'].storefront;
const lola: ScheduleRules = SHOP_PACKS['lola-remy'].storefront;

describe('Calendar week board (T86)', () => {
  it('stacks orders on the same time under one label, earliest time first', () => {
    const list = [
      order(mnl('2026-11-14 11:45')),
      order(mnl('2026-11-14 11:30')),
      order(mnl('2026-11-14 11:30')),
    ];
    const facts = dayFacts(list, kanto.slotMinutes);
    const groups = timeGroups(list, kanto, facts);
    expect(groups.map((g) => [g.label, g.orders.length, g.count])).toEqual([
      ['11:30 AM', 2, '2 orders'],
      ['11:45 AM', 1, null],
    ]);
  });

  it('says how full a time is for shops with a per-time limit', () => {
    const rules = { ...lola, ordersPerSlot: 2 };
    const list = [order(mnl('2026-11-14 10:00')), order(mnl('2026-11-14 10:00'))];
    const facts = dayFacts(list, rules.slotMinutes);
    expect(timeGroups(list, rules, facts)[0]).toMatchObject({ count: 'Full · 2 of 2', full: true });
    expect(hasRoom(rules, facts, new Date(mnl('2026-11-14 10:00')), 'other')).toBe(false);
    // The order's own place doesn't count against it.
    expect(hasRoom(rules, facts, new Date(mnl('2026-11-14 10:00')), list[0]?.id ?? '')).toBe(true);
  });

  it('a day is full only when every time is taken', () => {
    const rules: ScheduleRules = {
      ...lola,
      hours: [{ day: 6, open: '10:00', close: '12:00' }],
      closures: [],
      slotMinutes: 60,
      ordersPerSlot: 1,
    };
    const one = [order(mnl('2026-11-14 10:00'))];
    expect(isFullDay(rules, dayFacts(one, 60), '2026-11-14')).toBe(false);
    const both = [...one, order(mnl('2026-11-14 11:00'))];
    expect(isFullDay(rules, dayFacts(both, 60), '2026-11-14')).toBe(true);
  });

  it('pages run 7 days from today and stop at day 60', () => {
    expect(weekStartOf('2026-11-13', '2026-11-13')).toBe('2026-11-13');
    expect(weekStartOf('2026-11-22', '2026-11-13')).toBe('2026-11-20');
    expect(weekDays('2027-01-09', '2027-01-12')).toEqual([
      '2027-01-09',
      '2027-01-10',
      '2027-01-11',
      '2027-01-12',
    ]);
  });

  it('labels what is on screen', () => {
    const days = weekDays('2026-11-13', '2027-01-12');
    expect(rangeLabel('week', '2026-11-13', days)).toBe('13 – 19 Nov');
    expect(rangeLabel('week', '2026-11-27', weekDays('2026-11-27', '2027-01-12'))).toBe(
      '27 Nov – 3 Dec',
    );
    expect(rangeLabel('day', '2026-11-14', days)).toBe('Sat 14 Nov');
    expect(rangeLabel('month', '2026-12-05', days)).toBe('December 2026');
  });

  it('says why a day is closed', () => {
    // Lola Remy opens every day; a closure names the date.
    const rules = { ...lola, closures: [{ date: '2026-11-16', reason: 'Rest day' }] };
    expect(isClosedDay(rules, '2026-11-16')).toBe(true);
    expect(closedWords(rules, '2026-11-16')).toBe('Closed on Mon 16 Nov');
    // A weekday the shop never opens.
    const noMondays = { ...lola, hours: lola.hours.filter((h) => h.day !== 1) };
    expect(closedWords(noMondays, '2026-11-16')).toBe('Closed on Mondays');
  });

  it('keeps the view and day in the address', () => {
    expect(OrdersSearchSchema.parse({ cal: 'month', calDay: '2026-12-01' })).toMatchObject({
      cal: 'month',
      calDay: '2026-12-01',
    });
    expect(OrdersSearchSchema.parse({ cal: '3days', calDay: 'soon' })).toMatchObject({
      cal: undefined,
      calDay: undefined,
    });
  });
});
