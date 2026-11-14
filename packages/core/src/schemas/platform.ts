// Super Admin, sign-up and Meta tracking (decisions T88 to T92). The founder's own area: every shop, lead,
// plan payment and tracking event in one place, so nothing needs SQL. Shops and payments here come from
// NestJS for the platform admin only; another person gets Not found (rule 12).
import { z } from 'zod';
import { ShopKindEnum } from './demo-shop.js';
import { CentavosSchema, IdSchema, IsoDateSchema, IsoDateTimeSchema } from './common.js';
import {
  AdminFlagEnum,
  AdminNeedKindEnum,
  AdminPaymentViewEnum,
  AdminShopFilterEnum,
  BrowserTrackEventEnum,
  CloseReasonEnum,
  CloseWhenEnum,
  PlanMonthsSchema,
  PlanPaidViaEnum,
  PlanRejectReasonEnum,
  PlanStatusEnum,
  ShopActivityKindEnum,
  ShopStageEnum,
  SignupChannelEnum,
  SupportReasonEnum,
  TrackEventNameEnum,
  TrackStatusEnum,
  TrackViaEnum,
} from './enums.js';
import { BillingMessageSchema, PlanPaymentSchema, PlanPayToSchema } from './settings.js';

const NameSchema = z.string().trim().min(2).max(80);
const EmailSchema = z.string().trim().toLowerCase().pipe(z.email().max(254));
// A Philippine mobile, stored as +639XXXXXXXXX (rules/phone.ts makes it).
export const PhMobileSchema = z.string().regex(/^\+639\d{9}$/);
// Meta's browser and click ids, never hashed (T90): fb.<n>.<ms>.<value>.
const FbIdSchema = z
  .string()
  .regex(/^fb\.\d\.\d{10,14}\.[\w-]{1,500}$/)
  .nullable();

// ---------- where a sign-up came from ----------

export const SignupSourceSchema = z.object({
  channel: SignupChannelEnum,
  // utm_campaign, then utm_content: the ad's name as the founder typed it in Ads Manager.
  campaign: z.string().max(100).nullable(),
});
export type SignupSource = z.infer<typeof SignupSourceSchema>;

// ---------- sign-up (public) ----------

// Step 1 "You" (T89). Saved as a lead the moment the person taps Continue, before any account exists.
export const SignupLeadInputSchema = z.object({
  fullName: NameSchema,
  email: EmailSchema,
  phone: PhMobileSchema,
  // The terms and privacy notice were shown and accepted (version kept for the record).
  termsVersion: z.string().min(1).max(20),
  source: SignupSourceSchema,
  // The same id the browser pixel used, so Meta counts the Lead once (T90).
  eventId: z.string().min(8).max(80),
  fbp: FbIdSchema,
  fbc: FbIdSchema,
  pageUrl: z.url().max(500),
});
export type SignupLeadInput = z.infer<typeof SignupLeadInputSchema>;

export const SignupLeadResultSchema = z.object({ leadId: IdSchema });
export type SignupLeadResult = z.infer<typeof SignupLeadResultSchema>;

// Step 2 "Your shop".
export const SignupShopInputSchema = z.object({
  shopName: z.string().trim().min(2).max(60),
  kind: ShopKindEnum,
  city: z.string().trim().min(2).max(60),
  // Optional: the shop's Facebook page, so the founder can look it up before approving.
  facebookPage: z
    .string()
    .trim()
    .max(200)
    .transform((v) => (v === '' ? null : v))
    .nullable(),
});
export type SignupShopInput = z.infer<typeof SignupShopInputSchema>;

// After the email code: the shop is made for the new account (owner's login, T34) and Meta hears
// CompleteRegistration with the same id as the browser.
export const RegisterShopInputSchema = z.object({
  leadId: IdSchema.nullable(),
  shop: SignupShopInputSchema,
  eventId: z.string().min(8).max(80),
  fbp: FbIdSchema,
  fbc: FbIdSchema,
  pageUrl: z.url().max(500),
});
export type RegisterShopInput = z.infer<typeof RegisterShopInputSchema>;

// A browser event the sign-up page reports to the server, so the server can send it too (T90).
export const TrackInputSchema = z.object({
  name: BrowserTrackEventEnum,
  eventId: z.string().min(8).max(80),
  fbp: FbIdSchema,
  fbc: FbIdSchema,
  pageUrl: z.url().max(500),
  source: SignupSourceSchema,
});
export type TrackInput = z.infer<typeof TrackInputSchema>;

