import {
  BellIcon,
  ClockIcon,
  CreditCardIcon,
  GemIcon,
  HardDriveIcon,
  ShoppingBagIcon,
  StoreIcon,
  TruckIcon,
  UserIcon,
  type LucideIcon,
} from 'lucide-react';
import { settingsWords } from '@smartapp/core';

const t = settingsWords.sectionTitles;
const l = settingsWords.lines;

// The settings sections in three groups (decision T64): Your shop, You, Plan. Laptops show them as
// the left sub-menu; phones as the grouped list on /settings with one status line each.
export const SETTINGS_SECTIONS = [
  { id: 'shop', group: 'shop', to: '/settings/shop', label: t.shop, line: l.shop, icon: StoreIcon },
  {
    id: 'hours',
    group: 'shop',
    to: '/settings/hours',
    label: t.hours,
    line: l.hours,
    icon: ClockIcon,
  },
  {
    id: 'ordering',
    group: 'shop',
    to: '/settings/ordering',
    label: t.ordering,
    line: l.ordering,
    icon: ShoppingBagIcon,
  },
  {
    id: 'delivery',
    group: 'shop',
    to: '/settings/delivery',
    label: t.delivery,
    line: l.delivery,
    icon: TruckIcon,
  },
  {
    id: 'payments',
    group: 'shop',
    to: '/settings/payments',
    label: t.payments,
    line: l.payments,
    icon: CreditCardIcon,
  },
  {
    id: 'account',
    group: 'you',
    to: '/settings/account',
    label: t.account,
    line: l.account,
    icon: UserIcon,
  },
  {
    id: 'notifications',
    group: 'you',
    to: '/settings/notifications',
    label: t.notifications,
    line: l.notifications,
    icon: BellIcon,
  },
  { id: 'plan', group: 'plan', to: '/settings/plan', label: t.plan, line: l.plan, icon: GemIcon },
  {
    id: 'storage',
    group: 'plan',
    to: '/settings/storage',
    label: t.storage,
    line: l.storage,
    icon: HardDriveIcon,
  },
] as const satisfies readonly {
  id: string;
  group: 'shop' | 'you' | 'plan';
  to: `/settings/${string}`;
  label: string;
  line: string;
  icon: LucideIcon;
}[];

export type SettingsSectionId = (typeof SETTINGS_SECTIONS)[number]['id'];
export type SettingsSection = (typeof SETTINGS_SECTIONS)[number];

export const SETTINGS_GROUPS = [
  { id: 'shop', label: settingsWords.groups.shop },
  { id: 'you', label: settingsWords.groups.you },
  { id: 'plan', label: settingsWords.groups.plan },
] as const;

export function sectionOf(id: SettingsSectionId): SettingsSection {
  return SETTINGS_SECTIONS.find((s) => s.id === id) ?? SETTINGS_SECTIONS[0];
}
