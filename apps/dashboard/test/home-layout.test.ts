import { describe, expect, it } from 'vitest';
import { HOME_SLOTS } from '../src/features/home/home-layout';

// T83: the cards and the skeleton share these slots, so loading never moves the page.
describe('Home layout slots', () => {
  it('reads in order on a phone, Needs you first, and lets desktop place the columns', () => {
    const order = Object.entries(HOME_SLOTS).map(([card, cls]) => {
      const n = /(?:^| )order-(\d+)/.exec(cls)?.[1];
      expect(cls).toContain('lg:order-none');
      return [card, Number(n)] as const;
    });
    expect(order.map(([card]) => card)).toEqual([
      'needs',
      'money',
      'sales',
      'board',
      'mix',
      'best',
      'members',
      'coming',
    ]);
    expect(order.map(([, n]) => n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('closes the right column with a card that fills what is left', () => {
    expect(HOME_SLOTS.members).toContain('lg:flex-1');
  });
});
