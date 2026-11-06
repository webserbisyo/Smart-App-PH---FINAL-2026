import * as React from 'react';
import {
  ArrowDownRightIcon,
  ArrowRightIcon,
  ArrowUpRightIcon,
  ReceiptTextIcon,
  StampIcon,
  WalletIcon,
  type LucideIcon,
} from 'lucide-react';
import { Link } from '@tanstack/react-router';
import {
  formatClock,
  formatPeso,
  homeWords,
  pacePercent,
  type HomeSummary,
  type PaceVerdict,
} from '@smartapp/core';
import { Progress } from '@smartapp/ui/components/progress';
import { Badge } from '@smartapp/ui/components/reui/badge';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import {
  Stat,
  StatDescription,
  StatIndicator,
  StatLabel,
  StatValue,
} from '@smartapp/ui/components/stat';
import { cssVars } from '@smartapp/ui/lib/css-vars';
import { cn } from 'cn';
import { clockText } from './home-hello.js';
import { CARD } from './home-card.js';

const W = homeWords.today;
// Recharts loads only when the tiles show (T57).
const SparkLine = React.lazy(() => import('./spark-line.js'));

// A tile is one link: the whole card opens the right place.
const TILE_LINK =
  'group min-w-0 rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none';

const VERDICT: Readonly<
  Record<
    PaceVerdict,
    { icon: LucideIcon; variant: 'success-light' | 'secondary' | 'warning-light' }
  >
> = {
  ahead: { icon: ArrowUpRightIcon, variant: 'success-light' },
  about: { icon: ArrowRightIcon, variant: 'secondary' },
  behind: { icon: ArrowDownRightIcon, variant: 'warning-light' },
};

function PaceBar({ summary }: { summary: HomeSummary }) {
  const { pace, today, businessDate } = summary;
  if (pace.usualDay === null || pace.usualByNow === null) {
    return <p className="text-sm text-muted-foreground">{W.learning(pace.daysUsed)}</p>;
  }
  const value = pacePercent(today.sales, pace.usualDay);
  const mark = pacePercent(pace.usualByNow, pace.usualDay);
  const verdict = pace.verdict ? VERDICT[pace.verdict] : null;
  const VerdictIcon = verdict?.icon;
  const first = clockText(pace.usualFirstOrder);
  return (
    <div className="flex flex-col gap-2">
      <div className="relative pt-5">
        <span
          style={cssVars({ '--mark': `${mark}%` })}
          className={cn(
            'absolute top-0 left-(--mark) text-xs whitespace-nowrap text-muted-foreground',
            mark < 15 ? '' : mark > 85 ? '-translate-x-full' : '-translate-x-1/2',
          )}
        >
          {W.usualByNow}
        </span>
        <Progress value={value} aria-label={W.paceAria(value)} className="progress-thick" />
        <span
          aria-hidden="true"
          style={cssVars({ '--mark': `${mark}%` })}
          className="absolute bottom-0 left-(--mark) h-4.5 w-0.5 -translate-x-1/2 translate-y-1 rounded-full bg-foreground"
        />
      </div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {verdict && VerdictIcon && pace.verdict ? (
          <Badge variant={verdict.variant} radius="full" className="gap-1 font-semibold">
            <VerdictIcon aria-hidden="true" />
            {W.pace[pace.verdict]}
          </Badge>
        ) : null}
        <p className="min-w-0 flex-1 text-sm text-muted-foreground md:text-right">
          {(today.orders === 0 || pace.usualByNow === 0) && first
            ? W.firstOrder(businessDate, first)
            : W.paceLine(
                businessDate,
                formatPeso(pace.usualByNow),
                formatClock(summary.asOf),
                formatPeso(pace.usualDay),
              )}
        </p>
      </div>
    </div>
  );
}

