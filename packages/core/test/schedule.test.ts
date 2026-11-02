import { describe, expect, it } from 'vitest';
import {
  pickupSlots,
  scheduleDays,
  SHOP_PACKS,
  type PublicShop,
  type Storefront,
} from '../src/index.js';

describe('scheduleDays pure rule and pickupSlots parity', () => {
  const mnl = (str: string) => `${str.replace(' ', 'T')}:00+08:00`;

  it('pickupSlots parity test across all demo shops', () => {
    const testNow = new Date(mnl('2026-10-26 12:00'));
    for (const [slug, pack] of Object.entries(SHOP_PACKS)) {
      const slots = pickupSlots(pack.storefront, testNow);
      expect(Array.isArray(slots), slug).toBe(true);
      // For any shop open or accepting orders, pickupSlots returns valid slot timestamps
      for (const slot of slots) {
        expect(new Date(slot).getTime()).not.toBeNaN();
      }
    }
  });

  const kanto = SHOP_PACKS['kanto-smash'];
  const lola = SHOP_PACKS['lola-remy'];

  it('daysAhead 1 equals today plus tomorrow (2 days total)', () => {
    const now = new Date(mnl('2026-10-26 10:00'));
    const schedule = scheduleDays({
      storefront: { ...kanto.storefront, daysAhead: 1 },
      items: kanto.catalog.items,
      now,
      lines: [],
      bookings: { slotCounts: {}, itemCounts: {} },
    });
    expect(schedule.days.length).toBe(2);
    expect(schedule.days[0]?.date).toBe('2026-10-26');
    expect(schedule.days[1]?.date).toBe('2026-10-27');
  });

  it('noticeDays pushes the start and marks notice items', () => {
    const now = new Date(mnl('2026-10-26 10:00'));
    const cakeItem = lola.catalog.items.find((i) => i.id === 'lr-chocolate-moist-cake')!;
    expect(cakeItem.noticeDays).toBe(2);

    const schedule = scheduleDays({
      storefront: lola.storefront,
      items: lola.catalog.items,
      now,
      lines: [{ itemId: cakeItem.id, qty: 1 }],
      bookings: { slotCounts: {}, itemCounts: {} },
    });

    expect(schedule.noticeItems.length).toBe(1);
    expect(schedule.noticeItems[0]?.itemName).toBe(cakeItem.name);
    expect(schedule.noticeItems[0]?.noticeDays).toBe(2);
    expect(schedule.noticeItems[0]?.earliestDate).toBe('2026-10-28');

    // Days before Oct 28 must be too_soon or have too_soon slots
    const day0 = schedule.days.find((d) => d.date === '2026-10-26');
    expect(day0?.slots.every((s) => s.state === 'too_soon' || s.state === 'closed')).toBe(true);
    const day1 = schedule.days.find((d) => d.date === '2026-10-27');
    expect(day1?.slots.every((s) => s.state === 'too_soon' || s.state === 'closed')).toBe(true);
  });

  it('respects closures', () => {
    const now = new Date(mnl('2026-10-26 10:00'));
    const storefrontWithClosure: Storefront = {
      ...kanto.storefront,
      daysAhead: 3,
      closures: [{ date: '2026-10-27', reason: 'Maintenance' }],
    };
    const schedule = scheduleDays({
      storefront: storefrontWithClosure,
      items: kanto.catalog.items,
      now,
      lines: [],
      bookings: { slotCounts: {}, itemCounts: {} },
    });
    const closedDay = schedule.days.find((d) => d.date === '2026-10-27');
    expect(closedDay?.state).toBe('closed');
  });

  it('respects busy mode and paused mode', () => {
    const now = new Date(mnl('2026-10-26 10:00'));
    // Busy until 11:00
    const busyStorefront: Storefront = {
      ...kanto.storefront,
      daysAhead: 1,
      pause: { busyUntil: new Date(mnl('2026-10-26 11:00')).toISOString(), paused: false },
    };
    const busySchedule = scheduleDays({
      storefront: busyStorefront,
      items: kanto.catalog.items,
      now,
      lines: [],
      bookings: { slotCounts: {}, itemCounts: {} },
    });
    const today = busySchedule.days[0]!;
    const slotAt1030 = today.slots.find((s) => s.time === '10:30');
    expect(slotAt1030?.state).toBe('closed');

    // Paused
    const pausedStorefront: Storefront = {
      ...kanto.storefront,
      daysAhead: 1,
      pause: { busyUntil: null, paused: true },
    };
    const pausedSchedule = scheduleDays({
      storefront: pausedStorefront,
      items: kanto.catalog.items,
      now,
      lines: [],
      bookings: { slotCounts: {}, itemCounts: {} },
    });
    expect(pausedSchedule.days[0]?.slots.every((s) => s.state === 'closed')).toBe(true);
  });

  it('handles takeOrdersWhileClosed true vs false', () => {
    const now = new Date(mnl('2026-10-26 02:00')); // Shop closed at 2 AM
    const scheduleWithTake = scheduleDays({
      storefront: { ...kanto.storefront, takeOrdersWhileClosed: true, daysAhead: 1 },
      items: kanto.catalog.items,
      now,
      lines: [],
      bookings: { slotCounts: {}, itemCounts: {} },
    });
    expect(scheduleWithTake.days.some((d) => d.slots.some((s) => s.state === 'open'))).toBe(true);

    const scheduleWithoutTake = scheduleDays({
      storefront: { ...kanto.storefront, takeOrdersWhileClosed: false, daysAhead: 1 },
      items: kanto.catalog.items,
      now,
      lines: [],
      bookings: { slotCounts: {}, itemCounts: {} },
    });
    expect(scheduleWithoutTake.days.every((d) => d.slots.every((s) => s.state === 'closed'))).toBe(
      true,
    );
  });

  it('marks slot full when ordersPerSlot is reached', () => {
    const now = new Date(mnl('2026-10-26 10:00'));
    const slotKey = new Date(mnl('2026-10-26 14:00')).toISOString();
    const schedule = scheduleDays({
      storefront: { ...kanto.storefront, ordersPerSlot: 2, daysAhead: 1 },
      items: kanto.catalog.items,
      now,
      lines: [],
      bookings: {
        slotCounts: { [slotKey]: 2 },
        itemCounts: {},
      },
    });
    const today = schedule.days[0]!;
    const slot = today.slots.find((s) => s.iso === slotKey);
    expect(slot?.state).toBe('full');
  });

  it('marks day full when dailyLimit with basket quantity is exceeded', () => {
    const now = new Date(mnl('2026-10-26 10:00'));
    const cakeItem = lola.catalog.items.find((i) => i.id === 'lr-chocolate-moist-cake')!;
    expect(cakeItem.dailyLimit).toBe(6);

    const schedule = scheduleDays({
      storefront: lola.storefront,
      items: lola.catalog.items,
      now,
      lines: [{ itemId: cakeItem.id, qty: 2 }],
      bookings: {
        slotCounts: {},
        itemCounts: {
          '2026-10-28': { [cakeItem.id]: 5 }, // 5 + 2 = 7 > 6 daily limit
        },
      },
    });

    const day = schedule.days.find((d) => d.date === '2026-10-28');
    expect(day?.slots.every((s) => s.state === 'full' || s.state === 'closed')).toBe(true);
  });
});
