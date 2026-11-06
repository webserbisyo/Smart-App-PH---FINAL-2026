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
import { formatPeso, homeWords, type HomeSummary, type PaceVerdict } from '@smartapp/core';
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
import { cn } from 'cn';
import { clockText } from './home-hello.js';
import { CARD } from './home-card.js';

const W = homeWords.today;
// Recharts loads only when Home shows (T57).
const TodayRing = React.lazy(() => import('./today-ring.js'));

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

/** Today against a usual weekday (T77): a ring with the amount in the middle and the gap in words. */
function Pace({ summary }: { summary: HomeSummary }) {
  const { pace, today, businessDate } = summary;
  const amount = (
    <p
      className={cn(
        'text-4xl font-extrabold tracking-tight tabular-nums md:text-5xl',
        today.orders === 0 && 'text-muted-foreground',
      )}
    >
      {formatPeso(today.sales)}
    </p>
  );
  if (pace.usualDay === null || pace.usualByNow === null) {
    return (
      <div className="flex flex-col gap-1">
        {amount}
        <p className="text-sm text-muted-foreground">{W.learning(pace.daysUsed)}</p>
      </div>
    );
  }
  const first = clockText(pace.usualFirstOrder);
  const verdict = pace.verdict ? VERDICT[pace.verdict] : null;
  const VerdictIcon = verdict?.icon;
  const gap = Math.abs(today.sales - pace.usualByNow);
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
      <div
        role="img"
        aria-label={W.ringAria(formatPeso(today.sales), formatPeso(pace.usualByNow))}
        className="relative size-48 shrink-0"
      >
        <React.Suspense fallback={<Skeleton className="size-full rounded-full" />}>
          <TodayRing
            sales={today.sales}
            usualByNow={pace.usualByNow}
            usualDay={pace.usualDay}
            todayLabel={W.ringToday}
            usualLabel={W.ringUsual}
          />
        </React.Suspense>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center"
        >
          <span
            className={cn(
              'text-xl font-extrabold tracking-tight tabular-nums md:text-2xl',
              today.orders === 0 && 'text-muted-foreground',
            )}
          >
            {formatPeso(today.sales)}
          </span>
          <span className="text-xs text-muted-foreground">{W.soFar}</span>
        </div>
      </div>
      <div className="flex w-full min-w-0 flex-1 flex-col gap-2">
        {verdict && VerdictIcon && pace.verdict ? (
          <Badge variant={verdict.variant} radius="full" className="gap-1 self-start font-semibold">
            <VerdictIcon aria-hidden="true" />
            {W.pace[pace.verdict]}
          </Badge>
        ) : null}
        <p className="text-base font-semibold text-balance">
          {(today.orders === 0 || pace.usualByNow === 0) && first
            ? W.firstOrder(businessDate, first)
            : W.gap(pace.verdict ?? 'about', formatPeso(gap), businessDate)}
        </p>
        <ul className="flex flex-col gap-1 text-sm">
          <li className="flex items-center gap-2">
            <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full bg-chart-1" />
            <span className="flex-1 text-muted-foreground">{W.ringToday}</span>
            <span className="font-semibold tabular-nums">{formatPeso(today.sales)}</span>
          </li>
          <li className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="size-2.5 shrink-0 rounded-full bg-muted-foreground/45"
            />
            <span className="flex-1 text-muted-foreground">{W.ringUsual}</span>
            <span className="font-semibold tabular-nums">{formatPeso(pace.usualByNow)}</span>
          </li>
        </ul>
        <p className="text-sm text-muted-foreground">
          {W.endsNear(businessDate, formatPeso(pace.usualDay))}
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
  extra,
}: {
  label: string;
  icon: React.ReactNode;
  value: React.ReactNode;
  note: React.ReactNode;
  extra?: React.ReactNode;
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
        {extra}
      </StatDescription>
    </Stat>
  );
}

/**
 * Today (H2 to H6, T77): sales against a usual weekday as a ring and in words, then three plain tiles, each
 * about today only and each saying what its number means.
 */
export function TodayCard({
  summary,
  openNow,
  className,
}: {
  summary: HomeSummary;
  openNow: number;
  className?: string | undefined;
}) {
  const { today, members } = summary;
  const collectedShare = today.sales > 0 ? Math.round((today.collected / today.sales) * 100) : 0;
  return (
    <section aria-labelledby="today-title" className={cn(CARD, 'gap-4', className)}>
      <h2 id="today-title" className="text-sm text-muted-foreground">
        {W.sales} · {W.orders(today.orders)}
      </h2>
      <Pace summary={summary} />
      <div className="grid gap-2 sm:grid-cols-3 md:gap-3">
        <Link to="/orders" className={TILE_LINK}>
          <Tile
            label={W.tiles.orders}
            icon={<ReceiptTextIcon />}
            value={today.orders}
            note={W.tiles.openNow(openNow)}
          />
        </Link>
        <Link to="/orders" search={{ view: 'list', day: 'today' }} className={TILE_LINK}>
          <Tile
            label={W.tiles.toCollect}
            icon={<WalletIcon />}
            value={formatPeso(today.toCollect)}
            note={W.tiles.toCollectHint}
            extra={
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
          />
        </Link>
      </div>
    </section>
  );
}
