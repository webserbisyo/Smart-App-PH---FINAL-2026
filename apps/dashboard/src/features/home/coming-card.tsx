import { Link } from '@tanstack/react-router';
import {
  formatManila,
  formatPeso,
  formatPesoShort,
  homeWords,
  manilaToDate,
  type HomeBookingDay,
} from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import { cssVars } from '@smartapp/ui/lib/css-vars';
import { HomeCard } from './home-card.js';

const W = homeWords.coming;

/** True when any of the next 7 days has a booking; the card is hidden otherwise. */
export function hasBookings(days: readonly HomeBookingDay[]): boolean {
  return days.some((d) => d.orders > 0);
}

/** Coming up: bookings for each of the next 7 days, tallest day first to the eye. Each day opens Orders. */
export function ComingCard({
  days,
  className,
}: {
  days: readonly HomeBookingDay[];
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
    </HomeCard>
  );
}
