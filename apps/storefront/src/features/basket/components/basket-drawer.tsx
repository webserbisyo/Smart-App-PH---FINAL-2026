'use client';

import { words } from '@smartapp/core';
import { Drawer, DrawerContent } from '@smartapp/ui/components/drawer';
import { useFormFactor } from '@smartapp/ui/hooks/use-form-factor';
import { useShop } from '../../shell/components/shop-context';
import { BasketPanel } from './basket-panel';

// Bottom sheet on phones, right drawer from tablets up (pattern c-drawer-2).
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
        className="flex max-h-vh-85 flex-col overflow-hidden pb-safe"
      >
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
          <BasketPanel onBrowse={() => setBasketOpen(false)} />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
