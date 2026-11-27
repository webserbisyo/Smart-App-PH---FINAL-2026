'use client';

import { orderFlowWords } from '@smartapp/core';
import type { BasketApi } from '@smartapp/data';
import { BasketLine } from '../../basket/components/basket-line';
import { FlaggedBanner } from '../../basket/components/flagged-banner';
import type { BasketRow } from '../../basket/components/use-basket-view';

/**
 * The lines that can't be ordered, above the form (T127): one Remove for all, or each line's Remove or
 * Edit. Loaded only when there is one, so checkout's first JavaScript stays in budget.
 */
export default function CheckoutFixLines({
  basket,
  rows,
  onEdit,
}: {
  basket: BasketApi;
  rows: readonly BasketRow[];
  onEdit: (row: BasketRow) => void;
}) {
  return (
    <section aria-label={orderFlowWords.cantOrder(rows.length)} className="flex flex-col gap-2">
      <FlaggedBanner basket={basket} rows={rows} />
      <ul className="flex flex-col gap-2.5">
        {rows.map((row) => (
          <li key={row.identity}>
            <BasketLine row={row} basket={basket} onEdit={onEdit} />
          </li>
        ))}
      </ul>
    </section>
  );
}
