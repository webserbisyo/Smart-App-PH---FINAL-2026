import * as React from 'react';
import {
  BanIcon,
  ClipboardListIcon,
  CopyIcon,
  MessageSquareTextIcon,
  ShieldAlertIcon,
} from 'lucide-react';
import {
  formatClock,
  formatPeso,
  needsProofCheck,
  ordersWords,
  statusStage,
  type BoardOrder,
  type ShopKind,
} from '@smartapp/core';
import { Avatar, AvatarFallback } from '@smartapp/ui/components/avatar';
import { AvatarGroup } from '@smartapp/ui/components/avatar-group';
import { Button } from '@smartapp/ui/components/button';
import { notify } from '@smartapp/ui/compositions/notify';
import {
  ResponsiveDialog,
  ResponsiveDialogFooter,
} from '@smartapp/ui/compositions/responsive-dialog';
import { initials } from '@smartapp/ui/compositions/shop-image';
import { copyText } from '@smartapp/ui/lib/copy-text';
import { cn } from 'cn';
import { dayLong } from '@/app/orders/calendar-days';
import {
  CUSTOMER_LOOK,
  CustomerKindChip,
  customerKind,
  customerLabel,
} from '@/app/orders/customer-kind';
import { ItemPhotos, PaymentChip } from '@/app/orders/order-card';
import { orderNoLabel } from '@/app/orders/order-ticket-label';
import { ORDER_TYPE_ICON } from '@/app/orders/order-type-icons';
import { StageChip } from '@/app/orders/stage-chip';

const W = ordersWords.bookings;

/** The customer's initials, tinted by who they are (member, first order, guest). */
export function CustomerAvatar({
  order,
  size = 'sm',
  className,
}: {
  order: BoardOrder;
  size?: 'sm' | 'default';
  className?: string | undefined;
}) {
  const look = CUSTOMER_LOOK[customerKind(order)];
  return (
    <Avatar size={size} className={cn('shrink-0', className)}>
      <AvatarFallback className={cn('font-semibold', look.avatar)}>
        {initials(order.customerName)}
      </AvatarFallback>
    </Avatar>
  );
}

/** Up to 3 customers' initials for a month day, then "+N" (the installed Avatar Group's overflow). */
export function CustomerStack({ orders }: { orders: readonly BoardOrder[] }) {
  if (orders.length === 0) return null;
  return (
    <AvatarGroup size={24} max={4} aria-hidden="true">
      {orders.map((o) => (
        <CustomerAvatar key={o.id} order={o} className="ring-2 ring-card" />
      ))}
    </AvatarGroup>
  );
}

/**
 * One order on the time grid (T85): the edge colour says who ordered, then their name, the time and how
 * it goes out, and the item photos when the block is tall enough. Words and icons back every colour.
 */
export function CalendarEventCard({ order, dragging }: { order: BoardOrder; dragging: boolean }) {
  const kind = customerKind(order);
  const TypeIcon = ORDER_TYPE_ICON[order.type];
  const toCheck = needsProofCheck(order);
  return (
    <div
      data-slot="calendar-order"
      className={cn(
        'flex size-full min-w-0 flex-col gap-0.5 overflow-hidden rounded-md border border-l-4 bg-card px-1.5 py-1 text-left text-xs text-card-foreground shadow-xs',
        CUSTOMER_LOOK[kind].bar,
        dragging && 'shadow-lg ring-2 ring-primary',
      )}
    >
      <span className="flex min-w-0 items-center gap-1">
        <CustomerAvatar order={order} />
        <span className="truncate text-sm font-semibold">{order.customerName}</span>
      </span>
      <span className="flex min-w-0 items-center gap-1 text-muted-foreground">
        <TypeIcon aria-hidden="true" className="size-3 shrink-0" />
        <span className="truncate tabular-nums">
          {formatClock(order.dueAt)} · {orderNoLabel(order.orderNo)}
        </span>
        {toCheck ? (
          <ShieldAlertIcon
            className="size-3.5 shrink-0 text-warning-text"
            role="img"
            aria-label={W.toCheck}
          />
        ) : null}
      </span>
      <span className="mt-0.5 flex min-w-0 items-center gap-1">
        {/* The total wins on a narrow card; the photos give way. */}
        <span className="flex min-w-0 overflow-hidden">
          <ItemPhotos order={order} />
        </span>
        <span className="ml-auto shrink-0 font-semibold tabular-nums">
          {formatPeso(order.total)}
        </span>
      </span>
      <span className="sr-only">{customerLabel(kind)}</span>
    </div>
  );
}

