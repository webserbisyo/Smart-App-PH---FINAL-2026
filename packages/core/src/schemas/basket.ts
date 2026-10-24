import { z } from 'zod';
import { IdSchema, IsoDateTimeSchema, LatLngSchema } from './common.js';
import { PaymentMethodEnum } from './enums.js';

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

// Checkout fields kept on the phone while the customer types (N2), so nothing is lost offline.
export const CheckoutDraftSchema = z.object({
  name: z.string().max(80),
  phone: z.string().max(20),
  email: z.string().max(120),
  rememberMe: z.boolean(),
  paymentMethod: PaymentMethodEnum.nullable(),
  note: z.string().max(NOTE_MAX * 2),
  scheduledAt: IsoDateTimeSchema.nullable(),
  useReward: z.boolean(),
});
export type CheckoutDraft = z.infer<typeof CheckoutDraftSchema>;

// The last delivery spot the customer used in this shop.
export const LastAddressSchema = z.object({
  spot: LatLngSchema.nullable(),
  zoneId: IdSchema.nullable(),
  addressLine: z.string().max(160),
  houseNo: z.string().max(40),
  floor: z.string().max(40),
  landmark: z.string().max(120),
});
export type LastAddress = z.infer<typeof LastAddressSchema>;
