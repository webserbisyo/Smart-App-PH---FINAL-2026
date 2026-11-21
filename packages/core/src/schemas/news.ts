// Push News (decision T106): the owner's news to customers' phones, the two automatic pushes and the
// customer's own news choice. Closed lists are `as const` arrays plus a Zod enum, mirrored by CHECKs in
// the push_campaigns migration (rule 5).
import { z } from 'zod';
import { CentavosSchema, IdSchema, IsoDateTimeSchema } from './common.js';
import { MEMBER_SEGMENTS } from './enums.js';

export const NEWS_TITLE_MAX = 40;
export const NEWS_BODY_MAX = 120;
// At most 2 news in any 7 days and 1 a day per shop (P5).
export const NEWS_WEEK_LIMIT = 2;
export const NEWS_DAY_LIMIT = 1;
// Nothing sends from 9 PM to 8 AM Manila time (P5); news set inside it moves to 8 AM.
export const NEWS_QUIET_FROM = '21:00';
export const NEWS_QUIET_UNTIL = '08:00';
// The customer's inbox shows the last 30 days.
export const NEWS_INBOX_DAYS = 30;

// Who gets it: every phone with news on, members only, or one of the member groups (T57).
export const NEWS_AUDIENCES = ['everyone', 'members', ...MEMBER_SEGMENTS] as const;
export const NewsAudienceEnum = z.enum(NEWS_AUDIENCES);
export type NewsAudience = z.infer<typeof NewsAudienceEnum>;

// draft → scheduled → sending → sent; waiting when the link broke, the plan lapsed or the shop is paused.
export const NEWS_STATUSES = [
  'draft',
  'scheduled',
  'sending',
  'sent',
  'waiting',
  'canceled',
] as const;
export const NewsStatusEnum = z.enum(NEWS_STATUSES);
export type NewsStatus = z.infer<typeof NewsStatusEnum>;

export const NEWS_WAIT_REASONS = ['link_gone', 'plan_lapsed', 'shop_paused'] as const;
export const NewsWaitReasonEnum = z.enum(NEWS_WAIT_REASONS);
export type NewsWaitReason = z.infer<typeof NewsWaitReasonEnum>;

// Where a tap opens: links stay inside the shop (sameOriginPath in sw.ts).
export const NEWS_LINK_KINDS = ['home', 'item', 'rewards'] as const;
export const NewsLinkKindEnum = z.enum(NEWS_LINK_KINDS);
export type NewsLinkKind = z.infer<typeof NewsLinkKindEnum>;

// "What's it about?" starters: each one carries something real (no empty "we miss you").
export const NEWS_STARTERS = ['item', 'open', 'deal', 'ready', 'almost', 'own'] as const;
export const NewsStarterEnum = z.enum(NEWS_STARTERS);
export type NewsStarter = z.infer<typeof NewsStarterEnum>;

export const NewsLinkSchema = z.object({
  kind: NewsLinkKindEnum,
  // Set for an item link only; null after the item is deleted (the news then waits, P13).
  itemId: IdSchema.nullable(),
});
export type NewsLink = z.infer<typeof NewsLinkSchema>;

export const NewsResultsSchema = z.object({
  // Phones the push service took it for, split by phone kind for the preview and the stats.
  sent: z.number().int().min(0),
  android: z.number().int().min(0),
  ios: z.number().int().min(0),
  opened: z.number().int().min(0),
  // Orders within 24 hours of opening it, and their total.
  ordered: z.number().int().min(0),
  sales: CentavosSchema,
  stopped: z.number().int().min(0),
});
export type NewsResults = z.infer<typeof NewsResultsSchema>;

