import * as React from 'react';
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  ClockIcon,
  HourglassIcon,
  MessageSquareTextIcon,
  Undo2Icon,
  WalletIcon,
} from 'lucide-react';
import type { BoardOrder, OwnerOrder } from '@smartapp/core';
import {
  formatClock,
  formatManila,
  formatPeso,
  isTransfer,
  manilaDate,
  ordersWords,
  orderTiming,
  payCountdown,
  words,
} from '@smartapp/core';
import { Badge } from '@smartapp/ui/components/reui/badge';
import { Card } from '@smartapp/ui/components/card';
import { IconTile } from '@smartapp/ui/components/reui/icon-tile';
import { Status, StatusIndicator } from '@smartapp/ui/components/status';
import { cn } from 'cn';
import { KitchenTicket, type KitchenTicketExtras } from './kitchen-ticket.js';
import { orderNoLabel } from './order-ticket-label.js';
import { ORDER_TYPE_ICON } from './order-type-icons.js';
import { PrintTicket } from './print-ticket.js';

export { orderNoLabel };

type PayVariant = 'success' | 'warning' | 'default';

// The payment chip: icon + word + colour (status words from words.ts).
function paymentChip(
  status: BoardOrder['paymentStatus'],
  unpaidTransfer: boolean,
  expiresAt: string,
  now: Date,
): { label: string; variant: PayVariant; Icon: typeof WalletIcon } {
  const w = words.shop.paymentStatus;
  if (status === 'paid') return { label: w.paid, variant: 'success', Icon: CheckCircle2Icon };
  if (status === 'pending') return { label: w.pending, variant: 'warning', Icon: HourglassIcon };
  if (status === 'refunded') return { label: w.refunded, variant: 'default', Icon: Undo2Icon };
  if (unpaidTransfer) {
    const countdown = payCountdown(expiresAt, now);
    return {
      label: countdown.expired ? words.shop.orderStatus.expired : countdown.label,
      variant: 'warning',
      Icon: HourglassIcon,
    };
  }
  return { label: w.unpaid, variant: 'default', Icon: WalletIcon };
}

export interface OrderTicketProps {
  order: BoardOrder | OwnerOrder;
  size?: 'card' | 'kitchen' | 'full' | 'print';
  now: Date;
  actionSlot?: React.ReactNode;
  className?: string;
  onClick?: () => void;
  /** size="kitchen": line ticks, the big step button and the print icon (Kitchen view). */
  kitchen?: KitchenTicketExtras | undefined;
  /** size="print": the shop name and the receipt link for the QR. */
  print?: { shopName: string; receiptUrl: string; onReady?: () => void } | undefined;
}

interface NormalizedLine {
  qty: number;
  name: string;
  variantLabel: string | null;
  optionLabels: string[];
  note: string | null;
}

function normalizeLines(order: BoardOrder | OwnerOrder): NormalizedLine[] {
  return order.lines.map((l) => ({
    qty: l.qty,
    name: l.name,
    variantLabel: l.variantLabel ?? null,
    optionLabels: l.optionLabels ?? [],
    note: l.note ?? null,
  }));
}

