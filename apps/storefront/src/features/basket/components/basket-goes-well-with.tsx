'use client';

import { PlusIcon } from 'lucide-react';
import {
  canQuickAdd,
  formatPeso,
  imageSources,
  words,
  type Item,
  type OptionGroup,
} from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import { Hitbox } from '@smartapp/ui/components/hitbox';
import { ShopImage } from '@smartapp/ui/compositions/shop-image';
import { notify } from '@smartapp/ui/compositions/notify';
import type { BasketApi } from '@smartapp/data';

export interface BasketGoesWellWithProps {
  items: Item[];
  optionGroups: OptionGroup[];
  basket: BasketApi;
  onOpenItem: (itemId: string) => void;
}

export function BasketGoesWellWith({
  items,
  optionGroups,
  basket,
  onOpenItem,
}: BasketGoesWellWithProps) {
  if (items.length === 0) return null;

  const handleAdd = (item: Item) => {
    if (!canQuickAdd(item, optionGroups)) {
      onOpenItem(item.id);
      return;
    }

    const variant = item.variants[0];
    if (!variant) return;

    basket.add({
      itemId: item.id,
      variantId: variant.id,
      optionIds: [],
      note: '',
      qty: 1,
    });

    notify({
      title: words.storefrontShell.menu.added,
      description: `${item.name} added`,
      tone: 'success',
    });
  };

  return (
    <div className="flex flex-col gap-2 pt-2">
      <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
        {words.basket.goesWellWith}
      </h3>
      <div className="flex flex-col gap-2">
        {items.map((item) => {
          const startingPrice = item.variants[0]?.price ?? 0;
          const photo = item.photos[0] ? imageSources(item.photos[0]) : null;

          return (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border/80 bg-card/60 p-2 text-xs"
            >
              <div className="flex min-w-0 items-center gap-2.5">
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
                  <p className="text-muted-foreground tabular">{formatPeso(startingPrice)}</p>
                </div>
              </div>

              <Hitbox
                size="md"
                radius="full"
                render={
                  <Button
                    size="icon-xs"
                    variant="outline"
                    className="size-7 rounded-full border-primary/20 text-primary hover:bg-primary hover:text-primary-foreground"
                    aria-label={`Add ${item.name}`}
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
