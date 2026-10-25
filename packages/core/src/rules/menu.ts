// Pure functions for the Menu screen: category sections, search, price and sold out labels.
import type { Catalog, Category, Item } from '../schemas/catalog.js';
import { words } from '../words.js';
import { variantAvailability } from './hours.js';
import { formatPeso } from './money.js';

export interface MenuSection {
  category: Category;
  items: Item[];
}

/** Categories in owner order, each with its active items; empty categories are left out. */
export function menuSections(catalog: Pick<Catalog, 'categories' | 'items'>): MenuSection[] {
  return [...catalog.categories]
    .sort((a, b) => a.sort - b.sort)
    .map((category) => ({
      category,
      items: catalog.items.filter(
        (item) => item.status === 'active' && item.categoryId === category.id,
      ),
    }))
    .filter((section) => section.items.length > 0);
}

/** Active items whose name, description or category matches the search (any case). */
export function searchMenu(catalog: Pick<Catalog, 'categories' | 'items'>, query: string): Item[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  const categoryNames = new Map(catalog.categories.map((c) => [c.id, c.name.toLowerCase()]));
  return catalog.items.filter(
    (item) =>
      item.status === 'active' &&
      (item.name.toLowerCase().includes(needle) ||
        (item.description?.toLowerCase().includes(needle) ?? false) ||
        (categoryNames.get(item.categoryId)?.includes(needle) ?? false)),
  );
}

/** "₱149", or "from ₱149" when the item has more than one price. */
export function itemPriceLabel(item: Pick<Item, 'variants'>): string {
  const prices = item.variants.map((v) => v.price);
  const min = Math.min(...prices);
  if (!Number.isFinite(min)) return '';
  const varied = prices.some((price) => price !== min);
  return varied ? words.storefrontShell.home.fromPrice(formatPeso(min)) : formatPeso(min);
}

/** The badge word when no variant can be ordered: "Sold out today" or "Sold out". */
export function itemSoldOutLabel(item: Pick<Item, 'variants'>, now: string | Date): string | null {
  const states = item.variants.map((v) => variantAvailability(v, now));
  if (states.some((state) => state === 'available')) return null;
  return states.some((state) => state === 'sold_out_today')
    ? words.storefrontShell.menu.badges.soldOutToday
    : words.storefrontShell.menu.badges.soldOut;
}
