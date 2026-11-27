'use client';

import { formatPeso, words, type LineProblem, orderFlowWords } from '@smartapp/core';
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
  /** Editing one of several copies: the count stays at 1. */
  qtyLocked?: boolean | undefined;
  /** Words for a sold-out pick ("Sold out today · back tomorrow 9 AM"): the button can't be pressed. */
  soldOut?: string | null | undefined;
  /** "update" when the sheet edits a basket line. */
  mode?: 'add' | 'update' | undefined;
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
  qtyLocked = false,
  soldOut = null,
  mode = 'add',
}: ItemSheetFooterProps) {
  const sheet = words.storefrontShell.menu.itemSheet;
  const price = formatPeso(totalPrice);
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
          disabled={qtyLocked}
          className="w-32 shrink-0"
          aria-label={words.storefrontShell.menu.itemSheet.quantity}
        >
          <NumberFieldGroup>
            <NumberFieldDecrement />
            <NumberFieldInput className="text-base font-semibold" />
            <NumberFieldIncrement />
          </NumberFieldGroup>
        </NumberField>

        {soldOut ? (
          <Button
            variant="secondary"
            disabled
            className="h-12 min-w-0 flex-1 rounded-xl text-sm font-semibold"
          >
            <span className="truncate">{soldOut}</span>
          </Button>
        ) : firstProblem ? (
          <Button
            variant="outline"
            className="h-12 min-w-0 flex-1 rounded-xl text-sm font-semibold"
            onClick={() => onMissingClick(firstProblem)}
          >
            <span className="truncate">
              {firstProblem.groupName
                ? sheet.chooseToContinue(firstProblem.groupName)
                : sheet.addWithPrice(price)}
            </span>
          </Button>
        ) : (
          <AddToCartButton
            label={
              mode === 'update' ? orderFlowWords.updateWithPrice(price) : sheet.addWithPrice(price)
            }
            loadingLabel={mode === 'update' ? orderFlowWords.updating : sheet.adding}
            addedLabel={mode === 'update' ? orderFlowWords.updated : sheet.added}
            loadingMs={ADD_LOADING_MS}
            onClick={onAdd}
            className="min-w-0 flex-1 tabular"
          />
        )}
      </div>
    </div>
  );
}
