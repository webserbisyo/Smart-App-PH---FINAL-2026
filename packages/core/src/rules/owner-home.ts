// Owner Home rules H1 to H14 (decisions T69 to T71). Pure functions of orders, the stamp history and the
// menu, so the mock and the API (phase 4) work every number out the same way. Nothing here is stored.
import type {
  HomeNeedKind,
  ItemStatus,
  OrderStatus,
  OrderType,
  PaceVerdict,
  PaymentMethod,
  PaymentStatus,
  SetupStep,
  HomeRange,
} from '../schemas/enums.js';
import { HOME_NEED_KINDS, ORDER_TYPES, PAYMENT_METHODS } from '../schemas/enums.js';
import type {
  HomeBestSeller,
  HomeBookingDay,
  HomeHour,
  HomeMembers,
  HomePace,
  HomeSetupStepState,
  HomeSoldOut,
  HomeSummary,
  HomeTrendDay,
  HomeTrends,
  HomeTrendTotals,
} from '../schemas/owner-home.js';
import type { Storefront } from '../schemas/storefront.js';
import { awaitsTransfer, payWindowOver, statusStage } from './order-rules.js';
import { ticketTime } from './order-timing.js';
import { addDays, clockMinutes, manilaDate, manilaParts, weekdayOf } from './time.js';

// H4: the average order shows from 3 orders.
export const HOME_AVERAGE_MIN_ORDERS = 3;
// H5: a usual day is the middle value of the last 4 same weekdays, when at least 3 had orders.
export const USUAL_WEEKS = 4;
export const USUAL_MIN_DAYS = 3;
// H6: Ahead or Behind past 10% either way.
export const PACE_BAND = 0.1;
// H9: top 5, and items with no sale in 14 days.
export const BEST_LIMIT = 5;
export const IDLE_DAYS = 14;
// H13: the busy-hours map averages 4 weeks and shows from 14 days with orders.
export const HEAT_DAYS = 28;
export const HEAT_MIN_DAYS = 14;
// Needs you: a Ready order waiting this long for its customer.
export const READY_WAIT_MINUTES = 20;
// Needs you shows this many rows, then "Show N more".
export const NEEDS_SHOWN = 4;
// The setup checklist's first step: a few items so the menu doesn't look empty.
export const SETUP_MIN_ITEMS = 5;
export const SPARK_DAYS = 7;
export const COMING_UP_DAYS = 7;
// How far back the summary and the trends read (30 days and the 30 before).
export const HOME_HISTORY_DAYS = 60;

export const RANGE_DAYS: Readonly<Record<HomeRange, number>> = { '7d': 7, '30d': 30 };

interface SaleCheck {
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  expiresAt: string | null;
}

/** H2: an order counts toward sales unless it was cancelled or expired (or its pay window just ended). */
export function countsAsSale(order: SaleCheck, now: string | Date): boolean {
  if (order.status === 'cancelled' || order.status === 'expired') return false;
  return !payWindowOver(order, now);
}

/** The Orders list footer and Home's Sales: one total for one list of orders (H2). */
export function salesTotal(
  orders: readonly (SaleCheck & { total: number })[],
  now: string | Date,
): number {
  return orders.reduce((sum, o) => (countsAsSale(o, now) ? sum + o.total : sum), 0);
}

/** The customer sent a transfer and the proof needs the owner's look ("To check"). */
export function needsProofCheck(
  order: Pick<SaleCheck, 'status' | 'paymentStatus' | 'paymentMethod'>,
): boolean {
  return order.status === 'placed' && awaitsTransfer(order) && order.paymentStatus === 'pending';
}

/** The middle value; the mean of the two middle values for an even count. Null for none. */
export function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const hi = sorted[mid] ?? 0;
  if (sorted.length % 2 === 1) return hi;
  return ((sorted[mid - 1] ?? 0) + hi) / 2;
}

/** H6: Ahead, About usual or Behind. Null before the usual first order when nothing has sold yet. */
export function paceVerdict(sales: number, usualByNow: number | null): PaceVerdict | null {
  if (usualByNow === null) return null;
  // Nothing usually sold yet: a sale already is ahead; none yet waits for the usual first order.
  if (usualByNow <= 0) return sales > 0 ? 'ahead' : null;
  if (sales > usualByNow * (1 + PACE_BAND)) return 'ahead';
  if (sales < usualByNow * (1 - PACE_BAND)) return 'behind';
  return 'about';
}

