'use client';

import { words } from '@smartapp/core';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@smartapp/ui/components/drawer';
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
      <DrawerContent className="pb-safe">
        <DrawerHeader>
          <DrawerTitle>{words.basket.title}</DrawerTitle>
          <DrawerDescription>{words.basket.description}</DrawerDescription>
        </DrawerHeader>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
          <BasketPanel onBrowse={() => setBasketOpen(false)} />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
