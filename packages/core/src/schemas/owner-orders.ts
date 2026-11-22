import { z } from 'zod';
import { CentavosSchema, IdSchema, IsoDateTimeSchema, MediaRefSchema } from './common.js';
import { BasketLineSchema, NOTE_MAX } from './basket.js';
import {
  ChatLockEnum,
  OrderSourceEnum,
  OrderStatusEnum,
  OrderTypeEnum,
  PaidKindEnum,
  PaymentMethodEnum,
  PaymentStatusEnum,
} from './enums.js';
import { OwnerAvatarSchema } from './owner-avatar.js';
import {
  DeliveryDetailsSchema,
  OrderMessageSchema,
  OrderReceiptSchema,
  ProofSchema,
} from './order.js';

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
  // A member's face (T95); null for guests, who show their initials.
  customerAvatar: OwnerAvatarSchema.nullable().default(null),
  // T111: who made it (the owner's New order or the storefront) and how much is paid so far.
  source: OrderSourceEnum.default('storefront'),
  paidAmount: CentavosSchema.default(0),
});
export type BoardOrder = z.infer<typeof BoardOrderSchema>;

// The owner's view of one order: the receipt plus who ordered and every proof.
export const OwnerOrderSchema = OrderReceiptSchema.extend({
  id: IdSchema,
  // A walk-in the owner made without a mobile number has none (T111).
  customerPhone: z.string().min(1).nullable(),
  customerEmail: z.string().nullable(),
  isFirstOrder: z.boolean(),
  isMember: z.boolean(),
  proofs: z.array(ProofSchema),
  seenAt: IsoDateTimeSchema.nullable(),
  ownerNote: z.string().nullable(),
  lastStepAt: IsoDateTimeSchema,
  // T111: who made it, what is paid so far (Collect more / Give back), the version every edit sends
  // back (`order_changed` when another phone saved first), and when the shop last changed it.
  source: OrderSourceEnum.default('storefront'),
  paidAmount: CentavosSchema.default(0),
  version: z.number().int().min(1).default(1),
  editedAt: IsoDateTimeSchema.nullable().default(null),
  // The member on the order (for Edit order's customer step); null for guests.
  memberId: IdSchema.nullable().default(null),
});
export type OwnerOrder = z.infer<typeof OwnerOrderSchema>;

export const PaymentSchema = z.object({
  orderId: IdSchema,
  method: PaymentMethodEnum,
  status: PaymentStatusEnum,
  amount: CentavosSchema,
  // What the customer paid so far (T111): below `amount` is a part payment, above it is money to give back.
  paidAmount: CentavosSchema.default(0),
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
  customerPhone: z.string().min(1).nullable(),
  isMember: z.boolean(),
  isFirstOrder: z.boolean(),
  memberStamps: z
    .object({ have: z.number().int().nonnegative(), goal: z.number().int().positive() })
    .nullable(),
  customerAvatar: OwnerAvatarSchema.nullable().default(null),
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

// ---------------------------------------------------------------------------------------------------
// New order and Edit order (T111): the owner makes an order for a walk-in, Messenger or phone customer,
// and changes a received order while it is New, Preparing or Ready.

export const OWNER_GUEST_NAME_MAX = 80;

// The customer on an owner-made order: a guest (a name, "Walk-in" when left empty, and an optional
// mobile number), or a member picked from Members (their name, mobile and face come from the member).
export const OwnerOrderCustomerSchema = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal('guest'),
      name: z.string().trim().max(OWNER_GUEST_NAME_MAX),
      phone: z.string().trim().max(20).nullable(),
    })
    .strict(),
  z.object({ kind: z.literal('member'), memberId: IdSchema }).strict(),
]);
export type OwnerOrderCustomer = z.infer<typeof OwnerOrderCustomerSchema>;

// What the owner's screen sends for New order and Edit order. Price-free like the storefront's: the
// server works out every amount.
export const OwnerOrderPayloadSchema = z
  .object({
    type: OrderTypeEnum,
    // Null = now (walk-in is never scheduled, T48).
    scheduledAt: IsoDateTimeSchema.nullable(),
    lines: z.array(BasketLineSchema.strict()).min(1).max(50),
    customer: OwnerOrderCustomerSchema,
    delivery: DeliveryDetailsSchema.nullable(),
    // Delivery only: the fee the owner agreed (the area's fee by default; the owner books the rider).
    deliveryFee: CentavosSchema.nullable(),
    paymentMethod: PaymentMethodEnum,
    paymentAccountId: z.string().min(1).max(40).nullable(),
    note: z
      .string()
      .max(NOTE_MAX * 2)
      .nullable(),
    // The member's ready prize goes on this order (members only).
    useReward: z.boolean(),
    // "Allow anyway": the owner may go over slot caps, daily limits and notice days (never closed days
    // or hours), like Change time (T85, P6).
    override: z.boolean(),
  })
  .strict();
export type OwnerOrderPayload = z.infer<typeof OwnerOrderPayloadSchema>;

export const OwnerPaySchema = z
  .object({
    kind: PaidKindEnum,
    // Only for `part`: what the customer paid now, more than 0 and less than the total.
    amount: CentavosSchema.nullable(),
  })
  .strict();
export type OwnerPay = z.infer<typeof OwnerPaySchema>;

export const CreateOwnerOrderInputSchema = z
  .object({
    payload: OwnerOrderPayloadSchema,
    pay: OwnerPaySchema,
    // Walk-in only: the customer already has it, so the order is made as Done and a member's stamp
    // lands at once (P5).
    handedOver: z.boolean(),
    // Made once per try and kept until it works: a retry returns the first order.
    clientKey: z.string().min(8).max(64),
  })
  .strict();
export type CreateOwnerOrderInput = z.infer<typeof CreateOwnerOrderInputSchema>;

export const EditOrderInputSchema = z
  .object({
    // The version the screen loaded; an older one is `order_changed`.
    version: z.number().int().min(1),
    payload: OwnerOrderPayloadSchema,
  })
  .strict();
export type EditOrderInput = z.infer<typeof EditOrderInputSchema>;

export const OwnerOrderCreatedSchema = z.object({
  orderId: IdSchema,
  orderNo: z.number().int().min(1),
  token: z.string().min(8),
  status: OrderStatusEnum,
});
export type OwnerOrderCreated = z.infer<typeof OwnerOrderCreatedSchema>;
