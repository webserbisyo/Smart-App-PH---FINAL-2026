import { describe, expect, it } from 'vitest';
import { SHOP_PACKS } from '../src/demo/packs/index.js';
import {
  DEFAULT_AVATAR_COUNT,
  defaultAvatar,
  groupedHours,
  membersPreviewAvatars,
  todayHoursText,
  upcomingClosures,
} from '../src/rules/shop-info.js';
import type { OpeningRange } from '../src/schemas/storefront.js';

describe('grouped hours', () => {
  it('joins neighbouring days with the same hours, Monday first', () => {
    const hours: OpeningRange[] = [
      ...([1, 2, 3, 4] as const).map((day) => ({ day, open: '11:00', close: '22:00' })),
      { day: 5, open: '11:00', close: '24:00' },
      { day: 6, open: '11:00', close: '24:00' },
    ];
    expect(groupedHours(hours)).toEqual([
      { days: [1, 2, 3, 4], label: 'Mon to Thu', hours: '11 AM to 10 PM' },
      { days: [5, 6], label: 'Fri, Sat', hours: '11 AM to 12 MN' },
      { days: [0], label: 'Sun', hours: 'Closed' },
    ]);
  });

  it('keeps split days in time order and every demo shop covers 7 days', () => {
    const hours: OpeningRange[] = [
      { day: 1, open: '15:00', close: '20:00' },
      { day: 1, open: '06:00', close: '12:00' },
    ];
    expect(groupedHours(hours)[0]?.hours).toBe('6 AM to 12 NN, 3 PM to 8 PM');
    for (const pack of Object.values(SHOP_PACKS)) {
      const days = groupedHours(pack.storefront.hours).flatMap((g) => g.days);
      expect(days).toEqual([1, 2, 3, 4, 5, 6, 0]);
    }
  });
});

describe('today hours', () => {
  it('reads the weekday, and a closure closes the day', () => {
    const sf = { hours: [{ day: 3 as const, open: '11:00', close: '22:00' }], closures: [] };
    expect(todayHoursText(sf, '2026-10-28')).toBe('11 AM to 10 PM');
    expect(todayHoursText(sf, '2026-10-29')).toBe('Closed');
    expect(
      todayHoursText({ ...sf, closures: [{ date: '2026-10-28', reason: null }] }, '2026-10-28'),
    ).toBe('Closed');
  });
});

describe('upcoming closures', () => {
  it('lists closures from today on, soonest first', () => {
    const closures = [
      { date: '2026-11-02', reason: null },
      { date: '2026-10-20', reason: 'Past' },
      { date: '2026-11-01', reason: 'All Saints’ Day' },
    ];
    expect(upcomingClosures(closures, '2026-10-25')).toEqual([
      'Closed Sun 1 Nov, All Saints’ Day',
      'Closed Mon 2 Nov',
    ]);
  });
});

describe('default avatars', () => {
  it('gives the same face to the same key, inside the set', () => {
    expect(defaultAvatar('Ana')).toBe(defaultAvatar('Ana'));
    expect(defaultAvatar('Ana')).toMatch(/^\/avatars\/default-(0[1-9]|1\d|2[0-4])\.webp$/);
  });

  it('picks different faces for the members pill', () => {
    const faces = membersPreviewAvatars('kanto-smash', 4);
    expect(new Set(faces).size).toBe(4);
    expect(membersPreviewAvatars('kanto-smash', 99)).toHaveLength(DEFAULT_AVATAR_COUNT);
  });
});
