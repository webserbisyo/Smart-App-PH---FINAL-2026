import { z } from 'zod';
import { IconKeyEnum } from '../icons.js';
import { CentavosSchema, IdSchema, IsoDateTimeSchema, MediaRefSchema } from './common.js';
import { AvailabilityEnum, ItemStatusEnum } from './enums.js';

export const CategorySchema = z.object({
  id: IdSchema,
  name: z.string().min(1).max(40),
  icon: IconKeyEnum,
  sort: z.number().int().min(0),
});
export type Category = z.infer<typeof CategorySchema>;

export const AxisValueSchema = z.object({
  name: z.string().min(1).max(30),
  // Choosing this value shows this photo first (Tala Basic Tee · Sand).
  photo: MediaRefSchema.nullable(),
});
export type AxisValue = z.infer<typeof AxisValueSchema>;

export const VariantAxisSchema = z.object({
  name: z.string().min(1).max(30),
  values: z.array(AxisValueSchema).min(1).max(10),
});
export type VariantAxis = z.infer<typeof VariantAxisSchema>;

export const VariantSchema = z.object({
  id: IdSchema,
  // One value name per axis, in axis order. Empty for an item without choices.
  values: z.array(z.string().min(1)).max(2),
  price: CentavosSchema,
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

export const OptionGroupSchema = z
  .object({
    id: IdSchema,
    name: z.string().min(1).max(40),
    min: z.number().int().min(0).max(10),
    max: z.number().int().min(1).max(10),
    options: z.array(OptionSchema).min(1).max(20),
  })
  .refine((g) => g.min <= g.max, { message: 'min must be at most max' })
  .refine((g) => g.min <= g.options.length, { message: 'min is more than the options' });
export type OptionGroup = z.infer<typeof OptionGroupSchema>;

export const ItemSchema = z
  .object({
    id: IdSchema,
    categoryId: IdSchema,
    name: z.string().min(1).max(80),
    description: z.string().max(300).nullable(),
    photos: z.array(MediaRefSchema).max(5),
    axes: z.array(VariantAxisSchema).max(2),
    variants: z.array(VariantSchema).min(1).max(30),
    optionGroupIds: z.array(IdSchema),
    pairingIds: z.array(IdSchema).max(4),
    featured: z.boolean(),
    isNew: z.boolean(),
    status: ItemStatusEnum,
    // Sample data from a pack; customers of a real shop never see it, demo shops show it.
    sample: z.boolean(),
  })
  .refine((item) => item.variants.every((v) => v.values.length === item.axes.length), {
    message: 'Every variant needs one value per axis',
  })
  .refine((item) => !item.pairingIds.includes(item.id), {
    message: 'An item cannot pair with itself',
  });
export type Item = z.infer<typeof ItemSchema>;

export const CatalogSchema = z.object({
  categories: z.array(CategorySchema),
  items: z.array(ItemSchema),
  optionGroups: z.array(OptionGroupSchema),
});
export type Catalog = z.infer<typeof CatalogSchema>;
