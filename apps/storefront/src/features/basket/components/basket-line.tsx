'use client';

import { AlertTriangleIcon, XIcon } from 'lucide-react';
import { formatPeso, QTY_MAX, words } from '@smartapp/core';
import { Alert, AlertDescription } from '@smartapp/ui/components/reui/alert';
import { Button } from '@smartapp/ui/components/button';
import { Hitbox } from '@smartapp/ui/components/hitbox';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@smartapp/ui/components/item';
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
} from '@smartapp/ui/components/reui/number-field';
import { ShopImage } from '@smartapp/ui/compositions/shop-image';
import { notify } from '@smartapp/ui/compositions/notify';
import type { BasketApi } from '@smartapp/data';
import { isFixableProblem, lineProblemMessage } from '../basket-rules';
import type { BasketRow } from './use-basket-view';

export interface BasketLineProps {
  row: BasketRow;
  basket: BasketApi;
  onChooseAgain?: ((itemId: string) => void) | undefined;
}

// One basket line: patterns c-item-2 (row), c-number-field-2 (quantity), c-button-24 (remove) and c-alert-7 (flagged line).
export function BasketLine({ row, basket, onChooseAgain }: BasketLineProps) {
  function remove() {
    const undo = basket.removeWithUndo(row.identity);
    if (!undo) return;
    notify({
      title: words.basket.removed(row.name),
      action: { label: words.basket.undo, onClick: undo },
    });
  }

  const firstProblem = row.problems[0];

  return (
    <div className="flex flex-col gap-1.5">
      <Item
        variant="outline"
        className={`items-start gap-3 rounded-xl p-3 transition-colors ${
          row.isFlagged ? 'border-warning/50 bg-warning/5' : ''
        }`}
      >
        <ItemMedia className="size-14 shrink-0 overflow-hidden rounded-md">
          <ShopImage
            src={row.photo}
            alt=""
            ratio="1:1"
            sizes="56px"
            fallbackText={row.name}
            className="size-14"
          />
        </ItemMedia>

        <ItemContent className="min-w-0 flex-1 gap-1">
          <ItemTitle className="w-full items-start justify-between gap-2">
            <span
              className={`line-clamp-2 min-w-0 flex-1 font-medium text-foreground ${
                row.isFlagged ? 'text-muted-foreground line-through' : ''
              }`}
            >
              {row.name}
            </span>
            <span
              className={`shrink-0 text-sm font-semibold whitespace-nowrap tabular ${
                row.isFlagged ? 'text-muted-foreground line-through' : ''
              }`}
            >
              {formatPeso(row.lineTotal)}
            </span>
          </ItemTitle>

          {row.details ? (
            <ItemDescription className="truncate text-xs">{row.details}</ItemDescription>
          ) : null}

          {row.note ? (
            <ItemDescription className="line-clamp-2 text-xs italic">“{row.note}”</ItemDescription>
          ) : null}

          <ItemActions className="mt-2 items-center justify-between">
            {row.isFlagged ? (
              <span className="text-xs text-muted-foreground">Qty: {row.qty}</span>
            ) : (
              <NumberField
                value={row.qty}
                min={1}
                max={QTY_MAX}
                size="sm"
                className="w-28"
                onValueChange={(value) => {
                  if (value !== null) basket.setQty(row.identity, value);
                }}
              >
                <NumberFieldGroup>
                  <NumberFieldDecrement />
                  <NumberFieldInput
                    aria-label={words.basket.quantity(row.name)}
                    className="text-base"
                  />
                  <NumberFieldIncrement />
                </NumberFieldGroup>
              </NumberField>
            )}

            {!row.isFlagged ? (
              <Hitbox
                size="lg"
                radius="full"
                render={
                  <Button
                    size="icon-xs"
                    variant="outline"
                    aria-label={words.basket.remove(row.name)}
                    onClick={remove}
                  >
                    <XIcon aria-hidden="true" className="size-3.5" />
                  </Button>
                }
              />
            ) : null}
          </ItemActions>
        </ItemContent>
      </Item>

      {/* Flagged line alert (c-alert-7 pattern) */}
      {firstProblem ? (
        <Alert
          variant="warning"
          className="flex flex-col gap-2 rounded-lg border-warning/30 bg-warning/10 p-2.5 text-xs text-warning-foreground"
        >
          <div className="flex items-start gap-2">
            <AlertTriangleIcon className="size-4 shrink-0 text-warning" aria-hidden="true" />
            <AlertDescription className="flex-1 font-medium">
              {lineProblemMessage(firstProblem, row.oldPrice, row.newPrice)}
            </AlertDescription>
          </div>

          <div className="flex items-center gap-2 pl-6">
            <Button size="xs" variant="outline" className="h-7 text-xs" onClick={remove}>
              {words.basket.remove(row.name)}
            </Button>
            {isFixableProblem(firstProblem) && onChooseAgain ? (
              <Button
                size="xs"
                variant="default"
                className="h-7 text-xs"
                onClick={() => onChooseAgain(row.itemId)}
              >
                {words.basket.chooseAgain}
              </Button>
            ) : null}
          </div>
        </Alert>
      ) : null}
    </div>
  );
}
