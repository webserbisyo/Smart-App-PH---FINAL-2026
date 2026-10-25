'use client';

import { formatPeso, words, type LineProblem } from '@smartapp/core';
import { Pending } from '@smartapp/ui/components/pending';
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
} from '@smartapp/ui/components/reui/number-field';
import { AddToCartButton } from '@smartapp/ui/vendor/opensource-ui/add-to-cart';

export interface ItemSheetFooterProps {
  qty: number;
  onQtyChange: (qty: number) => void;
  totalPrice: number;
  problems: readonly LineProblem[];
  onAdd: () => void;
  onMissingClick: (problem: LineProblem) => void;
  isAdding?: boolean;
}

/**
 * Item Sheet sticky footer:
 * - Quantity selector: c-number-field-3 (1 to 99, Hitbox)
 * - Add to Cart: Opensource UI Add to Cart in DiceUI Pending
 * - Missing required pick prompt (e.g. "Choose a patty")
 */
export function ItemSheetFooter({
  qty,
  onQtyChange,
  totalPrice,
  problems,
  onAdd,
  onMissingClick,
  isAdding = false,
}: ItemSheetFooterProps) {
  // First blocking problem
  const firstProblem = problems.find((p) => p.code === 'required_missing' || p.code === 'too_few');

  const missingText = firstProblem?.groupName
    ? words.storefrontShell.menu.itemSheet.chooseToContinue(firstProblem.groupName)
    : null;

  const buttonLabel =
    missingText ?? words.storefrontShell.menu.itemSheet.addWithPrice(formatPeso(totalPrice));

  return (
    <div className="flex w-full items-center justify-between gap-3 border-t border-border bg-card/95 px-4 py-3 backdrop-blur-xs">
      {/* Quantity field (1 to 99) */}
      <div className="w-28 shrink-0">
        <NumberField
          value={qty}
          onValueChange={(val) => {
            if (val === null || val < 1) onQtyChange(1);
            else if (val > 99) onQtyChange(99);
            else onQtyChange(val);
          }}
          min={1}
          max={99}
          size="lg"
          className="w-full"
          aria-label="Quantity"
        >
          <NumberFieldGroup>
            <NumberFieldDecrement />
            <NumberFieldInput className="font-semibold" />
            <NumberFieldIncrement />
          </NumberFieldGroup>
        </NumberField>
      </div>

      {/* Add To Cart button wrapped in Pending */}
      <div className="flex-1">
        <Pending isPending={isAdding}>
          <AddToCartButton
            label={buttonLabel}
            loadingLabel={words.storefrontShell.menu.itemSheet.adding}
            addedLabel={words.storefrontShell.menu.itemSheet.added}
            disabled={isAdding}
            onClick={(e) => {
              e.preventDefault();
              if (firstProblem) {
                onMissingClick(firstProblem);
              } else {
                onAdd();
              }
            }}
            className="w-full text-xs sm:text-sm"
          />
        </Pending>
      </div>
    </div>
  );
}
