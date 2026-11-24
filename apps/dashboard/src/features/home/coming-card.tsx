import { Link } from '@tanstack/react-router';
import { CircleCheckIcon, HourglassIcon, WalletIcon } from 'lucide-react';
import {
  addDays,
  awaitsTransfer,
  balanceOf,
  formatManila,
  formatPeso,
  formatPesoShort,
  homeWords,
  manilaDate,
  manilaToDate,
  ordersWords,
  type BoardOrder,
  type HomeBookingDay,
} from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import { Badge } from '@smartapp/ui/components/reui/badge';
import { cssVars } from '@smartapp/ui/lib/css-vars';
import { HomeCard } from '@/app/home/home-card';
import { PhotoStack } from '@/app/orders/item-photo';
import { orderNoLabel } from '@/app/orders/order-ticket-label';

const W = homeWords.coming;

/** True when any of the next 7 days has a booking; the card is hidden otherwise. */
export function hasBookings(days: readonly HomeBookingDay[]): boolean {
  return days.some((d) => d.orders > 0);
}

/**
 * Upcoming (T113, was Coming up): bookings for each of the next 7 days as bars, then the next booked
 * orders with their photos and what is still owed. Each day and each order opens Orders.
 */
export function ComingCard({
  days,
  upcoming,
  upcomingCount,
  today,
  className,
}: {
  days: readonly HomeBookingDay[];
  upcoming: readonly BoardOrder[];
  upcomingCount: number;
  today: string;
  className?: string | undefined;
}) {
  const top = Math.max(1, ...days.map((d) => d.orders));
  return (
    <HomeCard
      id="coming"
      title={W.title}
      hint={W.hint}
      className={className}
      action={
        <Button
          variant="link"
          className="h-auto px-0 font-semibold"
          nativeButton={false}
          render={<Link to="/orders" search={{ view: 'list', day: 'upcoming' }} />}
        >
          {W.open}
        </Button>
      }
    >
      <ol className="grid grid-cols-7 gap-1">
        {days.map((d, i) => {
          const at = manilaToDate(d.date, '12:00');
          const day = i === 0 ? W.tomorrow : formatManila(at, 'date');
          const height = d.orders > 0 ? Math.max(8, Math.round((d.orders / top) * 100)) : 0;
          return (
            <li key={d.date} className="min-w-0">
              <Link
                to="/orders"
                search={{ view: 'list', day: d.date }}
                aria-label={W.dayAria(day, d.orders, formatPeso(d.sales))}
                className="flex min-h-11 flex-col items-center gap-1 rounded-lg py-1 text-center hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <span aria-hidden="true" className="text-xs text-muted-foreground">
                  {formatManila(at, 'day')}
                </span>
                <span
                  aria-hidden="true"
                  className="flex h-16 w-full max-w-8 items-end overflow-hidden rounded-md bg-muted"
                >
                  <span
                    style={cssVars({ '--bar': `${height}%` })}
                    className="block h-(--bar) w-full rounded-md bg-chart-1"
                  />
                </span>
                <span aria-hidden="true" className="text-sm font-bold tabular-nums">
                  {d.orders}
                </span>
                <span
                  aria-hidden="true"
                  className="w-full truncate text-xs text-muted-foreground tabular-nums"
                >
                  {d.sales > 0 ? formatPesoShort(d.sales) : W.none}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
      <UpcomingList orders={upcoming} count={upcomingCount} today={today} />
    </HomeCard>
  );
}

/** When a booked order is due: "Tomorrow, 3:00 PM" or "Fri 28 Nov, 3:00 PM · in 3 days". */
function dueWords(dueAt: string, today: string): { when: string; soon: string | null } {
  const day = manilaDate(dueAt);
  const at = formatManila(dueAt, 'time');
  let n = 0;
  while (n < 60 && addDays(today, n) < day) n += 1;
  if (n <= 1) return { when: `${W.tomorrowShort}, ${at}`, soon: null };
  return { when: `${formatManila(dueAt, 'date')}, ${at}`, soon: W.inDays(n) };
}

/**
 * Money on a booked order (T113): yellow when something is still owed and needs chasing (a deposit's
 * balance, a transfer not paid yet); grey for cash paid on pickup, which is normal; green when paid.
 */
function MoneyChip({ order }: { order: BoardOrder }) {
  const method = ordersWords.ticket.methodShort[order.paymentMethod];
  if (order.paymentStatus === 'paid') {
    return (
      <Badge variant="success-light" size="sm" radius="full" className="gap-1 font-semibold">
        <CircleCheckIcon aria-hidden="true" />
        {W.paid}
      </Badge>
    );
  }
  const due = balanceOf({ total: order.total, paidAmount: order.paidAmount }).due;
  if (order.paidAmount > 0 && due > 0) {
    return (
      <Badge
        variant="warning-light"
        size="sm"
        radius="full"
        className="gap-1 font-semibold tabular-nums"
      >
        <WalletIcon aria-hidden="true" />
        {W.left(formatPeso(due))}
      </Badge>
    );
  }
  if (awaitsTransfer(order)) {
    return (
      <Badge variant="warning-light" size="sm" radius="full" className="gap-1 font-semibold">
        <HourglassIcon aria-hidden="true" />
        {W.notPaid(method)}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" size="sm" radius="full" className="text-muted-foreground">
      {W.onHandover(method)}
    </Badge>
  );
}

/** The next booked orders, soonest first (T113): photos, who, when, total and what is still owed. */
function UpcomingList({
  orders,
  count,
  today,
}: {
  orders: readonly BoardOrder[];
  count: number;
  today: string;
}) {
  if (orders.length === 0) return null;
  return (
    <div className="flex flex-col gap-1 border-t pt-3">
      <h3 className="sr-only">{W.listLabel}</h3>
      <ul className="flex flex-col divide-y">
        {orders.map((order) => {
          const due = dueWords(order.dueAt, today);
          const no = orderNoLabel(order.orderNo);
          return (
            <li key={order.id}>
              <Link
                to="/orders"
                search={{ order: order.id }}
                aria-label={W.rowAria(no, order.customerName, due.when, formatPeso(order.total))}
                className="-mx-2 flex min-h-14 items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <PhotoStack
                  lines={order.lines}
                  label={ordersWords.ticket.photosAria(order.lines.length + order.moreLines)}
                  className="shrink-0"
                />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-sm font-semibold">{order.customerName}</span>
                  <span className="truncate text-xs text-muted-foreground tabular-nums">
                    {due.when}
                    {due.soon ? ` · ${due.soon}` : ''}
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-sm font-bold tabular-nums">{formatPeso(order.total)}</span>
                  <MoneyChip order={order} />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      {count > orders.length ? (
        <Button
          variant="link"
          className="h-11 self-start px-0 font-semibold md:h-9"
          nativeButton={false}
          render={<Link to="/orders" search={{ view: 'list', day: 'upcoming' }} />}
        >
          {W.seeAll(count)}
        </Button>
      ) : null}
    </div>
  );
}
