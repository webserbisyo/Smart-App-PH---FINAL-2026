'use client';

import { quickAddLine, words, type Item } from '@smartapp/core';
import { useBasket, useNow } from '@smartapp/data';
import { notify } from '@smartapp/ui/compositions/notify';
import { useShop } from '../shell/components/shop-context';
import { useStockAt } from '../basket/use-stock-at';
import { useAddedToast } from './use-added-toast';

/**
 * One "+" for the menu cards and both Goes well lists (T127): adds the item with its default add-ons when it
 * needs no choice and can be ordered at the booked time, and says so. Returns false when the item needs its
 * sheet (choices) or is sold out, so the caller opens the sheet instead.
 */
export function useQuickAdd(): (item: Item, options?: { inBasket?: boolean }) => boolean {
  const { slug, shop } = useShop();
  const basket = useBasket(slug);
  const stockAt = useStockAt(slug, useNow());
  const addedToast = useAddedToast();
  return (item, options) => {
    const line = quickAddLine(item, shop.catalog.optionGroups, stockAt);
    if (!line) return false;
    basket.add(line);
    // In the basket there is no View basket: it is already open.
    if (options?.inBasket) {
      notify({ title: words.storefrontShell.menu.addedToast(item.name), tone: 'success' });
    } else {
      addedToast(item.name);
    }
    return true;
  };
}
