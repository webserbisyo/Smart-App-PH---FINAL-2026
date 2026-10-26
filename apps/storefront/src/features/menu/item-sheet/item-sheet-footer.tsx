'use client';

import { formatPeso, words, type LineProblem } from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
} from '@smartapp/ui/components/reui/number-field';
import { AddToCartButton } from '@smartapp/ui/vendor/opensource-ui/add-to-cart';

// Adding is local, so the spinner is a short beat before the check (the source waits 1.2 s).
export const ADD_LOADING_MS = 300;

export interface ItemSheetFooterProps {
  qty: number;
  onQtyChange: (qty: number) => void;
  totalPrice: number;
  problems: readonly LineProblem[];
  onAdd: () => void;
  onMissingClick: (problem: LineProblem) => void;
}

/**
 * Fixed item sheet footer: quantity (c-number-field-3, 1 to 99) and Opensource UI Add to Cart
 * ("Add · ₱229"). A missing required pick shows a plain button that jumps to it instead, so the
 * cart animation only plays for a real add.
 */
export function ItemSheetFooter({
  qty,
  onQtyChange,
  totalPrice,
  problems,
  onAdd,
  onMissingClick,
}: ItemSheetFooterProps) {
  const firstProblem = problems.find((p) => p.code === 'required_missing' || p.code === 'too_few');

  return (
    <div className="shrink-0 border-t bg-popover pb-safe">
      <div className="flex w-full items-center gap-3 px-4 py-3">
        <NumberField
          value={qty}
          onValueChange={(val) => onQtyChange(Math.min(99, Math.max(1, val ?? 1)))}
          min={1}
          max={99}
          size="lg"
          className="w-32 shrink-0"
          aria-label={words.storefrontShell.menu.itemSheet.quantity}
        >
          <NumberFieldGroup>
            <NumberFieldDecrement />
            <NumberFieldInput className="font-semibold" />
            <NumberFieldIncrement />
          </NumberFieldGroup>
        </NumberField>

        {firstProblem ? (
          <Button
            variant="outline"
            className="h-12 min-w-0 flex-1 rounded-xl text-sm font-semibold"
            onClick={() => onMissingClick(firstProblem)}
          >
            <span className="truncate">
              {firstProblem.groupName
                ? words.storefrontShell.menu.itemSheet.chooseToContinue(firstProblem.groupName)
                : words.storefrontShell.menu.itemSheet.addWithPrice(formatPeso(totalPrice))}
            </span>
          </Button>
        ) : (
          <AddToCartButton
            label={words.storefrontShell.menu.itemSheet.addWithPrice(formatPeso(totalPrice))}
            loadingLabel={words.storefrontShell.menu.itemSheet.adding}
            addedLabel={words.storefrontShell.menu.itemSheet.added}
            loadingMs={ADD_LOADING_MS}
            onClick={onAdd}
            className="min-w-0 flex-1 tabular"
          />
        )}
      </div>
    </div>
  );
}
