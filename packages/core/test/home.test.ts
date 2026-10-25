import { describe, expect, it } from 'vitest';
import { SHOP_PACKS } from '../src/demo/packs/index.js';
import { TEST_SHOP_PACKS } from '../src/demo/test-shops.js';
import { canQuickAdd } from '../src/rules/options.js';
import { getBestSellerItems, resolveHomeSections } from '../src/rules/home.js';

describe('Shop Home rules (resolveHomeSections, getBestSellerItems, canQuickAdd)', () => {
  const kanto = SHOP_PACKS['kanto-smash'];
  const tala = SHOP_PACKS['tala-apparel'];
  const blank = TEST_SHOP_PACKS['test-blank'];
  const stress = TEST_SHOP_PACKS['test-stress'];

  // Normal open hours for Kanto: Wednesday 2:00 PM Manila
  const openTime = '2026-10-28T14:00:00+08:00';
  // Early morning closed hours: 4:30 AM Manila
  const closedTime = '2026-10-28T04:30:00+08:00';

  describe('resolveHomeSections table test', () => {
    it('kanto-smash when open has banners, announcement, open state, members count and categories', () => {
      const sections = resolveHomeSections(kanto.storefront, kanto.catalog, openTime);
      expect(sections.demoRibbon).toBe(true);
      expect(sections.banners).toBe(true);
      expect(sections.brandPanel).toBe(false);
      expect(sections.closedOrBusy).toBe(false);
      expect(sections.rewards).toBe(true);
      expect(sections.favourites).toBe(false); // No hearts yet
      expect(sections.categories).toBe(true);
      expect(sections.bestSellers).toBe(true);
      expect(sections.about).toBe(true);
      expect(sections.hours).toBe(true);
      expect(sections.contact).toBe(true);
      expect(sections.membersCount).toBe(true); // kanto has members count on
      expect(sections.footer).toBe(true);
    });

    it('kanto-smash when closed shows closedOrBusy section', () => {
      const sections = resolveHomeSections(kanto.storefront, kanto.catalog, closedTime);
      expect(sections.closedOrBusy).toBe(true);
    });

    it('tala-apparel has membersCount off', () => {
      const sections = resolveHomeSections(tala.storefront, tala.catalog, openTime);
      expect(sections.membersCount).toBe(false);
      expect(sections.banners).toBe(true);
      expect(sections.rewards).toBe(true);
    });

    it('test-blank has 0 banners so it falls back to brand-panel, has no about/categories/items', () => {
      const sections = resolveHomeSections(blank.storefront, blank.catalog, openTime);
      expect(sections.demoRibbon).toBe(false);
      expect(sections.banners).toBe(false);
      expect(sections.brandPanel).toBe(true);
      expect(sections.about).toBe(false); // No about text
      expect(sections.categories).toBe(false); // 0 categories
      expect(sections.bestSellers).toBe(false); // 0 items
      expect(sections.rewards).toBe(false); // stamp card is off
      expect(sections.hours).toBe(true);
      expect(sections.contact).toBe(false); // No contact channels
      expect(sections.footer).toBe(true);
    });

    it('test-stress has 3 banners, announcement, paused card', () => {
      const sections = resolveHomeSections(stress.storefront, stress.catalog, openTime);
      expect(sections.banners).toBe(true);
      expect(sections.brandPanel).toBe(false);
      expect(sections.announcement).toBe(true);
      expect(sections.rewards).toBe(true); // paused card is still rendered (says stamps paused)
      expect(sections.bestSellers).toBe(true);
    });

    it('favourites section renders only when customer has hearts for existing items', () => {
      const noFavs = resolveHomeSections(kanto.storefront, kanto.catalog, openTime, {
        favouriteIds: [],
      });
      expect(noFavs.favourites).toBe(false);

      const firstItemId = kanto.catalog.items[0]?.id;
      if (!firstItemId) throw new Error('Expected item in kanto catalog');

      const withFavs = resolveHomeSections(kanto.storefront, kanto.catalog, openTime, {
        favouriteIds: [firstItemId],
      });
      expect(withFavs.favourites).toBe(true);

      const withBogusFavs = resolveHomeSections(kanto.storefront, kanto.catalog, openTime, {
        favouriteIds: ['non-existent-id'],
      });
      expect(withBogusFavs.favourites).toBe(false);
    });

    it('announcement expires after endsAt', () => {
      const sf = {
        ...kanto.storefront,
        look: {
          ...kanto.storefront.look,
          announcement: {
            text: 'Flash sale!',
            tone: 'warning' as const,
            endsAt: '2026-10-25T12:00:00+08:00',
          },
        },
      };

      const before = resolveHomeSections(sf, kanto.catalog, '2026-10-25T11:00:00+08:00');
      expect(before.announcement).toBe(true);

      const after = resolveHomeSections(sf, kanto.catalog, '2026-10-25T13:00:00+08:00');
      expect(after.announcement).toBe(false);
    });
  });

  describe('best sellers ordering', () => {
    it('returns featured items first', () => {
      const items = kanto.catalog.items;
      const sorted = getBestSellerItems(items, 6);
      expect(sorted.length).toBeLessThanOrEqual(6);
      expect(sorted[0]?.featured).toBe(true);
    });
  });

  describe('canQuickAdd', () => {
    it('permits single variant item without required option groups', () => {
      const items = kanto.catalog.items;
      const groups = kanto.catalog.optionGroups;

      const quickAddable = items.find(
        (i) =>
          i.variants.length === 1 &&
          groups.filter((g) => i.optionGroupIds.includes(g.id)).every((g) => g.min === 0),
      );
      if (!quickAddable) throw new Error('Expected at least one quick-addable item');
      expect(canQuickAdd(quickAddable, groups)).toBe(true);

      const multiVariant = items.find((i) => i.variants.length > 1);
      if (multiVariant) {
        expect(canQuickAdd(multiVariant, groups)).toBe(false);
      }
    });
  });
});
