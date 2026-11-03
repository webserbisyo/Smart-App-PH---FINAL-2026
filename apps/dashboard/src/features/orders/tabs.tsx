import { Link, useSearch } from '@tanstack/react-router';
import { z } from 'zod';
import { words } from '@smartapp/core';
import type { NavItem } from '@smartapp/ui/lib/nav';

export const ORDER_VIEWS = ['now', 'scheduled', 'history'] as const;
export type OrderView = (typeof ORDER_VIEWS)[number];

export const ORDER_TYPES = ['all', 'walk_in', 'pickup', 'delivery'] as const;
export type OrderTypeFilter = (typeof ORDER_TYPES)[number];

export const ORDER_STEPS = ['starting_soon', 'new', 'preparing', 'ready', 'out', 'done'] as const;
export type OrderStepFilter = (typeof ORDER_STEPS)[number];

export const CALENDAR_VIEWS = ['month', 'week', 'agenda'] as const;
export type CalendarViewParam = (typeof CALENDAR_VIEWS)[number];

export const OrdersSearchSchema = z.object({
  view: z.enum(ORDER_VIEWS).optional().catch('now'),
  type: z.enum(ORDER_TYPES).optional().catch('all'),
  step: z.enum(ORDER_STEPS).optional().catch(undefined),
  q: z.string().optional().catch(undefined),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .catch(undefined),
  cal: z.enum(CALENDAR_VIEWS).optional().catch(undefined),
  showDone: z.enum(['true', 'false']).optional().catch(undefined),
});
export type OrdersSearch = z.infer<typeof OrdersSearchSchema>;

/** The Orders page's search params from the address, typed (no casts). */
export function useOrdersSearch(): OrdersSearch {
  const search = useSearch({ strict: false });
  return {
    view: search.view,
    type: search.type,
    step: search.step,
    q: search.q,
    date: search.date,
    cal: search.cal,
    showDone: search.showDone,
  };
}

/** The same page state with some params changed, for links and navigate(). */
export function withSearch(search: OrdersSearch, patch: OrdersSearch): OrdersSearch {
  return { ...search, ...patch };
}

export function useOrdersTabs(): NavItem[] {
  const search = useOrdersSearch();
  const currentView = search.view ?? 'now';
  const type = search.type ?? 'all';
  const step = search.step;

  return [
    {
      id: 'now',
      label: words.screens.orders.tabNow,
      icon: null,
      link: (
        <Link
          to="/orders"
          search={{ view: 'now', type, step }}
          activeOptions={{ exact: true, includeSearch: true }}
        />
      ),
      active: currentView === 'now',
    },
    {
      id: 'scheduled',
      label: words.screens.orders.tabScheduled,
      icon: null,
      link: (
        <Link
          to="/orders"
          search={{ view: 'scheduled', type }}
          activeOptions={{ exact: true, includeSearch: true }}
        />
      ),
      active: currentView === 'scheduled',
    },
    {
      id: 'history',
      label: words.screens.orders.tabHistory,
      icon: null,
      link: (
        <Link
          to="/orders"
          search={{ view: 'history', type }}
          activeOptions={{ exact: true, includeSearch: true }}
        />
      ),
      active: currentView === 'history',
    },
  ];
}
