import { describe, expect, it } from 'vitest';
import { pickupSlots, scheduleDays, SHOP_PACKS, type Storefront } from '../src/index.js';

// Manila time helper: "2026-10-26 12:00" → ISO UTC. 2026-10-26 is a Monday.
const mnl = (local: string) => new Date(`${local.replace(' ', 'T')}:00+08:00`).toISOString();
const noBookings = { slotCounts: {}, itemCounts: {} };

const kanto = SHOP_PACKS['kanto-smash'];
const lola = SHOP_PACKS['lola-remy'];
const cake = lola.catalog.items.find((i) => i.name === 'Chocolate Moist Cake');
const bread = lola.catalog.items.find((i) => i.name === 'Classic Pandesal');
const with_ = (sf: Storefront, patch: Partial<Storefront>): Storefront => ({ ...sf, ...patch });

describe('scheduleDays (decision T48)', () => {
  it('demo cakes need 2 days notice and allow 6 a day', () => {
    expect(cake?.noticeDays).toBe(2);
    expect(cake?.dailyLimit).toBe(6);
  });

  it('demo shops book a realistic number of days ahead (T83)', () => {
    expect(
      Object.fromEntries(
        Object.entries(SHOP_PACKS).map(([slug, p]) => [slug, p.storefront.daysAhead]),
      ),
    ).toMatchObject({
      'kanto-smash': 3,
      'kape-juan': 3,
      aqualinis: 2,
      'tala-apparel': 7,
      'lola-remy': 14,
    });
  });

  it('daysAhead 1 gives today and tomorrow', () => {
    const s = scheduleDays(
      with_(kanto.storefront, { daysAhead: 1 }),
      [],
      kanto.catalog.items,
      noBookings,
      mnl('2026-10-26 10:00'),
    );
    expect(s.days.map((d) => d.date)).toEqual(['2026-10-26', '2026-10-27']);
    expect(s.days[0]?.state).toBe('open');
    expect(s.noticeItem).toBeNull();
  });

  it('matches pickupSlots for an open shop on 15-minute slots with no limits', () => {
    const now = mnl('2026-10-26 10:00');
    // pickupSlots covers today and tomorrow, so compare on a one-day-ahead shop.
    const sf = with_(kanto.storefront, { daysAhead: 1 });
    const s = scheduleDays(sf, [], kanto.catalog.items, noBookings, now);
    const slots = s.days.flatMap((d) => d.slots.map((x) => x.at));
    expect(slots).toEqual(pickupSlots(sf, now));
  });

  it('notice pushes the earliest day and names the item', () => {
    if (!cake) throw new Error('missing demo cake');
    const s = scheduleDays(
      lola.storefront,
      [{ itemId: cake.id, qty: 1 }],
      lola.catalog.items,
      noBookings,
      mnl('2026-10-26 10:00'),
    );
    expect(s.days[0]?.state).toBe('too_soon');
    expect(s.days[1]?.state).toBe('too_soon');
    expect(s.days[2]).toMatchObject({ date: '2026-10-28', state: 'open' });
    expect(s.noticeItem).toEqual({ name: 'Chocolate Moist Cake', noticeDays: 2 });
    expect(s.earliest && s.earliest >= mnl('2026-10-28 05:00')).toBe(true);
    // Lola Remy takes orders up to 14 days ahead (T83): today plus 14.
    expect(s.days).toHaveLength(15);
  });

  it('closures and closed weekdays are closed', () => {
    const sf = with_(lola.storefront, { closures: [{ date: '2026-10-27', reason: null }] });
    const s = scheduleDays(sf, [], lola.catalog.items, noBookings, mnl('2026-10-26 10:00'));
    expect(s.days.find((d) => d.date === '2026-10-27')?.state).toBe('closed');
  });

  it('a slot at its limit is full; a day with every slot full is full', () => {
    const now = mnl('2026-10-26 10:00');
    const slot = mnl('2026-10-27 06:00');
    const s = scheduleDays(
      lola.storefront,
      [],
      lola.catalog.items,
      { slotCounts: { [slot]: 4 }, itemCounts: {} },
      now,
    );
    const day = s.days.find((d) => d.date === '2026-10-27');
    expect(day?.slots.find((x) => x.at === slot)?.state).toBe('full');
    expect(day?.state).toBe('open');
  });

  it('daily limit counts the basket qty', () => {
    if (!cake) throw new Error('missing demo cake');
    const bookings = { slotCounts: {}, itemCounts: { '2026-10-31': { [cake.id]: 5 } } };
    const one = scheduleDays(
      lola.storefront,
      [{ itemId: cake.id, qty: 1 }],
      lola.catalog.items,
      bookings,
      mnl('2026-10-26 10:00'),
    );
    const two = scheduleDays(
      lola.storefront,
      [{ itemId: cake.id, qty: 2 }],
      lola.catalog.items,
      bookings,
      mnl('2026-10-26 10:00'),
    );
    expect(one.days.find((d) => d.date === '2026-10-31')?.state).toBe('open');
    expect(two.days.find((d) => d.date === '2026-10-31')?.state).toBe('full');
  });

  it('busy: no slot before the pause ends plus prep', () => {
    const sf = with_(kanto.storefront, {
      pause: { busyUntil: mnl('2026-10-26 12:00'), paused: false },
    });
    const s = scheduleDays(sf, [], kanto.catalog.items, noBookings, mnl('2026-10-26 11:00'));
    expect(s.earliest).toBe(mnl('2026-10-26 12:30'));
  });

  it('paused: nothing to book', () => {
    const sf = with_(kanto.storefront, { pause: { busyUntil: null, paused: true } });
    expect(
      scheduleDays(sf, [], kanto.catalog.items, noBookings, mnl('2026-10-26 11:00')).days,
    ).toEqual([]);
  });

  it('closed: bookable only while takeOrdersWhileClosed is on (N1)', () => {
    const night = mnl('2026-10-26 23:00');
    const on = scheduleDays(lola.storefront, [], lola.catalog.items, noBookings, night);
    const off = scheduleDays(
      with_(lola.storefront, { takeOrdersWhileClosed: false }),
      [],
      lola.catalog.items,
      noBookings,
      night,
    );
    expect(on.days.some((d) => d.state === 'open')).toBe(true);
    expect(off.days).toEqual([]);
    expect(pickupSlots(with_(lola.storefront, { takeOrdersWhileClosed: false }), night)).toEqual(
      [],
    );
  });

  it('items without notice keep ASAP-style earliest', () => {
    if (!bread) throw new Error('missing demo bread');
    const s = scheduleDays(
      lola.storefront,
      [{ itemId: bread.id, qty: 10 }],
      lola.catalog.items,
      noBookings,
      mnl('2026-10-26 10:00'),
    );
    expect(s.earliest).toBe(mnl('2026-10-26 11:00'));
  });
});
