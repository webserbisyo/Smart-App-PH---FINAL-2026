'use client';

import { useEffect, useEffectEvent } from 'react';
import { words } from '@smartapp/core';
import { useRefreshShop } from '@smartapp/data';
import { Drawer, DrawerContent } from '@smartapp/ui/components/drawer';
import { useFormFactor } from '@smartapp/ui/hooks/use-form-factor';
import { closeAddedToast } from '../../menu/use-added-toast';
import { useShop } from '../../shell/components/shop-context';
import { BasketPanel } from './basket-panel';

// Bottom sheet on phones (fits its content up to the drawer's max height), full-height right
// drawer from tablets up (pattern c-drawer-2). The panel holds the one scroll area.
export function BasketDrawer() {
  const { slug, basketOpen, setBasketOpen, preview } = useShop();
  const phone = useFormFactor() === 'phone';
  const refresh = useRefreshShop(slug);
  const onOpened = useEffectEvent(() => {
    closeAddedToast();
    if (!preview) void refresh();
  });

  // Opening the basket reads the menu again, so a line that sold out meanwhile shows before Checkout,
  // and the "added · View basket" toast goes away (T127).
  useEffect(() => {
    if (basketOpen) onOpened();
  }, [basketOpen]);

  return (
    <Drawer
      open={basketOpen}
      onOpenChange={setBasketOpen}
      swipeDirection={phone ? 'down' : 'right'}
      showSwipeHandle={phone}
    >
      <DrawerContent
        aria-label={words.basket.title}
        aria-description={words.basket.description}
        className="overflow-hidden"
      >
        <BasketPanel onBrowse={() => setBasketOpen(false)} />
      </DrawerContent>
    </Drawer>
  );
}