// ---------- the owner's side of going live ----------

export const OnboardingStepSchema = z.object({
  step: z.enum(['items', 'look', 'hours', 'payments']),
  done: z.boolean(),
});
export type OnboardingStep = z.infer<typeof OnboardingStepSchema>;

export const OwnerOnboardingSchema = z.object({
  stage: ShopStageEnum,
  askedAt: IsoDateTimeSchema.nullable(),
  liveAt: IsoDateTimeSchema.nullable(),
  // The four things a shop needs before the founder looks at it.
  steps: z.array(OnboardingStepSchema),
  // The founder is helping (help mode) right now.
  helpedNow: z.boolean(),
});
export type OwnerOnboarding = z.infer<typeof OwnerOnboardingSchema>;

// ---------- Super Admin: shops ----------

export const AdminShopRowSchema = z.object({
  id: IdSchema,
  slug: z.string().min(1).max(64),
  name: z.string().min(1).max(60),
  kind: ShopKindEnum,
  city: z.string().max(60),
  ownerName: z.string().min(1).max(80),
  ownerEmail: z.email(),
  ownerPhone: PhMobileSchema,
  stage: ShopStageEnum,
  // null until the shop is live (the trial starts at approval, T89).
  planStatus: PlanStatusEnum.nullable(),
  trialEndsAt: IsoDateTimeSchema.nullable(),
  paidUntil: IsoDateSchema.nullable(),
  graceUntil: IsoDateSchema.nullable(),
  // The price this shop signed up at; a later price change never touches it (T92).
  priceMonthly: CentavosSchema,
  storageUsedBytes: z.number().int().min(0),
  storageLimitBytes: z.number().int().positive(),
  orders7d: z.number().int().min(0),
  members: z.number().int().min(0),
  lastActiveAt: IsoDateTimeSchema.nullable(),
  createdAt: IsoDateTimeSchema,
  askedAt: IsoDateTimeSchema.nullable(),
  liveAt: IsoDateTimeSchema.nullable(),
  closedAt: IsoDateTimeSchema.nullable(),
  // Closing at the end of the paid days (T88): the day the link turns off.
  closesOn: IsoDateSchema.nullable(),
  source: SignupSourceSchema,
  flags: z.array(AdminFlagEnum),
  // A plan payment waiting for the founder.
  pending: PlanPaymentSchema.nullable(),
  // How many of the 4 go-live steps are done.
  setupDone: z.number().int().min(0).max(4),
  // The 5 demo shops have full demo data; help mode can open them (mock only).
  hasDemoData: z.boolean(),
});
export type AdminShopRow = z.infer<typeof AdminShopRowSchema>;

export const ShopActivitySchema = z.object({
  id: IdSchema,
  at: IsoDateTimeSchema,
  kind: ShopActivityKindEnum,
  by: z.enum(['owner', 'admin', 'system']),
  amount: CentavosSchema.nullable(),
  days: z.number().int().positive().nullable(),
  minutes: z.number().int().positive().nullable(),
  reason: z.string().max(40).nullable(),
  note: z.string().max(300).nullable(),
  // The Meta events this step sent (T90).
  events: z.array(TrackEventNameEnum),
});
export type ShopActivity = z.infer<typeof ShopActivitySchema>;

export const AdminShopDetailSchema = AdminShopRowSchema.extend({
  facebookPage: z.string().max(200).nullable(),
  steps: z.array(OnboardingStepSchema),
  closeReason: CloseReasonEnum.nullable(),
  payments: z.array(PlanPaymentSchema),
  thread: z.array(BillingMessageSchema),
  activity: z.array(ShopActivitySchema),
  remindedAt: IsoDateTimeSchema.nullable(),
});
export type AdminShopDetail = z.infer<typeof AdminShopDetailSchema>;

export const ListAdminShopsInputSchema = z.object({
  filter: AdminShopFilterEnum,
  q: z.string().trim().max(60).default(''),
});
export type ListAdminShopsInput = z.input<typeof ListAdminShopsInputSchema>;

export const AdminShopListSchema = z.object({
  rows: z.array(AdminShopRowSchema),
  // How many shops each chip holds (before the search).
  counts: z.record(AdminShopFilterEnum, z.number().int().min(0)),
});
export type AdminShopList = z.infer<typeof AdminShopListSchema>;

// ---------- leads: people who stopped after step 1 ----------

