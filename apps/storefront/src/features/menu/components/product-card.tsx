'use client';

import {
  canQuickAdd,
  formatPeso,
  imageSources,
  variantAvailability,
  words,
  type Category,
  type Item,
  type OptionGroup,
} from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import { Card, CardContent } from '@smartapp/ui/components/card';
import { Hitbox } from '@smartapp/ui/components/hitbox';
import { Badge } from '@smartapp/ui/components/reui/badge';
import { Toggle } from '@smartapp/ui/components/toggle';
import { ShopImage } from '@smartapp/ui/compositions/shop-image';
import { HeartIcon, PlusIcon } from 'lucide-react';

export interface ProductCardProps {
  item: Item;
  category?: Category | undefined;
  optionGroups: readonly OptionGroup[];
  isFav: boolean;
  onToggleFav: () => void;
  onOpenItem: (itemId: string) => void;
  onQuickAdd: (item: Item) => void;
  now?: string | Date | null | undefined;
  isPreview?: boolean;
}

/**
 * Product Card for the menu grid adhering to c-card-7 pattern:
 * - ShopImage 1:1 (c-aspect-ratio-3)
 * - Name clamped to 2 lines
 * - Price or "from ₱..."
 * - Badges: c-badge-14 (sold out), c-badge-13 (new, best seller), c-badge-7 (sample)
 * - Heart toggle: c-toggle-9
 * - Quick add "+": c-button-11 wrapped in Hitbox
 */
export function ProductCard({
  item,
  category,
  optionGroups,
  isFav,
  onToggleFav,
  onOpenItem,
  onQuickAdd,
  now: rawNow,
  isPreview = false,
}: ProductCardProps) {
  const now = rawNow ?? new Date();
  const isQuick = canQuickAdd(item, optionGroups);
  const firstVariant = item.variants[0];

  // Determine availability
  const allSoldOutToday = item.variants.every(
    (v) => variantAvailability(v, now) === 'sold_out_today',
  );
  const allSoldOut = item.variants.every((v) => variantAvailability(v, now) === 'sold_out');
  const isSoldOut = allSoldOutToday || allSoldOut;
  const soldOutLabel = allSoldOutToday
    ? words.storefrontShell.menu.badges.soldOutToday
    : words.storefrontShell.menu.badges.soldOut;

  // Price formatting
  const minPrice = Math.min(...item.variants.map((v) => v.price));
  const priceLabel =
    item.variants.length > 1
      ? words.storefrontShell.home.fromPrice(formatPeso(minPrice))
      : firstVariant
        ? formatPeso(firstVariant.price)
        : '';

  const photo = item.photos[0];

  return (
    <Card
      data-testid={`product-card-${item.id}`}
      className={`group flex h-full scroll-mt-36 flex-col justify-between overflow-hidden border-border bg-card transition-shadow hover:shadow-xs ${
        isSoldOut ? 'opacity-60' : ''
      }`}
    >
      <div className="relative">
        <button
          type="button"
          onClick={() => onOpenItem(item.id)}
          className="block w-full cursor-pointer text-left focus-visible:outline-hidden"
          aria-label={`${item.name}, ${priceLabel}`}
        >
          <div className="aspect-square w-full overflow-hidden bg-muted">
            <ShopImage
              src={photo ? imageSources(photo) : null}
              alt={item.name}
              ratio="1:1"
              fallbackIcon={category?.icon}
              fallbackText={item.name}
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            />
          </div>
        </button>

        {/* Floating Heart Button (c-toggle-9 pattern) */}
        <div className="absolute top-2 right-2 z-10">
          <Hitbox
            size="default"
            radius="full"
            render={
              <Toggle
                size="sm"
                variant="outline"
                aria-label={
                  isFav
                    ? words.storefrontShell.menu.unsaveItem(item.name)
                    : words.storefrontShell.menu.saveItem(item.name)
                }
                aria-pressed={isFav}
                pressed={isFav}
                onPressedChange={onToggleFav}
                className="size-8 rounded-full border-border/80 bg-background/90 backdrop-blur-xs hover:bg-background"
              >
                <HeartIcon
                  className={`size-4 transition-transform active:scale-125 ${
                    isFav ? 'fill-primary text-primary' : 'text-muted-foreground'
                  }`}
                  aria-hidden="true"
                />
              </Toggle>
            }
          />
        </div>

        {/* Badges */}
        <div className="pointer-events-none absolute top-2 left-2 flex flex-col gap-1">
          {isSoldOut ? (
            <Badge variant="destructive-light" size="xs" radius="full">
              {soldOutLabel}
            </Badge>
          ) : null}
          {!isSoldOut && item.isNew ? (
            <Badge variant="primary-light" size="xs" radius="full">
              {words.storefrontShell.menu.badges.new}
            </Badge>
          ) : null}
          {!isSoldOut && item.featured ? (
            <Badge variant="primary-light" size="xs" radius="full">
              {words.storefrontShell.menu.badges.bestSeller}
            </Badge>
          ) : null}
          {isPreview && item.sample ? (
            <Badge variant="outline" size="xs" radius="full">
              {words.storefrontShell.menu.badges.sample}
            </Badge>
          ) : null}
        </div>
      </div>

      <CardContent className="flex flex-1 flex-col justify-between gap-3 p-3">
        <button
          type="button"
          onClick={() => onOpenItem(item.id)}
          className="block cursor-pointer text-left group-hover:text-primary focus-visible:outline-hidden"
        >
          <h3 className="line-clamp-2 text-sm font-medium text-foreground group-hover:text-primary">
            {item.name}
          </h3>
          {item.description ? (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.description}</p>
          ) : null}
        </button>

        <div className="flex items-center justify-between gap-2 pt-1">
          <span className="text-xs font-semibold whitespace-nowrap text-foreground">
            {priceLabel}
          </span>

          {isSoldOut ? (
            <Hitbox
              size="default"
              radius="full"
              render={
                <Button
                  size="icon"
                  variant="outline"
                  disabled
                  className="size-8 rounded-full opacity-50"
                  aria-label={`${item.name} is ${soldOutLabel.toLowerCase()}`}
                  title={soldOutLabel}
                >
                  <PlusIcon className="size-4" aria-hidden="true" />
                </Button>
              }
            />
          ) : isQuick ? (
            <Hitbox
              size="default"
              radius="full"
              render={
                <Button
                  size="icon"
                  variant="secondary"
                  className="size-8 rounded-full"
                  aria-label={words.storefrontShell.menu.addItem(item.name)}
                  onClick={() => onQuickAdd(item)}
                >
                  <PlusIcon className="size-4" aria-hidden="true" />
                </Button>
              }
            />
          ) : (
            <Hitbox
              size="default"
              radius="full"
              render={
                <Button
                  size="icon"
                  variant="outline"
                  className="size-8 rounded-full"
                  aria-label={words.storefrontShell.menu.addItem(item.name)}
                  onClick={() => onOpenItem(item.id)}
                >
                  <PlusIcon className="size-4" aria-hidden="true" />
                </Button>
              }
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
