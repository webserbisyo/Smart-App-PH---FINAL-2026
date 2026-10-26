// What the receipt header shows for each order state: the Fluent picture, headline, next step and
// the status and payment chips (status = icon + word + colour).
import {
  AlarmClockOffIcon,
  BellRingIcon,
  BikeIcon,
  CircleCheckIcon,
  CircleXIcon,
  CookingPotIcon,
  HourglassIcon,
  PackageOpenIcon,
  ReceiptTextIcon,
  Undo2Icon,
  WalletIcon,
  type LucideIcon,
} from 'lucide-react';
import {
  formatPeso,
  isTransfer,
  vocab,
  words,
  type ArtKey,
  type OrderReceipt,
  type OrderStatus,
  type PaymentStatus,
  type ShopKind,
} from '@smartapp/core';
import type { BadgeProps } from '@smartapp/ui/components/reui/badge';
import type { ReceiptStepId } from './receipt-rules';

export interface ReceiptChip {
  readonly label: string;
  readonly icon: LucideIcon;
  readonly tone: NonNullable<BadgeProps['variant']>;
}

export interface ReceiptHero {
  readonly art: ArtKey;
  readonly title: string;
  readonly hint: string;
}

const STATUS_CHIP: Record<OrderStatus, Omit<ReceiptChip, 'label'>> = {
  placed: { icon: ReceiptTextIcon, tone: 'info-light' },
  preparing: { icon: CookingPotIcon, tone: 'warning-light' },
  ready: { icon: BellRingIcon, tone: 'success-light' },
  out_for_delivery: { icon: BikeIcon, tone: 'info-light' },
  completed: { icon: CircleCheckIcon, tone: 'success-light' },
  cancelled: { icon: CircleXIcon, tone: 'destructive-light' },
  expired: { icon: AlarmClockOffIcon, tone: 'destructive-light' },
};

const PAYMENT_CHIP: Record<PaymentStatus, Omit<ReceiptChip, 'label'>> = {
  unpaid: { icon: WalletIcon, tone: 'warning-light' },
  pending: { icon: HourglassIcon, tone: 'info-light' },
  paid: { icon: CircleCheckIcon, tone: 'success-light' },
  refunded: { icon: Undo2Icon, tone: 'secondary' },
};

// The order steps' icons (decision R48); the preparing step follows the shop's catalogue icon, so a clothes
// shop packs (an open box) while a kitchen cooks (a pot).
const PREP_ICON: Record<ReturnType<typeof vocab>['catalogIcon'], LucideIcon> = {
  utensils: CookingPotIcon,
  package: PackageOpenIcon,
};

export function stepIcon(id: ReceiptStepId, kind: ShopKind): LucideIcon {
  if (id === 'paid') return WalletIcon;
  if (id === 'preparing') return PREP_ICON[vocab(kind).catalogIcon];
  return STATUS_CHIP[id].icon;
}

export function statusChip(status: OrderStatus): ReceiptChip {
  return { label: words.shop.orderStatus[status], ...STATUS_CHIP[status] };
}

export function paymentChip(
  order: Pick<OrderReceipt, 'paymentMethod' | 'paymentStatus'>,
): ReceiptChip {
  const label =
    order.paymentStatus === 'unpaid' && order.paymentMethod === 'cod'
      ? words.shop.paymentStatus.unpaidCod
      : words.shop.paymentStatus[order.paymentStatus];
  return { label, ...PAYMENT_CHIP[order.paymentStatus] };
}

export function receiptHero(order: OrderReceipt, kind: ShopKind, justPlaced: boolean): ReceiptHero {
  const W = words.receipt.hero;
  const transfer = isTransfer(order.paymentMethod);
  switch (order.status) {
    case 'expired':
      return { art: 'expired', title: words.receipt.expiredTitle, hint: words.shop.thread.expired };
    case 'cancelled':
      return order.refund
        ? {
            art: 'cancelled',
            title: words.receipt.refundedTitle,
            hint: words.shop.thread.refunded(formatPeso(order.refund.amount), order.refund.reason),
          }
        : {
            art: 'cancelled',
            title: words.receipt.cancelledTitle,
            hint: words.shop.thread.cancelled(order.cancelReason ?? words.receipt.cancelledByShop),
          };
    case 'placed': {
      const unpaid = transfer && order.paymentStatus === 'unpaid';
      if (justPlaced)
        return {
          art: 'placed',
          title: W.justPlaced,
          hint: unpaid ? W.payNowHint : W.justPlacedHint,
        };
      if (unpaid) return { art: 'paid', title: W.payNow, hint: W.payNowHint };
      if (transfer && order.paymentStatus === 'pending')
        return { art: 'preparing', title: W.checking, hint: W.checkingHint };
      return { art: 'placed', title: W.placed, hint: W.placedHint };
    }
    case 'preparing':
      return { art: 'preparing', title: vocab(kind).prepHero, hint: W.preparingHint };
    case 'ready':
      return {
        art: 'ready',
        title: W.ready[order.type],
        hint: order.type === 'delivery' ? W.readyDeliveryHint : W.readyHint,
      };
    case 'out_for_delivery':
      return { art: 'out_for_delivery', title: W.outForDelivery, hint: W.outForDeliveryHint };
    case 'completed':
      return { art: 'completed', title: W.completed, hint: W.completedHint };
  }
}
