import { BikeIcon, ShoppingBagIcon, StoreIcon, type LucideIcon } from 'lucide-react';
import type { OrderType } from '@smartapp/core';

/** One icon per order type, used by How and where and checkout. */
export const ORDER_TYPE_ICON: Record<OrderType, LucideIcon> = {
  walk_in: StoreIcon,
  pickup: ShoppingBagIcon,
  delivery: BikeIcon,
};
