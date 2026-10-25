'use client';

import Link from 'next/link';
import { formatPeso, imageSources, words, type Catalog } from '@smartapp/core';
import { useFavourites } from '@smartapp/data';
import { Card, CardContent } from '@smartapp/ui/components/card';
import { ClientOnly } from '@smartapp/ui/components/client-only';
import { Scroller } from '@smartapp/ui/components/scroller';
import { ShopImage } from '@smartapp/ui/compositions/shop-image';

export interface FavouritesRowProps {
  slug: string;
  catalog: Catalog;
}

function FavouritesRowContent({ slug, catalog }: FavouritesRowProps) {
  const { ids } = useFavourites(slug);
  if (!ids || ids.length === 0) return null;

  const items = catalog.items.filter((item) => ids.includes(item.id));
  if (items.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-base font-semibold tracking-tight">
        {words.storefrontShell.home.favourites}
      </h2>
      <Scroller orientation="horizontal" hideScrollbar className="w-full">
        <div className="flex gap-3 pb-2">
          {items.map((item) => {
            const firstVariant = item.variants[0];
            const priceLabel = firstVariant
              ? item.variants.length > 1
                ? words.storefrontShell.home.fromPrice(formatPeso(firstVariant.price))
                : formatPeso(firstVariant.price)
              : '';
            const photo = item.photos[0];
            const category = catalog.categories.find((c) => c.id === item.categoryId);

            return (
              <Card key={item.id} className="w-44 shrink-0 overflow-hidden border-border bg-card">
                <CardContent className="flex flex-col gap-2 p-3">
                  <Link href={`/${slug}/menu?item=${item.id}`} className="group block space-y-2">
                    <div className="overflow-hidden rounded-md">
                      <ShopImage
                        src={photo ? imageSources(photo) : null}
                        alt={item.name}
                        ratio="1:1"
                        fallbackIcon={category?.icon}
                        fallbackText={item.name}
                        sizes="176px"
                      />
                    </div>
                    <p className="line-clamp-1 text-sm font-medium text-foreground group-hover:text-primary">
                      {item.name}
                    </p>
                    <p className="text-xs font-semibold whitespace-nowrap text-muted-foreground">
                      {priceLabel}
                    </p>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </Scroller>
    </section>
  );
}

export function FavouritesRow(props: FavouritesRowProps) {
  return (
    <ClientOnly fallback={null}>
      <FavouritesRowContent {...props} />
    </ClientOnly>
  );
}