/** How far today is along a usual day, 0 to 100, for the pace bar. */
export function pacePercent(value: number, usualDay: number | null): number {
  if (!usualDay || usualDay <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((value / usualDay) * 100)));
}

// ---------------------------------------------------------------------------------------------------
// Needs you (H8)

export interface NeedOrder extends SaleCheck {
  id: string;
  type: OrderType;
  dueAt: string;
  startBy: string;
  lastStepAt: string;
  seenAt: string | null;
}

export interface HomeNeed {
  kind: HomeNeedKind;
  count: number;
  // The order to open when there is exactly one, so the row goes straight to it.
  orderId: string | null;
  // Every order in the row, oldest due first, for the names under it.
  orderIds: string[];
}

export interface NeedsInput {
  orders: readonly NeedOrder[];
  now: string | Date;
  prizesToGive: number;
  soldOut: number;
  noticeTomorrow: number;
  // The plan needs paying, or storage is nearly full (from Settings).
  plan: boolean;
  storage: boolean;
}

function orderNeed(kind: HomeNeedKind, orders: readonly NeedOrder[]): HomeNeed {
  const sorted = [...orders].sort((a, b) => a.dueAt.localeCompare(b.dueAt));
  const only = sorted.length === 1 ? sorted[0] : undefined;
  return {
    kind,
    count: sorted.length,
    orderId: only ? only.id : null,
    orderIds: sorted.map((o) => o.id),
  };
}

/** The rows of Needs you, worst first, rows at 0 left out (H8). An order shows in one row only. */
export function homeNeeds(input: NeedsInput): HomeNeed[] {
  const t = new Date(input.now).getTime();
  const live = input.orders.filter(
    (o) => statusStage(o.status) !== null && o.status !== 'completed' && countsAsSale(o, input.now),
  );
  const used = new Set<string>();
  const take = (match: (o: NeedOrder) => boolean): NeedOrder[] => {
    const out = live.filter((o) => !used.has(o.id) && match(o));
    for (const o of out) used.add(o.id);
    return out;
  };
  const toCheck = take(needsProofCheck);
  const late = take((o) => ticketTime(o, input.now).kind === 'late');
  const unseen = take(
    (o) =>
      o.status === 'placed' &&
      o.seenAt === null &&
      new Date(o.startBy).getTime() <= t &&
      !awaitsTransfer(o),
  );
  const waiting = take((o) => {
    const tt = ticketTime(o, input.now);
    return o.status === 'ready' && tt.kind === 'waiting' && tt.minutes >= READY_WAIT_MINUTES;
  });
  const rows: Record<HomeNeedKind, HomeNeed> = {
    to_check: orderNeed('to_check', toCheck),
    late: orderNeed('late', late),
    unseen: orderNeed('unseen', unseen),
    waiting: orderNeed('waiting', waiting),
    prizes: { kind: 'prizes', count: input.prizesToGive, orderId: null, orderIds: [] },
    sold_out: { kind: 'sold_out', count: input.soldOut, orderId: null, orderIds: [] },
    bookings: { kind: 'bookings', count: input.noticeTomorrow, orderId: null, orderIds: [] },
    plan: { kind: 'plan', count: input.plan ? 1 : 0, orderId: null, orderIds: [] },
    storage: { kind: 'storage', count: input.storage ? 1 : 0, orderId: null, orderIds: [] },
  };
  return HOME_NEED_KINDS.map((k) => rows[k]).filter((r) => r.count > 0);
}

// ---------------------------------------------------------------------------------------------------
// The summary and the trends, from counted orders

export interface HomeSaleLine {
  itemId: string;
  name: string;
  qty: number;
  lineTotal: number;
}

/** One counted order (H2), as Home reads it. */
export interface HomeSale {
  placedAt: string;
  total: number;
  type: OrderType;
  method: PaymentMethod;
  paid: boolean;
  member: boolean;
  lines: readonly HomeSaleLine[];
}

/** A booking for a later day that still counts (H2), for Coming up. */
export interface HomeBooking {
  dueAt: string;
  total: number;
  // An item in it needs days of notice (cakes), for "Needs you" the day before.
  needsNotice: boolean;
}

