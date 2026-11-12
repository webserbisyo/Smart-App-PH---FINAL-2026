import { z } from 'zod';
import { ShopKindEnum } from './demo-shop.js';
import {
  CentavosSchema,
  ClockSchema,
  IdSchema,
  IsoDateSchema,
  IsoDateTimeSchema,
  LatLngSchema,
  MediaRefSchema,
} from './common.js';
import {
  AnnouncementToneEnum,
  BannerLinkKindEnum,
  OrderTypeEnum,
  PaymentMethodEnum,
  PhBankEnum,
  FontPairEnum,
  LogoShapeEnum,
  ShopSurfaceEnum,
  SlotLengthSchema,
  StampCardStatusEnum,
  WeekdaySchema,
} from './enums.js';
import { CatalogSchema } from './catalog.js';
import { RewardSchema, StampRuleSchema } from './loyalty.js';

export const ShopContactSchema = z.object({
  phone: z.string().min(1).nullable(),
  messengerUsername: z.string().min(1).nullable(),
  facebookUrl: z.url().nullable(),
  googleReviewUrl: z.url().nullable(),
  address: z.string().min(1).nullable(),
  showAddress: z.boolean(),
  pin: LatLngSchema.nullable(),
  pickupNote: z.string().max(200).nullable(),
});
export type ShopContact = z.infer<typeof ShopContactSchema>;

export const ShopInfoSchema = z.object({
  name: z.string().min(1).max(60),
  tagline: z.string().max(80).nullable(),
  about: z.string().max(600).nullable(),
  kind: ShopKindEnum,
  isDemo: z.boolean(),
  logo: MediaRefSchema.nullable(),
  contact: ShopContactSchema,
});
export type ShopInfo = z.infer<typeof ShopInfoSchema>;

export const BannerLinkSchema = z.object({
  kind: BannerLinkKindEnum,
  // The item or category id; null for Rewards.
  targetId: IdSchema.nullable(),
});
export type BannerLink = z.infer<typeof BannerLinkSchema>;

// A photo, with optional words and one in-shop button over it (decision R42). Photo-only banners stay valid.
export const BannerSchema = z.object({
  ref: MediaRefSchema,
  alt: z.string().min(1).max(120),
  title: z.string().min(1).max(40).optional(),
  description: z.string().min(1).max(90).optional(),
  link: BannerLinkSchema.optional(),
});
export type Banner = z.infer<typeof BannerSchema>;

export const AnnouncementSchema = z.object({
  text: z.string().min(1).max(200),
  tone: AnnouncementToneEnum,
  endsAt: IsoDateTimeSchema.nullable(),
});
export type Announcement = z.infer<typeof AnnouncementSchema>;

export const SectionSwitchesSchema = z.object({
  banners: z.boolean(),
  announcement: z.boolean(),
  rewards: z.boolean(),
  favourites: z.boolean(),
  categories: z.boolean(),
  bestSellers: z.boolean(),
  about: z.boolean(),
  hours: z.boolean(),
  contact: z.boolean(),
  membersCount: z.boolean(),
});
export type SectionSwitches = z.infer<typeof SectionSwitchesSchema>;

