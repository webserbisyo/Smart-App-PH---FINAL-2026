import { describe, expect, it } from 'vitest';
import { SHOP_PACKS, scheduleDays, type Schedule } from '@smartapp/core';
import {
  asapChoice,
  dayChipLabel,
  firstOpenDay,
  noDaysLine,
  noticeLine,
  periodOf,
  resolvePick,
  slotPeriods,
  whenSummary,
} from './when-rules';

const kanto = SHOP_PACKS['kanto-smash'].storefront;
// Sun 25 Oct 2026, noon Manila: Kanto is open.
const OPEN_NOW = '2026-10-25T04:00:00.000Z';

function schedule(patch: Partial<Schedule> = {}): Schedule {
  return {
    days: [
      { date: '2026-10-25', state: 'too_soon', slots: [] },
      { date: '2026-10-26', state: 'closed', slots: [] },
      {
        date: '2026-10-27',
        state: 'open',
        slots: [
          { at: '2026-10-27T01:00:00.000Z', state: 'full' }, // 9 AM
          { at: '2026-10-27T05:00:00.000Z', state: 'open' }, // 1 PM
          { at: '2026-10-27T10:00:00.000Z', state: 'open' }, // 6 PM
        ],
      },
      {
        date: '2026-10-28',
        state: 'open',
        slots: [{ at: '2026-10-28T02:00:00.000Z', state: 'open' }],
      },
    ],
    earliest: '2026-10-27T05:00:00.000Z',
    noticeItem: null,
    ...patch,
  };
}

describe('O6 When picker: ASAP', () => {
  it('offers ASAP when the shop is open and nothing needs notice', () => {
    expect(asapChoice(kanto, schedule(), OPEN_NOW)).toEqual({ available: true, reason: null });
  });

  it('hides ASAP when an item in the basket needs notice', () => {
    const withCake = schedule({ noticeItem: { name: 'Ube Macapuno Cake', noticeDays: 2 } });
    expect(asapChoice(kanto, withCake, OPEN_NOW)).toEqual({ available: false, reason: 'notice' });
  });

  it('hides ASAP when the shop is closed or paused', () => {
    const paused = { ...kanto, pause: { busyUntil: null, paused: true } };
    expect(asapChoice(paused, schedule(), OPEN_NOW).available).toBe(false);
    // 2 AM Manila: closed.
    expect(asapChoice(kanto, schedule(), '2026-10-24T18:00:00.000Z')).toEqual({
      available: false,
      reason: 'closed',
    });
  });
});

describe('O6 When picker: day and time', () => {
  it('opens on the first open day (closed and too-soon days are skipped)', () => {
    expect(firstOpenDay(schedule())).toBe('2026-10-27');
    expect(resolvePick(schedule(), null)).toEqual({ day: '2026-10-27', at: null, moved: false });
  });

  it('keeps a saved time while it is open', () => {
    expect(resolvePick(schedule(), '2026-10-28T02:00:00.000Z')).toEqual({
      day: '2026-10-28',
      at: '2026-10-28T02:00:00.000Z',
      moved: false,
    });
  });

  it('replaces a time that filled up with the next open one, and says so', () => {
    expect(resolvePick(schedule(), '2026-10-27T01:00:00.000Z')).toEqual({
      day: '2026-10-27',
      at: '2026-10-27T05:00:00.000Z',
      moved: true,
    });
  });

  it('replaces a time on a day that is now too soon after a cake joins the basket', () => {
    const cake = schedule({
      days: schedule().days.map((d) =>
        d.date === '2026-10-27' ? { ...d, state: 'too_soon', slots: [] } : d,
      ),
      noticeItem: { name: 'Chocolate Moist Cake', noticeDays: 3 },
      earliest: '2026-10-28T02:00:00.000Z',
    });
    expect(resolvePick(cake, '2026-10-27T05:00:00.000Z')).toEqual({
      day: '2026-10-28',
      at: '2026-10-28T02:00:00.000Z',
      moved: true,
    });
  });

  it('groups times into Morning, Afternoon and Evening in Manila time', () => {
    expect(periodOf('2026-10-27T01:00:00.000Z')).toBe('morning');
    expect(periodOf('2026-10-27T04:00:00.000Z')).toBe('afternoon');
    expect(periodOf('2026-10-27T09:00:00.000Z')).toBe('evening');
    const day = schedule().days[2];
    expect(slotPeriods(day?.slots ?? []).map((g) => g.period)).toEqual([
      'morning',
      'afternoon',
      'evening',
    ]);
  });

  it('labels the chips Today, Tomorrow, then the weekday and date', () => {
    expect(dayChipLabel('2026-10-25', OPEN_NOW)).toBe('Today');
    expect(dayChipLabel('2026-10-26', OPEN_NOW)).toBe('Tomorrow');
    expect(dayChipLabel('2026-10-28', OPEN_NOW)).toBe('Wed 28');
  });
});

describe('O6 When picker: lines', () => {
  it('says which item pushed the start and the earliest day', () => {
    const cake = schedule({ noticeItem: { name: 'Ube Macapuno Cake', noticeDays: 2 } });
    expect(noticeLine(cake, 'pickup')).toBe(
      'Ube Macapuno Cake needs 2 days’ notice. Earliest pickup: Tue 27 Oct.',
    );
    expect(noticeLine(schedule(), 'pickup')).toBeNull();
  });

  it('shows the summary the receipt uses', () => {
    expect(whenSummary('pickup', '2026-10-31T07:00:00.000Z', OPEN_NOW)).toBe(
      'Pickup Sat 31 Oct, 3 PM',
    );
    expect(whenSummary('delivery', '2026-10-25T07:30:00.000Z', OPEN_NOW)).toBe(
      'Delivery Today 3:30 PM',
    );
  });

  it('says when to try again when nothing can be booked', () => {
    expect(noDaysLine({ days: [] })).toMatch(/^Not taking bookings/);
    const full = { days: [{ date: '2026-11-14', state: 'full' as const, slots: [] }] };
    expect(noDaysLine(full)).toBe(
      'Fully booked until Sun 15 Nov. Message the shop for a special order.',
    );
  });
});

describe('O6 When picker: refreshes with the basket', () => {
  it('a cake with 2 days’ notice moves the first open day', () => {
    const lola = SHOP_PACKS['lola-remy'];
    const cake = lola.catalog.items.find((i) => i.noticeDays > 0);
    expect(cake).toBeDefined();
    if (!cake) return;
    const bookings = { slotCounts: {}, itemCounts: {} };
    // Tue 27 Oct, 8 AM Manila.
    const now = '2026-10-27T00:00:00.000Z';
    const without = scheduleDays(lola.storefront, [], lola.catalog.items, bookings, now);
    const withCake = scheduleDays(
      lola.storefront,
      [{ itemId: cake.id, qty: 1 }],
      lola.catalog.items,
      bookings,
      now,
    );
    expect(firstOpenDay(without)).toBe('2026-10-27');
    expect(firstOpenDay(withCake)).toBe('2026-10-29');
    expect(asapChoice(lola.storefront, withCake, now).available).toBe(false);
  });
});
