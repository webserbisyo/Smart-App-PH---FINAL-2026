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
} from '@smartapp/core';
import { Badge } from '@smartapp/ui/components/reui/badge';
import { Card } from '@smartapp/ui/components/card';
import { IconTile } from '@smartapp/ui/components/reui/icon-tile';
import { Status, StatusIndicator } from '@smartapp/ui/components/status';
import { cn } from 'cn';
import { ORDER_TYPE_ICON } from './order-type-icons.js';

export interface OrderTicketProps {
  order: BoardOrder | OwnerOrder;
  size?: 'card' | 'kitchen' | 'full' | 'print';
  now: Date;
  actionSlot?: React.ReactNode;
  className?: string;
  onClick?: () => void;
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
}: OrderTicketProps) {
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

  let paymentLabel: string = order.paymentStatus;
  let statusVariant: 'success' | 'warning' | 'default' = 'default';
  let PaymentIcon = WalletIcon;

  if (order.paymentStatus === 'paid') {
    statusVariant = 'success';
    PaymentIcon = CheckCircle2Icon;
    paymentLabel = 'Paid';
  } else if (order.paymentStatus === 'pending') {
    statusVariant = 'warning';
    PaymentIcon = HourglassIcon;
    paymentLabel = 'Checking';
  } else if (order.paymentStatus === 'refunded') {
    statusVariant = 'default';
    PaymentIcon = Undo2Icon;
    paymentLabel = 'Refunded';
  } else if (isUnpaidTransfer) {
    const countdown = payCountdown(expiresAt, now);
    statusVariant = 'warning';
    PaymentIcon = HourglassIcon;
    paymentLabel = countdown.expired ? 'Expired' : countdown.label;
  } else {
    statusVariant = 'default';
    PaymentIcon = WalletIcon;
    paymentLabel = 'Unpaid';
  }

  const hasReward =
    ('hasReward' in order && order.hasReward) ||
    ('rewardTitle' in order && Boolean(order.rewardTitle));

  return (
    <Card
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
        'group flex flex-col justify-between overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-xs transition-shadow',
        onClick && 'cursor-pointer hover:border-border/80 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        className,
      )}
    >
      {/* 1. Header row (48 px) */}
      <div className="flex h-12 items-center justify-between gap-2 border-b border-border/50 px-3">
        {/* Left: ReUI Icon Tile + type name (no colour) */}
        <div className="flex items-center gap-1.5 min-w-0">
          <IconTile variant="outline" size="sm" aria-hidden="true" className="shrink-0">
            <TypeIcon className="size-4 text-foreground" />
          </IconTile>
          <span className="text-xs font-medium text-muted-foreground capitalize truncate">
            {ordersWords.types[order.type]}
          </span>
        </div>

        {/* Middle: Order number + unseen indicator + short date if scheduled on another day */}
        <div className="flex items-center gap-1.5 shrink-0">
          {order.seenAt === null && (
            <span
              className="size-2 rounded-full bg-primary shrink-0 animate-pulse"
              aria-label={ordersWords.ticket.newOrderAria}
            />
          )}
          <span className="font-bold tabular-nums text-base text-foreground">
            #{String(order.orderNo).padStart(3, '0')}
          </span>
          {scheduledOtherDay && order.scheduledAt && (
            <span className="text-xs text-muted-foreground font-medium">
              {formatManila(order.scheduledAt, 'date')}
            </span>
          )}
        </div>

        {/* Right: Due time + age chip */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-xs font-semibold tabular-nums text-foreground">
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
        <div className="font-medium text-sm text-foreground truncate min-w-0">
          {order.customerName}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {order.isFirstOrder && (
            <Badge variant="outline" size="xs">
              {ordersWords.ticket.firstOrder}
            </Badge>
          )}
          {order.isMember && (
            <span className="inline-flex items-center rounded-sm border border-member/20 bg-member px-1.5 py-0.5 text-[0.625rem] font-bold text-member-foreground uppercase tracking-wide leading-none">
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
      <div className="px-3 py-2 space-y-1.5 text-sm flex-1">
        {visibleLines.map((line, idx) => (
          <div key={idx} className="grid grid-cols-[2rem_1fr] items-start gap-1">
            <span className="font-semibold tabular-nums text-foreground">{line.qty}×</span>
            <div className="min-w-0">
              <div className="font-medium text-foreground leading-snug break-words">
                {line.name}
              </div>
              {(line.variantLabel || line.optionLabels.length > 0) && (
                <div className="text-xs text-muted-foreground leading-snug">
                  {[line.variantLabel, ...line.optionLabels].filter(Boolean).join(', ')}
                </div>
              )}
              {line.note && (
                <div className="mt-1 flex items-start gap-1 rounded bg-warning-soft px-1.5 py-0.5 text-xs text-warning-text font-normal">
                  <MessageSquareTextIcon className="size-3 shrink-0 mt-0.5" />
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
          <div className="mt-2 flex items-start gap-1.5 rounded-md bg-warning-soft px-2 py-1 text-xs text-warning-text font-normal">
            <MessageSquareTextIcon className="size-3.5 shrink-0 mt-0.5" />
            <span className="break-words">
              <strong>{ordersWords.ticket.orderNote}:</strong> {order.note}
            </span>
          </div>
        )}
      </div>

      {/* 4. Footer row */}
      <div className="mt-auto border-t border-border/40 p-3 pt-2.5 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Status variant={statusVariant}>
            <StatusIndicator />
            <PaymentIcon className="size-3" />
            <span>{paymentLabel}</span>
          </Status>
          <span className="font-bold tabular-nums text-base text-foreground shrink-0 whitespace-nowrap">
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
