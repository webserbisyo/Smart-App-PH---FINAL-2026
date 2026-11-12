import * as React from 'react';
import { Link } from '@tanstack/react-router';
import {
  ChevronRightIcon,
  CircleCheckIcon,
  CircleDashedIcon,
  ShieldAlertIcon,
  WalletIcon,
} from 'lucide-react';
import {
  formatPeso,
  homeWords,
  sharePercent,
  type HomeMoney,
  type HomePlace,
} from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@smartapp/ui/components/item';
import { IconTile } from '@smartapp/ui/components/reui/icon-tile';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { CountUp } from '@smartapp/ui/compositions/count-up';
import { cssVars } from '@smartapp/ui/lib/css-vars';
import { cn } from 'cn';
import { PLACE_ICON, placeName, placeTone, type PlaceTone } from '@/app/pay-place';
import { HomeCard } from './home-card.js';

const W = homeWords.money;
// Recharts loads only when Home shows (T57).
const MoneyRing = React.lazy(() => import('./money-rings.js'));

/** A peso amount that counts up (Magic UI Number Ticker through CountUp; still under reduced motion). */
export function PesoTicker({ centavos, className }: { centavos: number; className?: string }) {
  const whole = centavos % 100 === 0;
  return (
    <span className={cn('tabular-nums', className)}>
      <span aria-hidden="true">
        {centavos < 0 ? '−' : ''}₱
        <CountUp value={Math.abs(centavos) / 100} decimalPlaces={whole ? 0 : 2} />
      </span>
      <span className="sr-only">{formatPeso(centavos)}</span>
    </span>
  );
}

// ---------------------------------------------------------------------------------------------------------
// Paid, To check, Not paid yet: one thin bar and its legend (T84). Status colours only ever mean status.

function StatusBar({ money }: { money: HomeMoney }) {
  const parts = [
    { key: 'paid', value: money.paid, className: 'bg-success' },
    { key: 'check', value: money.toCheck, className: 'bg-warning' },
    { key: 'not', value: money.notPaid, className: 'bg-muted-foreground/40' },
  ].filter((p) => p.value > 0);
  return (
    <div
      role="img"
      aria-label={W.statusAria(
        formatPeso(money.paid),
        formatPeso(money.toCheck),
        formatPeso(money.notPaid),
      )}
      className="flex h-2 w-full gap-0.5 overflow-hidden rounded-full bg-muted"
    >
      {parts.map((p) => (
        <span
          key={p.key}
          style={cssVars({ '--part': `${(p.value / Math.max(1, money.sales)) * 100}%` })}
          className={cn('block h-full w-(--part) min-w-1 rounded-full', p.className)}
        />
      ))}
    </div>
  );
}

function StatusCell({
  icon,
  label,
  value,
  tone,
  to,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: string;
  // Only To check opens Orders.
  to?: boolean;
}) {
  const body = (
    <>
      <span
        className={cn('flex min-w-0 items-center gap-1 text-xs leading-tight font-semibold', tone)}
      >
        {icon}
        <span className="min-w-0">{label}</span>
        {to ? <ChevronRightIcon aria-hidden="true" className="size-3.5 shrink-0" /> : null}
      </span>
      <PesoTicker centavos={value} className="text-sm font-bold sm:text-base" />
    </>
  );
  const cell = 'flex min-h-11 min-w-0 flex-col justify-center gap-0.5 rounded-lg px-2 py-1';
  if (to)
    return (
      <Link
        to="/orders"
        search={{ filter: 'to_check' }}
        className={cn(
          cell,
          'bg-warning-soft/60 transition-colors hover:bg-warning-soft focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
        )}
      >
        {body}
      </Link>
    );
  return <div className={cell}>{body}</div>;
}

