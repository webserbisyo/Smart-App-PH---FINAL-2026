import { PencilIcon, ShoppingBasketIcon, Trash2Icon, TriangleAlertIcon } from 'lucide-react';
import {
  formatPeso,
  lineIdentity,
  newOrderWords,
  variantLabel,
  type BasketLine,
  type Catalog,
  type QuoteLine,
} from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import { cn } from 'cn';
import { QtyField } from './qty-field.js';

const W = newOrderWords.basket;

/**
 * The items in this order (T111): name and choices, how many, the line's price from the quote, change
 * the choices, remove. A line the quote flags (sold out, choices changed) says so in red.
 */
export function OrderLines({
  lines,
  catalog,
  quoted,
  onQty,
  onRemove,
  onEdit,
  className,
}: {
  lines: readonly BasketLine[];
  catalog: Catalog;
  quoted: readonly QuoteLine[] | undefined;
  onQty: (index: number, qty: number) => void;
  onRemove: (index: number) => void;
  onEdit: (index: number) => void;
  className?: string | undefined;
}) {
  if (lines.length === 0) {
    return (
      <p
        className={cn(
          'flex items-center gap-2 rounded-xl border border-dashed border-border px-3 py-4 text-sm text-muted-foreground',
          className,
        )}
      >
        <ShoppingBasketIcon className="size-4 shrink-0" aria-hidden="true" />
        {W.empty}
      </p>
    );
  }
  return (
    <ul className={cn('flex flex-col divide-y divide-border', className)}>
      {lines.map((line, index) => {
        const item = catalog.items.find((i) => i.id === line.itemId);
        const variant = item?.variants.find((v) => v.id === line.variantId);
        const q = quoted?.find((l) => l.identity === lineIdentity(line));
        const name = q?.name || item?.name || '';
        const extras = [
          variant ? variantLabel(variant) : null,
          ...(q?.optionLabels ??
            catalog.optionGroups
              .flatMap((g) => g.options)
              .filter((o) => line.optionIds.includes(o.id))
              .map((o) => o.name)),
        ].filter(Boolean);
        const flagged = (q?.problems.length ?? 0) > 0;
        const hasChoices =
          (item?.variants.length ?? 0) > 1 || (item?.optionGroupIds.length ?? 0) > 0;
        return (
          <li key={lineIdentity(line)} className="flex flex-col gap-2 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium break-words">{name}</p>
                {extras.length > 0 ? (
                  <p className="text-sm break-words text-muted-foreground">{extras.join(' · ')}</p>
                ) : null}
                {line.note ? (
                  <p className="text-sm break-words text-warning-soft-foreground">{line.note}</p>
                ) : null}
                {flagged ? (
                  <p className="mt-1 flex items-start gap-1.5 text-sm text-destructive">
                    <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    {newOrderWords.problems.line(name)}
                  </p>
                ) : null}
              </div>
              <span className="text-sm font-semibold whitespace-nowrap tabular-nums">
                {q ? formatPeso(q.lineTotal) : ''}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <QtyField
                value={line.qty}
                onChange={(qty) => onQty(index, qty)}
                label={W.qtyLabel(name)}
                lessLabel={W.less(name)}
                moreLabel={W.more(name)}
                min={1}
              />
              <div className="flex items-center gap-1">
                {hasChoices ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-11 md:size-9"
                    aria-label={W.edit(name)}
                    onClick={() => onEdit(index)}
                  >
                    <PencilIcon aria-hidden="true" />
                  </Button>
                ) : null}
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-11 text-destructive hover:text-destructive md:size-9"
                  aria-label={W.remove(name)}
                  onClick={() => onRemove(index)}
                >
                  <Trash2Icon aria-hidden="true" />
                </Button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
