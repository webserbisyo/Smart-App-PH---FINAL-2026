import * as React from 'react';
import {
  formatManila,
  homeWords,
  manilaParts,
  manilaToDate,
  type HomeSummary,
} from '@smartapp/core';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { HomeCard, Segmented } from './home-card.js';

const W = homeWords.hours;
const HourChart = React.lazy(() => import('./hour-chart.js'));

type Metric = 'sales' | 'orders';

/** Hour by hour (H7): today against a usual weekday, Sales or Orders. */
export function HourCard({
  summary,
  className,
}: {
  summary: HomeSummary;
  className?: string | undefined;
}) {
  const [metric, setMetric] = React.useState<Metric>('sales');
  const isToday = summary.hoursDate === summary.businessDate;
  const usualLabel = W.usual(summary.hoursDate);
  const todayLabel = isToday
    ? W.today
    : formatManila(manilaToDate(summary.hoursDate, '12:00'), 'day');
  const peak = summary.hours.reduce<{ hour: number; v: number } | null>((top, h) => {
    const v = metric === 'sales' ? h.sales : h.orders;
    return v > 0 && (top === null || v > top.v) ? { hour: h.hour, v } : top;
  }, null);
  const hint = isToday
    ? W.hint(summary.hoursDate)
    : W.lastDay(formatManila(manilaToDate(summary.hoursDate, '12:00'), 'date'));
  return (
    <HomeCard
      id="hours"
      title={W.title}
      hint={hint}
      className={className}
      action={
        <Segmented
          label={W.title}
          value={metric}
          onChange={setMetric}
          options={[
            { value: 'sales', label: W.sales },
            { value: 'orders', label: W.orders },
          ]}
        />
      }
    >
      {summary.hours.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">{W.empty}</p>
      ) : (
        <React.Suspense fallback={<Skeleton className="h-52 w-full rounded-lg md:h-60" />}>
          <HourChart
            hours={summary.hours}
            metric={metric}
            nowHour={isToday ? manilaParts(summary.asOf).hour : null}
            usualLabel={usualLabel}
            todayLabel={todayLabel}
          />
        </React.Suspense>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="size-2.5 rounded-sm bg-chart-1" />
            {todayLabel}
          </span>
          <span className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="size-2.5 rounded-sm border border-muted-foreground/60 bg-muted-foreground/25"
            />
            {usualLabel}
          </span>
        </span>
        {peak ? (
          <span>
            {isToday ? W.busiest : W.busiestDay}{' '}
            <span className="font-semibold text-foreground">{W.hour(peak.hour)}</span>
          </span>
        ) : null}
      </div>
    </HomeCard>
  );
}
