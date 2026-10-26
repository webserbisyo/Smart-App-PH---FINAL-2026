import { describe, expect, it } from 'vitest';
import { SHOP_PACKS } from '../src/demo/packs/index.js';
import type { Storefront } from '../src/schemas/storefront.js';
import { formatPeso, optionPriceLabel, parsePeso, pesoAmountText } from '../src/rules/money.js';
import { formatClock, formatManila, manilaDate, minutesUntil } from '../src/rules/time.js';
import {
  isSoldOutToday,
  nextOpening,
  openState,
  openStateText,
  pickupSlots,
  variantAvailability,
} from '../src/rules/hours.js';
import {
  canQuickAdd,
  defaultPicks,
  findVariant,
  lineIdentity,
  linePrice,
  possibleValues,
  validateLinePicks,
} from '../src/rules/options.js';
import { deliveryFee, distanceM, parseMapsLink, roundKm } from '../src/rules/delivery.js';
import {
  boardColumn,
  canAdvance,
  canCancel,
  nextActions,
  payCountdown,
  statusTone,
  timelineSteps,
} from '../src/rules/order-rules.js';
import {
  earnsStamp,
  periodStart,
  quantityLabel,
  rewardState,
  stampProgress,
} from '../src/rules/stamps.js';
import { formatPhPhone, normalisePhPhone } from '../src/rules/phone.js';

// Manila time helper: "2026-10-26 12:00" → ISO UTC.
const mnl = (local: string) => new Date(`${local.replace(' ', 'T')}:00+08:00`).toISOString();

const kanto = SHOP_PACKS['kanto-smash'];
const kape = SHOP_PACKS['kape-juan'];
const lola = SHOP_PACKS['lola-remy'];
const tala = SHOP_PACKS['tala-apparel'];
const with_ = (sf: Storefront, patch: Partial<Storefront>): Storefront => ({ ...sf, ...patch });

describe('money', () => {
  it.each([
    [1234550, '₱12,345.50'],
    [123400, '₱1,234'],
    [14900, '₱149'],
    [0, '₱0'],
    [5, '₱0.05'],
    [-10000, '−₱100'],
  ])('formatPeso(%i) = %s', (centavos, text) => expect(formatPeso(centavos)).toBe(text));

  it('shows ₱0 as "Free" in option labels', () => {
    expect(optionPriceLabel(0, 'Free')).toBe('Free');
    expect(optionPriceLabel(2500, 'Free')).toBe('+₱25');
  });

  it.each([
    ['₱120', 12000],
    ['120.50', 12050],
    ['1,234', 123400],
    [' ₱ 1,234.5 ', 123450],
    ['abc', null],
    ['12.345', null],
  ])('parsePeso(%s) = %s', (text, centavos) => expect(parsePeso(text)).toBe(centavos));

  it('copies the exact amount for payment apps, centavos kept', () => {
    expect(pesoAmountText(34500)).toBe('345');
    expect(pesoAmountText(34550)).toBe('345.50');
    expect(pesoAmountText(123405)).toBe('1234.05');
  });
});

describe('time', () => {
  it('formats Manila times', () => {
    expect(formatClock(mnl('2026-10-26 21:00'))).toBe('9 PM');
    expect(formatClock(mnl('2026-10-26 15:40'))).toBe('3:40 PM');
    expect(formatClock(mnl('2026-10-27 00:00'))).toBe('12 MN');
    expect(formatClock(mnl('2026-10-26 12:00'))).toBe('12 NN');
    expect(formatManila(mnl('2026-10-25 15:40'), 'datetime')).toBe('Sun 25 Oct, 3:40 PM');
    expect(manilaDate('2026-10-25T17:00:00Z')).toBe('2026-10-26');
    expect(minutesUntil(mnl('2026-10-26 12:30'), mnl('2026-10-26 12:00'))).toBe(30);
  });
});

