import {
  VARIANT_LIMITS,
  buildVersions,
  isSamePrice,
  computedVariantPrice,
  type Variant,
  type VariantAxis,
} from '@smartapp/core';

export { VARIANT_LIMITS, buildVersions, isSamePrice, computedVariantPrice };

let seq = 0;
export function newVariantId(): string {
  seq += 1;
  return `var_${Date.now().toString(36)}_${seq}`;
}

export function comboCount(axes: readonly VariantAxis[]): number {
  if (axes.length === 0) return 1;
  return axes.reduce((total, axis) => total * axis.values.length, 1);
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

/** A copy of another item's choices with fresh ids, so the two items never share a combination. */
export function copyChoices(
  axes: readonly VariantAxis[],
  variants: readonly Variant[],
  basePrice: number,
): { axes: VariantAxis[]; variants: Variant[] } {
  const copiedAxes = axes.map((axis) => ({
    ...axis,
    values: axis.values.map((value) => ({ ...value })),
  }));
  const copiedVariants = buildVersions(
    copiedAxes,
    variants.map((v) => ({
      ...v,
      id: newVariantId(),
      availability: 'available' as const,
      soldOutUntil: null,
    })),
    basePrice,
  );
  return {
    axes: copiedAxes,
    variants: copiedVariants,
  };
}
