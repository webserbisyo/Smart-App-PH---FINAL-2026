import { z } from 'zod';
import { IconKeyEnum, CategoryIconStyleEnum, type CategoryIconStyle } from '../icons.js';
import { CentavosSchema, IdSchema, IsoDateTimeSchema, MediaRefSchema } from './common.js';
import { AvailabilityEnum, ItemStatusEnum, SortKindEnum } from './enums.js';
import { VARIANT_LIMITS } from '../rules/variant-limits.js';

export { CategoryIconStyleEnum, type CategoryIconStyle };

export const CategoryIconSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('fluent'),
    key: IconKeyEnum,
    style: CategoryIconStyleEnum,
  }),
  z.object({
    kind: z.literal('emoji'),
    char: z.string().min(1).max(8),
  }),
  z.object({
    kind: z.literal('image'),
    ref: MediaRefSchema,
  }),
]);
export type CategoryIcon = z.infer<typeof CategoryIconSchema>;

export const CategoryIconInputSchema = z.union([
  IconKeyEnum.transform((key) => ({
    kind: 'fluent' as const,
    key,
    style: 'flat' as const,
  })),
  CategoryIconSchema,
]);
export type CategoryIconInput = z.input<typeof CategoryIconInputSchema>;

export const CategorySchema = z.object({
  id: IdSchema,
  name: z.string().min(1).max(40),
  icon: CategoryIconInputSchema,
  sort: z.number().int().min(0),
});
export type Category = z.infer<typeof CategorySchema>;

export const CategoryDraftSchema = z.object({
  id: IdSchema.optional(),
  name: z.string().min(1).max(40),
  icon: CategoryIconInputSchema,
});
export type CategoryDraft = z.infer<typeof CategoryDraftSchema>;

export const AxisValueSchema = z.object({
  name: z.string().min(1).max(VARIANT_LIMITS.valueLength),
  // Choosing this value shows this photo first (Tala Basic Tee · Sand).
  photo: MediaRefSchema.nullable(),
  priceDelta: CentavosSchema.default(0),
});
export type AxisValue = z.infer<typeof AxisValueSchema>;

export const VariantAxisSchema = z.object({
  name: z.string().min(1).max(VARIANT_LIMITS.nameLength),
  values: z.array(AxisValueSchema).min(1).max(VARIANT_LIMITS.values),
  templateId: IdSchema.nullable().default(null),
});
export type VariantAxis = z.infer<typeof VariantAxisSchema>;

export const VariantSchema = z.object({
  id: IdSchema,
  // One value name per axis, in axis order. Empty for an item without choices.
  values: z.array(z.string().min(1)).max(VARIANT_LIMITS.axes),
  price: CentavosSchema,
  priceOverride: CentavosSchema.nullable().default(null),
  availability: AvailabilityEnum,
  // "Sold out today" turns back on by itself at this time (the next opening).
  soldOutUntil: IsoDateTimeSchema.nullable(),
});
export type Variant = z.infer<typeof VariantSchema>;

export const OptionSchema = z.object({
  id: IdSchema,
  name: z.string().min(1).max(60),
  priceDelta: CentavosSchema,
  isDefault: z.boolean(),
  soldOut: z.boolean(),
});
export type Option = z.infer<typeof OptionSchema>;

export const OptionGroupBaseSchema = z.object({
  id: IdSchema,
  name: z.string().min(1).max(40),
  min: z.number().int().min(0).max(10),
  max: z.number().int().min(1).max(10),
  options: z.array(OptionSchema).min(1).max(20),
});

export const OptionGroupSchema = OptionGroupBaseSchema.refine((g) => g.min <= g.max, {
  message: 'min must be at most max',
}).refine((g) => g.min <= g.options.length, { message: 'min is more than the options' });
export type OptionGroup = z.infer<typeof OptionGroupSchema>;

export const OwnerOptionGroupSchema = OptionGroupBaseSchema.extend({
  usedBy: z.number().int().min(0),
})
  .refine((g) => g.min <= g.max, { message: 'min must be at most max' })
  .refine((g) => g.min <= g.options.length, { message: 'min is more than the options' });
export type OwnerOptionGroup = z.infer<typeof OwnerOptionGroupSchema>;

export const OptionDraftSchema = z.object({
  id: IdSchema.optional(),
  name: z.string().min(1).max(60),
  priceDelta: CentavosSchema,
  isDefault: z.boolean(),
  soldOut: z.boolean(),
});
export type OptionDraft = z.infer<typeof OptionDraftSchema>;

