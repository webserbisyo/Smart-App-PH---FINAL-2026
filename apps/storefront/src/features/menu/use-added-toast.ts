'use client';

import { words } from '@smartapp/core';
import { notify } from '@smartapp/ui/compositions/notify';
import { useShop } from '../shell/components/shop-context';

/** "Classic Smash added" with a real View basket button that opens the basket (decision R35). */
export function useAddedToast(): (itemName: string) => void {
  const { setBasketOpen } = useShop();
  return (itemName) => {
    notify({
      title: words.storefrontShell.menu.addedToast(itemName),
      tone: 'success',
      action: { label: words.storefrontShell.menu.viewBasket, onClick: () => setBasketOpen(true) },
    });
  };
}