export interface HomeItem {
  id: string;
  name: string;
  photo: string | null;
  status: ItemStatus;
  isNew: boolean;
  // Null when it was added long ago (demo items), or unknown.
  addedAt: string | null;
  soldOut: boolean;
}

export type HomeHoursInput = Pick<Storefront, 'hours' | 'closures'>;

export interface HomeSummaryInput {
  now: Date;
  storefront: HomeHoursInput;
  // Counted orders of the last HOME_HISTORY_DAYS days, today included, in any order.
  sales: readonly HomeSale[];
  bookings: readonly HomeBooking[];
  items: readonly HomeItem[];
  members: HomeMembers;
  // When each member joined, for the joined spark line.
  joinedAt: readonly string[];
  setup: HomeSetupStepState[] | null;
}

interface DayBucket {
  sales: number;
  orders: number;
  hours: { sales: number; orders: number }[];
  // Minute of the day of each order with its total, sorted, for "added up to this minute".
  minutes: { at: number; total: number }[];
}

function emptyDay(): DayBucket {
  return {
    sales: 0,
    orders: 0,
    hours: Array.from({ length: 24 }, () => ({ sales: 0, orders: 0 })),
    minutes: [],
  };
}

/** Counted orders grouped by Manila business day (H1). */
export function bucketDays(sales: readonly HomeSale[]): Map<string, DayBucket> {
  const days = new Map<string, DayBucket>();
  for (const s of sales) {
    const date = manilaDate(s.placedAt);
    let day = days.get(date);
    if (!day) {
      day = emptyDay();
      days.set(date, day);
    }
    const p = manilaParts(s.placedAt);
    day.sales += s.total;
    day.orders += 1;
    const hour = day.hours[p.hour];
    if (hour) {
      hour.sales += s.total;
      hour.orders += 1;
    }
    day.minutes.push({ at: p.hour * 60 + p.minute, total: s.total });
  }
  for (const day of days.values()) day.minutes.sort((a, b) => a.at - b.at);
  return days;
}

const salesBy = (day: DayBucket, minute: number): number =>
  day.minutes.reduce((sum, m) => (m.at <= minute ? sum + m.total : sum), 0);

const roundCentavos = (n: number): number => Math.round(n);

