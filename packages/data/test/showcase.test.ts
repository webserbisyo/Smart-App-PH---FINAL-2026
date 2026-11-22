import { describe, expect, it } from 'vitest';
import { DEMO_SHOP_SLUGS, ShowcaseSchema } from '@smartapp/core';
import { mnl, testStore } from './helpers';

// The sign-up tour (T108): every sample shop plays its own story, so each one needs its own parts.
describe('showcase mock adapter', () => {
  it('gives every sample shop its own story', async () => {
    const { store } = testStore(mnl('2026-11-21 13:05'));
    const tour = ShowcaseSchema.parse(await store.showcase.getShowcase());
    expect(tour.shops.map((s) => s.slug)).toEqual([...DEMO_SHOP_SLUGS]);
    for (const { slug, shop, story } of tour.shops) {
      expect(story.chat, slug).not.toBeNull();
      expect(story.member, slug).not.toBeNull();
      expect(story.board.length, slug).toBeGreaterThan(0);
      expect(story.week.slots.length, slug).toBeGreaterThan(0);
      expect(shop.catalog.items.length, slug).toBeGreaterThan(0);
    }
  });
});
