import {
  BellIcon,
  ClockIcon,
  CreditCardIcon,
  GemIcon,
  ShoppingBagIcon,
  StoreIcon,
  TruckIcon,
  UserIcon,
  type LucideIcon,
} from 'lucide-react';
import { words } from '@smartapp/core';

const w = words.screens.settings;

// The settings sections, in menu order. Desktop shows them as the left
// sub-menu, phone as a list of rows.
export const SETTINGS_SECTIONS = [
  { id: 'shop', to: '/settings/shop', label: w.shop, empty: w.shopEmpty, icon: StoreIcon },
  { id: 'hours', to: '/settings/hours', label: w.hours, empty: w.hoursEmpty, icon: ClockIcon },
  {
    id: 'ordering',
    to: '/settings/ordering',
    label: w.ordering,
    empty: w.orderingEmpty,
    icon: ShoppingBagIcon,
  },
  {
    id: 'delivery',
    to: '/settings/delivery',
    label: w.delivery,
    empty: w.deliveryEmpty,
    icon: TruckIcon,
  },
  {
    id: 'payments',
    to: '/settings/payments',
    label: w.payments,
    empty: w.paymentsEmpty,
    icon: CreditCardIcon,
  },
  {
    id: 'notifications',
    to: '/settings/notifications',
    label: w.notifications,
    empty: w.notificationsEmpty,
    icon: BellIcon,
  },
  { id: 'plan', to: '/settings/plan', label: w.plan, empty: w.planEmpty, icon: GemIcon },
  {
    id: 'account',
    to: '/settings/account',
    label: w.account,
    empty: w.accountEmpty,
    icon: UserIcon,
  },
] as const satisfies readonly {
  id: string;
  to: `/settings/${string}`;
  label: string;
  empty: string;
  icon: LucideIcon;
}[];

export type SettingsSectionId = (typeof SETTINGS_SECTIONS)[number]['id'];
