// Variants and add-on picks for one basket line (N4). Every rule is checked again by the server.
import type { BasketLine } from '../schemas/basket.js';
import { NOTE_MAX } from '../schemas/basket.js';
import type { Item, OptionGroup, Variant } from '../schemas/catalog.js';
import type { LineProblem } from '../schemas/order.js';
import { variantAvailability } from './hours.js';

export interface LinePicks {
  variantId: string;
  optionIds: readonly string[];
}

/** Item + variant + sorted option ids + trimmed note: identical lines merge. */
export function lineIdentity(
  line: Pick<BasketLine, 'itemId' | 'variantId' | 'optionIds' | 'note'>,
): string {
  return [line.itemId, line.variantId, [...line.optionIds].sort().join(','), line.note.trim()].join(
    '|',
  );
}

export function sortOptionIds(ids: readonly string[]): string[] {
  return [...new Set(ids)].sort();
}

function groupsOf(
  item: Pick<Item, 'optionGroupIds'>,
  groups: readonly OptionGroup[],
): OptionGroup[] {
  return item.optionGroupIds.flatMap((id) => groups.filter((g) => g.id === id));
}

/** Variant price plus the add-on price changes, for one piece. */
export function unitPrice(
  item: Pick<Item, 'variants' | 'optionGroupIds'>,
  groups: readonly OptionGroup[],
  picks: LinePicks,
): number {
  const variant = item.variants.find((v) => v.id === picks.variantId);
  const options = groupsOf(item, groups).flatMap((g) => g.options);
  const extras = picks.optionIds.reduce(
    (sum, id) => sum + (options.find((o) => o.id === id)?.priceDelta ?? 0),
    0,
  );
  return (variant?.price ?? 0) + extras;
}

/** Unit price times quantity. */
export function linePrice(
  item: Pick<Item, 'variants' | 'optionGroupIds'>,
  groups: readonly OptionGroup[],
  line: LinePicks & { qty: number },
): number {
  return unitPrice(item, groups, line) * line.qty;
}

/** The variant for a set of axis values, or null for an impossible combination. */
export function findVariant(
  item: Pick<Item, 'variants'>,
  values: readonly string[],
): Variant | null {
  return (
    item.variants.find(
      (v) => v.values.length === values.length && v.values.every((value, i) => value === values[i]),
    ) ?? null
  );
}

/** Values of one axis that still make a real variant with the other picked values ("Not available" otherwise). */
export function possibleValues(
  item: Pick<Item, 'axes' | 'variants'>,
  axisIndex: number,
  picked: readonly (string | null)[],
): string[] {
  const axis = item.axes[axisIndex];
  if (!axis) return [];
  return axis.values
    .map((v) => v.name)
    .filter((value) =>
      item.variants.some(
        (variant) =>
          variant.values[axisIndex] === value &&
          variant.values.every((v, i) => i === axisIndex || picked[i] == null || picked[i] === v),
      ),
    );
}

const problem = (
  code: LineProblem['code'],
  group: Pick<OptionGroup, 'id' | 'name'> | null = null,
): LineProblem => ({ code, groupId: group?.id ?? null, groupName: group?.name ?? null });

/**
 * Checks one line's picks: the variant exists and is available, every picked option belongs to the item and is not
 * sold out, and each group's min and max are met. Problems name the group so the screen can say what to choose.
 */
export function validateLinePicks(
  item: Pick<Item, 'variants' | 'optionGroupIds' | 'status'>,
  groups: readonly OptionGroup[],
  picks: LinePicks & { note?: string },
  now: string | Date,
): LineProblem[] {
  const problems: LineProblem[] = [];
  if (item.status !== 'active') return [problem('item_missing')];

  const variant = item.variants.find((v) => v.id === picks.variantId);
  if (!variant) {
    problems.push(problem('variant_missing'));
  } else {
    const availability = variantAvailability(variant, now);
    if (availability === 'sold_out') problems.push(problem('sold_out'));
    if (availability === 'sold_out_today') problems.push(problem('sold_out_today'));
  }

  const itemGroups = groupsOf(item, groups);
  const known = new Set(itemGroups.flatMap((g) => g.options.map((o) => o.id)));
  if (picks.optionIds.some((id) => !known.has(id))) problems.push(problem('option_missing'));

  for (const group of itemGroups) {
    const chosen = group.options.filter((o) => picks.optionIds.includes(o.id));
    if (chosen.some((o) => o.soldOut)) problems.push(problem('option_sold_out', group));
    if (chosen.length > group.max) problems.push(problem('too_many', group));
    if (chosen.length < group.min) {
      problems.push(problem(chosen.length === 0 ? 'required_missing' : 'too_few', group));
    }
  }

  if (picks.note !== undefined && picks.note.length > NOTE_MAX)
    problems.push(problem('note_too_long'));
  return problems;
}

/** Starting picks for the item sheet: the first available variant and each group's default options. */
export function defaultPicks(
  item: Pick<Item, 'variants' | 'optionGroupIds'>,
  groups: readonly OptionGroup[],
  now: string | Date,
): LinePicks {
  const variant =
    item.variants.find((v) => variantAvailability(v, now) === 'available') ?? item.variants[0];
  const optionIds = groupsOf(item, groups).flatMap((g) =>
    g.options
      .filter((o) => o.isDefault && !o.soldOut)
      .slice(0, g.max)
      .map((o) => o.id),
  );
  return { variantId: variant?.id ?? '', optionIds: sortOptionIds(optionIds) };
}

/** "+" on a card adds at once only when there is one variant and no required group (ux.md). */
export function canQuickAdd(
  item: Pick<Item, 'variants' | 'optionGroupIds'>,
  groups: readonly OptionGroup[],
): boolean {
  return item.variants.length === 1 && groupsOf(item, groups).every((g) => g.min === 0);
}

/** "Single", "M · Sand" — null for an item without choices. */
export function variantLabel(variant: Pick<Variant, 'values'>): string | null {
  return variant.values.length ? variant.values.join(' · ') : null;
}
