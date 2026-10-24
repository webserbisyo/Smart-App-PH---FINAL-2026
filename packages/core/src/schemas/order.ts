import { z } from 'zod';
import { BasketLineSchema, NOTE_MAX } from './basket.js';
import {
  CentavosSchema,
  IdSchema,
  IsoDateTimeSchema,
  LatLngSchema,
  MediaRefSchema,
} from './common.js';
import {
  LineProblemCodeEnum,
  MessageKindEnum,
  OpenStateKindEnum,
  OrderStatusEnum,
  OrderTypeEnum,
  PaymentMethodEnum,
  PaymentStatusEnum,
  ProofStatusEnum,
} from './enums.js';

export const CustomerDetailsSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    phone: z.string().trim().min(1).max(20),
    email: z.email().nullable(),
  })
  .strict();
export type CustomerDetails = z.infer<typeof CustomerDetailsSchema>;

export const DeliveryDetailsSchema = z
  .object({
    spot: LatLngSchema.nullable(),
    zoneId: IdSchema.nullable(),
    addressLine: z.string().trim().min(1).max(160),
    houseNo: z.string().max(40).nullable(),
    floor: z.string().max(40).nullable(),
    landmark: z.string().max(120).nullable(),
  })
  .strict();
export type DeliveryDetails = z.infer<typeof DeliveryDetailsSchema>;

// What the phone sends. Strict and price-free: the server works out every amount.
export const OrderPayloadSchema = z
  .object({
    type: OrderTypeEnum,
    scheduledAt: IsoDateTimeSchema.nullable(),
    lines: z.array(BasketLineSchema.strict()).min(1).max(50),
    customer: CustomerDetailsSchema,
    delivery: DeliveryDetailsSchema.nullable(),
    paymentMethod: PaymentMethodEnum,
    note: z
      .string()
      .max(NOTE_MAX * 2)
      .nullable(),
    useReward: z.boolean(),
  })
  .strict();
export type OrderPayload = z.infer<typeof OrderPayloadSchema>;

export const PlaceOrderInputSchema = z
  .object({ payload: OrderPayloadSchema, clientKey: z.string().min(8).max(64) })
  .strict();
export type PlaceOrderInput = z.infer<typeof PlaceOrderInputSchema>;

export const LineProblemSchema = z.object({
  code: LineProblemCodeEnum,
  // The add-on group a problem is about, so the screen can name it.
  groupId: IdSchema.nullable(),
  groupName: z.string().nullable(),
});
export type LineProblem = z.infer<typeof LineProblemSchema>;

export const QuoteLineSchema = z.object({
  identity: z.string().min(1),
  itemId: IdSchema,
  variantId: IdSchema,
  optionIds: z.array(IdSchema),
  qty: z.number().int().min(1),
  name: z.string(),
  variantLabel: z.string().nullable(),
  optionLabels: z.array(z.string()),
  note: z.string(),
  unitPrice: CentavosSchema,
  lineTotal: CentavosSchema,
  photo: MediaRefSchema.nullable(),
  // A line with problems is flagged and left out of the total.
  problems: z.array(LineProblemSchema),
});
export type QuoteLine = z.infer<typeof QuoteLineSchema>;

export const QUOTE_PROBLEMS = [
  'shop_closed',
  'shop_paused',
  'shop_busy',
  'fulfillment_unavailable',
  'payment_unavailable',
  'cod_limit',
  'zone_required',
  'out_of_range',
  'below_min_order',
  'slot_unavailable',
  'reward_unavailable',
  'empty_basket',
] as const;
export const QuoteProblemCodeEnum = z.enum(QUOTE_PROBLEMS);
export type QuoteProblemCode = z.infer<typeof QuoteProblemCodeEnum>;

export const QuoteProblemSchema = z.object({
  code: QuoteProblemCodeEnum,
  // Numbers the words need: the COD limit, the max km, the minimum order.
  amount: CentavosSchema.nullable(),
  km: z.number().nullable(),
});
export type QuoteProblem = z.infer<typeof QuoteProblemSchema>;

export const OpenStateSchema = z.object({
  state: OpenStateKindEnum,
  // When open: closing time. When closed: next opening (null = none in the next 7 days).
  closesAt: IsoDateTimeSchema.nullable(),
  nextOpening: IsoDateTimeSchema.nullable(),
  busyUntil: IsoDateTimeSchema.nullable(),
  paused: z.boolean(),
});
export type OpenState = z.infer<typeof OpenStateSchema>;

export const TotalsSchema = z.object({
  subtotal: CentavosSchema,
  discount: CentavosSchema,
  deliveryFee: CentavosSchema,
  total: CentavosSchema,
});
export type Totals = z.infer<typeof TotalsSchema>;

