import * as React from 'react';
import { ChevronDownIcon, ChevronRightIcon, ClipboardListIcon } from 'lucide-react';
import {
  canReschedule,
  formatClock,
  manilaDate,
  ordersWords,
  scrollWords,
  type BoardOrder,
  type ShopKind,
} from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import { Hitbox } from '@smartapp/ui/components/hitbox';
import {
  Kanban,
  KanbanBoard,
  KanbanColumn,
  KanbanColumnContent,
  KanbanItem,
  KanbanItemHandle,
  KanbanOverlay,
  type KanbanCommitMeta,
} from '@smartapp/ui/components/reui/kanban';
import { notify } from '@smartapp/ui/compositions/notify';
import { useHiddenBelow } from '@smartapp/ui/hooks/use-hidden-below';
import { useReducedMotion } from '@smartapp/ui/hooks/use-reduced-motion';
import { cn } from 'cn';
import { dayChipLabel, dayLong } from '@/app/orders/calendar-days';
import { orderNoLabel } from '@/app/orders/order-ticket-label';
import {
  byTime,
  clockOf,
  closedWords,
  daySummary,
  hasRoom,
  isClosedDay,
  isOpenAt,
  momentOn,
  timeGroups,
  type DayFacts,
  type ScheduleRules,
} from './calendar-facts.js';
import { useMoveOrder } from './calendar-move.js';
import {
  CalendarOrderRow,
  NowLine,
  TimeLabel,
  WeekOrderCard,
  WhatToMakeButton,
} from './calendar-order.js';

const W = ordersWords.bookings;

type Columns = Record<string, BoardOrder[]>;

export interface WeekProps {
  slug: string;
  kind: ShopKind;
  // The days on screen, in order ("YYYY-MM-DD").
  days: readonly string[];
  facts: DayFacts;
  rules: ScheduleRules;
  today: string;
  now: Date;
  online: boolean;
  // The day "Go to date" landed on: its column is marked.
  picked?: string | undefined;
  onOpen: (order: BoardOrder) => void;
  onOpenDay: (date: string) => void;
  // The time is not open on the day an order was dropped on: pick one there.
  onChangeTime: (order: BoardOrder, date: string) => void;
  onWhatToMake: (date: string) => void;
}

function toColumns(days: readonly string[], facts: DayFacts): Columns {
  const out: Columns = {};
  for (const d of days) out[d] = facts.byDay.get(d) ?? [];
  return out;
}

function sorted(value: Columns): Columns {
  const out: Columns = {};
  for (const [day, list] of Object.entries(value)) out[day] = [...list].sort(byTime);
  return out;
}

/**
 * The week board (T86): one column per day and each order a full-width card under its time, so two
 * orders close together stack instead of squeezing. Built on the installed ReUI Kanban, the same one the
 * Board uses. Drag a card to another day and it keeps its time; if that time isn't open there, Change
 * time opens on that day. A closed day refuses the drop and says why.
 */
export function WeekBoard({
  slug,
  days,
  facts,
  rules,
  today,
  now,
  online,
  picked,
  onOpen,
  onOpenDay,
  onChangeTime,
  onWhatToMake,
}: WeekProps) {
  const move = useMoveOrder(slug, today);
  const grouped = React.useMemo(() => toColumns(days, facts), [days, facts]);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  // The owner's preview while a card is in hand, and after a drop until the server's list catches up.
  const [held, setHeld] = React.useState<{ cols: Columns; base: Columns } | null>(null);
  const columns = held && (activeId !== null || held.base === grouped) ? held.cols : grouped;
  const hold = (cols: Columns) => setHeld({ cols, base: grouped });

  const find = (id: string) => {
    for (const list of Object.values(grouped)) {
      const hit = list.find((o) => o.id === id);
      if (hit) return hit;
    }
    return undefined;
  };
  const activeOrder = activeId ? find(activeId) : undefined;
  const origin = activeOrder ? manilaDate(activeOrder.dueAt) : null;
  const target = activeId
    ? (days.find((d) => (columns[d] ?? []).some((o) => o.id === activeId)) ?? null)
    : null;

  const handleCommit = (next: Columns, meta: KanbanCommitMeta<BoardOrder>) => {
    const restore = () => setHeld(null);
    if (meta.kind !== 'item') return restore();
    const order = find(String(meta.event.active.id));
    const to = meta.overContainer;
    if (!order || to === manilaDate(order.dueAt)) return restore();
    const no = orderNoLabel(order.orderNo);
    if (isClosedDay(rules, to)) {
      restore();
      notify({ title: W.closedDrop(closedWords(rules, to), no), tone: 'error' });
      return;
    }
    // The same time on the new day, when it is one of the shop's booking times, open, and has room.
    const clock = clockOf(order.scheduledAt ?? order.dueAt);
    const at = momentOn(to, clock);
    if (
      clock % rules.slotMinutes !== 0 ||
      at.getTime() < now.getTime() ||
      !isOpenAt(rules, at) ||
      !hasRoom(rules, facts, at, order.id)
    ) {
      restore();
      notify({ title: W.pickTime(formatClock(at), dayChipLabel(to, today)), tone: 'info' });
      onChangeTime(order, to);
      return;
    }
    hold(sorted(next));
    void move(order, at.toISOString()).then((ok) => {
      if (!ok) restore();
    });
  };

  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0">
      <Kanban
        value={columns}
        onValueChange={(value) => hold(sorted(value))}
        onValueCommit={handleCommit}
        restoreOnCancel
        getItemValue={(item) => item.id}
        onDragStart={(event) => {
          hold(grouped);
          setActiveId(String(event.active.id));
        }}
        onDragEnd={() => setActiveId(null)}
        onDragCancel={() => {
          setActiveId(null);
          setHeld(null);
        }}
      >
        <KanbanBoard className="flex min-w-max gap-2 lg:min-w-0">
          {days.map((day) => (
            <DayColumn
              key={day}
              day={day}
              orders={columns[day] ?? []}
              facts={facts}
              rules={rules}
              today={today}
              now={now}
              picked={picked === day}
              dropping={activeOrder !== undefined && target === day && day !== origin}
              dimmed={activeOrder !== undefined && day !== origin && isClosedDay(rules, day)}
              canDrag={online}
              onOpen={onOpen}
              onOpenDay={onOpenDay}
              onWhatToMake={onWhatToMake}
            />
          ))}
        </KanbanBoard>
        <KanbanOverlay>
          {({ value }) => {
            const order = find(String(value));
            if (!order) return null;
            return (
              <div className="w-44 rotate-2 cursor-grabbing">
                <WeekOrderCard order={order} dragging />
              </div>
            );
          }}
        </KanbanOverlay>
      </Kanban>
    </div>
  );
}