describe('openState', () => {
  it.each([
    ['open', kanto.storefront, '2026-10-26 12:00', 'open', 'Open until 10 PM'],
    [
      'closed tonight',
      kanto.storefront,
      '2026-10-26 23:00',
      'closed',
      'Closed · Opens tomorrow 11 AM',
    ],
    ['open past midnight close', kanto.storefront, '2026-10-30 23:30', 'open', 'Open until 12 MN'],
    ['Lola Remy 4:30 AM', lola.storefront, '2026-10-26 04:30', 'closed', 'Closed · Opens 5 AM'],
    [
      'Tala on Monday',
      tala.storefront,
      '2026-10-26 12:00',
      'closed',
      'Closed · Opens tomorrow 10 AM',
    ],
    ['closure skipped', kape.storefront, '2026-10-31 23:00', 'closed', 'Closed · Opens Mon 7 AM'],
  ])('%s', (_label, sf, now, state, text) => {
    const result = openState(sf, mnl(now));
    expect(result.state).toBe(state);
    expect(openStateText(result, mnl(now))).toBe(text);
  });

  it('busy while paused for a time', () => {
    const sf = with_(kanto.storefront, {
      pause: { busyUntil: mnl('2026-10-26 15:40'), paused: false },
    });
    const result = openState(sf, mnl('2026-10-26 15:00'));
    expect(result.state).toBe('busy');
    expect(openStateText(result, mnl('2026-10-26 15:00'))).toBe('Busy · back 3:40 PM');
  });

  it('paused until the owner resumes', () => {
    const sf = with_(kanto.storefront, { pause: { busyUntil: null, paused: true } });
    const result = openState(sf, mnl('2026-10-26 12:00'));
    expect(result).toMatchObject({ state: 'closed', paused: true });
    expect(openStateText(result, mnl('2026-10-26 12:00'))).toBe('Not taking orders right now');
  });

  it('nextOpening skips the closure', () => {
    expect(nextOpening(kape.storefront, mnl('2026-10-31 23:00'))).toBe(mnl('2026-11-02 07:00'));
  });
});

describe('pickupSlots', () => {
  it('open shop: from the prep time out, 15-minute steps, today and tomorrow inside hours', () => {
    const slots = pickupSlots(kanto.storefront, mnl('2026-10-26 12:00'));
    expect(slots[0]).toBe(mnl('2026-10-26 12:30'));
    expect(slots).toContain(mnl('2026-10-26 21:45'));
    expect(slots).not.toContain(mnl('2026-10-26 22:00'));
    expect(slots).toContain(mnl('2026-10-27 11:30'));
    expect(slots).not.toContain(mnl('2026-10-27 11:15'));
    expect(slots.every((s) => manilaDate(s) <= '2026-10-27')).toBe(true);
  });

  it('closed shop that takes orders: next opening slots only', () => {
    const slots = pickupSlots(lola.storefront, mnl('2026-10-26 04:30'));
    expect(slots[0]).toBe(mnl('2026-10-26 05:30'));
    expect(slots.every((s) => manilaDate(s) === '2026-10-26')).toBe(true);
  });

  it('closed shop without "Take orders while closed": no slots', () => {
    const sf = with_(lola.storefront, { takeOrdersWhileClosed: false });
    expect(pickupSlots(sf, mnl('2026-10-26 04:30'))).toEqual([]);
  });

  it('skips a closure day', () => {
    const slots = pickupSlots(kape.storefront, mnl('2026-10-31 20:00'));
    expect(slots.length).toBeGreaterThan(0);
    expect(slots.some((s) => manilaDate(s) === '2026-11-01')).toBe(false);
    // Closed tonight and the next opening is 2 days away: no slots.
    expect(pickupSlots(kape.storefront, mnl('2026-10-31 23:00'))).toEqual([]);
  });

  it('busy: only after the pause; paused: none', () => {
    const busy = with_(kanto.storefront, {
      pause: { busyUntil: mnl('2026-10-26 13:00'), paused: false },
    });
    expect(pickupSlots(busy, mnl('2026-10-26 12:00'))[0]).toBe(mnl('2026-10-26 13:30'));
    const paused = with_(kanto.storefront, { pause: { busyUntil: null, paused: true } });
    expect(pickupSlots(paused, mnl('2026-10-26 12:00'))).toEqual([]);
  });

  it('sold out today comes back at soldOutUntil', () => {
    const v = { availability: 'sold_out_today' as const, soldOutUntil: mnl('2026-10-27 11:00') };
    expect(isSoldOutToday(v, mnl('2026-10-26 20:00'))).toBe(true);
    expect(isSoldOutToday(v, mnl('2026-10-27 11:00'))).toBe(false);
    expect(variantAvailability(v, mnl('2026-10-27 12:00'))).toBe('available');
  });
});