function clockOf(minute: number): string {
  const m = Math.max(0, Math.min(23 * 60 + 59, Math.round(minute)));
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

/** The last 4 same weekdays that had orders (H5). */
function usualDays(days: Map<string, DayBucket>, date: string): DayBucket[] {
  const out: DayBucket[] = [];
  for (let w = 1; w <= USUAL_WEEKS; w += 1) {
    const day = days.get(addDays(date, -7 * w));
    if (day && day.orders > 0) out.push(day);
  }
  return out;
}

/** H5 and H6: today against a usual day of the same weekday, up to this minute. */
export function homePace(
  days: Map<string, DayBucket>,
  today: string,
  minute: number,
  todaySales: number,
): HomePace {
  const used = usualDays(days, today);
  if (used.length < USUAL_MIN_DAYS) {
    return {
      verdict: null,
      usualByNow: null,
      usualDay: null,
      usualFirstOrder: null,
      daysUsed: used.length,
    };
  }
  const byNow = median(used.map((d) => salesBy(d, minute))) ?? 0;
  const first = median(used.map((d) => d.minutes[0]?.at ?? 0));
  return {
    verdict: paceVerdict(todaySales, byNow),
    usualByNow: roundCentavos(byNow),
    usualDay: roundCentavos(median(used.map((d) => d.sales)) ?? 0),
    usualFirstOrder: first === null ? null : clockOf(first),
    daysUsed: used.length,
  };
}

/** The open hours of a date (H7), as whole hours; an empty list when it has none. */
export function openHoursOf(sf: HomeHoursInput, date: string): number[] {
  if (sf.closures.some((c) => c.date === date)) return [];
  const weekday = weekdayOf(date);
  const set = new Set<number>();
  for (const r of sf.hours) {
    if (r.day !== weekday) continue;
    const from = Math.floor(clockMinutes(r.open) / 60);
    const to = Math.ceil(clockMinutes(r.close) / 60);
    for (let h = from; h < Math.min(24, to); h += 1) set.add(h);
  }
  return [...set].sort((a, b) => a - b);
}

/** H7: one bar per open hour, stretched to any hour that had orders today or on a usual day. */
export function hourBars(
  days: Map<string, DayBucket>,
  date: string,
  sf: HomeHoursInput,
): HomeHour[] {
  const day = days.get(date) ?? emptyDay();
  const used = usualDays(days, date);
  const usable = used.length >= USUAL_MIN_DAYS ? used : [];
  const usual = Array.from({ length: 24 }, (_, h) => ({
    sales: median(usable.map((d) => d.hours[h]?.sales ?? 0)) ?? 0,
    orders: median(usable.map((d) => d.hours[h]?.orders ?? 0)) ?? 0,
  }));
  const hours = new Set(openHoursOf(sf, date));
  for (let h = 0; h < 24; h += 1) {
    if ((day.hours[h]?.orders ?? 0) > 0 || (usual[h]?.orders ?? 0) > 0) hours.add(h);
  }
  if (hours.size === 0) return [];
  const list = [...hours].sort((a, b) => a - b);
  const from = list[0] ?? 0;
  const to = list[list.length - 1] ?? 0;
  const out: HomeHour[] = [];
  for (let h = from; h <= to; h += 1) {
    out.push({
      hour: h,
      sales: day.hours[h]?.sales ?? 0,
      orders: day.hours[h]?.orders ?? 0,
      usualSales: roundCentavos(usual[h]?.sales ?? 0),
      usualOrders: usual[h]?.orders ?? 0,
    });
  }
  return out;
}

/** H9: most sold first, variants under their item, ties by sales. */
export function bestSellers(
  sales: readonly HomeSale[],
  items: readonly HomeItem[],
  limit = BEST_LIMIT,
): HomeBestSeller[] {
  const byId = new Map(items.map((i) => [i.id, i]));
  const totals = new Map<string, { name: string; qty: number; sales: number }>();
  for (const s of sales) {
    for (const l of s.lines) {
      const t = totals.get(l.itemId) ?? { name: l.name, qty: 0, sales: 0 };
      t.qty += l.qty;
      t.sales += l.lineTotal;
      totals.set(l.itemId, t);
    }
  }
  return [...totals.entries()]
    .filter(([, t]) => t.qty > 0)
    .sort(
      (a, b) =>
        b[1].qty - a[1].qty || b[1].sales - a[1].sales || a[1].name.localeCompare(b[1].name),
    )
    .slice(0, limit)
    .map(([itemId, t]) => {
      const item = byId.get(itemId);
      return {
        itemId,
        name: item?.name ?? t.name,
        photo: item?.photo ?? null,
        qty: t.qty,
        sales: t.sales,
        soldOut: item?.soldOut ?? false,
      };
    });
}

/** H9: active items with no sale in 14 days; items marked New or added in that time don't count. */
export function idleItemCount(
  sales: readonly HomeSale[],
  items: readonly HomeItem[],
  now: Date,
): number {
  const since = now.getTime() - IDLE_DAYS * 86_400_000;
  const sold = new Set<string>();
  for (const s of sales) {
    if (new Date(s.placedAt).getTime() <= since) continue;
    for (const l of s.lines) sold.add(l.itemId);
  }
  return items.filter(
    (i) =>
      i.status === 'active' &&
      !i.isNew &&
      !(i.addedAt !== null && new Date(i.addedAt).getTime() > since) &&
      !sold.has(i.id),
  ).length;
}

/** H10: how they ordered and paid, biggest first, kinds at 0 left out. */
export function homeMix(sales: readonly HomeSale[]): HomeSummary['mix'] {
  const types = ORDER_TYPES.map((type) => {
    const list = sales.filter((s) => s.type === type);
    return { type, orders: list.length, sales: list.reduce((n, s) => n + s.total, 0) };
  });
  const methods = PAYMENT_METHODS.map((method) => {
    const list = sales.filter((s) => s.method === method);
    return { method, orders: list.length, sales: list.reduce((n, s) => n + s.total, 0) };
  });
  const keep = <T extends { orders: number; sales: number }>(list: T[]): T[] =>
    list.filter((x) => x.orders > 0).sort((a, b) => b.sales - a.sales || b.orders - a.orders);
  return { types: keep(types), methods: keep(methods) };
}

function countByDate(at: readonly string[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const a of at) {
    const d = manilaDate(a);
    out.set(d, (out.get(d) ?? 0) + 1);
  }
  return out;
}

/** H7: the day Hour by hour shows, today or the last day with orders while the shop is closed today. */
function hoursDateFor(days: Map<string, DayBucket>, today: string, openToday: boolean): string {
  if (openToday || (days.get(today)?.orders ?? 0) > 0) return today;
  for (let i = 1; i <= HOME_HISTORY_DAYS; i += 1) {
    const d = addDays(today, -i);
    if ((days.get(d)?.orders ?? 0) > 0) return d;
  }
  return today;
}

/** Everything on Home except the live board, which comes from the open orders (T69). */
export function buildHomeSummary(input: HomeSummaryInput): HomeSummary {
  const { now } = input;
  const today = manilaDate(now);
  const p = manilaParts(now);
  const minute = p.hour * 60 + p.minute;
  const days = bucketDays(input.sales);
  const todaySales = input.sales.filter((s) => manilaDate(s.placedAt) === today);
  const salesSum = todaySales.reduce((n, s) => n + s.total, 0);
  const collected = todaySales.reduce((n, s) => (s.paid ? n + s.total : n), 0);
  const openToday = openHoursOf(input.storefront, today).length > 0;
  const weekStart = addDays(today, -(SPARK_DAYS - 1));
  const week = input.sales.filter((s) => manilaDate(s.placedAt) >= weekStart);
  const joined = countByDate(input.joinedAt);
  const sparkDates = Array.from({ length: SPARK_DAYS }, (_, i) =>
    addDays(today, i - SPARK_DAYS + 1),
  );
  const tomorrow = addDays(today, 1);
  const comingUp: HomeBookingDay[] = Array.from({ length: COMING_UP_DAYS }, (_, i) => {
    const date = addDays(tomorrow, i);
    const list = input.bookings.filter((b) => manilaDate(b.dueAt) === date);
    return { date, orders: list.length, sales: list.reduce((n, b) => n + b.total, 0) };
  });
  const soldOut: HomeSoldOut[] = input.items
    .filter((i) => i.status === 'active' && i.soldOut)
    .map((i) => ({ itemId: i.id, name: i.name }));
  return {
    asOf: now.toISOString(),
    businessDate: today,
    openToday,
    hoursDate: hoursDateFor(days, today, openToday),
    today: {
      sales: salesSum,
      orders: todaySales.length,
      collected,
      toCollect: salesSum - collected,
      average:
        todaySales.length >= HOME_AVERAGE_MIN_ORDERS
          ? Math.round(salesSum / todaySales.length)
          : null,
    },
    pace: openToday
      ? homePace(days, today, minute, salesSum)
      : { ...homePace(days, today, minute, salesSum), verdict: null },
    hours: hourBars(days, hoursDateFor(days, today, openToday), input.storefront),
    best: {
      today: bestSellers(todaySales, input.items),
      week: bestSellers(week, input.items),
    },
    idleItems: idleItemCount(input.sales, input.items, now),
    mix: homeMix(todaySales),
    members: input.members,
    comingUp,
    noticeTomorrow: input.bookings.filter((b) => b.needsNotice && manilaDate(b.dueAt) === tomorrow)
      .length,
    soldOut,
    sparks: {
      sales: sparkDates.map((d) => days.get(d)?.sales ?? 0),
      orders: sparkDates.map((d) => days.get(d)?.orders ?? 0),
      average: sparkDates.map((d) => {
        const day = days.get(d);
        return day && day.orders > 0 ? Math.round(day.sales / day.orders) : 0;
      }),
      joined: sparkDates.map((d) => joined.get(d) ?? 0),
    },
    setup: input.setup,
    daysWithOrders: [...days.values()].filter((d) => d.orders > 0).length,
  };
}

export interface HomeTrendsInput {
  now: Date;
  range: HomeRange;
  sales: readonly HomeSale[];
  joinedAt: readonly string[];
}

function trendDays(
  days: Map<string, DayBucket>,
  joined: Map<string, number>,
  end: string,
  count: number,
): HomeTrendDay[] {
  return Array.from({ length: count }, (_, i) => {
    const date = addDays(end, i - count + 1);
    const day = days.get(date);
    return {
      date,
      sales: day?.sales ?? 0,
      orders: day?.orders ?? 0,
      joined: joined.get(date) ?? 0,
    };
  });
}

function totalsOf(list: readonly HomeTrendDay[]): HomeTrendTotals {
  return list.reduce(
    (t, d) => ({
      sales: t.sales + d.sales,
      orders: t.orders + d.orders,
      joined: t.joined + d.joined,
    }),
    { sales: 0, orders: 0, joined: 0 },
  );
}

/** H12 and H13: the rolling 7 or 30 days against the days before, and the busy-hours map. */
export function buildHomeTrends(input: HomeTrendsInput): HomeTrends {
  const today = manilaDate(input.now);
  const count = RANGE_DAYS[input.range];
  const days = bucketDays(input.sales);
  const joined = countByDate(input.joinedAt);
  const recent = trendDays(days, joined, today, count);
  const before = trendDays(days, joined, addDays(today, -count), count);
  const best = recent.reduce<HomeTrendDay | null>(
    (top, d) => (d.sales > 0 && (top === null || d.sales > top.sales) ? d : top),
    null,
  );
  // The 4 full weeks before today, so today's half day doesn't pull its weekday down.
  const heatSum = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));
  let heatDays = 0;
  for (let i = 1; i <= HEAT_DAYS; i += 1) {
    const date = addDays(today, -i);
    const day = days.get(date);
    if (!day || day.orders === 0) continue;
    heatDays += 1;
    const row = heatSum[weekdayOf(date)];
    if (!row) continue;
    day.hours.forEach((h, hour) => {
      row[hour] = (row[hour] ?? 0) + h.orders;
    });
  }
  const weeks = HEAT_DAYS / 7;
  return {
    range: input.range,
    days: recent,
    before,
    totals: totalsOf(recent),
    totalsBefore: totalsOf(before),
    bestDay: best,
    heat: heatSum.map((row) => row.map((n) => Math.round((n / weeks) * 10) / 10)),
    heatDays,
  };
}

