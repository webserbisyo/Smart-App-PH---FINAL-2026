'use client';

import { errorWords, words } from '@smartapp/core';
import { errorCodeOf, useBasket, useLoadOrder } from '@smartapp/data';
import { notify } from '@smartapp/ui/compositions/notify';
import { useShop } from '../shell/components/shop-context';

/**
 * Order again from My orders: loads the order, copies its lines into the basket (merging with what is
 * there) and opens the basket. Changed or missing lines are flagged by the basket rules (T08); it never
 * places an order by itself.
 */
export function useOrderAgain() {
  const { slug, shop, setBasketOpen } = useShop();
  const basket = useBasket(slug);
  const load = useLoadOrder(slug);

  function orderAgain(token: string) {
    load.mutate(token, {
      onSuccess: (order) => {
        const known = new Set(shop.catalog.items.map((i) => i.id));
        if (!order.lines.some((l) => known.has(l.itemId))) {
          notify({
            title: words.orders.allGone,
            description: words.orders.allGoneHint,
            tone: 'warning',
          });
          return;
        }
        for (const line of order.lines) {
          basket.add({
            itemId: line.itemId,
            variantId: line.variantId,
            optionIds: [...line.optionIds],
            note: line.note,
            qty: line.qty,
          });
        }
        setBasketOpen(true);
        notify({
          title: words.orders.added(order.lines.reduce((n, l) => n + l.qty, 0)),
          description: words.orders.addedHint,
          tone: 'success',
        });
      },
      onError: (error) => notify({ title: errorWords(errorCodeOf(error)), tone: 'error' }),
    });
  }

  return {
    orderAgain,
    // The order being loaded, so only its button shows the spinner.
    loadingToken: load.isPending ? load.variables : null,
  };
}
