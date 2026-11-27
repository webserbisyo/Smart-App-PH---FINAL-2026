'use client';

import {
  imageSources,
  itemPriceLabel,
  itemSoldOutLabel,
  words,
  type Catalog,
  type Item,
} from '@smartapp/core';
import { useFavourites } from '@smartapp/data';
import { ProductCard, type ProductBadge } from '@smartapp/ui/compositions/product-card';
import { useShop } from '../../shell/components/shop-context';
import { useQuickAdd } from '../use-quick-add';

export interface MenuProductCardProps {
  item: Item;
  catalog: Pick<Catalog, 'categories' | 'optionGroups'>;
  now: string | Date | null;
  // Opens the item sheet (?item=); the "+" opens it too when the item needs choices.
  onOpen: (itemId: string) => void;
  sizes: string;
  priority?: boolean | undefined;
  className?: string | undefined;
}

/** The shared product card (C5) wired to favourites and the basket, for Menu and Home rows. */
export function MenuProductCard({
  item,
  catalog,
  now,
  onOpen,
  sizes,
  priority,
  className,
}: MenuProductCardProps) {
  const { slug } = useShop();
  const favourites = useFavourites(slug);
  const quickAdd = useQuickAdd();
  const price = itemPriceLabel(item);
  // Sold out is judged once the clock is known, so the first paint matches the server.
  const soldOut = now ? itemSoldOutLabel(item, now) : null;
  const saved = favourites.has(item.id);
  const icon = catalog.categories.find((c) => c.id === item.categoryId)?.icon;
  const photo = item.photos[0];

  // One badge per card, the most useful first: Sold out, then Best seller, then New (decision R29).
  const badges: ProductBadge[] = soldOut
    ? [{ tone: 'soldOut', label: soldOut }]
    : item.featured
      ? [{ tone: 'bestSeller', label: words.storefrontShell.menu.badges.bestSeller }]
      : item.isNew
        ? [{ tone: 'new', label: words.storefrontShell.menu.badges.new }]
        : [];

  return (
    <ProductCard
      testId={`product-card-${item.id}`}
      name={item.name}
      priceLabel={price}
      photo={photo ? imageSources(photo) : null}
      fallbackIcon={icon}
      sizes={sizes}
      priority={priority}
      openLabel={words.storefrontShell.menu.openItem(item.name, price)}
      onOpen={() => onOpen(item.id)}
      badges={badges}
      soldOut={soldOut !== null}
      heart={{
        pressed: saved,
        onPressedChange: () => favourites.toggle(item.id),
        label: words.storefrontShell.menu.saveItem(item.name),
        pressedLabel: words.storefrontShell.menu.unsaveItem(item.name),
      }}
      add={{
        label: words.storefrontShell.menu.addItem(item.name),
        onClick: () => {
          if (!quickAdd(item)) onOpen(item.id);
        },
      }}
      className={className}
    />
  );
}