function Tile({
  label,
  icon,
  value,
  note,
  spark,
}: {
  label: string;
  icon: React.ReactNode;
  value: React.ReactNode;
  note: React.ReactNode;
  spark: React.ReactNode;
}) {
  return (
    <Stat className="h-full min-w-0 gap-y-0.5 overflow-hidden rounded-xl p-3 shadow-none transition duration-base group-hover:-translate-y-0.5 group-hover:shadow-md motion-reduce:transition-none motion-reduce:group-hover:translate-y-0">
      <StatLabel className="truncate text-xs">{label}</StatLabel>
      <StatIndicator
        variant="icon"
        aria-hidden="true"
        className="size-7 rounded-lg border-0 bg-muted text-muted-foreground"
      >
        {icon}
      </StatIndicator>
      <StatValue className="truncate text-lg font-extrabold tabular-nums sm:text-xl">
        {value}
      </StatValue>
      <StatDescription className="flex min-w-0 flex-col gap-1">
        <span className="truncate">{note}</span>
        {spark}
      </StatDescription>
    </Stat>
  );
}

function Spark({
  values,
  label,
  tone,
}: {
  values: readonly number[];
  label: string;
  tone?: 'member';
}) {
  return (
    <React.Suspense fallback={<Skeleton className="h-8 w-full rounded" />}>
      <SparkLine values={values} label={W.sparkAria(label)} {...(tone ? { tone } : {})} />
    </React.Suspense>
  );
}

/** Today (H2 to H6): sales against a usual weekday in words, then four tiles with the last 7 days. */
export function TodayCard({
  summary,
  openNow,
  wide,
  className,
}: {
  summary: HomeSummary;
  openNow: number;
  // Wide when the card has the whole row; beside the needs list four tiles get too narrow for big amounts.
  wide: boolean;
  className?: string | undefined;
}) {
  const { today, members, sparks } = summary;
  const collectedShare = today.sales > 0 ? Math.round((today.collected / today.sales) * 100) : 0;
  return (
    <section aria-labelledby="today-title" className={cn(CARD, 'gap-4', className)}>
      <div className="flex flex-col gap-0.5">
        <h2 id="today-title" className="text-sm text-muted-foreground">
          {W.sales} · {W.orders(today.orders)}
        </h2>
        <p
          className={cn(
            'text-4xl font-extrabold tracking-tight tabular-nums md:text-5xl',
            today.orders === 0 && 'text-muted-foreground',
          )}
        >
          {formatPeso(today.sales)}
        </p>
      </div>
      <PaceBar summary={summary} />
      <div
        className={cn(
          'grid grid-cols-2 gap-2 md:gap-3',
          wide ? 'xl:grid-cols-4' : '2xl:grid-cols-4',
        )}
      >
        <Link to="/orders" className={TILE_LINK}>
          <Tile
            label={W.tiles.orders}
            icon={<ReceiptTextIcon />}
            value={today.orders}
            note={W.tiles.openNow(openNow)}
            spark={<Spark values={sparks.orders} label={W.tiles.orders} />}
          />
        </Link>
        <Link to="/orders" search={{ view: 'list', day: 'today' }} className={TILE_LINK}>
          <Tile
            label={W.tiles.average}
            icon={<ReceiptTextIcon />}
            value={today.average === null ? '—' : formatPeso(today.average)}
            note={today.average === null ? W.tiles.averageWait : W.tiles.averageHint}
            spark={<Spark values={sparks.average} label={W.tiles.average} />}
          />
        </Link>
        <Link to="/orders" search={{ view: 'list', day: 'today' }} className={TILE_LINK}>
          <Tile
            label={W.tiles.toCollect}
            icon={<WalletIcon />}
            value={formatPeso(today.toCollect)}
            note={W.tiles.toCollectHint}
            spark={
              <span className="flex flex-col gap-1 pt-1">
                <Progress
                  value={collectedShare}
                  aria-label={W.tiles.collected(formatPeso(today.collected))}
                  className="progress-success"
                />
                <span className="truncate tabular-nums">
                  {W.tiles.collected(formatPeso(today.collected))}
                </span>
              </span>
            }
          />
        </Link>
        <Link to="/members" className={TILE_LINK}>
          <Tile
            label={W.tiles.members}
            icon={<StampIcon />}
            value={members.cardOn ? members.stamps : '—'}
            note={members.cardOn ? W.tiles.membersHint(members.joined) : W.tiles.cardOff}
            spark={<Spark values={sparks.joined} label={W.tiles.members} tone="member" />}
          />
        </Link>
      </div>
    </section>
  );
}
