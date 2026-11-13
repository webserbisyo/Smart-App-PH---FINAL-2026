import { z } from 'zod';
import { CentavosSchema, IdSchema, IsoDateTimeSchema, MediaRefSchema } from './common.js';
import {
  ChatLockEnum,
  OrderStatusEnum,
  OrderTypeEnum,
  PaymentMethodEnum,
  PaymentStatusEnum,
} from './enums.js';
import { OrderMessageSchema, OrderReceiptSchema, ProofSchema } from './order.js';

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
  // The shop account it is paid to (T84), for Home's "Tap a row for its orders". Null for cash and COD.
  paymentAccountId: z.string().min(1).max(40).nullable().optional(),
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

// One row of the owner's Chats list (T87). One chat per order for now; `key` is the member's or the
// order's, so a member's chat can run across orders once live chat arrives (MVP B) with no new list.
export const ChatSummarySchema = z.object({
  key: z.string().min(1),
  orderId: IdSchema,
  orderNo: z.number().int().min(1),
  status: OrderStatusEnum,
  customerName: z.string().min(1),
  customerPhone: z.string().min(1),
  isMember: z.boolean(),
  isFirstOrder: z.boolean(),
  memberStamps: z
    .object({ have: z.number().int().nonnegative(), goal: z.number().int().positive() })
    .nullable(),
  // The newest line, from either side.
  last: OrderMessageSchema,
  // Since when the customer's newest line has waited for the shop (null once the shop answered).
  waitingSince: IsoDateTimeSchema.nullable(),
  // The customer's lines the shop has not seen yet.
  unseen: z.number().int().nonnegative(),
  photosUsed: z.number().int().nonnegative(),
  lock: ChatLockEnum,
});
export type ChatSummary = z.infer<typeof ChatSummarySchema>;