function DayColumn({
  day,
  orders,
  facts,
  rules,
  today,
  now,
  picked,
  dropping,
  dimmed,
  canDrag,
  onOpen,
  onOpenDay,
  onWhatToMake,
}: {
  day: string;
  orders: readonly BoardOrder[];
  facts: DayFacts;
  rules: ScheduleRules;
  today: string;
  now: Date;
  picked: boolean;
  dropping: boolean;
  dimmed: boolean;
  canDrag: boolean;
  onOpen: (order: BoardOrder) => void;
  onOpenDay: (date: string) => void;
  onWhatToMake: (date: string) => void;
}) {
  const closed = isClosedDay(rules, day);
  const isToday = day === today;
  const groups = timeGroups(orders, rules, facts);
  const nowMinutes = clockOf(now);
  // The Now line sits above the first time still ahead, or under the last one.
  const ahead = groups.findIndex((g) => g.minutes >= nowMinutes);
  const nowAt = isToday ? (ahead === -1 ? groups.length : ahead) : -1;
  const [contentRef, hidden] = useHiddenBelow<HTMLDivElement>();
  const reduced = useReducedMotion();
  const long = dayLong(day);
  return (
    <KanbanColumn
      value={day}
      data-day={day}
      data-closed={closed ? '' : undefined}
      className={cn(
        'flex w-44 shrink-0 flex-col rounded-2xl border border-transparent bg-muted/50 transition duration-base lg:w-auto lg:min-w-0 lg:flex-1',
        closed && 'bg-muted/25',
        picked && 'border-primary/40',
        dropping && 'border-dashed border-primary bg-primary/5',
        dimmed && 'opacity-40',
      )}
    >
      <div className="relative px-1.5 pt-1.5 pb-1">
        <button
          type="button"
          onClick={() => onOpenDay(day)}
          aria-label={`${W.openDay(long)}, ${daySummary(rules, facts, day)}`}
          className="flex min-h-11 w-full min-w-0 flex-col justify-center rounded-lg px-1.5 py-1 text-left hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <span
            className={cn(
              'w-full truncate text-sm font-bold',
              orders.length > 0 && 'pr-7',
              isToday && 'text-primary',
            )}
          >
            {dayChipLabel(day, today)}
          </span>
          <span className="w-full truncate text-xs text-muted-foreground tabular-nums">
            {daySummary(rules, facts, day)}
          </span>
        </button>
        {orders.length > 0 ? (
          <span className="absolute top-1.5 right-1.5">
            <Hitbox
              size="sm"
              radius="full"
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`${W.whatToMake}, ${long}`}
                  onClick={() => onWhatToMake(day)}
                  className="rounded-full"
                >
                  <ClipboardListIcon aria-hidden="true" />
                </Button>
              }
            />
          </span>
        ) : null}
      </div>
      <KanbanColumnContent
        ref={contentRef}
        value={day}
        data-more={hidden > 0 ? '' : undefined}
        className="scrollbar-fine flex min-h-40 flex-1 flex-col gap-1.5 overflow-y-auto px-1.5 pb-2 data-more:mask-b-from-85% md:max-h-vh-70"
      >
        {nowAt === 0 ? <NowLine now={now} className="px-0.5" /> : null}
        {orders.length === 0 ? (
          <p className="rounded-xl border border-dashed px-2 py-6 text-center text-xs text-muted-foreground">
            {closed ? W.closed : W.noOrdersYet}
          </p>
        ) : null}
        {groups.map((group, index) => (
          <React.Fragment key={group.minutes}>
            {index > 0 && index === nowAt ? <NowLine now={now} className="px-0.5" /> : null}
            <TimeLabel
              label={group.label}
              count={group.count}
              full={group.full}
              className={cn('px-0.5', index > 0 && 'mt-1.5')}
            />
            {group.orders.map((order) => {
              const fixed = !canReschedule(order);
              return (
                <KanbanItem
                  key={order.id}
                  value={order.id}
                  disabled={!canDrag || fixed}
                  // A card that can't move stays readable; only dragging is off.
                  className="opacity-100"
                  // The card is its own button, so the drag wrapper is a group, not another button.
                  role="group"
                  aria-label={ordersWords.ticket.open(
                    orderNoLabel(order.orderNo),
                    order.customerName,
                  )}
                >
                  <KanbanItemHandle cursor={canDrag && !fixed}>
                    <WeekOrderCard order={order} onOpen={onOpen} />
                  </KanbanItemHandle>
                </KanbanItem>
              );
            })}
          </React.Fragment>
        ))}
        {nowAt > 0 && nowAt === groups.length ? <NowLine now={now} className="px-0.5" /> : null}
      </KanbanColumnContent>
      {hidden > 0 ? (
        <Button
          type="button"
          variant="ghost"
          aria-label={scrollWords.moreAria(hidden)}
          className="mx-1.5 mb-1.5 h-11 gap-1 rounded-xl text-xs font-semibold text-muted-foreground md:h-8"
          onClick={() => {
            const el = contentRef.current;
            if (!el) return;
            el.scrollBy({ top: el.clientHeight * 0.7, behavior: reduced ? 'auto' : 'smooth' });
          }}
        >
          {scrollWords.more(hidden)}
          <ChevronDownIcon aria-hidden="true" />
        </Button>
      ) : null}
    </KanbanColumn>
  );
}

