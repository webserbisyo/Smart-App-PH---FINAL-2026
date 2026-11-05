// Owner Members area (decisions T57 to T59): the list, the member panel, counter stamps and prizes.
import { z } from 'zod';
import { CentavosSchema, IdSchema, IsoDateTimeSchema } from './common.js';
import {
  ClaimCancelReasonEnum,
  ClaimStatusEnum,
  CustomerFilterEnum,
  LedgerKindEnum,
  ManualReasonEnum,
  MemberActivityKindEnum,
  MemberSegmentEnum,
  MemberSortEnum,
  OrderStatusEnum,
  StampCardStatusEnum,
} from './enums.js';
import { PublicStampCardSchema } from './storefront.js';

// The whole stamp card as the owner saves it: status, earn rule and reward (pieces included).
export const StampCardSettingsSchema = PublicStampCardSchema;
export type StampCardSettings = z.infer<typeof StampCardSettingsSchema>;

// What a change would do before it is saved, both ways (rule M9).
export const StampCardImpactSchema = z.object({
  // Members whose reward becomes ready when the goal goes down.
  readyNow: z.number().int().min(0),
  // Members with a ready reward who would need more stamps when the goal goes up.
  loseReady: z.number().int().min(0),
  // Prize claims waiting at the counter; they keep the prize they claimed.
  pendingClaims: z.number().int().min(0),
});
export type StampCardImpact = z.infer<typeof StampCardImpactSchema>;

// One stamp history line as the owner sees it: who made it and the private note (D4).
export const OwnerLedgerEntrySchema = z.object({
  id: IdSchema,
  kind: LedgerKindEnum,
  delta: z.number().int(),
  reasonCategory: ManualReasonEnum.nullable(),
  orderNo: z.number().int().min(1).nullable(),
  at: IsoDateTimeSchema,
  // The owner's private note on a manual change; the member never sees it.
  note: z.string().max(120).nullable(),
  // Made by the owner (or staff in B) at the counter, not by an order.
  byOwner: z.boolean(),
  // A counter change that was undone within the undo window; it and its `undone` line cancel out.
  undone: z.boolean(),
});
export type OwnerLedgerEntry = z.infer<typeof OwnerLedgerEntrySchema>;

export const MemberOrderSchema = z.object({
  id: IdSchema,
  orderNo: z.number().int().min(1),
  placedAt: IsoDateTimeSchema,
  status: OrderStatusEnum,
  total: CentavosSchema,
  itemsSummary: z.string(),
});
export type MemberOrder = z.infer<typeof MemberOrderSchema>;

export const OwnerClaimSchema = z.object({
  id: IdSchema,
  code: z.string().min(4).max(16),
  status: ClaimStatusEnum,
  title: z.string().min(1),
  createdAt: IsoDateTimeSchema,
  givenAt: IsoDateTimeSchema.nullable(),
  cancelledAt: IsoDateTimeSchema.nullable(),
  cancelReason: ClaimCancelReasonEnum.nullable(),
  customerId: IdSchema,
  memberName: z.string().min(1),
});
export type OwnerClaim = z.infer<typeof OwnerClaimSchema>;

// One person on the Members list: a member, or a guest grouped by mobile number for display only (M12).
export const CustomerRowSchema = z.object({
  id: IdSchema,
  isMember: z.boolean(),
  name: z.string().min(1),
  // Display form, e.g. "0917 000 2001".
  phone: z.string().min(1),
  memberCode: z.string().min(4).max(16).nullable(),
  // Stamps on the card now (0 for guests); can be over the goal.
  balance: z.number().int().min(0),
  goal: z.number().int().min(1),
  segments: z.array(MemberSegmentEnum),
  // Completed orders.
  visits: z.number().int().min(0),
  spent: CentavosSchema,
  lastOrderAt: IsoDateTimeSchema.nullable(),
  joinedAt: IsoDateTimeSchema.nullable(),
  prizeToGive: z.boolean(),
});
export type CustomerRow = z.infer<typeof CustomerRowSchema>;

export const MemberDetailSchema = CustomerRowSchema.extend({
  email: z.email().nullable(),
  pendingStamps: z.number().int().min(0),
  averageOrder: CentavosSchema,
  // The item bought most in the last 90 days (D6).
  usuallyBuys: z.string().nullable(),
  firstOrderAt: IsoDateTimeSchema.nullable(),
  // A note for the counter ("less ice"); members only.
  note: z.string().max(300).nullable(),
  // Manual changes left today (rule M6: 3 per member per Manila day).
  changesLeftToday: z.number().int().min(0),
  // The last counter stamp still counting, for the 2-minute double-stamp check (D2).
  lastCounterStampAt: IsoDateTimeSchema.nullable(),
  history: z.array(OwnerLedgerEntrySchema),
  orders: z.array(MemberOrderSchema),
  claims: z.array(OwnerClaimSchema),
});
export type MemberDetail = z.infer<typeof MemberDetailSchema>;

