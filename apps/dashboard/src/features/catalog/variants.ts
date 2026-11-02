import type { Variant, VariantAxis } from '@smartapp/core';

// Decision N4: up to 2 choices per item, 10 options each, 30 combinations in total.
export const VARIANT_LIMITS = { axes: 2, values: 10, combos: 30, valueLength: 30 } as const;

let seq = 0;
export function newVariantId(): string {
  seq += 1;
  return `var_${Date.now().toString(36)}_${seq}`;
}

export function comboCount(axes: readonly VariantAxis[]): number {
  if (axes.length === 0) return 1;
  return axes.reduce((total, axis) => total * axis.values.length, 1);
}

function sameValues(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((value, i) => value === b[i]);
}

/**
 * Every combination of the axes' options, in axis order. A combination that already exists keeps its
 * id, price and stock state; a new one starts at `price` and available.
 */
export function buildVariants(
  axes: readonly VariantAxis[],
  previous: readonly Variant[],
  price: number,
): Variant[] {
  if (axes.length === 0) {
    const first = previous[0];
    return [
      {
        id: first?.id ?? newVariantId(),
        values: [],
        price,
        availability: first?.availability ?? 'available',
        soldOutUntil: first?.soldOutUntil ?? null,
      },
    ];
  }
  const combos = axes.reduce<string[][]>(
    (acc, axis) => acc.flatMap((combo) => axis.values.map((value) => [...combo, value.name])),
    [[]],
  );
  return combos.map((values) => {
    const existing = previous.find((v) => sameValues(v.values, values));
    if (existing) return existing;
    return { id: newVariantId(), values, price, availability: 'available', soldOutUntil: null };
  });
}

/** Renames one option and keeps every combination that uses it (id, price, stock). */
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

/** A copy of another item's choices with fresh ids, so the two items never share a combination. */
export function copyChoices(
  axes: readonly VariantAxis[],
  variants: readonly Variant[],
): { axes: VariantAxis[]; variants: Variant[] } {
  return {
    axes: axes.map((axis) => ({ ...axis, values: axis.values.map((value) => ({ ...value })) })),
    variants: variants.map((variant) => ({
      ...variant,
      id: newVariantId(),
      values: [...variant.values],
      availability: 'available',
      soldOutUntil: null,
    })),
  };
}

/** "₱149" style text for an input: whole pesos stay whole, centavos keep two places. */
export function pesoText(centavos: number): string {
  if (centavos === 0) return '';
  return centavos % 100 === 0 ? String(centavos / 100) : (centavos / 100).toFixed(2);
}

/** Parses what the owner typed into centavos; null while the text is not a price yet. */
export function parsePeso(text: string): number | null {
  const trimmed = text.trim().replace(/,/g, '');
  if (trimmed === '') return 0;
  if (!/^\d{1,6}(\.\d{0,2})?$/.test(trimmed)) return null;
  return Math.round(Number(trimmed) * 100);
}
