export { parsePeso, pesoText } from '@/app/peso-input';
import { buildVersions, isSamePrice, type Variant, type VariantAxis } from '@smartapp/core';

// Dashboard-only helpers for the item editor's choices. The pricing rules live in
// packages/core/src/rules (decision T46).

export { newVariantId } from '@smartapp/core';

export function comboCount(axes: readonly Pick<VariantAxis, 'values'>[]): number {
  if (axes.length === 0) return 1;
  return axes.reduce((total, axis) => total * axis.values.length, 1);
}

/**
 * The editor's choices. samePrice[i] is choice i's "Same price for all" switch: while it is on, the
 * typed price changes stay in the form but count as +₱0, and saving stores +₱0.
 */
export interface ChoicesValue {
  axes: VariantAxis[];
  variants: Variant[];
  samePrice: boolean[];
}

export function choicesFrom(axes: VariantAxis[], variants: Variant[]): ChoicesValue {
  return { axes, variants, samePrice: axes.map((axis) => isSamePrice(axis)) };
}

/** The axes as they price: +₱0 for every option of a choice whose switch is on. */
export function pricedAxes(value: Pick<ChoicesValue, 'axes' | 'samePrice'>): VariantAxis[] {
  return value.axes.map((axis, i) =>
    value.samePrice[i] === false
      ? axis
      : { ...axis, values: axis.values.map((v) => ({ ...v, priceDelta: 0 })) },
  );
}

/**
 * Rebuilds the versions after any change: existing ones keep id, special price and stock. A choice
 * with no options yet (just started empty) adds no versions until its first option.
 */
export function withVersions(
  value: Pick<ChoicesValue, 'axes' | 'samePrice' | 'variants'>,
  basePrice: number,
): ChoicesValue {
  return {
    axes: value.axes,
    samePrice: value.samePrice,
    variants: buildVersions(
      pricedAxes(value).filter((axis) => axis.values.length > 0),
      value.variants,
      basePrice,
    ),
  };
}
