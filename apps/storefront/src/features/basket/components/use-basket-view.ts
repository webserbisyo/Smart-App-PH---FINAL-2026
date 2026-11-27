'use client';

import {
  formatPeso,
  imageSources,
  lineIdentity,
  unitPrice,
  validateLinePicks,
  variantAvailability,
  variantLabel,
  type BasketLine,
  type ImageSources,
  type LineProblem,
  type PublicShop,
  type Quote,
} from '@smartapp/core';
import { useBasket } from '@smartapp/data';

export interface BasketRow {
  identity: string;
  // The saved line, so Edit can open the item sheet with its picks (T127).
  line: BasketLine;
  // The item is still on the menu with a choice left to make, so Edit can fix or change the line.
  canEdit: boolean;
  itemId: string;
  variantId: string;
  name: string;
  // Variant and add-ons in one line, e.g. "Double · Cheese, Bacon".
  details: string | null;
  note: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  photo: ImageSources | null;
  problems: LineProblem[];
  isFlagged: boolean;
  oldPrice?: number | undefined;
  newPrice?: number | undefined;
}

/**
 * Basket lines with names, prices, photos, and validation problems from catalog and quote.
 * Flagged lines (sold out, price changed, option gone) are excluded from the total.
 */
export function useBasketView(
  shop: PublicShop,
  quote?: Quote | null | undefined,
  now?: Date | string | null | undefined,
) {
  const basket = useBasket(shop.storefront.slug);
  const { items, optionGroups } = shop.catalog;
  const options = optionGroups.flatMap((g) => g.options);
  const nowDate = now ? new Date(now) : new Date();

  const rows: BasketRow[] = basket.lines.map((line) => {
    const id = lineIdentity(line);
    const item = items.find((i) => i.id === line.itemId);
    const quoteLine = quote?.lines.find((ql) => ql.identity === id);

    if (!item || item.status === 'hidden' || item.status === 'archived') {
      return {
        identity: id,
        line,
        canEdit: false,
        itemId: line.itemId,
        variantId: line.variantId,
        name: item?.name ?? 'Item',
        details: null,
        note: line.note,
        qty: line.qty,
        unitPrice: 0,
        lineTotal: 0,
        photo: null,
        problems: [{ code: 'item_missing', groupId: null, groupName: null }],
        isFlagged: true,
      };
    }

    const variant = item.variants.find((v) => v.id === line.variantId);
    if (!variant) {
      return {
        identity: id,
        line,
        canEdit: true,
        itemId: line.itemId,
        variantId: line.variantId,
        name: item.name,
        details: null,
        note: line.note,
        qty: line.qty,
        unitPrice: 0,
        lineTotal: 0,
        photo: item.photos[0] ? imageSources(item.photos[0]) : null,
        problems: [{ code: 'variant_missing', groupId: null, groupName: null }],
        isFlagged: true,
      };
    }

    const picked = options.filter((o) => line.optionIds.includes(o.id)).map((o) => o.name);
    const details = [variantLabel(variant), picked.join(', ')].filter(Boolean).join(' · ');
    const localPrice = unitPrice(item, optionGroups, line);

    // Collect problems
    const problems: LineProblem[] = [...validateLinePicks(item, optionGroups, line, nowDate)];

    const avail = variantAvailability(variant, nowDate);
    if (avail === 'sold_out' && !problems.some((p) => p.code === 'sold_out')) {
      problems.push({ code: 'sold_out', groupId: null, groupName: null });
    } else if (avail === 'sold_out_today' && !problems.some((p) => p.code === 'sold_out_today')) {
      problems.push({ code: 'sold_out_today', groupId: null, groupName: null });
    }

    let oldPrice: number | undefined;
    let newPrice: number | undefined;

    if (quoteLine) {
      for (const qp of quoteLine.problems) {
        if (!problems.some((p) => p.code === qp.code && p.groupId === qp.groupId)) {
          problems.push(qp);
        }
      }
      if (quoteLine.unitPrice !== localPrice) {
        oldPrice = localPrice;
        newPrice = quoteLine.unitPrice;
        if (!problems.some((p) => p.code === 'price_changed')) {
          problems.push({ code: 'price_changed', groupId: null, groupName: null });
        }
      }
    }

    const isFlagged = problems.length > 0;
    const finalUnitPrice = newPrice ?? localPrice;
    // A sold-out pick can still be fixed by Edit when another size or colour can be ordered.
    const soldOut = avail !== 'available';
    const canEdit =
      !soldOut || item.variants.some((v) => variantAvailability(v, nowDate) === 'available');

    return {
      identity: id,
      line,
      canEdit,
      itemId: line.itemId,
      variantId: line.variantId,
      name: item.name,
      details: details || null,
      note: line.note,
      qty: line.qty,
      unitPrice: finalUnitPrice,
      lineTotal: finalUnitPrice * line.qty,
      photo: item.photos[0] ? imageSources(item.photos[0]) : null,
      problems,
      isFlagged,
      oldPrice,
      newPrice,
    };
  });

  // Lines that can't be ordered go on top (T127), so they are seen before Checkout.
  rows.sort((a, b) => Number(b.isFlagged) - Number(a.isFlagged));
  // Totals only include unflagged lines
  const goodRows = rows.filter((r) => !r.isFlagged);
  const flaggedRows = rows.filter((r) => r.isFlagged);
  const total = goodRows.reduce((sum, r) => sum + r.lineTotal, 0);
  const count = rows.reduce((n, r) => n + r.qty, 0);
  const goodCount = goodRows.reduce((n, r) => n + r.qty, 0);

  return {
    basket,
    rows,
    goodRows,
    flaggedRows,
    count,
    goodCount,
    total,
    totalLabel: formatPeso(total),
  };
}