function Status({ money }: { money: HomeMoney }) {
  return (
    <div className="flex flex-col gap-2">
      <StatusBar money={money} />
      <div className="grid grid-cols-3 gap-1.5">
        <StatusCell
          icon={<CircleCheckIcon aria-hidden="true" className="size-3.5 shrink-0" />}
          label={W.paid}
          value={money.paid}
          tone="text-success-text"
        />
        <StatusCell
          icon={<ShieldAlertIcon aria-hidden="true" className="size-3.5 shrink-0" />}
          label={W.toCheck(money.toCheckOrders)}
          value={money.toCheck}
          tone="text-warning-text"
          to={money.toCheckOrders > 0}
        />
        <StatusCell
          icon={<CircleDashedIcon aria-hidden="true" className="size-3.5 shrink-0" />}
          label={W.notPaid(money.notPaidOrders)}
          value={money.notPaid}
          tone="text-muted-foreground"
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------
// Where it is: one ring per place and one row each (T84). Colours follow the place, never its size.

function nameOf(place: HomePlace): string {
  return placeName(place.kind, place.bank);
}

/** The row's one line: what came in and what is still out, nothing the ring already says. */
function stateLine(place: HomePlace, live: boolean): string {
  if (place.orders === 0) return W.nothingYet;
  if (place.kind === 'drawer') {
    const held = live ? W.inDrawer(formatPeso(place.paid)) : W.taken(formatPeso(place.paid));
    return place.notPaidOrders > 0
      ? `${held} · ${W.collectLine(place.notPaidOrders, formatPeso(place.notPaid))}`
      : held;
  }
  const out: string[] = [];
  if (place.toCheckOrders > 0)
    out.push(W.checkLine(place.toCheckOrders, formatPeso(place.toCheck)));
  if (place.notPaidOrders > 0)
    out.push(W.notSentLine(place.notPaidOrders, formatPeso(place.notPaid)));
  return out.length > 0 ? out.join(' · ') : W.allIn;
}

// Ring cells: four fit a phone row, more wrap three to a row; wider screens keep them on one line.
const RING_BASIS: Readonly<Record<number, string>> = {
  1: 'basis-1/3 sm:basis-1/4',
  2: 'basis-1/3 sm:basis-1/4',
  3: 'basis-1/3 sm:basis-1/4',
  4: 'basis-1/4',
  5: 'basis-1/3 sm:basis-1/5',
  6: 'basis-1/3 sm:basis-1/6',
};

export interface ShareRing {
  key: string;
  label: string;
  // Share of the total, 0 to 100.
  percent: number;
  tone: PlaceTone;
}

/** Labelled rings, one per share (T84), shared by the Sales card and Where the money came from. */
export function ShareRings({ rings, label }: { rings: readonly ShareRing[]; label: string }) {
  const basis = RING_BASIS[rings.length] ?? 'basis-1/3';
  return (
    <ul aria-label={label} className="flex flex-wrap justify-center gap-y-3">
      {rings.map((r) => (
        <li
          key={r.key}
          aria-hidden="true"
          className={cn('flex min-w-0 flex-col items-center gap-1.5 px-1', basis)}
        >
          <div className="relative size-18 sm:size-20">
            <React.Suspense fallback={<Skeleton className="size-full rounded-full" />}>
              <MoneyRing slice={{ key: r.key, percent: r.percent, color: r.tone.color }} />
            </React.Suspense>
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm font-extrabold tabular-nums">
              <CountUp value={r.percent} />%
            </span>
          </div>
          <span className="flex max-w-full min-w-0 items-center gap-1 text-xs font-semibold">
            <span className={cn('size-2 shrink-0 rounded-full', r.tone.bg)} />
            <span className="truncate">{r.label}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function Rings({ places, sales }: { places: readonly HomePlace[]; sales: number }) {
  return (
    <ShareRings
      label={places
        .map((p) => W.ringAria(nameOf(p), sharePercent(p.sales, sales), formatPeso(p.sales)))
        .join(', ')}
      rings={places.map((p) => ({
        key: p.key,
        label: nameOf(p),
        percent: sharePercent(p.sales, sales),
        tone: placeTone(p.slot),
      }))}
    />
  );
}

function PlaceRow({
  place,
  live,
  day,
}: {
  place: HomePlace;
  live: boolean;
  // The one day the card shows ("today" or a date), so the row can open that day's orders; null for a range.
  day: string | null;
}) {
  const Icon = PLACE_ICON[place.kind];
  const tone = placeTone(place.slot);
  const name = nameOf(place);
  const state = stateLine(place, live);
  const linked = day !== null && place.kind !== 'other' && place.orders > 0;
  const inner = (
    <>
      <ItemMedia>
        <IconTile variant="soft" size="default" aria-hidden="true" className={tone.text}>
          <Icon />
        </IconTile>
      </ItemMedia>
      <ItemContent className="min-w-0 gap-0.5">
        <ItemTitle className="w-full min-w-0 font-semibold">
          <span className="truncate">{name}</span>
          {place.ending ? (
            <span className="shrink-0 text-xs font-medium text-muted-foreground tabular-nums">
              {W.ending(place.ending)}
            </span>
          ) : place.kind === 'drawer' ? (
            <span className="shrink-0 text-xs font-medium text-muted-foreground">
              {W.drawerHint}
            </span>
          ) : null}
        </ItemTitle>
        <ItemDescription className="line-clamp-2 text-xs">{state}</ItemDescription>
      </ItemContent>
      <ItemActions className="flex-col items-end gap-0">
        <PesoTicker centavos={place.sales} className="text-sm font-bold" />
        <span className="text-xs text-muted-foreground tabular-nums">{W.orders(place.orders)}</span>
      </ItemActions>
      {linked ? (
        <ChevronRightIcon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
      ) : null}
    </>
  );
  const label = W.rowAria(name, formatPeso(place.sales), state);
  if (linked)
    return (
      <li>
        <Item
          size="sm"
          className="flex-nowrap px-2"
          render={
            <Link
              to="/orders"
              search={{ view: 'list', day: day ?? undefined, pay: place.key }}
              aria-label={label}
            />
          }
        >
          {inner}
        </Item>
      </li>
    );
  return (
    <li aria-label={label}>
      <Item size="sm" className="flex-nowrap px-2">
        {inner}
      </Item>
    </li>
  );
}

function Where({ money, live, day }: { money: HomeMoney; live: boolean; day: string | null }) {
  const places = money.places;
  const empty = money.orders === 0;
  // A shop that only takes cash sees where GCash, Maya or a bank would show.
  const onlyCash = places.length > 0 && places.every((p) => p.kind === 'drawer');
  return (
    <section aria-labelledby="sales-where" className="flex flex-col gap-3 border-t pt-3">
      <div className="flex items-baseline justify-between gap-3">
        <h3 id="sales-where" className="text-sm font-bold">
          {W.where}
        </h3>
        {day !== null && !empty ? (
          <span className="text-xs text-muted-foreground">{W.whereTap}</span>
        ) : null}
      </div>
      {places.length > 0 ? <Rings places={places} sales={money.sales} /> : null}
      {empty ? (
        <p className="text-center text-sm text-muted-foreground">{W.empty}</p>
      ) : (
        <ul className="grid gap-1 lg:grid-cols-2 lg:gap-x-3">
          {places.map((p) => (
            <PlaceRow key={p.key} place={p} live={live} day={day} />
          ))}
        </ul>
      )}
      {onlyCash ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg bg-muted/50 p-3">
          <WalletIcon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
          <p className="min-w-0 flex-1 text-xs text-muted-foreground">{W.onlyCash}</p>
          <Button
            variant="outline"
            className="h-11 md:h-8"
            nativeButton={false}
            render={<Link to="/settings/payments" />}
          >
            {W.addPayments}
          </Button>
        </div>
      ) : null}
    </section>
  );
}

/**
 * Sales for the picked period (T83, T84): the total, then one bar for what is paid, to check and not paid
 * yet, then where the money is: the drawer and each account as a ring with its row. No comparisons.
 */
export function MoneyCard({
  money,
  periodText,
  live,
  day,
  action,
  className,
}: {
  money: HomeMoney;
  periodText: string;
  // The period picker, top right.
  action: React.ReactNode;
  // Today: the drawer holds the cash now; a past period only took it.
  live: boolean;
  // The one day shown ("today" or a date), for the rows' Orders links; null for more than one day.
  day: string | null;
  className?: string | undefined;
}) {
  return (
    <HomeCard
      id="sales-total"
      title={W.title}
      hint={<span className="sr-only">{periodText}</span>}
      action={action}
      className={className}
    >
      <div className="flex flex-wrap items-end gap-x-4 gap-y-1">
        <PesoTicker
          centavos={money.sales}
          className={cn(
            'text-4xl font-extrabold tracking-tight md:text-5xl',
            money.orders === 0 && 'text-muted-foreground',
          )}
        />
        <p className="flex flex-wrap items-center gap-x-3 pb-1 text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{W.orders(money.orders)}</span>
          <span>
            {W.average}{' '}
            {money.average === null ? (
              <span className="font-semibold text-foreground">{W.averageNone}</span>
            ) : (
              <PesoTicker centavos={money.average} className="font-semibold text-foreground" />
            )}
          </span>
        </p>
      </div>
      {money.orders > 0 ? <Status money={money} /> : null}
      <Where money={money} live={live} day={day} />
    </HomeCard>
  );
}

/** The card's shape while the numbers load, so nothing moves when they arrive. */
export function MoneyCardSkeleton() {
  return (
    <>
      <Skeleton className="h-10 w-48 md:h-12" />
      <Skeleton className="h-2 w-full rounded-full" />
      <div className="grid grid-cols-3 gap-1.5">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-11 rounded-lg" />
        ))}
      </div>
      <div className="flex justify-center gap-6 border-t pt-3">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="size-18 rounded-full sm:size-20" />
        ))}
      </div>
      <div className="grid gap-1 lg:grid-cols-2 lg:gap-x-3">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-14 rounded-lg" />
        ))}
      </div>
    </>
  );
}
