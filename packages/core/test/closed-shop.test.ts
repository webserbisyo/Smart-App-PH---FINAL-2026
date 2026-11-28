import { describe, expect, it } from 'vitest';
import {
  bookingProblem,
  closedTodayReason,
  lastOrderAt,
  openState,
  openStateText,
  pastLastOrder,
  quote,
  readyEstimate,
  scheduleDays,
  SHOP_PACKS,
  type Storefront,
} from '../src/index.js';

// Ordering while the shop is closed (T129). Manila time helper: "2026-12-01 01:30" → ISO UTC.
// 2026-12-01 is a Tuesday. Lola Remy opens 5 AM to 12 noon and 2 to 8 PM, 20 minutes prep, hourly times.
const mnl = (local: string) => new Date(`${local.replace(' ', 'T')}:00+08:00`).toISOString();
const noBookings = { slotCounts: {}, itemCounts: {} };
const lola = SHOP_PACKS['lola-remy'];
const sf = lola.storefront;
const bread = lola.catalog.items.find((i) => i.name === 'Classic Pandesal');
const breadVariant = bread?.variants[0];
const with_ = (s: Storefront, patch: Partial<Storefront>): Storefront => ({ ...s, ...patch });

describe('last orders (T129)', () => {
  it('is closing time minus prep while open', () => {
    expect(lastOrderAt(sf, mnl('2026-12-01 19:00'))).toBe(mnl('2026-12-01 19:40'));
    expect(lastOrderAt(sf, mnl('2026-12-01 01:30'))).toBeNull();
  });

  it('stops ASAP after last orders, not at closing', () => {
    expect(pastLastOrder(sf, mnl('2026-12-01 19:39'))).toBe(false);
    expect(readyEstimate(sf, mnl('2026-12-01 19:39'))).not.toBeNull();
    expect(pastLastOrder(sf, mnl('2026-12-01 19:41'))).toBe(true);
    expect(readyEstimate(sf, mnl('2026-12-01 19:41'))).toBeNull();
  });

  it('the price check refuses an order for now after last orders, but takes a booked time', () => {
    if (!bread || !breadVariant) throw new Error('demo bread missing');
    const lines = [
      { itemId: bread.id, variantId: breadVariant.id, optionIds: [], note: '', qty: 1 },
    ];
    const base = {
      type: 'pickup' as const,
      lines,
      delivery: null,
      paymentMethod: 'cash' as const,
      paymentAccountId: null,
      useReward: false,
    };
    const now = new Date(mnl('2026-12-01 19:50'));
    const asap = quote({ shop: lola, now, member: null }, { ...base, scheduledAt: null });
    expect(asap.problems.map((p) => p.code)).toContain('shop_closed');
    const later = quote(
      { shop: lola, now, member: null },
      { ...base, scheduledAt: mnl('2026-12-02 06:00') },
    );
    expect(later.problems.map((p) => p.code)).not.toContain('shop_closed');
    // Walk-in is ordering inside the shop now: a booked time is never one.
    const walkIn = quote(
      { shop: lola, now: new Date(mnl('2026-12-01 10:00')), member: null },
      { ...base, type: 'walk_in', scheduledAt: mnl('2026-12-02 06:00') },
    );
    expect(walkIn.problems.map((p) => p.code)).toContain('slot_unavailable');
  });
});

describe('bookingProblem (one booking rule, T129)', () => {
  const at130 = mnl('2026-12-01 01:30');
  const schedule = scheduleDays(sf, [], lola.catalog.items, noBookings, at130);

  it('the old 15-minute "5:30 AM" is not one of the shop’s times', () => {
    expect(bookingProblem(schedule, mnl('2026-12-01 05:30'))).toBe('slot_unavailable');
  });

  it('the schedule’s earliest time is bookable', () => {
    expect(schedule.earliest).toBe(mnl('2026-12-01 06:00'));
    expect(bookingProblem(schedule, mnl('2026-12-01 06:00'))).toBeNull();
    expect(bookingProblem(schedule, mnl('2026-12-02 06:00'))).toBeNull();
  });

  it('a full time says full, not closed', () => {
    const one = with_(sf, { ordersPerSlot: 1 });
    const full = scheduleDays(
      one,
      [],
      lola.catalog.items,
      { slotCounts: { [mnl('2026-12-01 06:00')]: 1 }, itemCounts: {} },
      at130,
    );
    expect(bookingProblem(full, mnl('2026-12-01 06:00'))).toBe('slot_full');
  });

  it('accepts the same time written another way', () => {
    expect(bookingProblem(schedule, '2026-12-01T06:00:00+08:00')).toBeNull();
  });
});

describe('closed days (T129)', () => {
  it('says the reason on a closed day with one', () => {
    const closed = with_(sf, {
      closures: [
        { date: '2026-12-24', reason: 'Christmas' },
        { date: '2026-12-25', reason: 'Christmas' },
        { date: '2026-12-26', reason: '' },
      ],
    });
    const now = mnl('2026-12-25 10:00');
    expect(closedTodayReason(closed, now)).toBe('Christmas');
    expect(closedTodayReason(closed, mnl('2026-12-26 10:00'))).toBeNull();
    const text = openStateText(openState(closed, now), now, closedTodayReason(closed, now));
    expect(text).toMatch(/^Closed today · Christmas · Opens /);
  });

  it('a closure longer than the week still finds the next opening', () => {
    const closures = Array.from({ length: 20 }, (_, i) => ({
      date: `2026-12-${String(i + 1).padStart(2, '0')}`,
      reason: 'Renovation',
    }));
    const state = openState(with_(sf, { closures }), mnl('2026-12-01 10:00'));
    expect(state.state).toBe('closed');
    expect(state.nextOpening).toBe(mnl('2026-12-21 05:00'));
  });
});
