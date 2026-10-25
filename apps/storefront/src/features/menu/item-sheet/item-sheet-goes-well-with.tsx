'use client';

import {
  canQuickAdd,
  formatPeso,
  imageSources,
  words,
  type Category,
  type Item,
  type OptionGroup,
} from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import { Card, CardContent } from '@smartapp/ui/components/card';
import { Hitbox } from '@smartapp/ui/components/hitbox';
import { ShopImage } from '@smartapp/ui/compositions/shop-image';
import { PlusIcon } from 'lucide-react';

export interface ItemSheetGoesWellWithProps {
  items: readonly Item[];
  categories: readonly Category[];
  optionGroups: readonly OptionGroup[];
  onQuickAdd: (item: Item) => void;
  onOpenItem: (itemId: string) => void;
}

/**
 * "Goes well with" section: up to 4 recommended items with small cards and their own "+" button.
 */
export function ItemSheetGoesWellWith({
  items,
  categories,
  optionGroups,
  onQuickAdd,
  onOpenItem,
}: ItemSheetGoesWellWithProps) {
  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <h4 className="text-sm font-semibold tracking-tight text-foreground">
        {words.storefrontShell.menu.itemSheet.goesWellWith}
      </h4>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {items.slice(0, 4).map((item) => {
          const isQuick = canQuickAdd(item, optionGroups);
          const firstVariant = item.variants[0];
          const priceLabel = firstVariant ? formatPeso(firstVariant.price) : '';
          const photo = item.photos[0];
          const category = categories.find((c) => c.id === item.categoryId);

          return (
            <Card
              key={item.id}
              className="flex flex-col justify-between overflow-hidden border-border bg-card p-2 shadow-2xs"
            >
              <button
                type="button"
                onClick={() => onOpenItem(item.id)}
                className="block w-full cursor-pointer text-left focus-visible:outline-hidden"
              >
                <div className="aspect-square w-full overflow-hidden rounded-md bg-muted">
                  <ShopImage
                    src={photo ? imageSources(photo) : null}
                    alt={item.name}
                    ratio="1:1"
                    fallbackIcon={category?.icon}
                    fallbackText={item.name}
                    sizes="120px"
                  />
                </div>
                <p className="mt-1.5 line-clamp-1 text-xs font-medium text-foreground">
                  {item.name}
                </p>
              </button>

              <CardContent className="flex items-center justify-between p-0 pt-2">
                <span className="text-xs font-semibold whitespace-nowrap text-muted-foreground">
                  {priceLabel}
                </span>
                <Hitbox
                  size="default"
                  radius="full"
                  render={
                    <Button
                      size="icon"
                      variant="secondary"
                      className="size-6 rounded-full"
                      aria-label={`Add ${item.name}`}
                      onClick={() => {
                        if (isQuick) {
                          onQuickAdd(item);
                        } else {
                          onOpenItem(item.id);
                        }
                      }}
                    >
                      <PlusIcon className="size-3" aria-hidden="true" />
                    </Button>
                  }
                />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
