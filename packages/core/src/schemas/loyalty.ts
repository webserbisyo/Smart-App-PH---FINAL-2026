import { z } from 'zod';
import { CentavosSchema, IdSchema, IsoDateTimeSchema, MediaRefSchema } from './common.js';
import {
  ClaimStatusEnum,
  LedgerKindEnum,
  ManualReasonEnum,
  RewardKindEnum,
  StampPeriodEnum,
} from './enums.js';

export const StampRuleSchema = z
  .object({
    // Subtotal before the reward discount.
    minOrderTotal: CentavosSchema,
    stampsNeeded: z.number().int().min(4).max(20),
    welcomeStamps: z.union([z.literal(0), z.literal(1)]),
    // At most this many earned stamps per member per period (default 1 per day, S24); null = no cap.
    maxEarned: z.number().int().min(1).max(10).nullable(),
    period: StampPeriodEnum.nullable(),
  })
  .refine((r) => (r.maxEarned === null) === (r.period === null), {
    message: 'maxEarned and period go together',
  });
export type StampRule = z.infer<typeof StampRuleSchema>;

export const RewardSchema = z
  .object({
    kind: RewardKindEnum,
    // Discount amount in centavos (discount only).
    amount: CentavosSchema.nullable(),
    // The free item and its variant (free_item only).
    itemId: IdSchema.nullable(),
    variantId: IdSchema.nullable(),
    title: z.string().min(1).max(60),
    description: z.string().max(200).nullable(),
    image: MediaRefSchema.nullable(),
    // Limited prizes (S26): null = unlimited.
    quantityTotal: z.number().int().min(1).nullable(),
    quantityLeft: z.number().int().min(0).nullable(),
    onePerCustomer: z.boolean(),
  })
  .refine((r) => r.kind !== 'discount' || (r.amount !== null && r.amount > 0), {
    message: 'A discount needs an amount',
  })
  .refine((r) => r.kind !== 'free_item' || (r.itemId !== null && r.variantId !== null), {
    message: 'A free item needs an item and a variant',
  })
  .refine((r) => (r.quantityTotal === null) === (r.quantityLeft === null), {
    message: 'quantityTotal and quantityLeft go together',
  })
  .refine((r) => r.quantityTotal === null || (r.quantityLeft ?? 0) <= r.quantityTotal, {
    message: 'quantityLeft cannot be more than quantityTotal',
  });
export type Reward = z.infer<typeof RewardSchema>;

export const LedgerEntrySchema = z.object({
  kind: LedgerKindEnum,
  delta: z.number().int(),
  // Manual changes show the category only, never the owner's private note.
  reasonCategory: ManualReasonEnum.nullable(),
  orderNo: z.number().int().min(1).nullable(),
  at: IsoDateTimeSchema,
});
export type LedgerEntry = z.infer<typeof LedgerEntrySchema>;

export const MemberAccountSchema = z.object({
  name: z.string().min(1).max(80),
  phone: z.string().min(1),
  email: z.email(),
  balance: z.number().int().min(0),
  pendingStamps: z.number().int().min(0),
  rewardReady: z.boolean(),
  // A code the shop scans or types to find this member (N6).
  memberCode: z.string().min(4).max(16),
  history: z.array(LedgerEntrySchema),
});
export type MemberAccount = z.infer<typeof MemberAccountSchema>;

export const RewardClaimSchema = z.object({
  code: z.string().min(4).max(16),
  status: ClaimStatusEnum,
  qrUrl: z.url(),
  title: z.string().min(1),
  createdAt: IsoDateTimeSchema,
});
export type RewardClaim = z.infer<typeof RewardClaimSchema>;
