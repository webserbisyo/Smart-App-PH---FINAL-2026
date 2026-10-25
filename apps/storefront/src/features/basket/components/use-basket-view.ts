'use client';

import {
  formatPeso,
  imageSources,
  lineIdentity,
  unitPrice,
  variantLabel,
  type ImageSources,
  type PublicShop,
} from '@smartapp/core';
import { useBasket } from '@smartapp/data';

export interface BasketRow {
  identity: string;
  name: string;
  // Variant and add-ons in one line, e.g. "Double · Cheese, Bacon".
  details: string | null;
  note: string;
  qty: number;
  lineTotal: number;
  photo: ImageSources | null;
}

/**
 * Basket lines with names, prices and photos from the catalog. Lines the catalog no longer has are
 * left out here; T08 shows them flagged with the reason.
 */
export function useBasketView(shop: PublicShop) {
  const basket = useBasket(shop.storefront.slug);
  const { items, optionGroups } = shop.catalog;
  const options = optionGroups.flatMap((g) => g.options);
  const rows: BasketRow[] = basket.lines.flatMap((line) => {
    const item = items.find((i) => i.id === line.itemId);
    const variant = item?.variants.find((v) => v.id === line.variantId);
    if (!item || !variant) return [];
    const picked = options.filter((o) => line.optionIds.includes(o.id)).map((o) => o.name);
    const details = [variantLabel(variant), picked.join(', ')].filter(Boolean).join(' · ');
    return [
      {
        identity: lineIdentity(line),
        name: item.name,
        details: details || null,
        note: line.note,
        qty: line.qty,
        lineTotal: unitPrice(item, optionGroups, line) * line.qty,
        photo: item.photos[0] ? imageSources(item.photos[0]) : null,
      },
    ];
  });
  const total = rows.reduce((sum, r) => sum + r.lineTotal, 0);
  const count = rows.reduce((n, r) => n + r.qty, 0);
  return { basket, rows, count, total, totalLabel: formatPeso(total) };
}
