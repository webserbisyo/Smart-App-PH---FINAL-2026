// Small builders so the packs read like the menu tables in docs/prompts/ref/demo-menus.md.
// Prices are written in pesos here and stored in centavos.
import type { Availability } from '../../schemas/enums.js';
import type { Category, Item, OptionGroup, Variant } from '../../schemas/catalog.js';
import type { IconKey } from '../../icons.js';
import { DEMO_MEDIA } from '../media.js';
import type { DemoShopSlug } from '../slugs.js';

export const peso = (pesos: number): number => Math.round(pesos * 100);

const slugify = (text: string): string =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export interface OptionSpec {
  name: string;
  price?: number;
  isDefault?: boolean;
  soldOut?: boolean;
}

export function group(
  prefix: string,
  key: string,
  name: string,
  min: number,
  max: number,
  options: readonly OptionSpec[],
): OptionGroup {
  const id = `${prefix}-g-${key}`;
  return {
    id,
    name,
    min,
    max,
    options: options.map((o) => ({
      id: `${id}-${slugify(o.name)}`,
      name: o.name,
      priceDelta: peso(o.price ?? 0),
      isDefault: o.isDefault ?? false,
      soldOut: o.soldOut ?? false,
    })),
  };
}

export function category(
  prefix: string,
  key: string,
  name: string,
  icon: IconKey,
  sort: number,
): Category {
  return { id: `${prefix}-c-${key}`, name, icon, sort };
}

export interface AxisSpec {
  name: string;
  values: readonly (string | { name: string; photo: string })[];
}

export interface ItemSpec {
  key: string;
  category: string;
  name: string;
  description?: string | undefined;
  // One price for every variant, or a price per combination of axis values.
  price: number | ((values: readonly string[]) => number);
  axes?: readonly AxisSpec[];
  groups?: readonly string[];
  pairs?: readonly string[];
  // Photo names in DEMO_MEDIA[slug].items; the first is the cover.
  photos?: readonly string[];
  featured?: boolean;
  isNew?: boolean;
  availability?: (values: readonly string[]) => Availability;
}

function combinations(axes: readonly AxisSpec[]): string[][] {
  return axes.reduce<string[][]>(
    (acc, axis) =>
      acc.flatMap((prev) => axis.values.map((v) => [...prev, typeof v === 'string' ? v : v.name])),
    [[]],
  );
}

export function makeItems(
  slug: DemoShopSlug | null,
  prefix: string,
  specs: readonly ItemSpec[],
): Item[] {
  const media = slug ? DEMO_MEDIA[slug] : null;
  const ref = (name: string): string => {
    if (!slug || !media?.items.includes(name))
      throw new Error(`Missing demo photo ${slug}/${name}`);
    return `demo:${slug}/items/${name}`;
  };
  return specs.map((spec) => {
    const id = `${prefix}-${spec.key}`;
    const axes = (spec.axes ?? []).map((axis) => ({
      name: axis.name,
      values: axis.values.map((v) =>
        typeof v === 'string' ? { name: v, photo: null } : { name: v.name, photo: ref(v.photo) },
      ),
    }));
    const variants: Variant[] = combinations(spec.axes ?? []).map((values) => ({
      id: values.length ? `${id}--${slugify(values.join('-'))}` : `${id}--base`,
      values,
      price: peso(typeof spec.price === 'number' ? spec.price : spec.price(values)),
      availability: spec.availability?.(values) ?? 'available',
      soldOutUntil: null,
    }));
    return {
      id,
      categoryId: `${prefix}-c-${spec.category}`,
      name: spec.name,
      description: spec.description ?? null,
      photos: (spec.photos ?? []).map(ref),
      axes,
      variants,
      optionGroupIds: (spec.groups ?? []).map((g) => `${prefix}-g-${g}`),
      pairingIds: (spec.pairs ?? []).map((p) => `${prefix}-${p}`),
      featured: spec.featured ?? false,
      isNew: spec.isNew ?? false,
      status: 'active',
      sample: true,
    };
  });
}

export const ALL_SECTIONS_ON = {
  banners: true,
  announcement: true,
  rewards: true,
  favourites: true,
  categories: true,
  bestSellers: true,
  about: true,
  hours: true,
  contact: true,
  membersCount: true,
} as const;

/** Opening ranges for several weekdays at once (0 = Sunday). */
export function days(
  weekdays: readonly (0 | 1 | 2 | 3 | 4 | 5 | 6)[],
  open: string,
  close: string,
): { day: 0 | 1 | 2 | 3 | 4 | 5 | 6; open: string; close: string }[] {
  return weekdays.map((day) => ({ day, open, close }));
}

export const DAILY = [0, 1, 2, 3, 4, 5, 6] as const;
