// Owner Settings (decisions T64 to T68): the shop's facts, hours, ordering, delivery and payments; the owner's
// profile and emails; the Pro plan, storage and exports. The shop always comes from the owner's login (T34).
import { z } from 'zod';
import { OwnerAvatarSchema } from './owner-avatar.js';
import { ShopKindEnum } from './demo-shop.js';
import {
  CentavosSchema,
  IdSchema,
  IsoDateSchema,
  IsoDateTimeSchema,
  MediaRefSchema,
} from './common.js';
import {
  BillingFromEnum,
  BillingKindEnum,
  CleanupKindEnum,
  FileLockEnum,
  FileUseEnum,
  ExportRangeEnum,
  ExportStatusEnum,
  OrderTypeEnum,
  PlanMonthsSchema,
  PlanPaidViaEnum,
  PlanPaymentStatusEnum,
  PlanPayMethodEnum,
  PlanRejectReasonEnum,
  PlanStatusEnum,
  StorageFolderEnum,
  StorageKindEnum,
} from './enums.js';
import {
  BookingRulesSchema,
  ClosureSchema,
  DeliverySettingsSchema,
  OpeningRangeSchema,
  PaymentAccountsSchema,
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
  payments: PaymentAccountsSchema,
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
  // A new shop has no way to pay yet (T116): the read may be empty; a save still needs one (last_payment_method).
  payments: z.object({
    payments: z.array(PaymentAccountSchema),
    codMaxTotal: CentavosSchema.nullable(),
  }),
  booked: BookedCountsSchema,
});
export type OwnerSettings = z.infer<typeof OwnerSettingsSchema>;

// ---------- the owner (You group) ----------

// The owner's picture: its own module (owner-avatar.ts), as members use the same shape (T95).
export { OwnerAvatarSchema, type OwnerAvatar } from './owner-avatar.js';

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
  method: PlanPaidViaEnum,
  // Optional since T107: the photo shows it.
  reference: z.string().min(1).max(40).nullable(),
  status: PlanPaymentStatusEnum,
  submittedAt: IsoDateTimeSchema,
  // The last day this payment pays for, once approved.
  coversUntil: IsoDateSchema,
  // Why it was not approved (T88).
  rejectReason: PlanRejectReasonEnum.nullable().default(null),
  // The owner's photo of the payment, for the founder to check (null when recorded by hand).
  proofUrl: z.string().max(200_000).nullable().default(null),
});
export type PlanPayment = z.infer<typeof PlanPaymentSchema>;

export const PlanPayToSchema = z.object({
  accountName: z.string().min(1).max(80),
  gcash: z.string().min(1).max(40),
  maya: z.string().min(1).max(40),
});
export type PlanPayTo = z.infer<typeof PlanPayToSchema>;

// One line of the Billing chat between a shop and Smart App PH (T88). A payment line points at its payment;
// the founder's answers and the system's lines carry their own words on the screen, from `kind`.
export const BillingMessageSchema = z.object({
  id: IdSchema,
  at: IsoDateTimeSchema,
  from: BillingFromEnum,
  kind: BillingKindEnum,
  paymentId: IdSchema.nullable(),
  // A note's text (at most 300 characters); the other kinds use it for an optional short note.
  text: z.string().max(300).nullable(),
  reason: PlanRejectReasonEnum.nullable(),
  // extra_days: how many days were given; live: none.
  days: z.number().int().positive().nullable(),
  // photo (T107): where the photo is kept, a short-lived address to show it (null once it is deleted),
  // and the reference number the owner typed with it, if any.
  photoPath: z.string().min(1).max(300).nullable().default(null),
  photoUrl: z.string().max(200_000).nullable().default(null),
  reference: z.string().min(1).max(40).nullable().default(null),
  // When the other side saw it: Smart App PH for the owner's lines, the owner for ours.
  seenAt: IsoDateTimeSchema.nullable().default(null),
});
export type BillingMessage = z.infer<typeof BillingMessageSchema>;

export const PlanSchema = z.object({
  name: z.literal('pro'),
  priceMonthly: CentavosSchema,
  // Pay 6 months, get 1 free (T92): 6 months cost 5 times the monthly price.
  sixMonthBonus: z.boolean().default(false),
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
  // The Billing chat (T88), oldest first.
  thread: z.array(BillingMessageSchema).default([]),
});
export type Plan = z.infer<typeof PlanSchema>;

export const SendBillingNoteInputSchema = z.object({ text: z.string().trim().min(1).max(300) });
export type SendBillingNoteInput = z.infer<typeof SendBillingNoteInputSchema>;

// A photo in the Billing chat (T107): photos only, the reference number is optional.
export const BILLING_PHOTOS_PER_SEND = 3;
export const SendBillingPhotoInputSchema = z.object({
  photoPath: z.string().min(1).max(300),
  reference: z
    .string()
    .trim()
    .max(40)
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .default(null),
});
export type SendBillingPhotoInput = z.input<typeof SendBillingPhotoInputSchema>;

export const SubmitPlanPaymentInputSchema = z.object({
  months: PlanMonthsSchema,
  method: PlanPayMethodEnum,
  // Optional since T107: the photo shows it. When typed, at least 6 characters.
  reference: z
    .string()
    .trim()
    .max(40)
    .refine((v) => v === '' || v.length >= 6)
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .default(null),
  proofPath: z.string().min(1),
});
export type SubmitPlanPaymentInput = z.input<typeof SubmitPlanPaymentInputSchema>;

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

// ---------- files (T93) ----------

/**
 * One stored file in Storage › Files. The date is the day it was uploaded and never changes. `ref` is a
 * picture the dashboard can show (menu and look photos); proofs show their order instead, and their
 * pictures only open inside the order (customers' payment screenshots stay private).
 */
export const StoredFileSchema = z.object({
  id: z.string().min(1),
  folder: StorageFolderEnum,
  name: z.string().min(1),
  bytes: z.number().int().min(0),
  uploadedAt: IsoDateTimeSchema,
  ref: MediaRefSchema.nullable(),
  usedBy: z
    .object({ kind: FileUseEnum, id: z.string().min(1), label: z.string().min(1) })
    .nullable(),
  // Null: it can be deleted here.
  lock: FileLockEnum.nullable(),
  // Proofs: the order's total.
  amount: CentavosSchema.nullable(),
});
export type StoredFile = z.infer<typeof StoredFileSchema>;

export const StoredFileListSchema = z.object({
  folder: StorageFolderEnum,
  files: z.array(StoredFileSchema),
});
export type StoredFileList = z.infer<typeof StoredFileListSchema>;

// Delete and Download take the ticked files; a locked one in the list refuses the whole call (file_locked).
export const StoredFileIdsInputSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(500),
});
export type StoredFileIdsInput = z.infer<typeof StoredFileIdsInputSchema>;

// A zip of the ticked files; the link works for 24 hours.
export const FilesDownloadSchema = z.object({
  fileName: z.string().min(1),
  url: z.string().min(1),
  files: z.number().int().min(1),
});
export type FilesDownload = z.infer<typeof FilesDownloadSchema>;

export const CreateExportInputSchema = z.object({
  range: ExportRangeEnum,
  parts: DataExportSchema.shape.parts.refine((p) => p.orders || p.payments || p.proofs),
});
export type CreateExportInput = z.infer<typeof CreateExportInputSchema>;
