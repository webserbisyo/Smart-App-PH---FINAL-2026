import { z } from 'zod';
import { CentavosSchema, IdSchema, IsoDateTimeSchema } from './common.js';
import { OrderStatusEnum, OrderTypeEnum, PaymentMethodEnum, PaymentStatusEnum } from './enums.js';
import { OrderReceiptSchema, ProofSchema } from './order.js';

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