// ---------------------------------------------------------------------------------------------------
// The setup checklist

export interface SetupInput {
  activeItems: number;
  hasLogo: boolean;
  hasBrandColour: boolean;
  hours: number;
  payments: number;
  stampCardOn: boolean;
  anyOrder: boolean;
}

/** The new-shop checklist; null once every step is done. */
export function setupSteps(input: SetupInput): HomeSetupStepState[] | null {
  const done: Record<SetupStep, boolean> = {
    items: input.activeItems >= SETUP_MIN_ITEMS,
    look: input.hasLogo && input.hasBrandColour,
    hours: input.hours > 0,
    payments: input.payments > 0,
    stamp_card: input.stampCardOn,
    first_order: input.anyOrder,
  };
  const steps: HomeSetupStepState[] = [
    { step: 'items', done: done.items },
    { step: 'look', done: done.look },
    { step: 'hours', done: done.hours },
    { step: 'payments', done: done.payments },
    { step: 'stamp_card', done: done.stamp_card },
    { step: 'first_order', done: done.first_order },
  ];
  return steps.every((s) => s.done) ? null : steps;
}

export interface HeatSlot {
  weekday: number;
  hour: number;
}

/** The heat map's busiest and quietest slots that had orders, for the sentence under it. */
export function heatExtremes(heat: readonly (readonly number[])[]): {
  busiest: HeatSlot | null;
  quietest: HeatSlot | null;
} {
  let busiest: HeatSlot | null = null;
  let quietest: HeatSlot | null = null;
  let hi = 0;
  let lo = Number.POSITIVE_INFINITY;
  for (let weekday = 0; weekday < heat.length; weekday += 1) {
    const row = heat[weekday] ?? [];
    for (let hour = 0; hour < row.length; hour += 1) {
      const v = row[hour] ?? 0;
      if (v <= 0) continue;
      if (v > hi) {
        hi = v;
        busiest = { weekday, hour };
      }
      if (v < lo) {
        lo = v;
        quietest = { weekday, hour };
      }
    }
  }
  return { busiest, quietest };
}
