import { BikeIcon, ShoppingBagIcon, StoreIcon, type LucideIcon } from 'lucide-react';
import type { OrderType } from '@smartapp/core';

/** One icon per order type for the dashboard (decision T35/T49). */
export const ORDER_TYPE_ICON: Readonly<Record<OrderType, LucideIcon>> = {
  walk_in: StoreIcon,
  pickup: ShoppingBagIcon,
  delivery: BikeIcon,
};