describe('options', () => {
  const now = mnl('2026-10-26 12:00');
  const groups = kanto.catalog.optionGroups;
  const item = (name: string) => {
    const found = [...kanto.catalog.items, ...tala.catalog.items, ...kape.catalog.items].find(
      (i) => i.name === name,
    );
    if (!found) throw new Error(name);
    return found;
  };
  const nuggets = item('Chicken Nuggets');
  const classic = item('Classic Smash');

  it('missing required group names the group', () => {
    const problems = validateLinePicks(
      nuggets,
      groups,
      { variantId: nuggets.variants[0]?.id ?? '', optionIds: [] },
      now,
    );
    expect(problems).toEqual([{ code: 'required_missing', groupId: 'ks-g-dip', groupName: 'Dip' }]);
  });

  it('over max', () => {
    const sauce = groups.find((g) => g.name === 'Sauce');
    const ids = sauce?.options.slice(0, 3).map((o) => o.id) ?? [];
    const problems = validateLinePicks(
      classic,
      groups,
      { variantId: classic.variants[0]?.id ?? '', optionIds: ids },
      now,
    );
    expect(problems.map((p) => p.code)).toEqual(['too_many']);
  });

  it('sold-out option', () => {
    const jalapenos = groups.flatMap((g) => g.options).find((o) => o.name === 'Jalapeños');
    const problems = validateLinePicks(
      classic,
      groups,
      { variantId: classic.variants[0]?.id ?? '', optionIds: [jalapenos?.id ?? ''] },
      now,
    );
    expect(problems.map((p) => p.code)).toEqual(['option_sold_out']);
  });

  it('impossible or sold-out combination', () => {
    const tee = item('Tala Basic Tee');
    expect(findVariant(tee, ['XXL', 'Black'])).toBeNull();
    const mSand = findVariant(tee, ['M', 'Sand']);
    expect(
      validateLinePicks(
        tee,
        tala.catalog.optionGroups,
        { variantId: mSand?.id ?? '', optionIds: [] },
        now,
      ),
    ).toEqual([{ code: 'sold_out', groupId: null, groupName: null }]);
    expect(
      validateLinePicks(
        tee,
        tala.catalog.optionGroups,
        { variantId: 'nope', optionIds: [] },
        now,
      )[0]?.code,
    ).toBe('variant_missing');
    expect(possibleValues(tee, 1, ['M', null])).toEqual(['Black', 'White', 'Sand']);
  });

  it('sold out today item', () => {
    const rings = item('Onion Rings');
    expect(
      validateLinePicks(
        rings,
        groups,
        { variantId: rings.variants[0]?.id ?? '', optionIds: [] },
        now,
      )[0]?.code,
    ).toBe('sold_out_today');
  });

  it('price, identity and defaults', () => {
    const double = classic.variants.find((v) => v.values[0] === 'Double');
    const bacon = groups.flatMap((g) => g.options).find((o) => o.name === 'Bacon');
    expect(
      linePrice(classic, groups, {
        variantId: double?.id ?? '',
        optionIds: [bacon?.id ?? ''],
        qty: 2,
      }),
    ).toBe((20900 + 4000) * 2);
    const a = lineIdentity({
      itemId: 'x',
      variantId: 'v',
      optionIds: ['b', 'a'],
      note: ' extra hot ',
    });
    const b = lineIdentity({
      itemId: 'x',
      variantId: 'v',
      optionIds: ['a', 'b'],
      note: 'extra hot',
    });
    expect(a).toBe(b);
    const latte = item('Spanish Latte');
    const picks = defaultPicks(latte, kape.catalog.optionGroups, now);
    const names = kape.catalog.optionGroups
      .flatMap((g) => g.options)
      .filter((o) => picks.optionIds.includes(o.id))
      .map((o) => o.name);
    expect(names.sort()).toEqual(['100%', 'Regular ice']);
    expect(canQuickAdd(item('Cheese Fries'), groups)).toBe(true);
    expect(canQuickAdd(nuggets, groups)).toBe(false);
  });
});