// A top suki: the member and how often they came in the last 30 days (T63).
export const TopSukiSchema = z.object({
  row: CustomerRowSchema,
  visits: z.number().int().min(1),
});
export type TopSuki = z.infer<typeof TopSukiSchema>;

// One line of the "Latest at the counter" feed (T63).
export const MemberActivitySchema = z.object({
  id: IdSchema,
  kind: MemberActivityKindEnum,
  customerId: IdSchema,
  name: z.string().min(1),
  at: IsoDateTimeSchema,
  // Stamps added for a `stamp` line (an order or the counter).
  stamps: z.number().int().min(0),
});
export type MemberActivity = z.infer<typeof MemberActivitySchema>;

// Completed sales split between members and guests (T63).
export const MemberSalesSchema = z.object({
  members: CentavosSchema,
  guests: CentavosSchema,
  memberOrders: z.number().int().min(0),
  guestOrders: z.number().int().min(0),
});
export type MemberSales = z.infer<typeof MemberSalesSchema>;

// How the stamp card is doing (T61, T63). Rolling windows, so the 1st of a month never looks empty:
// "recent" is the last 30 days (stamps: the last 7) and "before" the same length just before it.
export const MembersPulseSchema = z.object({
  joined: z.number().int().min(0),
  joinedBefore: z.number().int().min(0),
  stamps: z.number().int().min(0),
  stampsBefore: z.number().int().min(0),
  sales: MemberSalesSchema,
  salesBefore: MemberSalesSchema,
  // Top 5 members by completed orders in the last 30 days.
  top: z.array(TopSukiSchema),
  // Newest first, at most 8.
  activity: z.array(MemberActivitySchema),
});
export type MembersPulse = z.infer<typeof MembersPulseSchema>;

export const MembersOverviewSchema = z.object({
  cardStatus: StampCardStatusEnum,
  goal: z.number().int().min(1),
  members: z.number().int().min(0),
  guests: z.number().int().min(0),
  // Rewards used and prizes given since the card began.
  rewardsGiven: z.number().int().min(0),
  counts: z.record(CustomerFilterEnum, z.number().int().min(0)),
  // Card progress: index = stamps on the card (the last bar is "goal or more").
  progress: z.array(z.number().int().min(0)),
  prizesToGive: z.number().int().min(0),
  // Members 1 or 2 stamps away, most recent first (Levra's "worth a word at the counter").
  near: z.array(CustomerRowSchema),
  pulse: MembersPulseSchema,
});
export type MembersOverview = z.infer<typeof MembersOverviewSchema>;

export const ListCustomersInputSchema = z.object({
  filter: CustomerFilterEnum,
  q: z.string().max(80),
  // Card progress bar tapped: only members with exactly this many stamps (the last bar = goal or more).
  stamps: z.number().int().min(0).nullable(),
  sort: MemberSortEnum,
  cursor: z.number().int().min(0),
  limit: z.number().int().min(1).max(100),
});
export type ListCustomersInput = z.infer<typeof ListCustomersInputSchema>;

export const CustomerPageSchema = z.object({
  rows: z.array(CustomerRowSchema),
  total: z.number().int().min(0),
  nextCursor: z.number().int().min(0).nullable(),
});
export type CustomerPage = z.infer<typeof CustomerPageSchema>;

// A counter change the owner can undo for a few seconds (D1, D3).
export const CounterChangeSchema = z.object({
  member: MemberDetailSchema,
  entryId: IdSchema,
  undoUntil: IsoDateTimeSchema,
});
export type CounterChange = z.infer<typeof CounterChangeSchema>;

export const FoundMemberSchema = z.object({
  customerId: IdSchema,
  // Set when the code was a prize claim code: the claim to give (M13).
  claimId: IdSchema.nullable(),
});
export type FoundMember = z.infer<typeof FoundMemberSchema>;

export const AdjustStampsInputSchema = z.object({
  customerId: IdSchema,
  delta: z.union([z.literal(1), z.literal(-1)]),
  reason: ManualReasonEnum,
  note: z.string().trim().max(120).nullable(),
});
export type AdjustStampsInput = z.infer<typeof AdjustStampsInputSchema>;