export const AdminLeadSchema = z.object({
  id: IdSchema,
  fullName: z.string().min(1).max(80),
  email: z.email(),
  phone: PhMobileSchema,
  createdAt: IsoDateTimeSchema,
  source: SignupSourceSchema,
  contactedAt: IsoDateTimeSchema.nullable(),
});
export type AdminLead = z.infer<typeof AdminLeadSchema>;

// ---------- actions ----------

export const ShopIdInputSchema = z.object({ shopId: IdSchema });
export type ShopIdInput = z.infer<typeof ShopIdInputSchema>;

export const ReviewPlanPaymentInputSchema = z.discriminatedUnion('verdict', [
  z.object({
    shopId: IdSchema,
    paymentId: IdSchema,
    verdict: z.literal('approve'),
    // A different amount than sent needs a reason (T88).
    amount: CentavosSchema.nullable(),
    amountReason: z.string().trim().max(120).nullable(),
  }),
  z.object({
    shopId: IdSchema,
    paymentId: IdSchema,
    verdict: z.literal('reject'),
    reason: PlanRejectReasonEnum,
  }),
]);
export type ReviewPlanPaymentInput = z.infer<typeof ReviewPlanPaymentInputSchema>;

// Money received outside the app (cash, a bank transfer to the founder): same path as Approve (T88).
export const RecordPlanPaymentInputSchema = z.object({
  shopId: IdSchema,
  months: PlanMonthsSchema,
  method: PlanPaidViaEnum,
  reference: z.string().trim().min(4).max(40),
  amount: CentavosSchema,
  note: z.string().trim().max(120).nullable(),
});
export type RecordPlanPaymentInput = z.infer<typeof RecordPlanPaymentInputSchema>;

export const ExtendDaysInputSchema = z.object({
  shopId: IdSchema,
  days: z.number().int().min(1).max(30),
  reason: z.string().trim().min(2).max(120),
});
export type ExtendDaysInput = z.infer<typeof ExtendDaysInputSchema>;

export const CloseShopInputSchema = z.object({
  shopId: IdSchema,
  reason: CloseReasonEnum,
  when: CloseWhenEnum,
  note: z.string().trim().max(120).nullable(),
});
export type CloseShopInput = z.infer<typeof CloseShopInputSchema>;

// Delete forever: only a closed shop, and the founder types its name (T88).
export const DeleteShopInputSchema = z.object({
  shopId: IdSchema,
  confirmName: z.string().trim().min(1).max(60),
});
export type DeleteShopInput = z.infer<typeof DeleteShopInputSchema>;

export const BillingNoteInputSchema = z.object({
  shopId: IdSchema,
  text: z.string().trim().min(1).max(300),
});
export type BillingNoteInput = z.infer<typeof BillingNoteInputSchema>;

// "Create a shop for a client" (T91): for owners who close with the founder on Messenger.
export const CreateClientInputSchema = z.object({
  fullName: NameSchema,
  email: EmailSchema,
  phone: PhMobileSchema,
  shopName: z.string().trim().min(2).max(60),
  kind: ShopKindEnum,
  city: z.string().trim().min(2).max(60),
});
export type CreateClientInput = z.infer<typeof CreateClientInputSchema>;

// ---------- help mode (T91) ----------

export const SUPPORT_MINUTES = 60;

export const StartSupportInputSchema = z.object({ shopId: IdSchema, reason: SupportReasonEnum });
export type StartSupportInput = z.infer<typeof StartSupportInputSchema>;

export const SupportSessionSchema = z.object({
  id: IdSchema,
  shopId: IdSchema,
  slug: z.string().min(1).max(64),
  shopName: z.string().min(1).max(60),
  reason: SupportReasonEnum,
  startedAt: IsoDateTimeSchema,
  endsAt: IsoDateTimeSchema,
});
export type SupportSession = z.infer<typeof SupportSessionSchema>;

// ---------- payments ----------

export const AdminPaymentSchema = PlanPaymentSchema.extend({
  shopId: IdSchema,
  shopName: z.string().min(1).max(60),
  reviewedAt: IsoDateTimeSchema.nullable(),
  // Entered by the founder (Record a payment), not sent by the owner.
  recorded: z.boolean(),
  note: z.string().max(120).nullable(),
});
export type AdminPayment = z.infer<typeof AdminPaymentSchema>;

