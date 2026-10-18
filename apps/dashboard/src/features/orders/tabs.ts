import { words } from '@smartapp/core';
import type { NavItem } from '@smartapp/ui/lib/nav';

export function getOrdersTabs(activePath: string): NavItem[] {
  return [
    {
      id: 'orders-board',
      label: words.screens.orders.tabBoard,
      href: '/orders',
      isActive: activePath === '/orders',
    },
    {
      id: 'orders-history',
      label: words.screens.orders.tabHistory,
      href: '/orders?date=today',
      isActive: activePath.startsWith('/orders') && activePath.includes('date'),
    },
  ];
}
