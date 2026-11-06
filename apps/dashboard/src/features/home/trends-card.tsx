import * as React from 'react';
import { ArrowDownRightIcon, ArrowUpRightIcon, MinusIcon } from 'lucide-react';
import { useRouterState } from '@tanstack/react-router';
import {
  formatManila,
  formatPeso,
  formatPesoShort,
  homeWords,
  manilaToDate,
  percentChange,
  RANGE_DAYS,
  type HomeTrends,
} from '@smartapp/core';
import { useHomeTrends } from '@smartapp/data';
import { Button } from '@smartapp/ui/components/button';
import { Badge } from '@smartapp/ui/components/reui/badge';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { cn } from 'cn';
import { HomeCard, Segmented } from './home-card.js';
import { useHomeRange, useSetHomeRange } from './search.js';

const W = homeWords.trends;
const TrendChart = React.lazy(() => import('./trend-chart.js'));

function Change({ recent, before }: { recent: number; before: number }) {
  const change = percentChange(recent, before);
  if (change === null) return null;
  if (change === 0) {
    return (
      <Badge variant="secondary" radius="full" size="sm" className="gap-1">
        <MinusIcon aria-hidden="true" />
        {W.same}
      </Badge>
    );
  }
  const up = change > 0;
  const Icon = up ? ArrowUpRightIcon : ArrowDownRightIcon;
  return (
    <Badge
      variant={up ? 'success-light' : 'warning-light'}
      radius="full"
      size="sm"
      className="gap-1 tabular-nums"
      aria-label={W.changeAria(change)}
    >
      <Icon aria-hidden="true" />
      {W.change(change)}
    </Badge>
  );
}

function Total({
  label,
  value,
  recent,
  before,
}: {
  label: string;
  value: string;
  recent: number;
  before: number;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-xl border p-3">
      <span className="truncate text-xs text-muted-foreground">{label}</span>
      <span className="truncate text-lg font-extrabold tabular-nums">{value}</span>
      <span className="flex min-h-5 items-center">
        <Change recent={recent} before={before} />
      </span>
    </div>
  );
}

function TrendsBody({ trends }: { trends: HomeTrends }) {
  const { totals, totalsBefore, bestDay } = trends;
  const average = totals.orders > 0 ? Math.round(totals.sales / totals.orders) : null;
  const averageBefore =
    totalsBefore.orders > 0 ? Math.round(totalsBefore.sales / totalsBefore.orders) : 0;
  if (totals.orders === 0 && totalsBefore.orders === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{W.empty}</p>;
  }
  return (
    <>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
        <Total
          label={W.sales}
          value={formatPesoShort(totals.sales)}
          recent={totals.sales}
          before={totalsBefore.sales}
        />
        <Total
          label={W.orders}
          value={totals.orders.toLocaleString('en-PH')}
          recent={totals.orders}
          before={totalsBefore.orders}
        />
        <Total
          label={W.average}
          value={average === null ? '—' : formatPeso(average)}
          recent={average ?? 0}
          before={averageBefore}
        />
        <Total
          label={W.joined}
          value={String(totals.joined)}
          recent={totals.joined}
          before={totalsBefore.joined}
        />
      </div>
      <React.Suspense fallback={<Skeleton className="h-52 w-full rounded-lg md:h-60" />}>
        <TrendChart days={trends.days} before={trends.before} />
      </React.Suspense>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="size-2.5 rounded-sm bg-chart-1" />
            {W.sales}
          </span>
          <span className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="w-4 border-t-2 border-dashed border-muted-foreground"
            />
            {W.before}
          </span>
        </span>
        {bestDay ? (
          <span className="text-foreground">
            {W.bestDay(
              formatManila(manilaToDate(bestDay.date, '12:00'), 'date'),
              formatPeso(bestDay.sales),
              bestDay.orders,
            )}
          </span>
        ) : null}
      </div>
    </>
  );
}

/** Last 7 or 30 days (H12): totals with % change against the days before, and the daily chart. */
export function TrendsCard({ className }: { className?: string | undefined }) {
  const range = useHomeRange();
  const setRange = useSetHomeRange();
  const trends = useHomeTrends(range);
  const days = RANGE_DAYS[range];
  const hash = useRouterState({ select: (s) => s.location.hash });
  const ref = React.useRef<HTMLDivElement>(null);
  const ready = trends.data !== undefined;

  // /insights and Home#trends land here once the numbers are in.
  React.useEffect(() => {
    if (hash === 'trends' && ready) ref.current?.scrollIntoView({ block: 'start' });
  }, [hash, ready]);

  return (
    <div ref={ref} className={cn('min-w-0 scroll-mt-20', className)}>
      <HomeCard
        id="trends"
        title={W.title(days)}
        hint={W.hint(days)}
        className="h-full"
        action={
          <Segmented
            label={W.rangeLabel}
            value={range}
            onChange={setRange}
            options={[
              { value: '7d', label: W.range['7d'] },
              { value: '30d', label: W.range['30d'] },
            ]}
          />
        }
      >
        {trends.data ? (
          <div
            className={cn(
              'flex flex-col gap-3 transition-opacity duration-base motion-reduce:transition-none',
              trends.isPlaceholderData && 'opacity-60',
            )}
          >
            <TrendsBody trends={trends.data} />
          </div>
        ) : trends.isError ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center text-sm">
            <p className="text-muted-foreground">{homeWords.states.errorCard}</p>
            <Button variant="outline" className="h-11 md:h-9" onClick={() => void trends.refetch()}>
              {homeWords.states.tryAgain}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3" aria-hidden="true">
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-20 rounded-xl" />
              ))}
            </div>
            <Skeleton className="h-52 w-full rounded-lg md:h-60" />
          </div>
        )}
      </HomeCard>
    </div>
  );
}
