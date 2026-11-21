import * as React from 'react';
import { FlameIcon } from 'lucide-react';
import {
  formatManila,
  formatPeso,
  homeWords,
  manilaParts,
  manilaToDate,
  type HomePeriodData,
} from '@smartapp/core';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { HomeCard } from './home-card.js';

const W = homeWords.sales;
const H = homeWords.hours;
// Recharts loads only when Home shows (T57).
const SalesChart = React.lazy(() => import('./sales-chart.js'));

/** The one busiest line under the chart (T83), in place of the old heat map. */
function busiestLine(data: HomePeriodData, live: boolean): React.ReactNode {
  if (data.step === 'hour') {
    if (data.busiestHour === null) return null;
    return (
      <>
        {live ? W.rushSoFar : W.rush}{' '}
        <span className="font-semibold text-foreground">{H.hour(data.busiestHour)}</span>
      </>
    );
  }
  const day = data.slots.find((s) => s.date === data.busiestDay);
  if (!day || data.busiestDay === null) return null;
  const dayText = formatManila(manilaToDate(data.busiestDay, '12:00'), 'date');
  return (
    <>
      <span className="font-semibold text-foreground">
        {W.busiestDay(dayText, formatPeso(day.sales))}
      </span>
      {data.busiestHour !== null ? ` ${W.usualHour(H.hour(data.busiestHour))}` : null}
    </>
  );
}

/** Sales by hour for one day, by day for longer periods (T83), with the busiest hour or day in words. */
export function SalesCard({
  data,
  periodText,
  live,
  asOf,
  className,
}: {
  data: HomePeriodData;
  periodText: string;
  live: boolean;
  asOf: Date;
  className?: string | undefined;
}) {
  const empty = data.money.orders === 0;
  const line = busiestLine(data, live);
  return (
    <HomeCard
      id="sales"
      title={data.step === 'hour' ? W.byHour : W.byDay}
      hint={periodText}
      className={className}
    >
      {data.slots.length === 0 ? (
        <p className="flex h-52 items-center justify-center text-center text-sm text-muted-foreground md:h-60">
          {W.closed}
        </p>
      ) : (
        <div
          role="img"
          aria-label={W.chartAria(periodText, formatPeso(data.money.sales))}
          className="relative"
        >
          <React.Suspense fallback={<Skeleton className="h-52 w-full rounded-lg md:h-60" />}>
            <SalesChart
              slots={data.slots}
              nowHour={live && data.step === 'hour' ? manilaParts(asOf).hour : null}
            />
          </React.Suspense>
          {empty ? (
            <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
              {live ? W.empty : W.emptyPast}
            </p>
          ) : null}
        </div>
      )}
      <p className="flex min-h-5 items-center gap-1.5 text-xs text-muted-foreground">
        {line ? (
          <>
            <FlameIcon aria-hidden="true" className="size-3.5 shrink-0 text-warning-text" />
            <span>{line}</span>
          </>
        ) : null}
      </p>
    </HomeCard>
  );
}
