import { describe, expect, it } from 'vitest';
import { canQuickAdd, words, type Item, type OptionGroup } from '@smartapp/core';
import {
  buildMenuSearch,
  isOptionDisabledAtMax,
  parseMenuParams,
  type MenuParams,
} from './url-state';

describe('menu rules and helpers', () => {
  describe('groupRule label text', () => {
    it('formats optional pick 1', () => {
      expect(words.shop.groupRule(0, 1)).toBe('Optional · Choose 1');
    });

    it('formats optional up to N', () => {
      expect(words.shop.groupRule(0, 3)).toBe('Optional · Up to 3');
      expect(words.shop.groupRule(0, 5)).toBe('Optional · Up to 5');
    });

    it('formats required choose exactly N', () => {
      expect(words.shop.groupRule(1, 1)).toBe('Required · Choose 1');
      expect(words.shop.groupRule(2, 2)).toBe('Required · Choose 2');
    });

    it('formats choose min to max', () => {
      expect(words.shop.groupRule(2, 4)).toBe('Choose 2 to 4');
      expect(words.shop.groupRule(1, 3)).toBe('Choose 1 to 3');
    });
  });

  describe('isOptionDisabledAtMax', () => {
    const chosen = ['opt-1', 'opt-2'];
    const max = 2;

    it('does not disable an already chosen option', () => {
      expect(isOptionDisabledAtMax(chosen, max, 'opt-1')).toBe(false);
      expect(isOptionDisabledAtMax(chosen, max, 'opt-2')).toBe(false);
    });

    it('disables unchosen options when max is reached', () => {
      expect(isOptionDisabledAtMax(chosen, max, 'opt-3')).toBe(true);
      expect(isOptionDisabledAtMax(chosen, max, 'opt-4')).toBe(true);
    });

    it('does not disable unchosen options when below max', () => {
      expect(isOptionDisabledAtMax(['opt-1'], max, 'opt-3')).toBe(false);
      expect(isOptionDisabledAtMax([], max, 'opt-3')).toBe(false);
    });
  });

  describe('canQuickAdd decision', () => {
    const mockGroups: OptionGroup[] = [
      {
        id: 'grp-required',
        name: 'Patty',
        min: 1,
        max: 1,
        options: [{ id: 'opt-1', name: 'Single', priceDelta: 0, isDefault: true, soldOut: false }],
      },
      {
        id: 'grp-optional',
        name: 'Cheese',
        min: 0,
        max: 2,
        options: [
          {
            id: 'opt-2',
            name: 'Extra Cheddar',
            priceDelta: 3000,
            isDefault: false,
            soldOut: false,
          },
        ],
      },
    ];

    it('returns true when item has exactly 1 variant and no required option groups', () => {
      const item: Pick<Item, 'variants' | 'optionGroupIds'> = {
        variants: [
          { id: 'v1', values: [], price: 15000, availability: 'available', soldOutUntil: null },
        ],
        optionGroupIds: ['grp-optional'],
      };
      expect(canQuickAdd(item, mockGroups)).toBe(true);
    });

    it('returns true when item has 1 variant and no option groups at all', () => {
      const item: Pick<Item, 'variants' | 'optionGroupIds'> = {
        variants: [
          { id: 'v1', values: [], price: 15000, availability: 'available', soldOutUntil: null },
        ],
        optionGroupIds: [],
      };
      expect(canQuickAdd(item, mockGroups)).toBe(true);
    });

    it('returns false when item has multiple variants', () => {
      const item: Pick<Item, 'variants' | 'optionGroupIds'> = {
        variants: [
          { id: 'v1', values: ['S'], price: 15000, availability: 'available', soldOutUntil: null },
          { id: 'v2', values: ['M'], price: 17000, availability: 'available', soldOutUntil: null },
        ],
        optionGroupIds: [],
      };
      expect(canQuickAdd(item, mockGroups)).toBe(false);
    });

    it('returns false when item has any required option group', () => {
      const item: Pick<Item, 'variants' | 'optionGroupIds'> = {
        variants: [
          { id: 'v1', values: [], price: 15000, availability: 'available', soldOutUntil: null },
        ],
        optionGroupIds: ['grp-required', 'grp-optional'],
      };
      expect(canQuickAdd(item, mockGroups)).toBe(false);
    });
  });

  describe('URL state helpers', () => {
    it('parses empty search params', () => {
      const params = parseMenuParams(new URLSearchParams(''));
      expect(params).toEqual({
        q: '',
        cat: null,
        fav: false,
        show: null,
        item: null,
      });
    });

    it('parses full search params correctly', () => {
      const params = parseMenuParams(
        new URLSearchParams('q=smash&cat=burgers&fav=1&show=best&item=item-123'),
      );
      expect(params).toEqual({
        q: 'smash',
        cat: 'burgers',
        fav: true,
        show: 'best',
        item: 'item-123',
      });
    });

    it('ignores "all" category and normalizes fav', () => {
      const params = parseMenuParams(new URLSearchParams('cat=all&fav=0'));
      expect(params.cat).toBeNull();
      expect(params.fav).toBe(false);
    });

    it('ignores an unknown quick list', () => {
      expect(parseMenuParams(new URLSearchParams('show=cheap')).show).toBeNull();
    });

    it('builds clean search string without default params', () => {
      const initial: MenuParams = {
        q: '',
        cat: null,
        fav: false,
        show: null,
        item: null,
      };
      expect(buildMenuSearch(initial)).toBe('');
      expect(buildMenuSearch(initial, { show: 'new' })).toBe('?show=new');
      expect(buildMenuSearch(initial, { q: 'burger' })).toBe('?q=burger');
      expect(buildMenuSearch(initial, { cat: 'sides', fav: true })).toBe('?cat=sides&fav=1');
      expect(buildMenuSearch(initial, { item: 'classic-smash' })).toBe('?item=classic-smash');
    });

    it('handles query overrides and resets', () => {
      const current: MenuParams = {
        q: 'burger',
        cat: 'combos',
        fav: true,
        show: null,
        item: 'old-item',
      };
      const updated = buildMenuSearch(current, { item: null, q: '' });
      expect(updated).toBe('?cat=combos&fav=1');
    });
  });
});
