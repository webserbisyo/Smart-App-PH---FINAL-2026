import { describe, expect, it } from 'vitest';
import { SHOP_PACKS } from '@smartapp/core';
import { ownerHoldUntil } from '../../src/public/storefront.service.js';

// An order booked while the shop is closed tells the owner when it opens, not at 1:30 AM (T129).
const lola = SHOP_PACKS['lola-remy'].storefront;
const mnl = (local: string) => new Date(`${local.replace(' ', 'T')}:00+08:00`);

describe('ownerHoldUntil (T129)', () => {
  it('holds the new-order push until the next opening while closed', () => {
    expect(ownerHoldUntil(lola, mnl('2026-12-01 01:30'))).toBe(
      mnl('2026-12-01 05:00').toISOString(),
    );
  });

  it('sends at once while open', () => {
    expect(ownerHoldUntil(lola, mnl('2026-12-01 10:00'))).toBeNull();
  });

  it('sends at once while paused (the owner paused it on purpose)', () => {
    const paused = { ...lola, pause: { ...lola.pause, paused: true } };
    expect(ownerHoldUntil(paused, mnl('2026-12-01 01:30'))).toBeNull();
  });
});
