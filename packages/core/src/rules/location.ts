// The location bar line and the How and where sheet details. Pure functions of (storefront, choice, now).
import type { OrderType } from '../schemas/enums.js';
import type { DeliveryZone, Storefront } from '../schemas/storefront.js';
import { words } from '../words.js';
import { pickupSlots } from './hours.js';
import { formatPeso } from './money.js';
import { addDays, formatClock, manilaDate } from './time.js';

type LocationInput = Pick<Storefront, 'orderTypes' | 'delivery'>;

/** What the customer picked in the sheet (kept per shop on the phone). */
export interface LocationChoice {
  type: OrderType | null;
  // null = ASAP (pickup) or not chosen yet.
  scheduledAt: string | null;
  zoneId: string | null;
}

/** The order type to use: the saved one if the shop still allows it, else none. */
export function chosenOrderType(sf: LocationInput, type: OrderType | null): OrderType | null {
  return type && sf.orderTypes.includes(type) ? type : null;
}

export function chosenZone(sf: LocationInput, zoneId: string | null): DeliveryZone | null {
  return sf.delivery.zones.find((z) => z.id === zoneId) ?? null;
}

/** "Today 3:30 PM", "Tomorrow 9 AM" (pickup and delivery slots are today or tomorrow only). */
export function slotLabel(at: string, now: string | Date): string {
  const time = formatClock(at);
  return manilaDate(at) === manilaDate(now)
    ? words.location.today(time)
    : words.location.tomorrow(time);
}

const feeText = (centavos: number) => (centavos === 0 ? words.shop.free : formatPeso(centavos));

/** "Walk-in", "Pickup · ASAP", "Pickup · Today 3:30 PM", "Delivery · Concepcion Uno · ₱40", "Choose how you'll order". */
export function locationLabel(
  sf: LocationInput,
  choice: LocationChoice,
  now: string | Date,
): string {
  const type = chosenOrderType(sf, choice.type);
  const join = (...parts: string[]) => parts.join(' · ');
  switch (type) {
    case null:
      return words.location.choose;
    case 'walk_in':
      return words.shop.orderType.walk_in;
    case 'pickup':
      return join(
        words.shop.orderType.pickup,
        choice.scheduledAt ? slotLabel(choice.scheduledAt, now) : words.location.asap,
      );
    case 'delivery': {
      // Shops without named zones take the address at checkout (distance and pins come in T09).
      if (sf.delivery.zones.length === 0) return words.shop.orderType.delivery;
      const zone = chosenZone(sf, choice.zoneId);
      return zone
        ? join(words.shop.orderType.delivery, zone.name, feeText(zone.fee))
        : join(words.shop.orderType.delivery, words.location.chooseArea);
    }
  }
}

/** One line under each order type in the sheet: "Ready in about 20 min", "₱40 to ₱80 · 30 to 45 min". */
export function orderTypeDetail(
  sf: Pick<Storefront, 'delivery' | 'prepMinutes'>,
  type: OrderType,
): string {
  switch (type) {
    case 'walk_in':
      return words.location.walkInDetail;
    case 'pickup':
      return words.shop.readyIn(sf.prepMinutes);
    case 'delivery': {
      const options = [...sf.delivery.distance, ...sf.delivery.zones];
      const fees = options.map((o) => o.fee);
      const first = options[0];
      if (!first) return words.shop.orderType.delivery;
      const range = words.location.feeRange(feeText(Math.min(...fees)), feeText(Math.max(...fees)));
      return words.location.deliveryDetail(range, first.etaText);
    }
  }
}

export interface SlotGroup {
  label: string;
  slots: { value: string; label: string }[];
}

/** Pickup slots grouped Today / Tomorrow for the native select. */
export function slotGroups(sf: Parameters<typeof pickupSlots>[0], now: string | Date): SlotGroup[] {
  const today = manilaDate(now);
  const tomorrow = addDays(today, 1);
  const slots = pickupSlots(sf, now);
  return [
    { label: words.location.todayGroup, day: today },
    { label: words.location.tomorrowGroup, day: tomorrow },
  ]
    .map(({ label, day }) => ({
      label,
      slots: slots
        .filter((s) => manilaDate(s) === day)
        .map((s) => ({ value: s, label: formatClock(s) })),
    }))
    .filter((g) => g.slots.length > 0);
}
