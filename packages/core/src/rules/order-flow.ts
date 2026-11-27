// The ordering flow rules of T127 in their own module, so pages that never show them don't carry them:
// when a sold-out item is back, the Goes well pick and the line a "+" adds.
import type { BasketLine } from '../schemas/basket.js';
import type { Catalog, Item, OptionGroup } from '../schemas/catalog.js';
import { itemSoldOutLabel } from './menu.js';
import { variantAvailability } from './hours.js';
import { canQuickAdd, defaultPicks } from './options.js';

/**
 * When a sold-out-today item can be ordered again (the earliest of its versions), or null when it is
 * on sale now or sold out with no time set.
 */
export function soldOutUntil(item: Pick<Item, 'variants'>, now: string | Date): string | null {
  if (itemSoldOutLabel(item, now) === null) return null;
  const times = item.variants
    .filter((v) => variantAvailability(v, now) === 'sold_out_today' && v.soldOutUntil)
    .map((v) => v.soldOutUntil ?? '')
    .sort();
  return times[0] ?? null;
}

/**
 * "Goes well with" (T127), one rule for the item sheet and the basket: the owner's pairings for the given
 * items first, then items from other categories, in menu order. Hidden, sold-out and left-out items
 * (already in the basket, the item itself) are skipped.
 */
export function goesWellWith(
  catalog: Pick<Catalog, 'items'>,
  forItems: readonly Pick<Item, 'id' | 'categoryId' | 'pairingIds'>[],
  now: string | Date,
  options: { exclude?: ReadonlySet<string>; limit: number },
): Item[] {
  const skip = new Set([...(options.exclude ?? []), ...forItems.map((i) => i.id)]);
  const ok = (item: Item) =>
    item.status === 'active' && !skip.has(item.id) && itemSoldOutLabel(item, now) === null;
  const byId = new Map(catalog.items.map((i) => [i.id, i]));
  const picked: Item[] = [];
  const take = (item: Item | undefined) => {
    if (!item || picked.length >= options.limit || !ok(item) || picked.includes(item)) return;
    picked.push(item);
  };
  for (const source of forItems) for (const id of source.pairingIds) take(byId.get(id));
  const ownCategories = new Set(forItems.map((i) => i.categoryId));
  for (const item of catalog.items) if (!ownCategories.has(item.categoryId)) take(item);
  return picked;
}

/**
 * The line a "+" adds at once (T127): the item's starting picks (the owner's default add-ons included),
 * or null when the item needs the sheet (choices) or can't be ordered at that time (sold out).
 */
export function quickAddLine(
  item: Pick<Item, 'id' | 'variants' | 'optionGroupIds'>,
  groups: readonly OptionGroup[],
  at: string | Date,
): BasketLine | null {
  if (!canQuickAdd(item, groups)) return null;
  const picks = defaultPicks(item, groups, at);
  const variant = item.variants.find((v) => v.id === picks.variantId);
  if (!variant || variantAvailability(variant, at) !== 'available') return null;
  return {
    itemId: item.id,
    variantId: variant.id,
    optionIds: [...picks.optionIds],
    note: '',
    qty: 1,
  };
}
