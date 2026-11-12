// Owner Settings (decisions T64 to T68): the shop's facts, hours, ordering, delivery and payments; the owner's
// profile and emails; the Pro plan, storage and exports. The shop always comes from the owner's login (T34).
import { z } from 'zod';
import { AvatarMakeSchema, AvatarSvgSchema } from './avatar-make.js';
import { ShopKindEnum } from './demo-shop.js';
import {
  CentavosSchema,
  IdSchema,
  IsoDateSchema,
  IsoDateTimeSchema,
  MediaRefSchema,
} from './common.js';
import {
  AvatarThemeEnum,
  CleanupKindEnum,
  ExportRangeEnum,
  ExportStatusEnum,
  OrderTypeEnum,
  OwnerAvatarStyleEnum,
  PlanMonthsSchema,
  PlanPaymentStatusEnum,
  PlanPayMethodEnum,
  PlanStatusEnum,
  StorageKindEnum,
} from './enums.js';
import {
  BookingRulesSchema,
  ClosureSchema,
  DeliverySettingsSchema,
  OpeningRangeSchema,
  PaymentAccountSchema,
  ShopContactSchema,
} from './storefront.js';

// ---------- the shop (Your shop group) ----------

export const ShopFactsSchema = z.object({
  name: z.string().trim().min(1).max(60),
  contact: ShopContactSchema,
});
export type ShopFacts = z.infer<typeof ShopFactsSchema>;

export const HoursSettingsSchema = z.object({
  hours: z.array(OpeningRangeSchema).max(28),
  closures: z.array(ClosureSchema).max(60),
});
export type HoursSettings = z.infer<typeof HoursSettingsSchema>;

export const OrderingSettingsSchema = z.object({
  orderTypes: z.array(OrderTypeEnum).min(1),
  rules: BookingRulesSchema,
});
export type OrderingSettings = z.infer<typeof OrderingSettingsSchema>;

export const PaymentSettingsSchema = z.object({
  payments: z.array(PaymentAccountSchema).min(1),
  codMaxTotal: CentavosSchema.nullable(),
});
export type PaymentSettings = z.infer<typeof PaymentSettingsSchema>;

// Booked orders still to come, so turning an order type off can say what stays.
export const BookedCountsSchema = z.object({
  pickup: z.number().int().min(0),
  delivery: z.number().int().min(0),
});
export type BookedCounts = z.infer<typeof BookedCountsSchema>;

// One read for the whole Settings area; each section saves its own part.
export const OwnerSettingsSchema = z.object({
  slug: z.string().min(1).max(40),
  kind: ShopKindEnum,
  isDemo: z.boolean(),
  shop: ShopFactsSchema,
  hours: HoursSettingsSchema,
  ordering: OrderingSettingsSchema,
  delivery: DeliverySettingsSchema,
  payments: PaymentSettingsSchema,
  booked: BookedCountsSchema,
});
export type OwnerSettings = z.infer<typeof OwnerSettingsSchema>;

// ---------- the owner (You group) ----------

// A face is a tiny record that points at a file the app ships (0 KB of storage); a photo is an upload.
export const OwnerAvatarSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('face'),
    style: OwnerAvatarStyleEnum,
    face: z.number().int().min(1).max(12),
    theme: AvatarThemeEnum,
  }),
  z.object({
    // Made on the device (T83): the choices to open the maker again, and the drawing to show.
    kind: z.literal('custom'),
    make: AvatarMakeSchema,
    svg: AvatarSvgSchema,
    theme: AvatarThemeEnum,
  }),
  z.object({ kind: z.literal('initials'), theme: AvatarThemeEnum }),
  z.object({ kind: z.literal('photo'), ref: MediaRefSchema, bytes: z.number().int().min(0) }),
]);
export type OwnerAvatar = z.infer<typeof OwnerAvatarSchema>;

export const OwnerProfileSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.email(),
  avatar: OwnerAvatarSchema,
});
export type OwnerProfile = z.infer<typeof OwnerProfileSchema>;

export const SaveProfileInputSchema = OwnerProfileSchema.pick({ name: true, avatar: true });
export type SaveProfileInput = z.infer<typeof SaveProfileInputSchema>;

// The emails we send the owner. The order sound is the bell on the Orders page, not here.
export const NotificationPrefsSchema = z.object({
  newOrder: z.boolean(),
  paymentToCheck: z.boolean(),
  storage: z.boolean(),
  planPayment: z.boolean(),
  email: z.email(),
});
export type NotificationPrefs = z.infer<typeof NotificationPrefsSchema>;

