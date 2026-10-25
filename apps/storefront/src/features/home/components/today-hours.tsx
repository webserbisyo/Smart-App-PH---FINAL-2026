'use client';

import { ClockIcon } from 'lucide-react';
import { formatClock, manilaDate, manilaToDate, weekdayOf, words } from '@smartapp/core';
import { useNow } from '@smartapp/data';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { OpenState } from '../../shell/components/open-state';
import { useShop } from '../../shell/components/shop-context';

// Today's opening hours in Manila time, with the open state (T06 builds the full hours table).
export function TodayHours() {
  const { shop } = useShop();
  const now = useNow();
  if (!now) return <Skeleton className="h-16 w-full rounded-xl" />;
  const sf = shop.storefront;
  const today = manilaDate(now);
  const closed = sf.closures.some((c) => c.date === today);
  const ranges = closed ? [] : sf.hours.filter((h) => h.day === weekdayOf(today));
  return (
    <section className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
      <h2 className="flex items-center gap-2 text-base font-semibold">
        <ClockIcon aria-hidden="true" className="size-4 text-muted-foreground" />
        {words.storefrontShell.home.todayHours}
      </h2>
      <OpenState />
      <p className="text-sm text-muted-foreground">
        {ranges.length === 0
          ? words.storefrontShell.home.closedToday
          : ranges
              .map((r) =>
                words.storefrontShell.home.hoursRange(
                  formatClock(manilaToDate(today, r.open)),
                  formatClock(manilaToDate(today, r.close)),
                ),
              )
              .join(', ')}
      </p>
    </section>
  );
}
