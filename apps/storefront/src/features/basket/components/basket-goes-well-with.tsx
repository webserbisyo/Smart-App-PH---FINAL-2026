'use client';

import { PlusIcon } from 'lucide-react';
import { imageSources, itemPriceLabel, words, type Item } from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import { Hitbox } from '@smartapp/ui/components/hitbox';
import { ShopImage } from '@smartapp/ui/compositions/shop-image';
import { useQuickAdd } from '../../menu/use-quick-add';

export interface BasketGoesWellWithProps {
  items: readonly Item[];
  // An item with choices opens over the basket and comes back to it (T127).
  onOpenItem: (itemId: string) => void;
}

export function BasketGoesWellWith({ items, onOpenItem }: BasketGoesWellWithProps) {
  const quickAdd = useQuickAdd();
  if (items.length === 0) return null;

  // Same rule as the menu "+": added with its default add-ons, else its sheet opens (T127).
  const handleAdd = (item: Item) => {
    if (!quickAdd(item, { inBasket: true })) onOpenItem(item.id);
  };

  return (
    <div className="flex flex-col gap-2 pt-2">
      <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
        {words.basket.goesWellWith}
      </h3>
      <div className="flex flex-col gap-2">
        {items.map((item) => {
          const photo = item.photos[0] ? imageSources(item.photos[0]) : null;

          return (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border/80 bg-card/60 p-2 text-xs"
            >
              <button
                type="button"
                onClick={() => onOpenItem(item.id)}
                className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-md text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
              >
                <div className="size-10 shrink-0 overflow-hidden rounded-md">
                  <ShopImage
                    src={photo}
                    alt=""
                    ratio="1:1"
                    sizes="40px"
                    fallbackText={item.name}
                    className="size-10"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">{item.name}</p>
                  <p className="text-muted-foreground tabular">{itemPriceLabel(item)}</p>
                </div>
              </button>

              <Hitbox
                size="md"
                radius="full"
                render={
                  <Button
                    size="icon-xs"
                    variant="outline"
                    className="size-7 rounded-full border-primary/20 text-primary hover:bg-primary hover:text-primary-foreground"
                    aria-label={words.storefrontShell.menu.addItem(item.name)}
                    onClick={() => handleAdd(item)}
                  >
                    <PlusIcon className="size-3.5" aria-hidden="true" />
                  </Button>
                }
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
