'use client';

import Link from 'next/link';
import {
  canQuickAdd,
  formatPeso,
  getBestSellerItems,
  imageSources,
  words,
  type Catalog,
  type Item,
} from '@smartapp/core';
import { useBasket } from '@smartapp/data';
import { Button } from '@smartapp/ui/components/button';
import { Card, CardContent } from '@smartapp/ui/components/card';
import { Scroller } from '@smartapp/ui/components/scroller';
import { notify } from '@smartapp/ui/compositions/notify';
import { ShopImage } from '@smartapp/ui/compositions/shop-image';
import { PlusIcon } from 'lucide-react';

export interface BestSellersRowProps {
  slug: string;
  catalog: Catalog;
}

export function BestSellersRow({ slug, catalog }: BestSellersRowProps) {
  const basket = useBasket(slug);
  const items = getBestSellerItems(catalog.items);

  if (items.length === 0) return null;

  const handleQuickAdd = (item: Item) => {
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
      title: `${item.name} added`,
      description: words.storefrontShell.home.quickAdd,
      tone: 'success',
    });
  };

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-base font-semibold tracking-tight">
        {words.storefrontShell.home.bestSellers}
      </h2>
      <Scroller orientation="horizontal" hideScrollbar className="w-full">
        <div className="flex gap-3 pb-2">
          {items.map((item) => {
            const isQuick = canQuickAdd(item, catalog.optionGroups);
            const firstVariant = item.variants[0];
            const priceLabel = firstVariant
              ? item.variants.length > 1
                ? words.storefrontShell.home.fromPrice(formatPeso(firstVariant.price))
                : formatPeso(firstVariant.price)
              : '';
            const photo = item.photos[0];
            const category = catalog.categories.find((c) => c.id === item.categoryId);

            return (
              <Card key={item.id} className="w-48 shrink-0 overflow-hidden border-border bg-card">
                <CardContent className="flex h-full flex-col justify-between gap-3 p-3">
                  <Link href={`/${slug}/menu?item=${item.id}`} className="group block space-y-2">
                    <div className="overflow-hidden rounded-md">
                      <ShopImage
                        src={photo ? imageSources(photo) : null}
                        alt={item.name}
                        ratio="1:1"
                        fallbackIcon={category?.icon}
                        fallbackText={item.name}
                        sizes="192px"
                      />
                    </div>
                    <div>
                      <p className="line-clamp-1 text-sm font-medium text-foreground group-hover:text-primary">
                        {item.name}
                      </p>
                      {item.description ? (
                        <p className="line-clamp-2 text-xs text-muted-foreground">
                          {item.description}
                        </p>
                      ) : null}
                    </div>
                  </Link>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className="text-xs font-semibold whitespace-nowrap text-foreground">
                      {priceLabel}
                    </span>
                    {isQuick ? (
                      <Button
                        size="icon"
                        variant="secondary"
                        className="size-8 rounded-full"
                        aria-label={`Add ${item.name} to basket`}
                        onClick={(e) => {
                          e.preventDefault();
                          handleQuickAdd(item);
                        }}
                      >
                        <PlusIcon className="size-4" aria-hidden="true" />
                      </Button>
                    ) : (
                      <Button
                        render={<Link href={`/${slug}/menu?item=${item.id}`} />}
                        nativeButton={false}
                        size="icon"
                        variant="ghost"
                        className="size-8 rounded-full"
                        aria-label={`View options for ${item.name}`}
                      >
                        <PlusIcon className="size-4" aria-hidden="true" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </Scroller>
    </section>
  );
}
