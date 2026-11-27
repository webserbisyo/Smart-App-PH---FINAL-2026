'use client';

import { words } from '@smartapp/core';
import { closeToast, notify } from '@smartapp/ui/compositions/notify';
import { useShop } from '../shell/components/shop-context';

// The last "added" toast, so checkout and the opened basket can close it (it sat on Place order, T127).
let lastAdded: string | null = null;

/** Closes the last "Classic Smash added · View basket" toast, if it is still up. */
export function closeAddedToast(): void {
  if (lastAdded) closeToast(lastAdded);
  lastAdded = null;
}

/** "Classic Smash added" with a real View basket button that opens the basket (decision R35). */
export function useAddedToast(): (itemName: string) => void {
  const { setBasketOpen } = useShop();
  return (itemName) => {
    closeAddedToast();
    lastAdded = notify({
      title: words.storefrontShell.menu.addedToast(itemName),
      tone: 'success',
      action: { label: words.storefrontShell.menu.viewBasket, onClick: () => setBasketOpen(true) },
    });
  };
}
