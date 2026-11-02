import type { DayLoad, DayLoadItem } from '../schemas/schedule.js';
import type { OrderStatus } from '../schemas/enums.js';
import { addDays, manilaDate } from './time.js';

export interface DayLoadOrderLine {
  itemId: string;
  qty: number;
}

export interface DayLoadOrderInput {
  dueAt: string;
  status: OrderStatus;
  lines: readonly DayLoadOrderLine[];
}

export interface DayLoadItemInput {
  id: string;
  name: string;
  dailyLimit?: number | null;
}

/**
 * Computes DayLoad entries for each Manila calendar date between `from` and `to` (inclusive).
 * Counts total orders due on the date and tallies counts against item daily limits.
 */
export function dayLoads(
  orders: readonly DayLoadOrderInput[],
  items: readonly DayLoadItemInput[] | Record<string, DayLoadItemInput>,
  from: string,
  to: string,
  slotsFullByDate: Record<string, number> = {},
): DayLoad[] {
  const itemsList: DayLoadItemInput[] = Array.isArray(items) ? items : Object.values(items);
  const trackedItems = itemsList.filter(
    (it) => it.dailyLimit !== null && it.dailyLimit !== undefined,
  );

  const result: DayLoad[] = [];
  let current = from;

  while (current <= to) {
    const dateOrders = orders.filter(
      (o) => manilaDate(o.dueAt) === current && o.status !== 'cancelled',
    );

    const itemsSummary: DayLoadItem[] = trackedItems.map((it) => {
      let count = 0;
      for (const order of dateOrders) {
        for (const line of order.lines) {
          if (line.itemId === it.id) {
            count += line.qty;
          }
        }
      }
      return {
        itemId: it.id,
        name: it.name,
        count,
        limit: it.dailyLimit ?? null,
      };
    });

    result.push({
      date: current,
      orders: dateOrders.length,
      items: itemsSummary,
      slotsFull: slotsFullByDate[current] ?? 0,
    });

    current = addDays(current, 1);
  }

  return result;
}