describe('delivery', () => {
  const pin = kanto.storefront.info.contact.pin ?? { lat: 0, lng: 0 };
  const north = (km: number) => ({ lat: pin.lat + km / 111.195, lng: pin.lng });

  it('distance rows, then zone, then out of range', () => {
    expect(roundKm(distanceM(pin, north(1)))).toBe(1);
    expect(deliveryFee(kanto.storefront, { spot: north(1), zoneId: null }, 50000)).toMatchObject({
      ok: true,
      fee: 4900,
      via: 'distance',
    });
    expect(deliveryFee(kanto.storefront, { spot: north(4), zoneId: null }, 50000)).toMatchObject({
      ok: true,
      fee: 7900,
    });
    expect(deliveryFee(kanto.storefront, { spot: north(8), zoneId: null }, 50000)).toEqual({
      ok: false,
      code: 'zone_required',
    });
    expect(
      deliveryFee(kanto.storefront, { spot: north(8), zoneId: 'ks-z-marikina' }, 50000),
    ).toMatchObject({
      ok: true,
      fee: 8000,
      via: 'zone',
    });
    const kapePin = kape.storefront.info.contact.pin ?? { lat: 0, lng: 0 };
    const far = { lat: kapePin.lat + 8.2 / 111.195, lng: kapePin.lng };
    expect(deliveryFee(kape.storefront, { spot: far, zoneId: null }, 50000)).toEqual({
      ok: false,
      code: 'out_of_range',
      km: 8.2,
      maxKm: 4,
    });
  });

  it('parses full Google Maps links; short links need the server', () => {
    expect(parseMapsLink('https://www.google.com/maps/@14.6430,121.1010,17z')).toEqual({
      lat: 14.643,
      lng: 121.101,
    });
    expect(parseMapsLink('https://maps.google.com/?q=14.643,121.101')).toEqual({
      lat: 14.643,
      lng: 121.101,
    });
    expect(
      parseMapsLink(
        'https://www.google.com/maps/place/Kanto/@14.6,121.0,17z/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d14.6431!4d121.1012',
      ),
    ).toEqual({ lat: 14.6431, lng: 121.1012 });
    expect(parseMapsLink('https://maps.app.goo.gl/AbC123xyz')).toBeNull();
    expect(parseMapsLink('not a link')).toBeNull();
  });
});

describe('order rules', () => {
  it('timeline, cancel and steps forward', () => {
    expect(timelineSteps('delivery')).toContain('out_for_delivery');
    expect(timelineSteps('pickup')).not.toContain('out_for_delivery');
    expect(canCancel('ready')).toBe(true);
    expect(canCancel('completed')).toBe(false);
    const order = {
      status: 'placed' as const,
      type: 'pickup' as const,
      paymentStatus: 'unpaid' as const,
      paymentMethod: 'gcash' as const,
    };
    expect(canAdvance(order, 'preparing')).toEqual({ ok: false, code: 'not_paid' });
    expect(canAdvance({ ...order, paymentMethod: 'cash' }, 'preparing')).toEqual({ ok: true });
    expect(canAdvance({ ...order, paymentStatus: 'paid' }, 'ready')).toEqual({
      ok: false,
      code: 'invalid_transition',
    });
    expect(nextActions({ ...order, status: 'ready', paymentMethod: 'cash' })).toEqual([]);
    expect(nextActions({ ...order, status: 'ready', paymentStatus: 'paid' })).toEqual([
      'completed',
    ]);
    expect(statusTone('preparing').tone).toBe('warning');
    expect(
      boardColumn(
        { status: 'placed', scheduledAt: mnl('2026-10-26 15:00') },
        mnl('2026-10-26 12:00'),
      ),
    ).toBe('scheduled');
  });

  it('pay countdown', () => {
    expect(payCountdown(mnl('2026-10-26 12:25'), mnl('2026-10-26 12:00'))).toMatchObject({
      label: '25:00',
      expired: false,
    });
    expect(payCountdown(mnl('2026-10-26 12:00'), mnl('2026-10-26 12:01'))).toMatchObject({
      label: '00:00',
      expired: true,
    });
  });
});

