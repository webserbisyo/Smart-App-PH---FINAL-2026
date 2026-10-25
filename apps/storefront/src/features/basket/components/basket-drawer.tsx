'use client';

import { words } from '@smartapp/core';
import { Drawer, DrawerContent } from '@smartapp/ui/components/drawer';
import { useFormFactor } from '@smartapp/ui/hooks/use-form-factor';
import { useShop } from '../../shell/components/shop-context';
import { BasketPanel } from './basket-panel';

// Bottom sheet on phones (fits its content up to the drawer's max height), full-height right
// drawer from tablets up (pattern c-drawer-2). The panel holds the one scroll area.
export function BasketDrawer() {
  const { basketOpen, setBasketOpen } = useShop();
  const phone = useFormFactor() === 'phone';

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