/**
 * One order on the week board (T86): always the column's full width, so a busy time stacks cards instead
 * of squeezing them. The edge colour says who ordered; then the name, how it goes out and the total.
 */
export function WeekOrderCard({
  order,
  onOpen,
  dragging = false,
  className,
}: {
  order: BoardOrder;
  onOpen?: ((order: BoardOrder) => void) | undefined;
  dragging?: boolean;
  className?: string | undefined;
}) {
  const kind = customerKind(order);
  const KindIcon = CUSTOMER_LOOK[kind].icon;
  const TypeIcon = ORDER_TYPE_ICON[order.type];
  const toCheck = needsProofCheck(order);
  const no = orderNoLabel(order.orderNo);
  return (
    <button
      type="button"
      data-slot="calendar-order"
      onClick={onOpen ? () => onOpen(order) : undefined}
      aria-label={W.eventAria(
        no,
        order.customerName,
        formatClock(order.dueAt),
        customerLabel(kind),
      )}
      className={cn(
        'flex w-full min-w-0 flex-col gap-1 rounded-lg border border-l-4 bg-card px-2 py-1.5 text-left text-xs text-card-foreground shadow-xs transition-shadow duration-base hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        CUSTOMER_LOOK[kind].bar,
        dragging && 'shadow-lg ring-2 ring-primary',
        className,
      )}
    >
      <span className="flex min-w-0 items-center gap-1">
        <span className="min-w-0 flex-1 truncate text-sm font-semibold">{order.customerName}</span>
        {toCheck ? (
          <ShieldAlertIcon
            className="size-3.5 shrink-0 text-warning-text"
            role="img"
            aria-label={W.toCheck}
          />
        ) : null}
      </span>
      <span className="flex min-w-0 items-center gap-1 text-muted-foreground">
        <span
          className={cn(
            'flex size-5 shrink-0 items-center justify-center rounded-full',
            CUSTOMER_LOOK[kind].avatar,
          )}
        >
          <KindIcon aria-hidden="true" className="size-3" />
        </span>
        <TypeIcon aria-hidden="true" className="size-3.5 shrink-0" />
        {/* The word gives way on a laptop's narrow columns; the icon and the card's name keep it said. */}
        <span className="min-w-0 flex-1 truncate lg:sr-only 2xl:not-sr-only 2xl:flex-1">
          {ordersWords.types[order.type]}
        </span>
        <span className="ml-auto shrink-0 font-semibold text-foreground tabular-nums">
          {formatPeso(order.total)}
        </span>
      </span>
    </button>
  );
}

/** The red "Now 2:15 PM" line in today's column and today's list (T86). */
export function NowLine({ now, className }: { now: Date; className?: string | undefined }) {
  return (
    <div
      role="note"
      data-slot="calendar-now"
      className={cn('flex items-center gap-1.5 text-xs font-bold text-destructive', className)}
    >
      <span className="size-2 shrink-0 rounded-full bg-destructive" aria-hidden="true" />
      <span className="shrink-0 tabular-nums">{W.nowLine(formatClock(now))}</span>
      <span className="h-px flex-1 bg-destructive" aria-hidden="true" />
    </div>
  );
}