export const OwnerNewsSchema = z.object({
  id: IdSchema,
  title: z.string().min(1).max(NEWS_TITLE_MAX),
  body: z.string().max(NEWS_BODY_MAX),
  imageUrl: z.string().min(1).nullable(),
  link: NewsLinkSchema,
  // The linked item's name for the list and preview (null when not an item or deleted).
  itemName: z.string().nullable(),
  audience: NewsAudienceEnum,
  status: NewsStatusEnum,
  waitReason: NewsWaitReasonEnum.nullable(),
  // When it is due (scheduled) or was due; null for a draft with no time yet.
  sendAt: IsoDateTimeSchema.nullable(),
  sentAt: IsoDateTimeSchema.nullable(),
  updatedAt: IsoDateTimeSchema,
  // Phones in the audience now (before sending) or when it went out.
  phones: z.number().int().min(0),
  // How far a send is (sending only).
  progress: z.number().int().min(0).nullable(),
  results: NewsResultsSchema.nullable(),
  copiedFromId: IdSchema.nullable(),
});
export type OwnerNews = z.infer<typeof OwnerNewsSchema>;

export const NewsAudienceCountSchema = z.object({
  audience: NewsAudienceEnum,
  phones: z.number().int().min(0),
});
export type NewsAudienceCount = z.infer<typeof NewsAudienceCountSchema>;

export const PushSettingsSchema = z.object({
  stampAdded: z.boolean(),
  rewardReady: z.boolean(),
});
export type PushSettings = z.infer<typeof PushSettingsSchema>;

export const NewsOverviewSchema = z.object({
  phones: z.number().int().min(0),
  memberPhones: z.number().int().min(0),
  guestPhones: z.number().int().min(0),
  newThisWeek: z.number().int().min(0),
  // News sent or scheduled in the 7 days that count, and when the next one frees up.
  weekUsed: z.number().int().min(0),
  nextFreeAt: IsoDateTimeSchema.nullable(),
  // A news already went (or is set) today, so the next one waits for tomorrow.
  dayUsed: z.boolean(),
  last30: z.object({
    news: z.number().int().min(0),
    ordered: z.number().int().min(0),
    sales: CentavosSchema,
  }),
  audiences: z.array(NewsAudienceCountSchema),
  auto: PushSettingsSchema,
  // The shop's own busiest hours on Home, as "HH:MM" Manila clocks, best first.
  bestTimes: z.array(z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)).max(3),
  news: z.array(OwnerNewsSchema),
});
export type NewsOverview = z.infer<typeof NewsOverviewSchema>;

export const SaveNewsInputSchema = z.object({
  // Set when editing a draft, a scheduled or a waiting news.
  id: IdSchema.nullable(),
  title: z.string().trim().min(1).max(NEWS_TITLE_MAX),
  body: z.string().trim().max(NEWS_BODY_MAX),
  imageUrl: z.string().min(1).nullable(),
  link: NewsLinkSchema,
  audience: NewsAudienceEnum,
  // draft: keep it. now: send in the next minute. later: at sendAt.
  mode: z.enum(['draft', 'now', 'later']),
  sendAt: IsoDateTimeSchema.nullable(),
  copiedFromId: IdSchema.nullable(),
});
export type SaveNewsInput = z.infer<typeof SaveNewsInputSchema>;

export const NewsTestInputSchema = z.object({
  title: z.string().trim().min(1).max(NEWS_TITLE_MAX),
  body: z.string().trim().max(NEWS_BODY_MAX),
  imageUrl: z.string().min(1).nullable(),
});
export type NewsTestInput = z.infer<typeof NewsTestInputSchema>;

// One news in the customer's inbox (Account › News from the shop); reads sent news of the last 30 days.
export const ShopNewsItemSchema = z.object({
  id: IdSchema,
  title: z.string().min(1).max(NEWS_TITLE_MAX),
  body: z.string().max(NEWS_BODY_MAX),
  imageUrl: z.string().min(1).nullable(),
  // A path on the shop's own address, like "/kanto-smash/menu?item=…".
  path: z.string().startsWith('/'),
  sentAt: IsoDateTimeSchema,
});
export type ShopNewsItem = z.infer<typeof ShopNewsItemSchema>;
