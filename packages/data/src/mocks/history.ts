// The demo shop's last 60 days for Home (decision T71). Light past orders are made from the shop's rhythm,
// its seed and the date, so they are never stored and the browser never grows. Orders the mock already
// keeps (the board's past days and members' past orders) count toward each day, so Home and Members agree.
import {
  addDays,
  countsAsSale,
  HOME_HISTORY_DAYS,
  manilaDate,
  manilaToDate,
  openHoursOf,
  shopRhythm,
  weekdayOf,
  type HomeSale,
  type HomeSaleLine,
  type Item,
  type OrderType,
  type PaymentMethod,
  type PublicShop,
  type ShopRhythm,
} from '@smartapp/core';
import { methodsFor } from './quote';
import { int, mulberry32, type Rng } from './rng';
import type { ArchivedOrder, OrderRecord, ShopState } from './state';

/** A stable number for a text, so each shop and day gets its own generator. */
function hashOf(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Share of past orders that repeat a basket from the board (the rest are one to three random lines).
const BASKET_COPY = 0.7;

function weighted<T>(rng: Rng, list: readonly (readonly [T, number])[]): T | null {
  const total = list.reduce((n, [, w]) => n + w, 0);
  if (total <= 0) return null;
  let r = rng() * total;
  for (const [value, w] of list) {
    r -= w;
    if (r < 0) return value;
  }
  return list[list.length - 1]?.[0] ?? null;
}

function isPayday(date: string): boolean {
  const day = Number(date.slice(8, 10));
  return day === 15 || addDays(date, 1).slice(8, 10) === '01';
}

function sellable(shop: PublicShop): Item[] {
  return shop.catalog.items.filter(
    (i) => i.status === 'active' && i.variants.some((v) => v.availability !== 'sold_out'),
  );
}

/** A real order as Home reads it. */
export function saleOfOrder(o: OrderRecord): HomeSale {
  const r = o.receipt;
  return {
    placedAt: r.placedAt,
    total: r.totals.total,
    type: r.type,
    method: r.paymentMethod,
    paid: r.paymentStatus === 'paid',
    member: o.memberEmail !== null,
    lines: r.lines.map((l) => ({
      itemId: l.itemId,
      name: l.name,
      qty: l.qty,
      lineTotal: l.lineTotal,
    })),
  };
}

interface Picker {
  type: (rng: Rng) => OrderType;
  method: (rng: Rng, type: OrderType) => PaymentMethod;
}

function pickerFor(shop: PublicShop, rhythm: ShopRhythm): Picker {
  const allowed = new Set(shop.storefront.orderTypes);
  const types = rhythm.types.filter(([t]) => allowed.has(t));
  const fallbackType = shop.storefront.orderTypes[0] ?? 'pickup';
  return {
    type: (rng) => weighted(rng, types) ?? fallbackType,
    method: (rng, type) => {
      const ok = new Set(methodsFor(shop, type));
      const list = rhythm.methods.filter(([m]) => ok.has(m));
      return weighted(rng, list) ?? methodsFor(shop, type)[0] ?? 'cash';
    },
  };
}

/** A member's past order as Home reads it; its type and payment come from the shop's usual mix. */
function saleOfArchive(
  a: ArchivedOrder,
  picker: Picker,
  itemIds: ReadonlyMap<string, Item>,
  members: ReadonlySet<string>,
): HomeSale {
  const rng = mulberry32(hashOf(a.id));
  const type = picker.type(rng);
  const lines: HomeSaleLine[] = [];
  for (const l of a.lines) {
    const item = itemIds.get(l.name);
    if (!item) continue;
    lines.push({
      itemId: item.id,
      name: item.name,
      qty: l.qty,
      lineTotal: (item.variants[0]?.price ?? item.basePrice) * l.qty,
    });
  }
  return {
    placedAt: a.placedAt,
    total: a.total,
    type,
    method: picker.method(rng, type),
    paid: true,
    member: a.customerEmail !== null && members.has(a.customerEmail),
    lines,
  };
}

/** Hours of the day with their weight: open hours weigh 1 plus the rhythm's peaks. */
function hourWeights(shop: PublicShop, rhythm: ShopRhythm, date: string): [number, number][] {
  const peaks = new Map(rhythm.peaks);
  return openHoursOf({ hours: shop.storefront.hours, closures: [] }, date).map((h) => [
    h,
    1 + (peaks.get(h) ?? 0),
  ]);
}

function lightOrder(
  shop: PublicShop,
  rhythm: ShopRhythm,
  picker: Picker,
  items: readonly Item[],
  baskets: readonly (readonly HomeSaleLine[])[],
  date: string,
  hours: readonly [number, number][],
  rng: Rng,
): HomeSale | null {
  const hour = weighted(rng, hours);
  if (hour === null || items.length === 0) return null;
  const minute = int(rng, 0, 59);
  const clock = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  const lines = new Map<string, HomeSaleLine>();
  // Most past orders repeat a basket from the board, so a usual day's orders are the size of today's.
  const copy =
    baskets.length > 0 && rng() < BASKET_COPY
      ? baskets[Math.floor(rng() * baskets.length)]
      : undefined;
  for (const l of copy ?? []) lines.set(l.itemId, { ...l });
  const count = copy ? 0 : int(rng, rhythm.lines[0], rhythm.lines[1]);
  for (let i = 0; i < count; i += 1) {
    // Earlier items in the menu sell more, so best sellers look like a real shop's.
    const index = Math.min(items.length - 1, Math.floor(rng() * rng() * items.length));
    const item = items[index];
    const variant = item?.variants.find((v) => v.availability !== 'sold_out');
    if (!item || !variant) continue;
    const qty = int(rng, 1, rhythm.maxQty);
    const line = lines.get(item.id) ?? { itemId: item.id, name: item.name, qty: 0, lineTotal: 0 };
    line.qty += qty;
    line.lineTotal += variant.price * qty;
    lines.set(item.id, line);
  }
  if (lines.size === 0) return null;
  const type = picker.type(rng);
  const fee = type === 'delivery' ? (shop.storefront.delivery.zones[0]?.fee ?? 0) : 0;
  const list = [...lines.values()];
  return {
    placedAt: manilaToDate(date, clock).toISOString(),
    total: list.reduce((n, l) => n + l.lineTotal, 0) + fee,
    type,
    method: picker.method(rng, type),
    paid: true,
    member: false,
    lines: list,
  };
}

/**
 * Counted orders of the last 60 days before today: the ones the mock keeps, topped up with light orders
 * until each day reaches its usual count. Today is left out; the caller adds today's real orders.
 */
export function pastSales(s: ShopState, shop: PublicShop, seed: number, now: Date): HomeSale[] {
  const today = manilaDate(now);
  const first = addDays(today, -HOME_HISTORY_DAYS);
  const rhythm = shopRhythm(shop.storefront.slug);
  const picker = pickerFor(shop, rhythm);
  const items = sellable(shop);
  const byName = new Map(shop.catalog.items.map((i) => [i.name, i]));
  const members = new Set(s.members.map((m) => m.email));
  const out: HomeSale[] = [];
  const perDay = new Map<string, number>();
  const keep = (sale: HomeSale): void => {
    const date = manilaDate(sale.placedAt);
    if (date >= today || date < first) return;
    out.push(sale);
    perDay.set(date, (perDay.get(date) ?? 0) + 1);
  };
  const baskets: HomeSaleLine[][] = [];
  for (const o of s.orders) {
    if (!countsAsSale(o.receipt, now)) continue;
    const sale = saleOfOrder(o);
    baskets.push([...sale.lines]);
    if (o.businessDate < today) keep(sale);
  }
  for (const a of s.archive ?? []) {
    if (a.status === 'completed') keep(saleOfArchive(a, picker, byName, members));
  }
  for (let d = 1; d <= HOME_HISTORY_DAYS; d += 1) {
    const date = addDays(today, -d);
    const rng = mulberry32(hashOf(`${shop.storefront.slug}|${date}|${seed}`));
    const hours = hourWeights(shop, rhythm, date);
    if (hours.length === 0) continue;
    const [lo, hi] = rhythm.perDay;
    const base = lo + rng() * (hi - lo);
    const target = Math.round(
      base * (rhythm.weekdays[weekdayOf(date)] ?? 1) * (isPayday(date) ? rhythm.payday : 1),
    );
    const missing = target - (perDay.get(date) ?? 0);
    for (let i = 0; i < missing; i += 1) {
      const sale = lightOrder(shop, rhythm, picker, items, baskets, date, hours, rng);
      if (sale) keep(sale);
    }
  }
  return out;
}