export const OptionGroupDraftSchema = z
  .object({
    id: IdSchema.optional(),
    name: z.string().min(1).max(40),
    min: z.number().int().min(0).max(10),
    max: z.number().int().min(1).max(10),
    options: z.array(OptionDraftSchema).min(1).max(20),
  })
  .refine((g) => g.min <= g.max, { message: 'min must be at most max' })
  .refine((g) => g.min <= g.options.length, { message: 'min is more than the options' });
export type OptionGroupDraft = z.infer<typeof OptionGroupDraftSchema>;

/**
 * Computes expected version price: priceOverride ?? (basePrice + sum of priceDeltas)
 */
export function computedVariantPrice(
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
    const opt = axis?.values.find((v) => v.name === valName);
    if (opt) {
      delta += opt.priceDelta ?? 0;
    }
  }
  return basePrice + delta;
}

export const ItemBaseSchema = z.object({
  id: IdSchema,
  categoryId: IdSchema,
  name: z.string().min(1).max(80),
  description: z.string().max(300).nullable(),
  photos: z.array(MediaRefSchema).max(5),
  basePrice: CentavosSchema,
  axes: z.array(VariantAxisSchema).max(VARIANT_LIMITS.axes),
  variants: z.array(VariantSchema).min(1).max(VARIANT_LIMITS.combos),
  optionGroupIds: z.array(IdSchema),
  pairingIds: z.array(IdSchema).max(4),
  featured: z.boolean(),
  isNew: z.boolean(),
  status: ItemStatusEnum,
  // Sample data from a pack; customers of a real shop never see it, demo shops show it.
  sample: z.boolean(),
});

function applyItemRefinements<T extends z.ZodTypeAny>(schema: T) {
  return schema
    .refine((item: z.infer<typeof ItemBaseSchema>) => item.variants.every((v) => v.values.length === item.axes.length), {
      message: 'Every variant needs one value per axis',
    })
    .refine((item: z.infer<typeof ItemBaseSchema>) => !item.pairingIds.includes(item.id), {
      message: 'An item cannot pair with itself',
    })
    .refine(
      (item: z.infer<typeof ItemBaseSchema>) => {
        const names = item.axes.map((a) => a.name.toLowerCase());
        return new Set(names).size === names.length;
      },
      { message: 'Choice names must be unique' },
    )
    .refine(
      (item: z.infer<typeof ItemBaseSchema>) =>
        item.axes.every((axis) => {
          const vals = axis.values.map((v) => v.name.toLowerCase());
          return new Set(vals).size === vals.length;
        }),
      { message: 'Option names must be unique per choice' },
    )
    .refine(
      (item: z.infer<typeof ItemBaseSchema>) => {
        const tids = item.axes
          .map((a) => a.templateId)
          .filter((tid): tid is string => Boolean(tid));
        return new Set(tids).size === tids.length;
      },
      { message: 'A template can only be linked once per item' },
    )
    .refine((item: z.infer<typeof ItemBaseSchema>) => item.variants.length <= VARIANT_LIMITS.combos, {
      message: `An item can have at most ${VARIANT_LIMITS.combos} combinations`,
    })
    .refine(
      (item: z.infer<typeof ItemBaseSchema>) =>
        item.variants.every(
          (v) => v.price === computedVariantPrice(item.basePrice, item.axes, v),
        ),
      {
        message: 'Every variant price must equal basePrice + option price changes, or its priceOverride',
      },
    );
}

export const ItemSchema = applyItemRefinements(ItemBaseSchema);
export type Item = z.infer<typeof ItemSchema>;

export const OwnerItemSchema = applyItemRefinements(
  ItemBaseSchema.extend({
    hasOrders: z.boolean(),
  }),
);
export type OwnerItem = z.infer<typeof OwnerItemSchema>;

export const ItemDraftSchema = z
  .object({
    id: IdSchema.optional(),
    categoryId: IdSchema,
    name: z.string().min(1).max(80),
    description: z.string().max(300).nullable(),
    photos: z.array(MediaRefSchema).max(5),
    basePrice: CentavosSchema,
    axes: z.array(VariantAxisSchema).max(VARIANT_LIMITS.axes),
    variants: z.array(VariantSchema).min(1).max(VARIANT_LIMITS.combos),
    optionGroupIds: z.array(IdSchema),
    pairingIds: z.array(IdSchema).max(4),
    featured: z.boolean(),
    isNew: z.boolean(),
    status: ItemStatusEnum,
  })
  .refine((item) => item.variants.every((v) => v.values.length === item.axes.length), {
    message: 'Every variant needs one value per axis',
  })
  .refine((item) => !item.id || !item.pairingIds.includes(item.id), {
    message: 'An item cannot pair with itself',
  })
  .refine(
    (item) => {
      const names = item.axes.map((a) => a.name.toLowerCase());
      return new Set(names).size === names.length;
    },
    { message: 'Choice names must be unique' },
  )
  .refine(
    (item) =>
      item.axes.every((axis) => {
        const vals = axis.values.map((v) => v.name.toLowerCase());
        return new Set(vals).size === vals.length;
      }),
    { message: 'Option names must be unique per choice' },
  )
  .refine(
    (item) => {
      const tids = item.axes
        .map((a) => a.templateId)
        .filter((tid): tid is string => Boolean(tid));
      return new Set(tids).size === tids.length;
    },
    { message: 'A template can only be linked once per item' },
  )
  .refine((item) => item.variants.length <= VARIANT_LIMITS.combos, {
    message: `An item can have at most ${VARIANT_LIMITS.combos} combinations`,
  });
