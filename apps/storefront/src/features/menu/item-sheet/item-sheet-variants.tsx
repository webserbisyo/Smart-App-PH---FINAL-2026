'use client';

import {
  findVariant,
  formatPeso,
  possibleValues,
  variantAvailability,
  words,
  type Item,
  type Variant,
} from '@smartapp/core';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from '@smartapp/ui/components/field';
import { RadioGroup, RadioGroupItem } from '@smartapp/ui/components/radio-group';
import { ToggleGroup, ToggleGroupItem } from '@smartapp/ui/components/toggle-group';

export interface ItemSheetVariantsProps {
  item: Item;
  selectedVariant: Variant | null;
  onSelectVariant: (variant: Variant) => void;
  now?: string | Date;
  onSelectPhotoByValue?: (valueName: string) => void;
}

/**
 * Variants section for the item sheet:
 * - Single axis with prices -> radio rows (c-radio-group-17 pattern)
 * - 2 or 3 axes -> chips per axis (c-toggle-group-4 pattern, controlled)
 * - Impossible or sold-out combinations greyed with words.storefrontShell.menu.itemSheet.notAvailable
 * - Choosing an option with a photo notifies parent to show that photo first
 */
export function ItemSheetVariants({
  item,
  selectedVariant,
  onSelectVariant,
  now = new Date(),
  onSelectPhotoByValue,
}: ItemSheetVariantsProps) {
  // If item has 0 or 1 variant without axes, no variant picker needed.
  if (item.variants.length <= 1 && item.axes.length === 0) {
    return null;
  }

  // Single axis (common in food or simple options) -> c-radio-group-17 pattern
  if (item.axes.length <= 1) {
    const axis = item.axes[0];
    if (!axis) return null;
    const axisName = axis.name;
    const basePrice = item.basePrice;

    return (
      <div className="flex flex-col gap-2">
        <h4 className="text-sm font-semibold tracking-tight text-foreground">{axisName}</h4>
        <RadioGroup
          value={selectedVariant?.id ?? ''}
          onValueChange={(val) => {
            const match = item.variants.find((v) => v.id === val);
            if (match) onSelectVariant(match);
          }}
          className="w-full space-y-2"
        >
          {item.variants.map((variant) => {
            const avail = variantAvailability(variant, now);
            const isSoldOut = avail !== 'available';
            const priceDiff = variant.price - basePrice;
            const priceText =
              variant.price === basePrice
                ? formatPeso(variant.price)
                : priceDiff > 0
                  ? `+${formatPeso(priceDiff)} (${formatPeso(variant.price)})`
                  : formatPeso(variant.price);

            const label = variant.values.join(' · ') || variant.id;

            return (
              <FieldLabel
                key={variant.id}
                htmlFor={variant.id}
                className={`block rounded-lg border border-border p-3 transition-colors ${
                  isSoldOut
                    ? 'cursor-not-allowed bg-muted/40 opacity-50'
                    : 'cursor-pointer hover:bg-muted/30'
                }`}
              >
                <Field orientation="horizontal" className="items-center justify-between">
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value={variant.id} id={variant.id} disabled={isSoldOut} />
                    <FieldContent>
                      <FieldTitle className="text-sm font-medium">{label}</FieldTitle>
                      {isSoldOut ? (
                        <FieldDescription className="text-xs text-destructive">
                          {avail === 'sold_out_today'
                            ? words.storefrontShell.menu.badges.soldOutToday
                            : words.storefrontShell.menu.badges.soldOut}
                        </FieldDescription>
                      ) : null}
                    </FieldContent>
                  </div>
                  <span className="text-xs font-semibold whitespace-nowrap text-muted-foreground">
                    {priceText}
                  </span>
                </Field>
              </FieldLabel>
            );
          })}
        </RadioGroup>
      </div>
    );
  }

  // 2 or 3 axes (e.g. Size and Colour, or Size, Patty, Temperature) -> c-toggle-group-4 chips per axis
  const currentValues = selectedVariant?.values ?? item.variants[0]?.values ?? [];

  const handleAxisChange = (axisIndex: number, newValue: string) => {
    if (!newValue) return; // Controlled: ignore empty values

    const nextPicked = [...currentValues];
    nextPicked[axisIndex] = newValue;

    // Check if exact variant exists
    let matched = findVariant(item, nextPicked);

    // If exact variant doesn't exist, find first possible variant with this picked value
    if (!matched) {
      matched = item.variants.find((v) => v.values[axisIndex] === newValue) ?? null;
    }

    if (matched) {
      onSelectVariant(matched);
      onSelectPhotoByValue?.(newValue);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {item.axes.map((axis, axisIndex) => {
        const pickedForAxis = currentValues[axisIndex] ?? '';
        const allowedValues = possibleValues(item, axisIndex, currentValues);

        return (
          <div key={axis.name} className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">{axis.name}</span>
              <span className="text-xs text-muted-foreground">{pickedForAxis}</span>
            </div>

            <ToggleGroup
              variant="outline"
              spacing={2}
              value={[pickedForAxis]}
              onValueChange={(val) => {
                const chosen = val[0];
                if (chosen) handleAxisChange(axisIndex, chosen);
              }}
              className="flex flex-wrap justify-start gap-2"
            >
              {axis.values.map((v) => {
                const isPossible = allowedValues.includes(v.name);
                // Also check if the combination variant is sold out
                const testCombo = [...currentValues];
                testCombo[axisIndex] = v.name;
                const comboVariant = findVariant(item, testCombo);
                const isSoldOut =
                  comboVariant && variantAvailability(comboVariant, now) !== 'available';
                const isDisabled = !isPossible || isSoldOut;

                return (
                  <ToggleGroupItem
                    key={v.name}
                    value={v.name}
                    disabled={isDisabled ? true : undefined}
                    className={`h-9 gap-1 rounded-md px-3 text-xs font-medium ${
                      isDisabled ? 'line-through opacity-40' : ''
                    }`}
                    title={isDisabled ? words.storefrontShell.menu.itemSheet.notAvailable : v.name}
                  >
                    <span>{v.name}</span>
                    {v.priceDelta > 0 && (
                      <span className="text-muted-foreground">+{formatPeso(v.priceDelta)}</span>
                    )}
                  </ToggleGroupItem>
                );
              })}
            </ToggleGroup>
          </div>
        );
      })}
    </div>
  );
}