/** A time above its cards: "10 AM" and, when it helps, "2 orders", "2 of 3" or "Full · 3 of 3". */
export function TimeLabel({
  label,
  count,
  full,
  className,
}: {
  label: string;
  count: string | null;
  full: boolean;
  className?: string | undefined;
}) {
  return (
    <div
      data-slot="calendar-time"
      className={cn(
        'flex min-w-0 items-baseline justify-between gap-2 text-xs font-bold text-muted-foreground tabular-nums',
        className,
      )}
    >
      <span className="shrink-0 text-foreground">{label}</span>
      {count ? (
        <span className={cn('truncate font-semibold', full && 'text-destructive')}>
          {full ? <BanIcon aria-hidden="true" className="mr-1 inline size-3 align-middle" /> : null}
          {count}
        </span>
      ) : null}
    </div>
  );
}

/**
 * One order in a day's list (phone List and Month, T85): the same facts as a Board card in one tap
 * target. Who ordered (colour + word), when, how, item photos, payment to check, the stage once it moved.
 */
export function CalendarOrderRow({
  order,
  shopKind,
  now,
  onOpen,
  className,
}: {
  order: BoardOrder;
  shopKind: ShopKind;
  now: Date;
  onOpen: (order: BoardOrder) => void;
  className?: string | undefined;
}) {
  const kind = customerKind(order);
  const TypeIcon = ORDER_TYPE_ICON[order.type];
  const stage = statusStage(order.status);
  const toCheck = needsProofCheck(order);
  const no = orderNoLabel(order.orderNo);
  return (
    <button
      type="button"
      data-slot="calendar-order-row"
      onClick={() => onOpen(order)}
      aria-label={W.eventAria(
        no,
        order.customerName,
        formatClock(order.dueAt),
        customerLabel(kind),
      )}
      className={cn(
        'flex w-full min-w-0 flex-col gap-2 rounded-xl border border-l-4 bg-card p-3 text-left text-card-foreground shadow-xs transition-shadow duration-base hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        CUSTOMER_LOOK[kind].bar,
        className,
      )}
    >
      <span className="flex min-w-0 items-center gap-2">
        <CustomerAvatar order={order} size="default" />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-base font-semibold">{order.customerName}</span>
          <span className="flex min-w-0 items-center gap-1 text-sm text-muted-foreground">
            <TypeIcon aria-hidden="true" className="size-3.5 shrink-0" />
            <span className="truncate">
              {ordersWords.types[order.type]} · {no}
            </span>
          </span>
        </span>
        <span className="shrink-0 text-base font-bold tabular-nums">
          {formatClock(order.dueAt)}
        </span>
      </span>
      <span className="flex min-w-0 flex-wrap items-center gap-1.5">
        <CustomerKindChip kind={kind} />
        {stage && stage !== 'new' ? <StageChip stage={stage} kind={shopKind} /> : null}
        {toCheck ? <PaymentChip order={order} now={now} /> : null}
        <span className="ml-auto flex items-center gap-2">
          <ItemPhotos order={order} />
          <span className="text-sm font-semibold tabular-nums">{formatPeso(order.total)}</span>
        </span>
      </span>
      {order.note ? (
        <span className="flex items-start gap-1.5 rounded-lg bg-warning-soft px-2 py-1.5 text-xs text-warning-soft-foreground">
          <MessageSquareTextIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          <span className="line-clamp-2 break-words">{order.note}</span>
        </span>
      ) : null}
    </button>
  );
}

// ---------------------------------------------------------------- What to make

interface MakeLine {
  key: string;
  name: string;
  detail: string;
  qty: number;
}

/** Item totals for a day's orders, biggest first (lines past the card's 8 are counted, not named). */
export function makeList(orders: readonly BoardOrder[]): { lines: MakeLine[]; more: number } {
  const map = new Map<string, MakeLine>();
  let more = 0;
  for (const o of orders) {
    more += o.moreLines;
    for (const l of o.lines) {
      const detail = [l.variantLabel, ...l.optionLabels].filter(Boolean).join(' · ');
      const key = `${l.name}|${detail}`;
      const found = map.get(key);
      if (found) found.qty += l.qty;
      else map.set(key, { key, name: l.name, detail, qty: l.qty });
    }
  }
  const lines = [...map.values()].sort((a, b) => b.qty - a.qty || a.name.localeCompare(b.name));
  return { lines, more };
}

