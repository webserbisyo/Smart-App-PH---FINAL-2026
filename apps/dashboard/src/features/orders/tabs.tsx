import { Link, useSearch } from '@tanstack/react-router';
import { z } from 'zod';
import { words } from '@smartapp/core';
import type { NavItem } from '@smartapp/ui/lib/nav';

export const ORDER_VIEWS = ['board', 'list'] as const;
export const OrdersSearchSchema = z.object({
  view: z.enum(ORDER_VIEWS).optional().catch(undefined),
});

// Board and List are two views of /orders (?view=list).
export function useOrdersTabs(): NavItem[] {
  const { view } = useSearch({ strict: false });
  return [
    {
      id: 'board',
      label: words.screens.orders.tabBoard,
      icon: null,
      link: <Link to="/orders" search={{}} activeOptions={{ exact: true, includeSearch: true }} />,
      active: view !== 'list',
    },
    {
      id: 'list',
      label: words.screens.orders.tabList,
      icon: null,
      link: (
        <Link
          to="/orders"
          search={{ view: 'list' }}
          activeOptions={{ exact: true, includeSearch: true }}
        />
      ),
      active: view === 'list',
    },
  ];
}
