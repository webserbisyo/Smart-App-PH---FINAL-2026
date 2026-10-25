'use client';

import Link from 'next/link';
import { ShoppingBagIcon } from 'lucide-react';
import { vocab, words } from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@smartapp/ui/components/empty';
import { Separator } from '@smartapp/ui/components/separator';
import { useShop } from '../../shell/components/shop-context';
import { BasketLine } from './basket-line';
import { useBasketView } from './use-basket-view';

// The basket's lines and total, shared by the drawer and the 1280 px column.
export function BasketPanel({ onBrowse }: { onBrowse?: (() => void) | undefined }) {
  const { slug, shop } = useShop();
  const { basket, rows, totalLabel } = useBasketView(shop);
  const catalog = vocab(shop.storefront.info.kind).catalog;

  if (rows.length === 0) {
    // Pattern c-empty-11.
    return (
      <Empty className="py-12">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ShoppingBagIcon />
          </EmptyMedia>
          <EmptyTitle>{words.basket.empty}</EmptyTitle>
          <EmptyDescription>{words.basket.emptyHint}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href={`/${slug}/menu`} {...(onBrowse ? { onClick: onBrowse } : {})} />}
          >
            {words.basket.browse(catalog)}
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2">
        {rows.map((row) => (
          <li key={row.identity}>
            <BasketLine row={row} basket={basket} />
          </li>
        ))}
      </ul>
      {/* Pattern c-separator-6. */}
      <Separator />
      <dl className="flex items-center justify-between text-base font-semibold">
        <dt>{words.basket.total}</dt>
        <dd className="whitespace-nowrap tabular">{totalLabel}</dd>
      </dl>
    </div>
  );
}