// ---------------------------------------------------------------- Phone: the week as one list

/**
 * The week on a phone (T86): the same 7 days as one list, a section per day. A day with nothing on it
 * shrinks to one line. No dragging here: tap an order and use Change in its panel.
 */
export function WeekList({
  kind,
  days,
  facts,
  rules,
  today,
  now,
  onOpen,
  onOpenDay,
  onWhatToMake,
}: Omit<WeekProps, 'slug' | 'online' | 'onChangeTime' | 'picked'>) {
  return (
    <div className="flex flex-col gap-4">
      {days.map((day) => {
        const list = facts.byDay.get(day) ?? [];
        const long = dayLong(day);
        const isToday = day === today;
        if (list.length === 0) {
          return (
            <button
              key={day}
              type="button"
              data-slot="calendar-day-line"
              onClick={() => onOpenDay(day)}
              aria-label={`${W.openDay(long)}, ${daySummary(rules, facts, day)}`}
              className="flex min-h-11 items-center gap-2 rounded-xl border border-dashed px-3 text-left text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <span className={cn('font-semibold', isToday && 'text-primary')}>
                {dayChipLabel(day, today)}
              </span>
              <span className="min-w-0 flex-1 truncate text-muted-foreground">
                {daySummary(rules, facts, day)}
              </span>
              <ChevronRightIcon aria-hidden="true" className="size-4 text-muted-foreground" />
            </button>
          );
        }
        const groups = timeGroups(list, rules, facts);
        return (
          <section
            key={day}
            data-slot="calendar-day"
            aria-label={long}
            className="flex flex-col gap-2"
          >
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => onOpenDay(day)}
                aria-label={W.openDay(long)}
                className="flex min-h-11 min-w-0 flex-1 flex-col justify-center rounded-lg text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <span className={cn('truncate text-base font-bold', isToday && 'text-primary')}>
                  {isToday ? `${dayChipLabel(day, today)} · ${long}` : long}
                </span>
                <span className="text-sm text-muted-foreground tabular-nums">
                  {daySummary(rules, facts, day)}
                </span>
              </button>
              <WhatToMakeButton compact onClick={() => onWhatToMake(day)} className="shrink-0" />
            </div>
            {isToday ? <NowLine now={now} /> : null}
            {groups.map((group) => (
              <div key={group.minutes} className="flex flex-col gap-1.5">
                {group.count ? (
                  <TimeLabel label={group.label} count={group.count} full={group.full} />
                ) : null}
                {group.orders.map((o) => (
                  <CalendarOrderRow
                    key={o.id}
                    order={o}
                    shopKind={kind}
                    now={now}
                    onOpen={onOpen}
                  />
                ))}
              </div>
            ))}
          </section>
        );
      })}
    </div>
  );
}
