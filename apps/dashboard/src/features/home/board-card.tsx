import * as React from 'react';
import { Link } from '@tanstack/react-router';
import {
  boardColumn,
  formatClock,
  formatPeso,
  homeWords,
  isFinal,
  salesTotal,
  statusStage,
  ticketTime,
  words,
  type BoardOrder,
  type OrderStage,
  type ShopKind,
} from '@smartapp/core';
import {
  Timeline,
  TimelineContent,
  TimelineDate,
  TimelineHeader,
  TimelineIndicator,
  TimelineItem,
  TimelineTitle,
} from '@smartapp/ui/components/reui/timeline';
import { cssVars } from '@smartapp/ui/lib/css-vars';
import { cn } from 'cn';
import { ORDER_TYPE_ICON } from '@/app/orders/order-type-icons';
import { STAGE_LOOK, stageLabel } from '@/app/orders/stage';
import { StageChip } from '@/app/orders/stage-chip';
import { StageIcon } from '@/app/orders/stage-icon';
import { HomeCard } from './home-card.js';

const W = homeWords.board;
const LIVE_STAGES = ['new', 'preparing', 'ready', 'out'] as const satisfies readonly OrderStage[];
const NEXT_UP = 5;

/** On the board (T69): open orders per stage, the next five by due time with a now line, and done today. */
export function BoardCard({
  live,
  todays,
  kind,
  delivers,
  now,
  className,
}: {
  live: readonly BoardOrder[];
  todays: readonly BoardOrder[];
  kind: ShopKind;
  delivers: boolean;
  now: Date;
  className?: string | undefined;
}) {
  const open = React.useMemo(() => live.filter((o) => isOpenOnBoard(o, now)), [live, now]);
  const counts = Object.fromEntries(
    LIVE_STAGES.map((s) => [s, open.filter((o) => statusStage(o.status) === s).length]),
  );
  const stages = LIVE_STAGES.filter((s) => s !== 'out' || delivers);
  const next = [...open].sort((a, b) => a.dueAt.localeCompare(b.dueAt)).slice(0, NEXT_UP);
  const nowAt = next.findIndex((o) => new Date(o.dueAt).getTime() > now.getTime());
  const done = todays.filter((o) => o.status === 'completed');
  const total = open.length;

  return (
    <HomeCard
      id="board"
      title={W.title}
      hint={W.open(total)}
      className={className}
      action={
        <Link
          to="/orders"
          className="inline-flex h-11 items-center text-sm font-semibold text-primary hover:underline md:h-auto"
        >
          {W.openOrders}
        </Link>
      }
    >
      {total > 0 ? (
        <div aria-hidden="true" className="flex h-2 w-full gap-0.5 overflow-hidden rounded-full">
          {stages.map((s) =>
            (counts[s] ?? 0) > 0 ? (
              <span
                key={s}
                style={cssVars({ '--share': `${((counts[s] ?? 0) / total) * 100}%` })}
                className={cn('h-full w-(--share)', STAGE_LOOK[s].dot)}
              />
            ) : null,
          )}
        </div>
      ) : null}
      <ul
        className={cn(
          'grid gap-2',
          stages.length === 4 ? 'grid-cols-4 lg:grid-cols-2 2xl:grid-cols-4' : 'grid-cols-3',
        )}
      >
        {stages.map((s) => {
          const look = STAGE_LOOK[s];
          const n = counts[s] ?? 0;
          return (
            <li key={s}>
              <Link
                to="/orders"
                search={{ stage: s }}
                aria-label={W.stageAria(stageLabel(s, kind), n)}
                className={cn(
                  'flex min-h-16 flex-col justify-between rounded-lg p-2 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                  look.soft,
                  look.text,
                )}
              >
                <span className="flex items-center justify-between gap-1">
                  <span className="text-lg font-extrabold tabular-nums">{n}</span>
                  <StageIcon stage={s} kind={kind} className="size-4 shrink-0" />
                </span>
                <span className="text-xs leading-tight font-semibold break-words">
                  {stageLabel(s, kind)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      {next.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">{W.empty}</p>
      ) : (
        <div className="flex flex-col gap-1">
          <h3 className="text-xs font-semibold text-muted-foreground">{W.nextUp}</h3>
          <Timeline value={nowAt === -1 ? next.length : nowAt} className="pt-1">
            {next.map((o, i) => {
              const stage = statusStage(o.status) ?? 'new';
              const late = ticketTime(o, now).kind === 'late';
              const TypeIcon = ORDER_TYPE_ICON[o.type];
              const items = o.lines.reduce((n, l) => n + l.qty, 0);
              return (
                <React.Fragment key={o.id}>
                  {i === nowAt ? <NowLine now={now} /> : null}
                  <TimelineItem
                    step={i + 1}
                    className="group-orientation-vertical/timeline:ms-6 group-orientation-vertical/timeline:not-last:pb-1"
                  >
                    <Link
                      to="/orders"
                      search={{ order: o.id }}
                      className="-mx-1.5 flex min-h-11 items-start gap-2 rounded-lg px-1.5 py-1 transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    >
                      <TimelineHeader className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <TimelineIndicator
                          className={cn(
                            'size-3 border-2 bg-card group-orientation-vertical/timeline:top-2 group-orientation-vertical/timeline:-left-4.5',
                            STAGE_LOOK[stage].border,
                          )}
                        />
                        <TimelineDate
                          className={cn(
                            'mb-0 tabular-nums',
                            late && 'font-semibold text-destructive',
                          )}
                        >
                          {formatClock(o.dueAt)}
                        </TimelineDate>
                        <TimelineTitle className="truncate font-semibold">
                          {o.customerName}
                        </TimelineTitle>
                        <TimelineContent className="flex min-w-0 items-center gap-1 text-xs">
                          <TypeIcon className="size-3.5 shrink-0" aria-hidden="true" />
                          <span className="truncate">
                            {words.shop.orderType[o.type]} · {W.items(items)} ·{' '}
                            {formatPeso(o.total)}
                          </span>
                        </TimelineContent>
                      </TimelineHeader>
                      <span className="flex shrink-0 flex-col items-end gap-1">
                        <StageChip stage={stage} kind={kind} className="text-xs" />
                        {late ? (
                          <span className="text-xs font-semibold text-destructive">{W.late}</span>
                        ) : null}
                      </span>
                    </Link>
                  </TimelineItem>
                </React.Fragment>
              );
            })}
          </Timeline>
        </div>
      )}

      <div className="flex items-center justify-between border-t pt-3 text-sm">
        <span className="text-muted-foreground">{W.doneToday}</span>
        <span className="font-semibold tabular-nums">
          {W.doneLine(done.length, formatPeso(salesTotal(done, now)))}
        </span>
      </div>
    </HomeCard>
  );
}

function NowLine({ now }: { now: Date }) {
  return (
    <div className="flex items-center gap-2 py-1" aria-hidden="true">
      <span className="rounded-full bg-destructive px-1.5 py-0.5 text-xs font-semibold text-destructive-foreground tabular-nums">
        {formatClock(now)}
      </span>
      <span className="h-0.5 flex-1 rounded-full bg-destructive" />
    </div>
  );
}

export function isOpenOnBoard(o: BoardOrder, now: Date): boolean {
  const col = boardColumn(o, now);
  return col !== null && col !== 'scheduled' && col !== 'done' && !isFinal(o.status);
}