export const AdminPaymentListSchema = z.object({
  rows: z.array(AdminPaymentSchema),
  toCheck: z.number().int().min(0),
  // Approved money this Manila month.
  monthTotal: CentavosSchema,
});
export type AdminPaymentList = z.infer<typeof AdminPaymentListSchema>;

export const ListAdminPaymentsInputSchema = z.object({ view: AdminPaymentViewEnum });
export type ListAdminPaymentsInput = z.infer<typeof ListAdminPaymentsInputSchema>;

// ---------- Today ----------

export const AdminNeedSchema = z.object({
  kind: AdminNeedKindEnum,
  shopId: IdSchema.nullable(),
  shopName: z.string().max(60).nullable(),
  at: IsoDateTimeSchema,
  amount: CentavosSchema.nullable(),
  months: z.number().int().positive().nullable(),
  // trial_ending / due: days left; overdue: days late; storage: percent used; tracking_failed: how many.
  count: z.number().int().min(0).nullable(),
  // The day it ends (trial, paid until, grace).
  until: IsoDateSchema.nullable(),
  campaign: z.string().max(100).nullable(),
});
export type AdminNeed = z.infer<typeof AdminNeedSchema>;

export const AdminFunnelSchema = z.object({
  visits: z.number().int().min(0),
  leads: z.number().int().min(0),
  signedUp: z.number().int().min(0),
  live: z.number().int().min(0),
  paying: z.number().int().min(0),
});
export type AdminFunnel = z.infer<typeof AdminFunnelSchema>;

export const AdminTodaySchema = z.object({
  needs: z.array(AdminNeedSchema),
  liveShops: z.number().int().min(0),
  payingShops: z.number().int().min(0),
  // Approved plan money this Manila month.
  collectedThisMonth: CentavosSchema,
  // What paying shops bring in a month at their own prices.
  monthlyRunRate: CentavosSchema,
  // The last 30 days.
  funnel: AdminFunnelSchema,
});
export type AdminToday = z.infer<typeof AdminTodaySchema>;

// ---------- tracking (T90) ----------

export const TrackEventSchema = z.object({
  id: IdSchema,
  name: TrackEventNameEnum,
  eventId: z.string().min(1).max(80),
  at: IsoDateTimeSchema,
  via: TrackViaEnum,
  status: TrackStatusEnum,
  // Who it is about, never in full: a shop's name or a masked mobile (0917 ••• 0142).
  subject: z.string().max(80),
  value: CentavosSchema.nullable(),
  // Meta's own error code or our reason for skipping, never a token or a customer's data.
  problem: z.enum(['token_expired', 'rejected', 'timeout', 'no_match_data', 'off']).nullable(),
  test: z.boolean(),
});
export type TrackEvent = z.infer<typeof TrackEventSchema>;

export const TrackingByAdSchema = z.object({
  campaign: z.string().max(100).nullable(),
  leads: z.number().int().min(0),
  signedUp: z.number().int().min(0),
  live: z.number().int().min(0),
  paying: z.number().int().min(0),
});
export type TrackingByAd = z.infer<typeof TrackingByAdSchema>;

export const TrackingSummarySchema = z.object({
  // The pixel id and the access token are set on the server (env), never typed in a screen.
  connected: z.boolean(),
  sending: z.boolean(),
  testMode: z.boolean(),
  lastEventAt: IsoDateTimeSchema.nullable(),
  byAd: z.array(TrackingByAdSchema),
  events: z.array(TrackEventSchema),
  failed: z.number().int().min(0),
});
export type TrackingSummary = z.infer<typeof TrackingSummarySchema>;

// ---------- Setup ----------

export const PlatformSetupSchema = z.object({
  priceMonthly: CentavosSchema.min(100),
  trialDays: z.number().int().min(0).max(60),
  sixMonthBonus: z.boolean(),
  payTo: PlanPayToSchema,
  // m.me link of the founder's Page, shown on the sign-up page.
  messengerUrl: z.url().max(200),
});
export type PlatformSetup = z.infer<typeof PlatformSetupSchema>;

export const LeadIdInputSchema = z.object({ leadId: IdSchema });
export type LeadIdInput = z.infer<typeof LeadIdInputSchema>;

// The two switches on the Tracking page (T90): send to Meta at all, and send as test events.
export const SetTrackingInputSchema = z.object({ sending: z.boolean(), testMode: z.boolean() });
export type SetTrackingInput = z.infer<typeof SetTrackingInputSchema>;