export function WhatToMakeButton({
  onClick,
  className,
  compact = false,
}: {
  onClick: () => void;
  className?: string | undefined;
  compact?: boolean;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      aria-label={compact ? W.whatToMake : undefined}
      className={cn('h-11 gap-1.5 rounded-full font-semibold md:h-8', className)}
    >
      <ClipboardListIcon aria-hidden="true" />
      {compact ? null : W.whatToMake}
    </Button>
  );
}

/** Copies a day's "What to make" list, with the customers' notes under it. */
async function copyMakeList(day: string, orders: readonly BoardOrder[]) {
  const { lines } = makeList(orders);
  const notes = orders.filter((o) => o.note);
  const text = [
    W.copyHeading(day),
    ...lines.map((l) => `${l.qty} × ${l.name}${l.detail ? ` (${l.detail})` : ''}`),
    ...(notes.length > 0
      ? [
          '',
          W.orderNotes,
          ...notes.map((o) => `${formatClock(o.dueAt)} ${o.customerName}: ${o.note ?? ''}`),
        ]
      : []),
  ].join('\n');
  const ok = await copyText(text);
  notify(ok ? { title: W.listCopied, tone: 'success' } : { title: W.copyFailed, tone: 'error' });
}

/** The list itself: item totals, biggest first, then the customers' notes. */
export function MakeList({ orders }: { orders: readonly BoardOrder[] }) {
  const { lines, more } = makeList(orders);
  const notes = orders.filter((o) => o.note);
  if (lines.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{W.whatToMakeEmpty}</p>;
  }
  return (
    <div className="flex flex-col gap-4">
      <ul className="divide-y rounded-xl border">
        {lines.map((l) => (
          <li key={l.key} className="flex items-center gap-3 px-3 py-2.5">
            <span className="min-w-0 flex-1">
              <span className="block font-medium break-words">{l.name}</span>
              {l.detail ? (
                <span className="block text-xs break-words text-muted-foreground">{l.detail}</span>
              ) : null}
            </span>
            <span className="text-lg font-bold tabular-nums">{l.qty}</span>
          </li>
        ))}
      </ul>
      {more > 0 ? <p className="text-xs text-muted-foreground">{W.whatToMakeMore(more)}</p> : null}
      {notes.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
            {W.orderNotes}
          </h3>
          {notes.map((o) => (
            <p
              key={o.id}
              className="flex items-start gap-2 rounded-lg bg-warning-soft px-3 py-2 text-sm text-warning-soft-foreground"
            >
              <MessageSquareTextIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span className="min-w-0 break-words">
                <span className="font-semibold tabular-nums">{formatClock(o.dueAt)}</span>{' '}
                {o.customerName}: {o.note}
              </span>
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function CopyListButton({
  day,
  orders,
  className,
}: {
  day: string;
  orders: readonly BoardOrder[];
  className?: string | undefined;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      disabled={makeList(orders).lines.length === 0}
      onClick={() => void copyMakeList(day, orders)}
      className={cn('h-11 w-full gap-1.5 font-semibold md:h-9', className)}
    >
      <CopyIcon aria-hidden="true" />
      {W.copyList}
    </Button>
  );
}

/** "What to make" for one day (T85): item totals and the customers' notes, with Copy list. */
export function WhatToMakeDialog({
  date,
  orders,
  onOpenChange,
}: {
  date: string | null;
  orders: readonly BoardOrder[];
  onOpenChange: (open: boolean) => void;
}) {
  const [lastDate, setLastDate] = React.useState(date);
  if (date && date !== lastDate) setLastDate(date);
  const shownDate = date ?? lastDate ?? '';
  const day = shownDate ? dayLong(shownDate) : '';
  return (
    <ResponsiveDialog
      open={date !== null}
      onOpenChange={onOpenChange}
      title={W.whatToMakeTitle(day)}
      description={W.whatToMakeDesc(orders.length)}
      scroll
    >
      <MakeList orders={orders} />
      <ResponsiveDialogFooter>
        <CopyListButton day={day} orders={orders} />
      </ResponsiveDialogFooter>
    </ResponsiveDialog>
  );
}
