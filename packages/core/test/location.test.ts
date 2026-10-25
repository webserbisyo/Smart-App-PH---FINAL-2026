import { describe, expect, it } from 'vitest';
import { SHOP_PACKS } from '../src/demo/packs/index.js';
import {
  chosenOrderType,
  locationLabel,
  locationShortLabel,
  orderTypeDetail,
  slotGroups,
  slotLabel,
} from '../src/rules/location.js';

const kanto = SHOP_PACKS['kanto-smash'].storefront;
const tala = SHOP_PACKS['tala-apparel'].storefront;
const aqua = SHOP_PACKS.aqualinis.storefront;
const kape = SHOP_PACKS['kape-juan'].storefront;

// Tuesday 28 Oct 2026, 2:00 PM Manila (Kanto opens 11 AM to 10 PM).
const NOW = '2026-10-28T06:00:00.000Z';
const none = { type: null, scheduledAt: null, zoneId: null };

describe('short location pill', () => {
  it('names the type, or the delivery area once chosen', () => {
    expect(locationShortLabel(kanto, none)).toBe('Order how?');
    expect(locationShortLabel(kanto, { ...none, type: 'walk_in' })).toBe('Walk-in');
    expect(
      locationShortLabel(kanto, {
        ...none,
        type: 'pickup',
        scheduledAt: '2026-10-28T07:30:00.000Z',
      }),
    ).toBe('Pickup');
    expect(
      locationShortLabel(kanto, { ...none, type: 'delivery', zoneId: 'ks-z-concepcion' }),
    ).toBe('Concepcion Uno and Dos');
    expect(locationShortLabel(kanto, { ...none, type: 'delivery' })).toBe('Delivery');
  });
});

describe('location bar text', () => {
  it('asks to choose when nothing is set', () => {
    expect(locationLabel(kanto, none, NOW)).toBe('Choose how you’ll order');
  });

  it('walk-in', () => {
    expect(locationLabel(kanto, { ...none, type: 'walk_in' }, NOW)).toBe('Walk-in');
  });

  it('pickup ASAP and at a time today or tomorrow', () => {
    expect(locationLabel(kanto, { ...none, type: 'pickup' }, NOW)).toBe('Pickup · ASAP');
    expect(
      locationLabel(
        kanto,
        { ...none, type: 'pickup', scheduledAt: '2026-10-28T07:30:00.000Z' },
        NOW,
      ),
    ).toBe('Pickup · Today 3:30 PM');
    expect(
      locationLabel(
        kanto,
        { ...none, type: 'pickup', scheduledAt: '2026-10-29T01:00:00.000Z' },
        NOW,
      ),
    ).toBe('Pickup · Tomorrow 9 AM');
  });

  it('delivery with a zone, without one, free, and for a shop without zones', () => {
    expect(
      locationLabel(kanto, { ...none, type: 'delivery', zoneId: 'ks-z-concepcion' }, NOW),
    ).toBe('Delivery · Concepcion Uno and Dos · ₱40');
    expect(locationLabel(kanto, { ...none, type: 'delivery' }, NOW)).toBe(
      'Delivery · Choose your area',
    );
    expect(locationLabel(aqua, { ...none, type: 'delivery', zoneId: 'aq-z-pamplona' }, NOW)).toBe(
      'Delivery · Pamplona Uno, Dos and Tres · Free',
    );
    expect(locationLabel(kape, { ...none, type: 'delivery' }, NOW)).toBe('Delivery');
  });

  it('drops a saved type the shop no longer allows', () => {
    expect(chosenOrderType(tala, 'walk_in')).toBeNull();
    expect(locationLabel(tala, { ...none, type: 'walk_in' }, NOW)).toBe('Choose how you’ll order');
  });
});

describe('How and where sheet details', () => {
  it('gives one line per order type', () => {
    expect(orderTypeDetail(kanto, 'walk_in')).toBe('Order here, pay at the counter');
    expect(orderTypeDetail(kanto, 'pickup')).toBe('Ready in about 20 min');
    expect(orderTypeDetail(kanto, 'delivery')).toBe('₱40 to ₱80 · 30 to 45 min');
    expect(orderTypeDetail(aqua, 'delivery')).toBe('Free to ₱40 · 30 to 60 min');
  });

  it('labels slots for today and tomorrow', () => {
    expect(slotLabel('2026-10-28T12:15:00.000Z', NOW)).toBe('Today 8:15 PM');
    expect(slotLabel('2026-10-29T03:00:00.000Z', NOW)).toBe('Tomorrow 11 AM');
  });

  it('groups pickup slots under Today and Tomorrow', () => {
    const groups = slotGroups(kanto, NOW);
    expect(groups.map((g) => g.label)).toEqual(['Today', 'Tomorrow']);
    expect(groups[0]?.slots[0]?.label).toBe('2:30 PM');
  });
});
