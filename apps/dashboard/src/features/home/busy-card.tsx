import { HEAT_MIN_DAYS, heatExtremes, homeWords, type HomeTrends } from '@smartapp/core';
import { useHomeTrends } from '@smartapp/data';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { cn } from 'cn';
import { HomeCard } from './home-card.js';
import { useHomeRange } from './search.js';

const W = homeWords.busy;
const H = homeWords.hours;

// Monday first, as a shop's week reads.
const ROWS = [1, 2, 3, 4, 5, 6, 0] as const;
// Five steps from a few orders to the busiest hour; an hour with none stays grey.
const LEVELS = [
  'bg-muted',
  'bg-chart-1/15',
  'bg-chart-1/30',
  'bg-chart-1/50',
  'bg-chart-1/75',
  'bg-chart-1',
] as const;

function levelOf(value: number, top: number): number {
  if (value <= 0 || top <= 0) return 0;
  return Math.min(5, 1 + Math.floor((value / top) * 4.999));
}

/** The hours that had any order in the 4 weeks, first to last, so closed hours don't take room. */
function hourSpan(heat: HomeTrends['heat']): number[] {
  let first = 24;
  let last = -1;
  for (const row of heat) {
    row.forEach((v, h) => {
      if (v > 0) {
        first = Math.min(first, h);
        last = Math.max(last, h);
      }
    });
  }
  if (last < first) return [];
  return Array.from({ length: last - first + 1 }, (_, i) => first + i);
}

function HeatMap({ heat }: { heat: HomeTrends['heat'] }) {
  const hours = hourSpan(heat);
  const top = Math.max(0, ...heat.flat());
  const { busiest, quietest } = heatExtremes(heat);
  const every = hours.length > 12 ? 3 : hours.length > 8 ? 2 : 1;
  return (
    <>
      <div role="img" aria-label={W.mapAria} className="flex flex-col gap-1">
        {ROWS.map((weekday) => (
          <div key={weekday} aria-hidden="true" className="flex items-center gap-1">
            <span className="w-8 shrink-0 text-xs text-muted-foreground">
              {W.rowLabel(weekday)}
            </span>
            {hours.map((hour) => {
              const v = heat[weekday]?.[hour] ?? 0;
              return (
                <span
                  key={hour}
                  title={W.cell(weekday, H.hour(hour), v)}
                  className={cn('h-4 min-w-0 flex-1 rounded-sm md:h-6', LEVELS[levelOf(v, top)])}
                />
              );
            })}
          </div>
        ))}
        <div aria-hidden="true" className="flex items-center gap-1">
          <span className="w-8 shrink-0" />
          {hours.map((hour, i) => (
            <span
              key={hour}
              className="min-w-0 flex-1 text-center text-xs text-muted-foreground tabular-nums"
            >
              {i % every === 0 ? H.hourShort(hour) : ''}
            </span>
          ))}
        </div>
      </div>
      {busiest ? (
        <p className="text-sm">
          {W.sentence(
            W.slot(busiest.weekday, H.hour(busiest.hour)),
            quietest && (quietest.weekday !== busiest.weekday || quietest.hour !== busiest.hour)
              ? W.slot(quietest.weekday, H.hour(quietest.hour))
              : null,
          )}
        </p>
      ) : null}
    </>
  );
}

function Scale() {
  return (
    <span aria-hidden="true" className="flex items-center gap-1 text-xs text-muted-foreground">
      {W.fewer}
      {LEVELS.slice(1).map((tone) => (
        <span key={tone} className={cn('size-3 rounded-sm', tone)} />
      ))}
      {W.more}
    </span>
  );
}

/** When you're busy (H13): orders per weekday and hour over the last 4 weeks, from two weeks of orders. */
export function BusyCard({ className }: { className?: string | undefined }) {
  // Same request as the trends card above it, so this costs nothing extra.
  const trends = useHomeTrends(useHomeRange());
  const data = trends.data;
  const ready = data !== undefined && data.heatDays >= HEAT_MIN_DAYS;
  return (
    <HomeCard
      id="busy"
      title={W.title}
      hint={W.hint}
      className={className}
      action={ready ? <Scale /> : undefined}
    >
      {data === undefined ? (
        trends.isError ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {homeWords.states.errorCard}
          </p>
        ) : (
          <Skeleton className="h-48 w-full rounded-lg" />
        )
      ) : ready ? (
        <HeatMap heat={data.heat} />
      ) : (
        <p className="py-6 text-center text-sm text-muted-foreground">{W.waiting(data.heatDays)}</p>
      )}
    </HomeCard>
  );
}
