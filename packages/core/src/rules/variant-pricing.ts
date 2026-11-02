// Pure pricing rules for item choices and variants.
import type { Availability } from '../schemas/enums.js';
import type { Item, ItemDraft, OwnerItem, Variant, VariantAxis } from '../schemas/catalog.js';

let seq = 0;
export function newVariantId(): string {
  seq += 1;
  return `var_${Date.now().toString(36)}_${seq}`;
}

function sameValues(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((value, i) => value === b[i]);
}

/** Check if every option of a choice has priceDelta === 0. */
export function isSamePrice(axis: Pick<VariantAxis, 'values'>): boolean {
  return axis.values.every((v) => (v.priceDelta ?? 0) === 0);
}

/**
 * Computes the price for a combination of values:
 * basePrice + sum of option priceDeltas (or priceOverride if set).
 */
export function computedPrice(
  basePrice: number,
  axes: readonly VariantAxis[],
  variant: Pick<Variant, 'values' | 'priceOverride'>,
): number {
  if (variant.priceOverride !== null && variant.priceOverride !== undefined) {
    return variant.priceOverride;
  }
  let delta = 0;
  for (let i = 0; i < variant.values.length; i++) {
    const valName = variant.values[i];
    const axis = axes[i];
    const option = axis?.values.find((v) => v.name === valName);
    if (option) {
      delta += option.priceDelta ?? 0;
    }
  }
  return basePrice + delta;
}

/** Price for a specific set of axis values on an item. */
export function versionPrice(
  item: Pick<Item, 'basePrice' | 'axes' | 'variants'>,
  values: readonly string[],
): number {
  const match = item.variants.find((v) => sameValues(v.values, values));
  if (match) {
    return match.price;
  }
  return computedPrice(item.basePrice, item.axes, { values: [...values], priceOverride: null });
}

/**
 * Builds every combination in axis order.
 * An existing combination (same values) keeps its id, priceOverride, availability, and soldOutUntil.
 * A new combination starts available with no priceOverride.
 * Every variant's price is recomputed from basePrice + priceDeltas (or priceOverride).
 */
export function buildVersions(
  axes: readonly VariantAxis[],
  previous: readonly Variant[],
  basePrice: number,
): Variant[] {
  if (axes.length === 0) {
    const first = previous[0];
    const override = first?.priceOverride ?? null;
    const price = override !== null ? override : basePrice;
    return [
      {
        id: first?.id ?? newVariantId(),
        values: [],
        price,
        priceOverride: override,
        availability: first?.availability ?? 'available',
        soldOutUntil: first?.soldOutUntil ?? null,
      },
    ];
  }

  const combos = axes.reduce<string[][]>(
    (acc, axis) => acc.flatMap((combo) => axis.values.map((v) => [...combo, v.name])),
    [[]],
  );

  return combos.map((values) => {
    const existing = previous.find((v) => sameValues(v.values, values));
    const priceOverride = existing?.priceOverride ?? null;
    const price = computedPrice(basePrice, axes, { values, priceOverride });

    if (existing) {
      return {
        ...existing,
        values,
        price,
        priceOverride,
      };
    }

    return {
      id: newVariantId(),
      values,
      price,
      priceOverride: null,
      availability: 'available',
      soldOutUntil: null,
    };
  });
}

/** Alias for buildVersions matching legacy dashboard callers. */
export const buildVariants = buildVersions;

/**
 * Returns min and max price across all versions, or null for 0 versions.
 */
export function priceRange(item: Pick<Item, 'variants'>): { min: number; max: number } | null {
  if (item.variants.length === 0) return null;
  let min = item.variants[0]!.price;
  let max = item.variants[0]!.price;
  for (const v of item.variants) {
    if (v.price < min) min = v.price;
    if (v.price > max) max = v.price;
  }
  return { min, max };
}

/**
 * Sold out state of an option across all combinations using it:
 * 'all': every combination with this option is sold out
 * 'some': at least one combination is sold out and at least one is available
 * 'none': no combinations with this option are sold out
 */
export function optionSoldOutState(
  item: Pick<Item, 'variants'>,
  axisIndex: number,
  optionName: string,
): 'none' | 'some' | 'all' {
  const matching = item.variants.filter((v) => v.values[axisIndex] === optionName);
  if (matching.length === 0) return 'none';
  const soldOutCount = matching.filter((v) => v.availability !== 'available').length;
  if (soldOutCount === 0) return 'none';
  if (soldOutCount === matching.length) return 'all';
  return 'some';
}

/**
 * Sets sold out state for all combinations that include a given option.
 */
export function setOptionSoldOut<T extends Item | OwnerItem | ItemDraft>(
  item: T,
  axisIndex: number,
  optionName: string,
  soldOut: boolean,
): T {
  const nextAvailability: Availability = soldOut ? 'sold_out' : 'available';
  const updatedVariants = item.variants.map((v) => {
    if (v.values[axisIndex] === optionName) {
      return {
        ...v,
        availability: nextAvailability,
        soldOutUntil: soldOut ? v.soldOutUntil : null,
      };
    }
    return v;
  });
  return {
    ...item,
    variants: updatedVariants,
  };
}

/** Renames one option and keeps every combination that uses it (id, priceOverride, stock). */
export function renameOption(
  axes: readonly VariantAxis[],
  variants: readonly Variant[],
  axisIndex: number,
  from: string,
  to: string,
): { axes: VariantAxis[]; variants: Variant[] } {
  return {
    axes: axes.map((axis, i) =>
      i === axisIndex
        ? {
            ...axis,
            values: axis.values.map((value) =>
              value.name === from ? { ...value, name: to } : value,
            ),
          }
        : axis,
    ),
    variants: variants.map((variant) => ({
      ...variant,
      values: variant.values.map((value, i) => (i === axisIndex && value === from ? to : value)),
    })),
  };
}

/** The one price when every combination costs the same, otherwise null. */
export function sharedPrice(variants: readonly Variant[]): number | null {
  const first = variants[0];
  if (!first) return null;
  return variants.every((v) => v.price === first.price) ? first.price : null;
}

/** A copy of another item's choices with fresh ids, keeping price changes and overrides, resetting sold-out. */
export function copyChoices(
  axes: readonly VariantAxis[],
  variants: readonly Variant[],
): { axes: VariantAxis[]; variants: Variant[] } {
  return {
    axes: axes.map((axis) => ({
      ...axis,
      values: axis.values.map((value) => ({ ...value })),
    })),
    variants: variants.map((variant) => ({
      ...variant,
      id: newVariantId(),
      values: [...variant.values],
      availability: 'available',
      soldOutUntil: null,
    })),
  };
}