export const QuoteSchema = TotalsSchema.extend({
  lines: z.array(QuoteLineSchema),
  distanceM: z.number().int().min(0).nullable(),
  slots: z.array(IsoDateTimeSchema),
  openState: OpenStateSchema,
  readyEstimate: IsoDateTimeSchema.nullable(),
  problems: z.array(QuoteProblemSchema),
});
export type Quote = z.infer<typeof QuoteSchema>;

export const OrderEventSchema = z.object({
  status: OrderStatusEnum,
  at: IsoDateTimeSchema,
});
export type OrderEvent = z.infer<typeof OrderEventSchema>;

export const ProofSchema = z.object({
  id: IdSchema,
  status: ProofStatusEnum,
  referenceNo: z.string().min(1).max(40),
  path: z.string().min(1),
  uploadedAt: IsoDateTimeSchema,
  rejectReason: z.string().max(200).nullable(),
});
export type Proof = z.infer<typeof ProofSchema>;

// The order thread: proof first, then system lines. No chat posts in A (S7).
export const OrderMessageSchema = z.object({
  id: IdSchema,
  kind: MessageKindEnum,
  at: IsoDateTimeSchema,
  status: OrderStatusEnum.nullable(),
  proof: ProofSchema.nullable(),
  text: z.string().max(300).nullable(),
});
export type OrderMessage = z.infer<typeof OrderMessageSchema>;

export const ReceiptLineSchema = z.object({
  name: z.string(),
  variantLabel: z.string().nullable(),
  optionLabels: z.array(z.string()),
  note: z.string(),
  qty: z.number().int().min(1),
  unitPrice: CentavosSchema,
  lineTotal: CentavosSchema,
  itemId: IdSchema,
  variantId: IdSchema,
  optionIds: z.array(IdSchema),
});
export type ReceiptLine = z.infer<typeof ReceiptLineSchema>;

export const PaymentInstructionsSchema = z.object({
  method: PaymentMethodEnum,
  accountName: z.string().nullable(),
  accountNumber: z.string().nullable(),
  qr: MediaRefSchema.nullable(),
  amount: CentavosSchema,
});
export type PaymentInstructions = z.infer<typeof PaymentInstructionsSchema>;

export const RiderSchema = z.object({
  name: z.string().min(1).max(60),
  phone: z.string().min(1).max(20).nullable(),
  provider: z.string().max(40).nullable(),
});
export type Rider = z.infer<typeof RiderSchema>;

export const RefundSchema = z.object({
  amount: CentavosSchema,
  reason: z.string().min(1).max(200),
  at: IsoDateTimeSchema,
});
export type Refund = z.infer<typeof RefundSchema>;

export const OrderRatingSchema = z.object({
  stars: z.number().int().min(1).max(5),
  comment: z.string().max(300).nullable(),
  at: IsoDateTimeSchema,
});
export type OrderRating = z.infer<typeof OrderRatingSchema>;

export const OrderReceiptSchema = z.object({
  slug: z.string().min(1),
  orderNo: z.number().int().min(1),
  token: z.string().min(8),
  type: OrderTypeEnum,
  status: OrderStatusEnum,
  paymentStatus: PaymentStatusEnum,
  paymentMethod: PaymentMethodEnum,
  placedAt: IsoDateTimeSchema,
  scheduledAt: IsoDateTimeSchema.nullable(),
  customerName: z.string().min(1),
  deliveryAddress: z.string().nullable(),
  events: z.array(OrderEventSchema),
  messages: z.array(OrderMessageSchema),
  lines: z.array(ReceiptLineSchema).min(1),
  totals: TotalsSchema,
  rewardTitle: z.string().nullable(),
  payment: PaymentInstructionsSchema.nullable(),
  rider: RiderSchema.nullable(),
  trackingUrl: z.url().nullable(),
  refund: RefundSchema.nullable(),
  rating: OrderRatingSchema.nullable(),
  cancelReason: z.string().nullable(),
  // Unpaid transfers only: pay before this time or the order expires.
  expiresAt: IsoDateTimeSchema.nullable(),
  note: z.string().nullable(),
});
export type OrderReceipt = z.infer<typeof OrderReceiptSchema>;

// One row on My orders.
export const OrderRowSchema = z.object({
  slug: z.string().min(1),
  token: z.string().min(8),
  orderNo: z.number().int().min(1),
  type: OrderTypeEnum,
  status: OrderStatusEnum,
  paymentStatus: PaymentStatusEnum,
  total: CentavosSchema,
  placedAt: IsoDateTimeSchema,
  scheduledAt: IsoDateTimeSchema.nullable(),
  itemCount: z.number().int().min(1),
  summary: z.string(),
  photo: MediaRefSchema.nullable(),
});
export type OrderRow = z.infer<typeof OrderRowSchema>;