function OrderTicketComponent({
  order,
  size = 'card',
  now,
  actionSlot,
  className,
  onClick,
  kitchen,
  print,
}: OrderTicketProps) {
  if (size === 'kitchen' && kitchen) {
    return <KitchenTicket order={order} now={now} className={className} {...kitchen} />;
  }
  if (size === 'print' && print) {
    return (
      <PrintTicket
        order={order}
        now={now}
        shopName={print.shopName}
        receiptUrl={print.receiptUrl}
        onReady={print.onReady}
      />
    );
  }
  const TypeIcon = ORDER_TYPE_ICON[order.type];
  const timing = orderTiming(order, now);

  const startByMs = new Date(order.startBy).getTime();
  const nowMs = now.getTime();
  const ageMinutes = Math.max(0, Math.floor((nowMs - startByMs) / 60_000));

  const scheduledOtherDay =
    order.scheduledAt !== null && manilaDate(order.scheduledAt) !== manilaDate(now);

  const lines = normalizeLines(order);
  const cardLineCap = 4;
  const visibleLines = size === 'card' ? lines.slice(0, cardLineCap) : lines;
  const remainingCount =
    size === 'card'
      ? Math.max(
          0,
          lines.length > cardLineCap
            ? lines.length - cardLineCap
            : 'moreLines' in order
              ? order.moreLines
              : 0,
        )
      : 0;

  const totalCentavos = 'total' in order ? order.total : order.totals.total;

  const isTransferMethod = isTransfer(order.paymentMethod);
  const isUnpaidTransfer = order.paymentStatus === 'unpaid' && isTransferMethod;

  const expiresAt =
    'expiresAt' in order && order.expiresAt
      ? order.expiresAt
      : new Date(new Date(order.placedAt).getTime() + 30 * 60_000).toISOString();

  const pay = paymentChip(order.paymentStatus, isUnpaidTransfer, expiresAt, now);
  const paymentLabel = pay.label;
  const statusVariant = pay.variant;
  const PaymentIcon = pay.Icon;

  const hasReward =
    ('hasReward' in order && order.hasReward) ||
    ('rewardTitle' in order && Boolean(order.rewardTitle));

  return (
    <Card
      data-order-id={order.id}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={cn(
        'group @container flex flex-col justify-between overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-xs transition-shadow',
        onClick &&
          'cursor-pointer hover:border-border/80 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        className,
      )}
    >
      {/* 1. Header row (48 px) */}
      <div className="flex h-12 items-center justify-between gap-2 border-b border-border/50 px-3">
        {/* Left: ReUI Icon Tile + type name (no colour) */}
        <div className="flex min-w-0 items-center gap-1.5">
          <IconTile variant="outline" size="sm" aria-hidden="true" className="shrink-0">
            <TypeIcon className="size-4 text-foreground" />
          </IconTile>
          <span className="sr-only truncate text-xs font-medium text-muted-foreground capitalize @xs:not-sr-only">
            {ordersWords.types[order.type]}
          </span>
        </div>

        {/* Middle: Order number + unseen indicator + short date if scheduled on another day */}
        <div className="flex shrink-0 items-center gap-1.5">
          {order.seenAt === null && (
            <span
              className="size-2 shrink-0 animate-pulse rounded-full bg-primary"
              aria-label={ordersWords.ticket.newOrderAria}
            />
          )}
          <span className="text-base font-bold text-foreground tabular-nums">
            {orderNoLabel(order.orderNo)}
          </span>
          {scheduledOtherDay && order.scheduledAt && (
            <span className="text-xs font-medium text-muted-foreground">
              {formatManila(order.scheduledAt, 'date')}
            </span>
          )}
        </div>

        {/* Right: Due time + age chip */}
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="text-xs font-semibold text-foreground tabular-nums">
            {formatClock(order.dueAt)}
          </span>
          {timing.lateMinutes > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-destructive/20 bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">
              <AlertTriangleIcon className="size-3" />
              {ordersWords.timing.late(timing.lateMinutes)}
            </span>
          ) : timing.ageTone === 'amber' ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-warning/25 bg-warning-soft px-2 py-0.5 text-xs font-semibold text-warning-text">
              <ClockIcon className="size-3" />
              {ordersWords.timing.age(ageMinutes)}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-2 py-0.5 text-xs font-medium text-muted-foreground">
              <ClockIcon className="size-3" />
              {ordersWords.timing.age(ageMinutes)}
            </span>
          )}
        </div>
      </div>

      {/* 2. Who row */}
      <div className="flex items-center justify-between gap-2 border-b border-border/30 px-3 py-2">
        <div className="min-w-0 truncate text-sm font-medium text-foreground">
          {order.customerName}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {order.isFirstOrder && (
            <Badge variant="outline" size="xs">
              {ordersWords.ticket.firstOrder}
            </Badge>
          )}
          {order.isMember && (
            <span className="inline-flex items-center rounded-sm border border-member/20 bg-member px-1.5 py-0.5 text-xs leading-none font-bold tracking-wide text-member-foreground uppercase">
              {ordersWords.ticket.member}
            </span>
          )}
          {hasReward && (
            <Badge variant="warning-light" size="xs">
              {ordersWords.ticket.reward}
            </Badge>
          )}
        </div>
      </div>

      {/* 3. Lines grid */}
      <div className="flex-1 space-y-1.5 px-3 py-2 text-sm">
        {visibleLines.map((line, idx) => (
          <div key={idx} className="flex items-start gap-1">
            <span className="w-8 shrink-0 font-semibold text-foreground tabular-nums">
              {line.qty}×
            </span>
            <div className="min-w-0 flex-1">
              <div className="leading-snug font-medium break-words text-foreground">
                {line.name}
              </div>
              {(line.variantLabel || line.optionLabels.length > 0) && (
                <div className="text-xs leading-snug text-muted-foreground">
                  {[line.variantLabel, ...line.optionLabels].filter(Boolean).join(', ')}
                </div>
              )}
              {line.note && (
                <div className="mt-1 flex items-start gap-1 rounded bg-warning-soft px-1.5 py-0.5 text-xs font-normal text-warning-text">
                  <MessageSquareTextIcon className="mt-0.5 size-3 shrink-0" />
                  <span className="break-words">{line.note}</span>
                </div>
              )}
            </div>
          </div>
        ))}

        {remainingCount > 0 && (
          <div className="pl-9 text-xs font-medium text-muted-foreground">
            {ordersWords.ticket.moreLines(remainingCount)}
          </div>
        )}

        {order.note && (
          <div className="mt-2 flex items-start gap-1.5 rounded-md bg-warning-soft px-2 py-1 text-xs font-normal text-warning-text">
            <MessageSquareTextIcon className="mt-0.5 size-3.5 shrink-0" />
            <span className="break-words">
              <strong>{ordersWords.ticket.orderNote}:</strong> {order.note}
            </span>
          </div>
        )}
      </div>

      {/* 4. Footer row */}
      <div className="mt-auto space-y-2 border-t border-border/40 p-3 pt-2.5">
        <div className="flex items-center justify-between gap-2">
          <Status variant={statusVariant}>
            <StatusIndicator />
            <PaymentIcon className="size-3" />
            <span>{paymentLabel}</span>
          </Status>
          <span className="shrink-0 text-base font-bold whitespace-nowrap text-foreground tabular-nums">
            {formatPeso(totalCentavos)}
          </span>
        </div>
        {actionSlot && (
          <div
            className="w-full"
            onClick={(e) => {
              // Prevent triggering card click when action button is tapped
              e.stopPropagation();
            }}
          >
            {actionSlot}
          </div>
        )}
      </div>
    </Card>
  );
}

export const OrderTicket = React.memo(OrderTicketComponent, (prev, next) => {
  // Kitchen and print tickets carry callbacks and ticks: always render them fresh.
  if (next.size === 'kitchen' || next.size === 'print') return false;
  return (
    prev.order.id === next.order.id &&
    prev.order.status === next.order.status &&
    prev.order.paymentStatus === next.order.paymentStatus &&
    prev.order.seenAt === next.order.seenAt &&
    prev.order.scheduledAt === next.order.scheduledAt &&
    prev.order.lastStepAt === next.order.lastStepAt &&
    prev.size === next.size &&
    prev.now.getTime() === next.now.getTime() &&
    prev.actionSlot === next.actionSlot &&
    prev.className === next.className
  );
});
