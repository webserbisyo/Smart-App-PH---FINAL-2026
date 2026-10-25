'use client';

import { XIcon } from 'lucide-react';
import { formatPeso, words } from '@smartapp/core';
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
import { QTY_MAX } from '@smartapp/core';
import type { BasketApi } from '@smartapp/data';
import type { BasketRow } from './use-basket-view';

// One basket line: patterns c-item-2 (row), c-number-field-2 (quantity) and c-button-24 (remove).
export function BasketLine({ row, basket }: { row: BasketRow; basket: BasketApi }) {
  function remove() {
    const undo = basket.removeWithUndo(row.identity);
    if (!undo) return;
    notify({
      title: words.basket.removed(row.name),
      action: { label: words.basket.undo, onClick: undo },
    });
  }

  return (
    <Item variant="outline" className="items-start gap-3 p-3">
      <ItemMedia className="size-12 shrink-0 overflow-hidden rounded-md">
        <ShopImage
          src={row.photo}
          alt=""
          ratio="1:1"
          sizes="48px"
          fallbackText={row.name}
          className="size-12"
        />
      </ItemMedia>
      <ItemContent className="min-w-0 gap-1">
        <ItemTitle className="w-full">
          <span className="min-w-0 flex-1 truncate">{row.name}</span>
          <span className="shrink-0 font-semibold whitespace-nowrap tabular">
            {formatPeso(row.lineTotal)}
          </span>
        </ItemTitle>
        {row.details ? <ItemDescription className="truncate">{row.details}</ItemDescription> : null}
        {row.note ? <ItemDescription className="line-clamp-2">“{row.note}”</ItemDescription> : null}
        <ItemActions className="mt-1 justify-between">
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
              <NumberFieldInput aria-label={words.basket.quantity(row.name)} />
              <NumberFieldIncrement />
            </NumberFieldGroup>
          </NumberField>
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
                <XIcon aria-hidden="true" />
              </Button>
            }
          />
        </ItemActions>
      </ItemContent>
    </Item>
  );
}