describe('stamps', () => {
  const card = (patch: Partial<Storefront['stampCard']> = {}) => ({
    ...tala.storefront.stampCard,
    ...patch,
  });

  it('progress and earning', () => {
    expect(stampProgress(3, 5)).toMatchObject({ filled: 3, left: 2, ready: false });
    expect(earnsStamp(tala.storefront.stampCard.rule, 99900, 0)).toEqual({
      earns: false,
      reason: 'below_min',
    });
    expect(earnsStamp(tala.storefront.stampCard.rule, 100000, 1)).toEqual({
      earns: false,
      reason: 'cap_reached',
    });
    expect(earnsStamp(tala.storefront.stampCard.rule, 100000, 0)).toEqual({ earns: true });
    expect(periodStart('day', mnl('2026-10-26 12:00'))).toBe(mnl('2026-10-26 00:00'));
    expect(periodStart('week', mnl('2026-10-25 12:00'))).toBe(mnl('2026-10-19 00:00'));
  });

  it.each([
    ['ready', card(), { balance: 5, pendingStamps: 0 }, true, 'ready'],
    ['pending', card(), { balance: 4, pendingStamps: 1 }, true, 'pending'],
    ['paused', card({ status: 'paused' }), { balance: 2, pendingStamps: 0 }, true, 'paused'],
    [
      'ready while paused',
      card({ status: 'paused' }),
      { balance: 5, pendingStamps: 0 },
      true,
      'ready',
    ],
    [
      'all claimed',
      card({ reward: { ...tala.storefront.stampCard.reward, quantityLeft: 0 } }),
      { balance: 5, pendingStamps: 0 },
      true,
      'all_claimed',
    ],
    [
      'free item sold out',
      kanto.storefront.stampCard,
      { balance: 8, pendingStamps: 0 },
      false,
      'free_item_sold_out',
    ],
    ['not ready', card(), { balance: 1, pendingStamps: 0 }, true, 'not_ready'],
  ] as const)('%s', (_label, c, member, freeItemAvailable, state) => {
    expect(rewardState({ card: c, member, freeItemAvailable })).toBe(state);
  });

  it('limited prize labels', () => {
    expect(quantityLabel({ quantityTotal: 100, quantityLeft: 100 })).toEqual({
      kind: 'only',
      total: 100,
    });
    expect(quantityLabel({ quantityTotal: 100, quantityLeft: 21 })).toEqual({
      kind: 'only',
      total: 100,
    });
    expect(quantityLabel({ quantityTotal: 100, quantityLeft: 20 })).toEqual({
      kind: 'left',
      left: 20,
    });
    expect(quantityLabel({ quantityTotal: 100, quantityLeft: 0 })).toEqual({
      kind: 'all_claimed',
      total: 100,
    });
    expect(quantityLabel({ quantityTotal: null, quantityLeft: null })).toBeNull();
  });
});

describe('phone', () => {
  it.each(['0917 000 1234', '917-000-1234', '+63 917 000 1234', '639170001234', '(0917) 000 1234'])(
    '%s',
    (input) => {
      expect(normalisePhPhone(input)).toEqual({ ok: true, e164: '+639170001234' });
    },
  );
  it.each(['0817 000 1234', '12345', '0917 000 123', ''])('rejects %s', (input) => {
    expect(normalisePhPhone(input).ok).toBe(false);
  });
  it('formats for display', () => expect(formatPhPhone('+639170001234')).toBe('0917 000 1234'));
});
