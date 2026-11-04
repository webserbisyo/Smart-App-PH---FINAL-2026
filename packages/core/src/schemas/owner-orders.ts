import { z } from 'zod';
import { CentavosSchema, IdSchema, IsoDateTimeSchema, MediaRefSchema } from './common.js';
import { OrderStatusEnum, OrderTypeEnum, PaymentMethodEnum, PaymentStatusEnum } from './enums.js';
import { OrderReceiptSchema, ProofSchema } from './order.js';

// One line on the kitchen / packing ticket (up to 8 on the card).
export const TicketLineSchema = z.object({
  qty: z.number().int().positive(),
  name: z.string().min(1),
  variantLabel: z.string().nullable(),
  optionLabels: z.array(z.string()),
  note: z.string().nullable(),
  // The item's first photo (a media ref, like catalog photos), for the photo stack (decision T56).
  photo: MediaRefSchema.nullable(),
});
export type TicketLine = z.infer<typeof TicketLineSchema>;

// One card on the owner's board.
export const BoardOrderSchema = z.object({
  id: IdSchema,
  token: z.string().min(8),
  orderNo: z.number().int().min(1),
  type: OrderTypeEnum,
  status: OrderStatusEnum,
  paymentStatus: PaymentStatusEnum,
  paymentMethod: PaymentMethodEnum,
  scheduledAt: IsoDateTimeSchema.nullable(),
  placedAt: IsoDateTimeSchema,
  customerName: z.string().min(1),
  isFirstOrder: z.boolean(),
  isMember: z.boolean(),
  hasReward: z.boolean(),
  itemsSummary: z.string(),
  total: CentavosSchema,
  dueAt: IsoDateTimeSchema,
  startBy: IsoDateTimeSchema,
  pickupCode: z.string().length(4),
  seenAt: IsoDateTimeSchema.nullable(),
  lines: z.array(TicketLineSchema).max(8),
  moreLines: z.number().int().nonnegative(),
  note: z.string().nullable(),
  ownerNote: z.string().nullable(),
  deliveryArea: z.string().nullable(),
  lastStepAt: IsoDateTimeSchema,
  // When an unpaid transfer's pay window ends (null for cash and paid orders).
  expiresAt: IsoDateTimeSchema.nullable(),
  // The member's stamps toward the prize, for the "7/10" chip (null when not a member or the card is off).
  memberStamps: z
    .object({ have: z.number().int().nonnegative(), goal: z.number().int().positive() })
    .nullable(),
});
export type BoardOrder = z.infer<typeof BoardOrderSchema>;

// The owner's view of one order: the receipt plus who ordered and every proof.
export const OwnerOrderSchema = OrderReceiptSchema.extend({
  id: IdSchema,
  customerPhone: z.string().min(1),
  customerEmail: z.string().nullable(),
  isFirstOrder: z.boolean(),
  isMember: z.boolean(),
  proofs: z.array(ProofSchema),
  seenAt: IsoDateTimeSchema.nullable(),
  ownerNote: z.string().nullable(),
  lastStepAt: IsoDateTimeSchema,
});
export type OwnerOrder = z.infer<typeof OwnerOrderSchema>;

export const PaymentSchema = z.object({
  orderId: IdSchema,
  method: PaymentMethodEnum,
  status: PaymentStatusEnum,
  amount: CentavosSchema,
  proofs: z.array(ProofSchema),
});
export type Payment = z.infer<typeof PaymentSchema>;
