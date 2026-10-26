'use client';

import { useRouter } from 'next/navigation';
import { getBestSellerItems, words, type Catalog, type Item } from '@smartapp/core';
import { useNow } from '@smartapp/data';
import { Scroller } from '@smartapp/ui/components/scroller';
import { MenuProductCard } from '../../menu/components/menu-product-card';

export interface ProductRowProps {
  slug: string;
  title: string;
  items: readonly Item[];
  catalog: Catalog;
}

/** A titled row of the shared product card (C5); a card opens the item on the Menu. */
export function ProductRow({ slug, title, items, catalog }: ProductRowProps) {
  const router = useRouter();
  const now = useNow();
  if (items.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-base font-semibold tracking-tight">{title}</h2>
      <Scroller orientation="horizontal" hideScrollbar className="-mx-4 w-auto px-4">
        <div className="flex gap-3 pb-2">
          {items.map((item) => (
            <MenuProductCard
              key={item.id}
              item={item}
              catalog={catalog}
              now={now}
              onOpen={(id) => router.push(`/${slug}/menu?item=${id}`, { scroll: false })}
              sizes="160px"
              className="w-40 shrink-0"
            />
          ))}
        </div>
      </Scroller>
    </section>
  );
}

export interface BestSellersRowProps {
  slug: string;
  catalog: Catalog;
}

export function BestSellersRow({ slug, catalog }: BestSellersRowProps) {
  const items = getBestSellerItems(catalog.items.filter((item) => item.status === 'active'));
  return (
    <ProductRow
      slug={slug}
      title={words.storefrontShell.home.bestSellers}
      items={items}
      catalog={catalog}
    />
  );
}
