// Owner Home (decisions T69 to T71): today's numbers, how today compares with a usual day, what sells, how
// customers order and pay, and the 7 or 30 day trend that replaces the Insights page for launch. Every
// number is worked out from orders, the stamp history and the menu; nothing here is stored (H14).
import { z } from 'zod';
import {
  CentavosSchema,
  ClockSchema,
  IdSchema,
  IsoDateSchema,
  IsoDateTimeSchema,
  MediaRefSchema,
} from './common.js';
import {
  HomeRangeEnum,
  OrderTypeEnum,
  PaceVerdictEnum,
  PaymentMethodEnum,
  SetupStepEnum,
} from './enums.js';

const CountSchema = z.number().int().min(0);
// A median of whole counts can end in .5, so usual order counts are plain numbers.
const UsualCountSchema = z.number().min(0);

// Today's money (H2 to H4): sales leave out cancelled and expired orders, like the Orders list footer.
export const HomeTodaySchema = z.object({
  sales: CentavosSchema,
  orders: CountSchema,
  // Paid so far, and the part still to collect (cash and COD not paid yet). They add up to sales.
  collected: CentavosSchema,
  toCollect: CentavosSchema,
  // Null below HOME_AVERAGE_MIN_ORDERS orders, so one big order doesn't look like a trend.
  average: CentavosSchema.nullable(),
});
export type HomeToday = z.infer<typeof HomeTodaySchema>;

// Against a usual day of the same weekday (H5, H6). Everything is null until enough of those days had orders.
export const HomePaceSchema = z.object({
  verdict: PaceVerdictEnum.nullable(),
  // The middle value of the last 4 same weekdays, added up to this minute, and the whole day.
  usualByNow: CentavosSchema.nullable(),
  usualDay: CentavosSchema.nullable(),
  // When a usual day's first order comes in (Manila clock), for an empty morning.
  usualFirstOrder: ClockSchema.nullable(),
  // How many of the last 4 same weekdays had orders.
  daysUsed: z.number().int().min(0).max(4),
});
export type HomePace = z.infer<typeof HomePaceSchema>;

// One bar of Hour by hour (H7): the day's sales and orders in that hour, and a usual day's.
export const HomeHourSchema = z.object({
  hour: z.number().int().min(0).max(23),
  sales: CentavosSchema,
  orders: CountSchema,
  usualSales: CentavosSchema,
  usualOrders: UsualCountSchema,
});
export type HomeHour = z.infer<typeof HomeHourSchema>;

// One best seller (H9): how many were sold and for how much, variants grouped under their item.
export const HomeBestSellerSchema = z.object({
  itemId: IdSchema,
  name: z.string().min(1),
  photo: MediaRefSchema.nullable(),
  qty: z.number().int().positive(),
  sales: CentavosSchema,
  soldOut: z.boolean(),
});
export type HomeBestSeller = z.infer<typeof HomeBestSellerSchema>;

export const HomeTypeMixSchema = z.object({
  type: OrderTypeEnum,
  orders: CountSchema,
  sales: CentavosSchema,
});
export type HomeTypeMix = z.infer<typeof HomeTypeMixSchema>;
export const HomeMethodMixSchema = z.object({
  method: PaymentMethodEnum,
  orders: CountSchema,
  sales: CentavosSchema,
});
export type HomeMethodMix = z.infer<typeof HomeMethodMixSchema>;

// Members today (H11): the same numbers the Members page shows, so the two always agree.
export const HomeMembersSchema = z.object({
  cardOn: z.boolean(),
  joined: CountSchema,
  stamps: CountSchema,
  rewardsUsed: CountSchema,
  ready: CountSchema,
  prizesToGive: CountSchema,
  // Share of today's sales from members, 0 to 100.
  memberShare: z.number().int().min(0).max(100),
});
export type HomeMembers = z.infer<typeof HomeMembersSchema>;

// Bookings for one of the next 7 days.
export const HomeBookingDaySchema = z.object({
  date: IsoDateSchema,
  orders: CountSchema,
  sales: CentavosSchema,
});
export type HomeBookingDay = z.infer<typeof HomeBookingDaySchema>;

export const HomeSetupStepSchema = z.object({ step: SetupStepEnum, done: z.boolean() });
export type HomeSetupStepState = z.infer<typeof HomeSetupStepSchema>;

export const HomeSoldOutSchema = z.object({ itemId: IdSchema, name: z.string().min(1) });
export type HomeSoldOut = z.infer<typeof HomeSoldOutSchema>;

// The last 7 days, oldest first and today last, for the small lines under each tile.
export const HomeSparksSchema = z.object({
  sales: z.array(CentavosSchema).length(7),
  orders: z.array(CountSchema).length(7),
  average: z.array(CentavosSchema).length(7),
  joined: z.array(CountSchema).length(7),
});
export type HomeSparks = z.infer<typeof HomeSparksSchema>;

export const HomeSummarySchema = z.object({
  asOf: IsoDateTimeSchema,
  businessDate: IsoDateSchema,
  // False when the shop is closed all day today (no hours, or a closure).
  openToday: z.boolean(),
  // The day Hour by hour describes: today, or the last day with orders while the shop is closed today.
  hoursDate: IsoDateSchema,
  today: HomeTodaySchema,
  pace: HomePaceSchema,
  hours: z.array(HomeHourSchema),
  best: z.object({
    today: z.array(HomeBestSellerSchema).max(5),
    week: z.array(HomeBestSellerSchema).max(5),
  }),
  // Active items with no sale in the last 14 days (items added in that time don't count).
  idleItems: CountSchema,
  mix: z.object({ types: z.array(HomeTypeMixSchema), methods: z.array(HomeMethodMixSchema) }),
  members: HomeMembersSchema,
  comingUp: z.array(HomeBookingDaySchema).length(7),
  // Bookings due tomorrow that need notice (cakes), for "Needs you".
  noticeTomorrow: CountSchema,
  soldOut: z.array(HomeSoldOutSchema),
  sparks: HomeSparksSchema,
  // Null once every step is done; the checklist then goes away for good.
  setup: z.array(HomeSetupStepSchema).nullable(),
  // Days with at least one order, so new shops get friendly empty charts.
  daysWithOrders: CountSchema,
});
export type HomeSummary = z.infer<typeof HomeSummarySchema>;

export const HomeTrendDaySchema = z.object({
  date: IsoDateSchema,
  sales: CentavosSchema,
  orders: CountSchema,
  joined: CountSchema,
});
export type HomeTrendDay = z.infer<typeof HomeTrendDaySchema>;

export const HomeTrendTotalsSchema = z.object({
  sales: CentavosSchema,
  orders: CountSchema,
  joined: CountSchema,
});
export type HomeTrendTotals = z.infer<typeof HomeTrendTotalsSchema>;

// The 7 or 30 days ending today against the same number of days before (H12), and busy hours (H13).
export const HomeTrendsSchema = z.object({
  range: HomeRangeEnum,
  days: z.array(HomeTrendDaySchema),
  before: z.array(HomeTrendDaySchema),
  totals: HomeTrendTotalsSchema,
  totalsBefore: HomeTrendTotalsSchema,
  bestDay: HomeTrendDaySchema.nullable(),
  // heat[weekday 0 = Sunday][hour] = average orders in that hour over the last 4 weeks.
  heat: z.array(z.array(z.number().min(0)).length(24)).length(7),
  // Days with orders in those 4 weeks; the map shows from HEAT_MIN_DAYS.
  heatDays: z.number().int().min(0).max(28),
});
export type HomeTrends = z.infer<typeof HomeTrendsSchema>;