export const ShopLookSchema = z.object({
  brandColor: z.string().regex(/^#[0-9a-f]{6}$/i),
  // Light or dark page (decision R2). With a page colour the Editor sets it from that colour (T76 C4).
  surface: ShopSurfaceEnum.default('light'),
  // Optional page colour for the 60 (decisions R52, T76); null keeps the neutral page.
  pageColor: z
    .string()
    .regex(/^#[0-9a-f]{6}$/i)
    .nullable()
    .default(null),
  // Optional card colour for the 30 (T76 C3); null lets the cards follow the page.
  cardColor: z
    .string()
    .regex(/^#[0-9a-f]{6}$/i)
    .nullable()
    .default(null),
  // The logo's frame (T76 C7).
  logoShape: LogoShapeEnum.default('circle'),
  // One font pair for the whole shop (decision T79).
  fontPair: FontPairEnum.default('malinaw'),
  banners: z.array(BannerSchema).max(3),
  bannerSeconds: z.number().int().min(3).max(10).default(5),
  announcement: AnnouncementSchema.nullable(),
  sections: SectionSwitchesSchema,
});
export type ShopLook = z.infer<typeof ShopLookSchema>;

// One opening range in Manila time; a day may have several. close > open.
export const OpeningRangeSchema = z
  .object({ day: WeekdaySchema, open: ClockSchema, close: ClockSchema })
  .refine((r) => r.close > r.open, { message: 'Closing time must be after opening time' });
export type OpeningRange = z.infer<typeof OpeningRangeSchema>;

export const ClosureSchema = z.object({
  date: IsoDateSchema,
  reason: z.string().max(80).nullable(),
});
export type Closure = z.infer<typeof ClosureSchema>;

// Busy = paused until a time; paused = not taking orders until the owner resumes.
export const ShopPauseSchema = z.object({
  busyUntil: IsoDateTimeSchema.nullable(),
  paused: z.boolean(),
});
export type ShopPause = z.infer<typeof ShopPauseSchema>;

// A shop may keep up to 3 bank accounts (T84); every other way to pay is one account.
export const BANK_ACCOUNTS_MAX = 3;

export const PaymentAccountSchema = z.object({
  // Stays the same when the account is edited, so orders and Home know which account was paid.
  id: z.string().min(1).max(40),
  method: PaymentMethodEnum,
  // Bank transfers only: which bank (T84). Null for every other way to pay.
  bank: PhBankEnum.nullable(),
  // Transfers: account name and number, optional QR. Cash and COD: both null.
  accountName: z.string().min(1).max(80).nullable(),
  accountNumber: z.string().min(1).max(40).nullable(),
  qr: MediaRefSchema.nullable(),
  // Demo accounts are clearly fake and say so.
  sample: z.boolean(),
});
export type PaymentAccount = z.infer<typeof PaymentAccountSchema>;

/** The shop's ways to pay: ids unique, one account per way except banks (up to 3), each bank named. */
export const PaymentAccountsSchema = z
  .array(PaymentAccountSchema)
  .min(1)
  .superRefine((list, ctx) => {
    const ids = new Set<string>();
    const perMethod = new Map<string, number>();
    list.forEach((a, index) => {
      if (ids.has(a.id))
        ctx.addIssue({ code: 'custom', message: 'duplicate_account', path: [index, 'id'] });
      ids.add(a.id);
      perMethod.set(a.method, (perMethod.get(a.method) ?? 0) + 1);
      if ((a.method === 'bank') !== (a.bank !== null))
        ctx.addIssue({ code: 'custom', message: 'bank_required', path: [index, 'bank'] });
    });
    for (const [method, count] of perMethod) {
      if (count > (method === 'bank' ? BANK_ACCOUNTS_MAX : 1))
        ctx.addIssue({ code: 'custom', message: 'too_many_accounts', path: [] });
    }
  });

export const DistanceRowSchema = z
  .object({
    fromKm: z.number().min(0),
    toKm: z.number().positive(),
    fee: CentavosSchema,
    etaText: z.string().min(1).max(40),
    minOrder: CentavosSchema,
  })
  .refine((r) => r.toKm > r.fromKm, { message: 'toKm must be greater than fromKm' });
export type DistanceRow = z.infer<typeof DistanceRowSchema>;

export const DeliveryZoneSchema = z.object({
  id: IdSchema,
  name: z.string().min(1).max(60),
  fee: CentavosSchema,
  etaText: z.string().min(1).max(40),
});
export type DeliveryZone = z.infer<typeof DeliveryZoneSchema>;

export const DeliverySettingsSchema = z.object({
  distance: z.array(DistanceRowSchema).max(5),
  zones: z.array(DeliveryZoneSchema).max(20),
  freeDeliveryFrom: CentavosSchema.nullable(),
});
export type DeliverySettings = z.infer<typeof DeliverySettingsSchema>;

// The public part of the stamp card.
export const PublicStampCardSchema = z.object({
  status: StampCardStatusEnum,
  rule: StampRuleSchema,
  reward: RewardSchema,
});
export type PublicStampCard = z.infer<typeof PublicStampCardSchema>;

export const StorefrontSchema = z.object({
  slug: z.string().min(1).max(40),
  info: ShopInfoSchema,
  look: ShopLookSchema,
  hours: z.array(OpeningRangeSchema),
  closures: z.array(ClosureSchema),
  pause: ShopPauseSchema,
  orderTypes: z.array(OrderTypeEnum).min(1),
  prepMinutes: z.number().int().min(5).max(180).default(20),
  takeOrdersWhileClosed: z.boolean(),
  // New shops take orders up to 3 days ahead (T83); the owner changes it in Booking rules.
  daysAhead: z.number().int().min(1).max(60).default(3),
  slotMinutes: SlotLengthSchema.default(30),
  ordersPerSlot: z.number().int().min(1).max(50).nullable().default(null),
  payments: PaymentAccountsSchema,
  codMaxTotal: CentavosSchema.nullable(),
  delivery: DeliverySettingsSchema,
  stampCard: PublicStampCardSchema,
  membersCount: z.number().int().min(0),
});
export type Storefront = z.infer<typeof StorefrontSchema>;

// Booking rules that the owner reads and saves (T48).
export const BookingRulesSchema = z.object({
  daysAhead: z.number().int().min(1).max(60),
  slotMinutes: SlotLengthSchema,
  ordersPerSlot: z.number().int().min(1).max(50).nullable(),
  prepMinutes: z.number().int().min(5).max(180),
  takeOrdersWhileClosed: z.boolean(),
});
export type BookingRules = z.infer<typeof BookingRulesSchema>;

// What the storefront reads for one shop: the public shop and what it sells.
export const PublicShopSchema = z.object({
  storefront: StorefrontSchema,
  catalog: CatalogSchema,
});
export type PublicShop = z.infer<typeof PublicShopSchema>;
