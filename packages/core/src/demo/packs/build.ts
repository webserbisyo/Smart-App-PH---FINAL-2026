// Small builders so the packs read like the menu tables in docs/prompts/ref/demo-menus.md.
// Prices are written in pesos here and stored in centavos.
import type { Availability } from '../../schemas/enums.js';
import type {
  Category,
  Item,
  OptionGroup,
  Variant,
  VariantAxis,
  VariantTemplate,
} from '../../schemas/catalog.js';
import { computedVariantPrice } from '../../schemas/catalog.js';
import type { ShopKind } from '../../schemas/demo-shop.js';
import { defaultVariantTemplates } from '../../rules/variant-templates.js';
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
  return {
    id: `${prefix}-c-${key}`,
    name,
    icon: { kind: 'fluent', key: icon, style: 'flat' },
    sort,
  };
}

export interface AxisSpec {
  name: string;
  values: readonly (string | { name: string; photo?: string; price?: number })[];
  template?: string;
}

export interface ItemSpec {
  key: string;
  category: string;
  name: string;
  description?: string | undefined;
  // Base price in pesos
  price: number;
  axes?: readonly AxisSpec[];
  groups?: readonly string[];
  pairs?: readonly string[];
  // Photo names in DEMO_MEDIA[slug].items; the first is the cover.
  photos?: readonly string[];
  featured?: boolean;
  isNew?: boolean;
  availability?: (values: readonly string[]) => Availability;
  special?: (values: readonly string[]) => number | null;
}

export interface CustomTemplateSpec {
  key: string;
  name: string;
  options: readonly string[];
}

export function templates(
  prefix: string,
  kind: ShopKind,
  custom?: {
    edits?: Record<string, { name?: string; options?: readonly string[] }>;
    extra?: readonly CustomTemplateSpec[];
  },
): VariantTemplate[] {
  const base = defaultVariantTemplates(kind, (key) => `${prefix}-t-${key}`);
  const edited = base.map((t) => {
    const key = t.id.replace(`${prefix}-t-`, '');
    const edit = custom?.edits?.[key];
    if (!edit) return t;
    const name = edit.name ?? t.name;
    const options = edit.options
      ? edit.options.map((optName, idx) => ({
          id: `${t.id}_opt_${idx + 1}`,
          name: optName,
        }))
      : t.options;
    return { ...t, name, options };
  });

  const extraTemplates: VariantTemplate[] = (custom?.extra ?? []).map((spec) => {
    const id = `${prefix}-t-${spec.key}`;
    return {
      id,
      name: spec.name,
      options: spec.options.map((name, optIdx) => ({
        id: `${id}_opt_${optIdx + 1}`,
        name,
      })),
      sample: true,
    };
  });

  return [...edited, ...extraTemplates];
}

function combinations(axes: readonly AxisSpec[]): string[][] {
  return axes.reduce<string[][]>(
    (acc, axis) =>
      acc.flatMap((prev) => axis.values.map((v) => [...prev, typeof v === 'string' ? v : v.name])),
    [[]],
  );
}

// `sample` marks pack items; test shops pass false so their items show like a real shop's own.
export function makeItems(
  slug: DemoShopSlug | null,
  prefix: string,
  specs: readonly ItemSpec[],
  sample = true,
): Item[] {
  const media = slug ? DEMO_MEDIA[slug] : null;
  const ref = (name: string): string => {
    if (!slug || !media?.items.includes(name))
      throw new Error(`Missing demo photo ${slug}/${name}`);
    return `demo:${slug}/items/${name}`;
  };
  return specs.map((spec) => {
    const id = `${prefix}-${spec.key}`;
    const basePrice = peso(spec.price);
    const axes: VariantAxis[] = (spec.axes ?? []).map((axis) => ({
      name: axis.name,
      templateId: axis.template ? `${prefix}-t-${axis.template}` : null,
      values: axis.values.map((v) => {
        if (typeof v === 'string') {
          return { name: v, photo: null, priceDelta: 0 };
        }
        return {
          name: v.name,
          photo: v.photo ? ref(v.photo) : null,
          priceDelta: peso(v.price ?? 0),
        };
      }),
    }));

    const combos = combinations(spec.axes ?? []);
    const variants: Variant[] = combos.map((values) => {
      const vId = values.length ? `${id}--${slugify(values.join('-'))}` : `${id}--base`;
      const specialPrice = spec.special?.(values);
      const priceOverride =
        specialPrice !== undefined && specialPrice !== null ? peso(specialPrice) : null;
      const price = computedVariantPrice(basePrice, axes, { values, priceOverride });

      return {
        id: vId,
        values,
        price,
        priceOverride,
        availability: spec.availability?.(values) ?? 'available',
        soldOutUntil: null,
      };
    });

    return {
      id,
      categoryId: `${prefix}-c-${spec.category}`,
      name: spec.name,
      description: spec.description ?? null,
      photos: (spec.photos ?? []).map(ref),
      basePrice,
      axes,
      variants,
      optionGroupIds: (spec.groups ?? []).map((g) => `${prefix}-g-${g}`),
      pairingIds: (spec.pairs ?? []).map((p) => `${prefix}-${p}`),
      featured: spec.featured ?? false,
      isNew: spec.isNew ?? false,
      status: 'active',
      sample,
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
