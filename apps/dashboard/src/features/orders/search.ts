import { useNavigate, useSearch } from '@tanstack/react-router';
import { useCallback } from 'react';
import { z } from 'zod';

// Orders v2 address (decision T54): one page, its views, the order panel on top. Bookings (T83) shows
// only for shops that take orders more than a day ahead.
export const ORDER_VIEWS = ['board', 'list', 'bookings'] as const;
export type OrderView = (typeof ORDER_VIEWS)[number];

export const ORDER_FILTERS = ['walk_in', 'pickup', 'delivery', 'to_check'] as const;
export type OrderFilter = (typeof ORDER_FILTERS)[number];

// The phone stage list shows one stage at a time.
export const PHONE_STAGES = ['new', 'preparing', 'ready', 'out'] as const;
export type PhoneStage = (typeof PHONE_STAGES)[number];

export const DAY_PRESETS = ['today', 'yesterday', 'upcoming'] as const;
export type DayPreset = (typeof DAY_PRESETS)[number];

// List view status chips (All when empty).
export const LIST_STATUSES = [
  'new',
  'preparing',
  'ready',
  'out',
  'done',
  'cancelled',
  'expired',
] as const;
export type ListStatus = (typeof LIST_STATUSES)[number];

// The Calendar's own view and day (T86), so Back steps out of a day the way it came in.
export const CALENDAR_VIEWS = ['week', 'day', 'month'] as const;
export type CalendarMode = (typeof CALENDAR_VIEWS)[number];
const DateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const DaySchema = z.union([z.enum(DAY_PRESETS), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]);

export const OrdersSearchSchema = z.object({
  view: z.enum(ORDER_VIEWS).optional().catch(undefined),
  filter: z.enum(ORDER_FILTERS).optional().catch(undefined),
  stage: z.enum(PHONE_STAGES).optional().catch(undefined),
  order: z.string().min(1).max(64).optional().catch(undefined),
  // The order panel's Chat tab (T87); the Order tab when absent.
  tab: z.enum(['chat']).optional().catch(undefined),
  day: DaySchema.optional().catch(undefined),
  cal: z.enum(CALENDAR_VIEWS).optional().catch(undefined),
  calDay: DateSchema.optional().catch(undefined),
  status: z.enum(LIST_STATUSES).optional().catch(undefined),
  q: z.string().max(80).optional().catch(undefined),
  // Paid to one place (T84): "drawer" or an account id, from Home's money rows.
  pay: z.string().min(1).max(40).optional().catch(undefined),
});
export type OrdersSearch = z.infer<typeof OrdersSearchSchema>;

/** The Orders page's search params from the address, typed (no casts). */
export function useOrdersSearch(): OrdersSearch {
  const search = useSearch({ strict: false });
  return OrdersSearchSchema.parse({
    view: search.view,
    filter: search.filter,
    stage: search.stage,
    order: search.order,
    tab: search.tab,
    day: search.day,
    cal: search.cal,
    calDay: search.calDay,
    status: search.status,
    q: search.q,
    pay: search.pay,
  });
}

/** Changes some params and keeps the rest. `replace` for typing and filters, so Back stays useful. */
export function useSetOrdersSearch() {
  const navigate = useNavigate();
  return useCallback(
    (patch: Partial<OrdersSearch>, options: { replace?: boolean } = {}) => {
      void navigate({
        to: '/orders',
        search: (prev: Record<string, unknown>) => ({ ...prev, ...patch }),
        replace: options.replace ?? false,
      });
    },
    [navigate],
  );
}