export type ItemDraft = z.infer<typeof ItemDraftSchema>;

export const VariantTemplateOptionSchema = z.object({
  id: IdSchema,
  name: z.string().trim().min(1).max(VARIANT_LIMITS.valueLength),
});
export type VariantTemplateOption = z.infer<typeof VariantTemplateOptionSchema>;

export const VariantTemplateBaseSchema = z.object({
  id: IdSchema,
  name: z.string().trim().min(1).max(VARIANT_LIMITS.nameLength),
  options: z.array(VariantTemplateOptionSchema).min(1).max(VARIANT_LIMITS.values),
  sample: z.boolean(),
});

export const VariantTemplateSchema = VariantTemplateBaseSchema.refine(
  (t) => {
    const names = t.options.map((o) => o.name.toLowerCase());
    return new Set(names).size === names.length;
  },
  { message: 'Option names must be unique' },
);
export type VariantTemplate = z.infer<typeof VariantTemplateSchema>;

export const OwnerVariantTemplateSchema = VariantTemplateBaseSchema.extend({
  usedBy: z.number().int().min(0),
}).refine(
  (t) => {
    const names = t.options.map((o) => o.name.toLowerCase());
    return new Set(names).size === names.length;
  },
  { message: 'Option names must be unique' },
);
export type OwnerVariantTemplate = z.infer<typeof OwnerVariantTemplateSchema>;

export const VariantTemplateDraftOptionSchema = z.object({
  id: IdSchema.optional(),
  name: z.string().trim().min(1).max(VARIANT_LIMITS.valueLength),
});
export type VariantTemplateDraftOption = z.infer<typeof VariantTemplateDraftOptionSchema>;

export const VariantTemplateDraftSchema = z
  .object({
    id: IdSchema.optional(),
    name: z.string().trim().min(1).max(VARIANT_LIMITS.nameLength),
    options: z.array(VariantTemplateDraftOptionSchema).min(1).max(VARIANT_LIMITS.values),
  })
  .refine(
    (d) => {
      const names = d.options.map((o) => o.name.toLowerCase());
      return new Set(names).size === names.length;
    },
    { message: 'Option names must be unique' },
  );
export type VariantTemplateDraft = z.infer<typeof VariantTemplateDraftSchema>;

export const SaveVariantTemplateInputSchema = z.object({
  draft: VariantTemplateDraftSchema,
  applyToItems: z.boolean(),
});
export type SaveVariantTemplateInput = z.infer<typeof SaveVariantTemplateInputSchema>;

export const SaveVariantTemplateResultSchema = z.object({
  template: OwnerVariantTemplateSchema,
  updatedItemIds: z.array(IdSchema),
  unlinkedItemIds: z.array(IdSchema),
  skippedItemIds: z.array(IdSchema),
  soldOutItemIds: z.array(IdSchema),
});
export type SaveVariantTemplateResult = z.infer<typeof SaveVariantTemplateResultSchema>;

export const UploadResultSchema = z.object({
  uploadUrl: z.string(),
  path: z.string(),
});
export type UploadResult = z.infer<typeof UploadResultSchema>;

export const SortOrderInputSchema = z.object({
  kind: SortKindEnum,
  ids: z.array(z.string().min(1)),
});
export type SortOrderInput = z.infer<typeof SortOrderInputSchema>;

export const CatalogSchema = z.object({
  categories: z.array(CategorySchema),
  items: z.array(ItemSchema),
  optionGroups: z.array(OptionGroupSchema),
});
export type Catalog = z.infer<typeof CatalogSchema>;

export const PackCatalogSchema = CatalogSchema.extend({
  variantTemplates: z.array(VariantTemplateSchema),
});
export type PackCatalog = z.infer<typeof PackCatalogSchema>;
