import { z } from 'zod';
import { IdSchema } from './common.js';

export const NOTE_MAX = 120;
export const QTY_MAX = 99;

export const BasketLineSchema = z.object({
  itemId: IdSchema,
  variantId: IdSchema,
  // Sorted, so the same picks make the same line.
  optionIds: z.array(IdSchema),
  note: z.string().max(NOTE_MAX),
  qty: z.number().int().min(1).max(QTY_MAX),
});
export type BasketLine = z.infer<typeof BasketLineSchema>;

export const BasketSchema = z.object({
  slug: z.string().min(1),
  version: z.number().int().min(1),
  lines: z.array(BasketLineSchema),
});
export type Basket = z.infer<typeof BasketSchema>;