// ---------- the plan (T67) ----------

export const PlanPaymentSchema = z.object({
  id: IdSchema,
  months: PlanMonthsSchema,
  amount: CentavosSchema,
  method: PlanPayMethodEnum,
  reference: z.string().min(1).max(40),
  status: PlanPaymentStatusEnum,
  submittedAt: IsoDateTimeSchema,
  // The last day this payment pays for, once approved.
  coversUntil: IsoDateSchema,
});
export type PlanPayment = z.infer<typeof PlanPaymentSchema>;

export const PlanPayToSchema = z.object({
  accountName: z.string().min(1).max(80),
  gcash: z.string().min(1).max(40),
  maya: z.string().min(1).max(40),
});
export type PlanPayTo = z.infer<typeof PlanPayToSchema>;

export const PlanSchema = z.object({
  name: z.literal('pro'),
  priceMonthly: CentavosSchema,
  storageLimitBytes: z.number().int().positive(),
  status: PlanStatusEnum,
  trialEndsAt: IsoDateTimeSchema.nullable(),
  // The day the plan is paid up to (Manila); null while on the free trial and never paid.
  paidUntil: IsoDateSchema.nullable(),
  // The last day of the 7-day grace when unpaid.
  graceUntil: IsoDateSchema.nullable(),
  payTo: PlanPayToSchema,
  pending: PlanPaymentSchema.nullable(),
  history: z.array(PlanPaymentSchema),
});
export type Plan = z.infer<typeof PlanSchema>;

export const SubmitPlanPaymentInputSchema = z.object({
  months: PlanMonthsSchema,
  method: PlanPayMethodEnum,
  reference: z.string().trim().min(6).max(40),
  proofPath: z.string().min(1),
});
export type SubmitPlanPaymentInput = z.infer<typeof SubmitPlanPaymentInputSchema>;

// ---------- storage and data (T66) ----------

export const StorageKindUsageSchema = z.object({
  kind: StorageKindEnum,
  bytes: z.number().int().min(0),
  files: z.number().int().min(0),
});
export type StorageKindUsage = z.infer<typeof StorageKindUsageSchema>;

export const CleanupOfferSchema = z.object({
  kind: CleanupKindEnum,
  files: z.number().int().min(0),
  bytes: z.number().int().min(0),
});
export type CleanupOffer = z.infer<typeof CleanupOfferSchema>;

export const DataExportSchema = z.object({
  id: IdSchema,
  range: ExportRangeEnum,
  parts: z.object({ orders: z.boolean(), payments: z.boolean(), proofs: z.boolean() }),
  status: ExportStatusEnum,
  fileName: z.string().min(1),
  bytes: z.number().int().min(0).nullable(),
  orderRows: z.number().int().min(0),
  proofFiles: z.number().int().min(0),
  createdAt: IsoDateTimeSchema,
  readyAt: IsoDateTimeSchema.nullable(),
  // The download link works for 24 hours.
  expiresAt: IsoDateTimeSchema.nullable(),
  url: z.string().nullable(),
});
export type DataExport = z.infer<typeof DataExportSchema>;

export const StorageSummarySchema = z.object({
  usedBytes: z.number().int().min(0),
  limitBytes: z.number().int().positive(),
  kinds: z.array(StorageKindUsageSchema),
  cleanups: z.array(CleanupOfferSchema),
  // Uploads never attached to anything; they clear by themselves every night.
  unusedUploads: z.object({ files: z.number().int().min(0), bytes: z.number().int().min(0) }),
  // Every payment proof deletes itself this many days after the order (P7).
  proofDays: z.number().int().positive(),
  lastExport: DataExportSchema.nullable(),
});
export type StorageSummary = z.infer<typeof StorageSummarySchema>;

export const CleanupPreviewSchema = z.object({
  kind: CleanupKindEnum,
  files: z.number().int().min(0),
  bytes: z.number().int().min(0),
  // True when every one of these files is in an export the owner made (early proof delete, P7).
  savedCopy: z.boolean(),
  // Run deletes only what this preview listed; a changed list answers cleanup_changed.
  token: z.string().min(1),
});
export type CleanupPreview = z.infer<typeof CleanupPreviewSchema>;

export const CreateExportInputSchema = z.object({
  range: ExportRangeEnum,
  parts: DataExportSchema.shape.parts.refine((p) => p.orders || p.payments || p.proofs),
});
export type CreateExportInput = z.infer<typeof CreateExportInputSchema>;
