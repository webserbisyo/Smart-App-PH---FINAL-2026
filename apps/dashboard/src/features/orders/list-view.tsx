import * as React from 'react';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarDaysIcon,
  HistoryIcon,
  ListIcon,
  TimerOffIcon,
  XCircleIcon,
} from 'lucide-react';
import type { BoardOrder, OrderStage, PeriodDates, ShopKind } from '@smartapp/core';
import {
  addDays,
  errorWords,
  formatClock,
  formatManila,
  formatPeso,
  isStillOpenPast,
  manilaDate,
  ordersWords,
  payWindowOver,
  salesTotal,
  statusStage,
} from '@smartapp/core';
import { errorCodeOf, useOrdersInRange, useScheduledOrders } from '@smartapp/data';
import { Button } from '@smartapp/ui/components/button';
import { Badge } from '@smartapp/ui/components/reui/badge';
import {
  DataGrid,
  DataGridTable,
  dataGridFeatures,
  useTable,
  type ColumnDef,
  type DataGridFeatures,
} from '@smartapp/ui/components/reui/data-grid/index';
import { Scroller } from '@smartapp/ui/components/scroller';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@smartapp/ui/components/select';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@smartapp/ui/components/toggle-group';
import { useFormFactor } from '@smartapp/ui/hooks/use-form-factor';
import { cn } from 'cn';
import { GRID_I18N } from '@/app/grid-pager';
import { CustomerChip, ItemPhotos, PaymentChip, orderNoLabel } from '@/app/orders/order-card';
import { CustomerFace } from '@/app/owner-avatar';
import { dateFromKey } from '@/app/day-key';
import { AnimatePresence, FadeUp } from '@/app/orders/order-motion';
import { ORDER_TYPE_ICON } from '@/app/orders/order-type-icons';
import { StageChip } from '@/app/orders/stage-chip';
import { StageIcon } from '@/app/orders/stage-icon';
import { STAGE_LOOK, stageLabel } from '@/app/orders/stage';
import { PageEmpty, PageError } from '@/app/page-state';
import { PeriodPicker, rangeDays, rangeText, type PeriodPick } from '@/app/period-picker';
import { monthStart } from './calendar-facts.js';
import {
  LIST_PERIODS,
  LIST_STATUSES,
  useOrdersSearch,
  useSetOrdersSearch,
  type ListPeriod,
  type ListStatus,
  type OrderFilter,
  type OrdersSearch,
} from './search.js';

const L = ordersWords.list;
// How far ahead "Upcoming" and picked dates reach; booking rules allow at most 60 days.
const AHEAD_DAYS = 60;
// How far back picked dates reach, and the longest stretch at a time (T95).
const BACK_DAYS = 365;
export const LIST_MAX_DAYS = 92;
// Rows per page on a laptop (T95: 50, like Shopify's tables), and per "Show more" on a phone.
const PAGE_SIZES = [25, 50, 100] as const;
const PAGE_SIZE = 50;

const PICKS: readonly PeriodPick<ListPeriod>[] = LIST_PERIODS.map((id) => ({
  id,
  label: L.picks[id],
}));

export interface ListViewProps {
  slug: string;
  kind: ShopKind;
  now: Date;
  query: string;
  filter: OrderFilter | undefined;
  matches: (order: BoardOrder) => boolean;
  onOpen: (order: BoardOrder) => void;
  onClearFilters: (() => void) | undefined;
}

/** Where an order sits in the list: its stage, or Cancelled/Expired. An unpaid order past its window is Expired. */
export function listStatus(order: BoardOrder, now: Date): ListStatus {
  if (order.status === 'cancelled') return 'cancelled';
  if (order.status === 'expired' || payWindowOver(order, now)) return 'expired';
  return statusStage(order.status) ?? 'done';
}

function statusWord(status: ListStatus, kind: ShopKind): string {
  if (status === 'cancelled') return L.cancelled;
  if (status === 'expired') return L.expired;
  return stageLabel(status, kind);
}

/** The days a quick pick covers; null for a single day or picked dates. */
function periodDays(period: ListPeriod, today: string): PeriodDates {
  switch (period) {
    case 'today':
      return { from: today, to: today };
    case 'yesterday':
      return { from: addDays(today, -1), to: addDays(today, -1) };
    case '7d':
      return { from: addDays(today, -6), to: today };
    case 'month':
      return { from: monthStart(today, 0), to: today };
    case 'lastMonth':
      return { from: monthStart(today, -1), to: addDays(monthStart(today, 0), -1) };
    case 'upcoming':
      return { from: addDays(today, 1), to: addDays(today, AHEAD_DAYS) };
  }
}

/** The List's days from the address (T95): a quick pick, one day, or picked dates (at most 92 days). */
export function listPeriod(
  search: Pick<OrdersSearch, 'day' | 'from' | 'to'>,
  today: string,
): { pick: ListPeriod | null; dates: PeriodDates } {
  const earliest = addDays(today, -BACK_DAYS);
  const latest = addDays(today, AHEAD_DAYS);
  if (search.from && search.to) {
    const from = clamp(search.from < search.to ? search.from : search.to, earliest, latest);
    let to = clamp(search.from < search.to ? search.to : search.from, earliest, latest);
    if (rangeDays({ from, to }) > LIST_MAX_DAYS) to = addDays(from, LIST_MAX_DAYS - 1);
    return { pick: matchPick({ from, to }, today), dates: { from, to } };
  }
  const day = search.day ?? 'today';
  const quick = LIST_PERIODS.find((p) => p === day);
  if (quick) return { pick: quick, dates: periodDays(quick, today) };
  const one = clamp(day, earliest, latest);
  return { pick: one === today ? 'today' : null, dates: { from: one, to: one } };
}

function matchPick(dates: PeriodDates, today: string): ListPeriod | null {
  return (
    LIST_PERIODS.find((p) => {
      const d = periodDays(p, today);
      return d.from === dates.from && d.to === dates.to;
    }) ?? null
  );
}

function clamp(date: string, first: string, last: string): string {
  return date < first ? first : date > last ? last : date;
}

const STATUS_LOOK: Record<'cancelled' | 'expired' | 'all', { soft: string; text: string }> = {
  cancelled: { soft: 'bg-destructive/10', text: 'text-destructive' },
  expired: { soft: 'bg-muted', text: 'text-muted-foreground' },
  all: { soft: 'bg-accent', text: 'text-primary' },
};

// A picked chip fills with its own colour (T95, decision E2). Full class names, so Tailwind sees them.
const CHIP_ON: Record<ListStatus | 'all', string> = {
  all: 'aria-pressed:border-primary aria-pressed:bg-accent aria-pressed:text-foreground',
  new: 'aria-pressed:border-stage-new aria-pressed:bg-stage-new-soft aria-pressed:text-stage-new-text',
  preparing:
    'aria-pressed:border-stage-preparing aria-pressed:bg-stage-preparing-soft aria-pressed:text-stage-preparing-text',
  ready:
    'aria-pressed:border-stage-ready aria-pressed:bg-stage-ready-soft aria-pressed:text-stage-ready-text',
  out: 'aria-pressed:border-stage-out aria-pressed:bg-stage-out-soft aria-pressed:text-stage-out-text',
  done: 'aria-pressed:border-stage-done aria-pressed:bg-stage-done-soft aria-pressed:text-stage-done-text',
  cancelled:
    'aria-pressed:border-destructive aria-pressed:bg-destructive/10 aria-pressed:text-destructive',
  expired:
    'aria-pressed:border-muted-foreground aria-pressed:bg-muted aria-pressed:text-foreground',
};

function isStage(status: ListStatus | 'all'): status is OrderStage {
  return status !== 'all' && status !== 'cancelled' && status !== 'expired';
}

/** A status chip's icon in its soft circle (decision E2): the stage icon, or Cancelled, Expired, All. */
function ChipIcon({ status, kind }: { status: ListStatus | 'all'; kind: ShopKind }) {
  const look = isStage(status) ? STAGE_LOOK[status] : STATUS_LOOK[status];
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex size-6 shrink-0 items-center justify-center rounded-full md:size-5',
        look.soft,
        look.text,
      )}
    >
      {isStage(status) ? (
        <StageIcon stage={status} kind={kind} className="size-3.5 md:size-3" />
      ) : status === 'cancelled' ? (
        <XCircleIcon className="size-3.5 md:size-3" />
      ) : status === 'expired' ? (
        <TimerOffIcon className="size-3.5 md:size-3" />
      ) : (
        <ListIcon className="size-3.5 md:size-3" />
      )}
    </span>
  );
}

function StatusChip({ status, kind }: { status: ListStatus; kind: ShopKind }) {
  if (status === 'cancelled') {
    return (
      <Badge variant="destructive-light" size="lg" radius="full" className="gap-1 font-semibold">
        <XCircleIcon aria-hidden="true" />
        {L.cancelled}
      </Badge>
    );
  }
  if (status === 'expired') {
    return (
      <Badge
        variant="outline"
        size="lg"
        radius="full"
        className="gap-1 font-semibold text-muted-foreground"
      >
        <TimerOffIcon aria-hidden="true" />
        {L.expired}
      </Badge>
    );
  }
  return <StageChip stage={status} kind={kind} />;
}

/** The status, with a red "Still open" dot for an order from an earlier day nobody finished (T95, D3). */
function RowStatus({
  order,
  kind,
  now,
  today,
}: {
  order: BoardOrder;
  kind: ShopKind;
  now: Date;
  today: string;
}) {
  const stale = isStillOpenPast(order, today);
  return (
    <span className="flex items-center gap-1.5">
      <StatusChip status={listStatus(order, now)} kind={kind} />
      {stale ? (
        <span className="flex items-center gap-1 text-xs font-semibold text-destructive">
          <span aria-hidden="true" className="size-2 rounded-full bg-destructive" />
          {L.stillOpen}
        </span>
      ) : null}
    </span>
  );
}

/** "9:30 AM", or "Sat 14 Nov · 9:30 AM" when the list covers more than one day. */
function whenText(order: BoardOrder, withDate: boolean): string {
  return withDate
    ? `${formatManila(order.dueAt, 'date')} · ${formatClock(order.dueAt)}`
    : formatClock(order.dueAt);
}

type SortKey = 'time' | 'order' | 'total';
interface Sort {
  key: SortKey;
  asc: boolean;
}

function sortOrders(orders: readonly BoardOrder[], sort: Sort): BoardOrder[] {
  const out = [...orders].sort((a, b) => {
    const d =
      sort.key === 'time'
        ? a.dueAt.localeCompare(b.dueAt) || a.orderNo - b.orderNo
        : sort.key === 'order'
          ? a.orderNo - b.orderNo
          : a.total - b.total;
    return sort.asc ? d : -d;
  });
  return out;
}

/**
 * The List view (D8, T95): orders for a quick period, one day or picked dates, in a table that fits the
 * screen with its header and footer always in view. Rows open the same order panel as the board.
 */
export function ListView({
  slug,
  kind,
  now,
  query,
  filter,
  matches,
  onOpen,
  onClearFilters,
}: ListViewProps) {
  const search = useOrdersSearch();
  const setSearch = useSetOrdersSearch();
  const isPhone = useFormFactor() === 'phone';
  const today = manilaDate(now);
  const { pick, dates } = listPeriod(search, today);
  const multiDay = dates.from !== dates.to;
  const [sort, setSort] = React.useState<Sort>({ key: 'time', asc: true });

  // Days up to today list the orders made then; later days list the orders due then (from the Calendar).
  const madeTo = dates.to < today ? dates.to : today;
  const dueFrom = dates.from > today ? dates.from : addDays(today, 1);
  const wantsMade = dates.from <= today;
  const wantsDue = dates.to > today;
  const made = useOrdersInRange(
    slug,
    wantsMade ? dates.from : '',
    wantsMade ? madeTo : '',
    query || undefined,
  );
  const due = useScheduledOrders(slug, wantsDue ? dueFrom : '', wantsDue ? dates.to : '');
  const pending = (wantsMade && made.isPending) || (wantsDue && due.isPending);
  const failed = wantsMade && made.isError ? made : wantsDue && due.isError ? due : null;

  const madeData = made.data;
  const dueData = due.data;
  const all = React.useMemo(() => {
    const seen = new Set<string>();
    const out: BoardOrder[] = [];
    for (const o of wantsMade ? (madeData ?? []) : []) {
      seen.add(o.id);
      out.push(o);
    }
    const q = query.trim().toLowerCase();
    for (const o of wantsDue ? (dueData?.orders ?? []) : []) {
      if (seen.has(o.id)) continue;
      // The Calendar's list has no server search; match name or number here.
      if (
        q &&
        !o.customerName.toLowerCase().includes(q) &&
        !String(o.orderNo).includes(q.replace(/^#?0*/, ''))
      )
        continue;
      out.push(o);
    }
    return out.filter(matches);
  }, [wantsMade, wantsDue, madeData, dueData, query, matches]);

  const counts = React.useMemo(() => {
    const out: Record<ListStatus, number> = {
      new: 0,
      preparing: 0,
      ready: 0,
      out: 0,
      done: 0,
      cancelled: 0,
      expired: 0,
    };
    for (const o of all) out[listStatus(o, now)] += 1;
    return out;
  }, [all, now]);

  const status = search.status;
  const rows = React.useMemo(
    () => sortOrders(status ? all.filter((o) => listStatus(o, now) === status) : all, sort),
    [all, status, now, sort],
  );
  const shownStatuses = LIST_STATUSES.filter((s) => counts[s] > 0 || s === status);
  const chipStatuses: (ListStatus | 'all')[] = ['all', ...shownStatuses];
  const footer = L.footer(rows.length, formatPeso(salesTotal(rows, now)));
  const label = pick ? L.picks[pick] : rangeText(dates, L.period.range);

  let body: React.ReactNode;
  if (pending) {
    body = <ListSkeleton />;
  } else if (failed) {
    body = (
      <PageError
        title={ordersWords.states.errorList}
        message={errorWords(errorCodeOf(failed.error))}
        retryLabel={ordersWords.states.tryAgain}
        onRetry={() => void failed.refetch()}
      />
    );
  } else if (rows.length === 0) {
    const filtered = status !== undefined || onClearFilters !== undefined;
    body = (
      <PageEmpty
        icon={
          pick === 'upcoming' ? (
            <CalendarDaysIcon className="size-8 text-muted-foreground" />
          ) : (
            <HistoryIcon className="size-8 text-muted-foreground" />
          )
        }
        title={filtered ? ordersWords.states.noMatches : undefined}
        description={
          filtered ? undefined : pick === 'upcoming' ? L.emptyUpcoming : L.emptyDay(label)
        }
        action={
          filtered ? (
            <Button
              variant="outline"
              className="h-11 md:h-9"
              onClick={() => {
                setSearch({ status: undefined }, { replace: true });
                onClearFilters?.();
              }}
            >
              {ordersWords.states.clearFilters}
            </Button>
          ) : pick !== 'today' ? (
            <Button
              variant="outline"
              className="h-11 md:h-9"
              onClick={() =>
                setSearch({ day: undefined, from: undefined, to: undefined }, { replace: true })
              }
            >
              {L.showToday}
            </Button>
          ) : undefined
        }
      />
    );
  } else if (isPhone) {
    body = (
      <PhoneList
        // A new period or status starts again at the first rows.
        key={`${dates.from}|${dates.to}|${status ?? ''}`}
        orders={rows}
        kind={kind}
        now={now}
        today={today}
        multiDay={multiDay}
        footer={footer}
        onOpen={onOpen}
      />
    );
  } else {
    body = (
      <OrdersGrid
        key={`${dates.from}|${dates.to}|${status ?? ''}`}
        orders={rows}
        kind={kind}
        now={now}
        today={today}
        multiDay={multiDay}
        footer={footer}
        sort={sort}
        onSort={(key) =>
          setSort((s) => (s.key === key ? { key, asc: !s.asc } : { key, asc: key !== 'total' }))
        }
        onOpen={onOpen}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3" data-filter={filter ?? 'all'}>
      {/* Days: quick picks or From–To, Home's picker (T95). */}
      <div className="flex flex-wrap items-center gap-2">
        <PeriodPicker
          picks={PICKS}
          picked={pick}
          dates={dates}
          label={label}
          words={L.period}
          earliest={addDays(today, -BACK_DAYS)}
          latest={addDays(today, AHEAD_DAYS)}
          maxDays={LIST_MAX_DAYS}
          align="start"
          onPick={(p) =>
            setSearch(
              {
                day: p === 'today' ? undefined : p,
                from: undefined,
                to: undefined,
                status: undefined,
              },
              { replace: true },
            )
          }
          onRange={(picked) => {
            const quick = matchPick(picked, today);
            setSearch(
              quick || picked.from === picked.to
                ? {
                    day: quick === 'today' ? undefined : (quick ?? picked.from),
                    from: undefined,
                    to: undefined,
                    status: undefined,
                  }
                : { day: undefined, from: picked.from, to: picked.to, status: undefined },
              { replace: true },
            );
          }}
        />
      </div>

      {/* Status chips with counts (E2): icon + word + colour; only the ones that have orders. */}
      {all.length > 0 ? (
        <Scroller orientation="horizontal" hideScrollbar className="-mx-4 px-4 md:mx-0 md:px-0">
          <ToggleGroup
            value={[status ?? 'all']}
            onValueChange={(next) => {
              const picked = LIST_STATUSES.find((s) => s === next[0]);
              setSearch({ status: picked }, { replace: true });
            }}
            aria-label={L.statusLabel}
            spacing={1.5}
            className="w-max"
          >
            {chipStatuses.map((s) => (
              <ToggleGroupItem
                key={s}
                value={s}
                className={cn(
                  'h-10 gap-1.5 rounded-full border border-border bg-card ps-1.5 pe-3 text-sm font-semibold text-foreground md:h-8 md:ps-1',
                  CHIP_ON[s],
                )}
              >
                <ChipIcon status={s} kind={kind} />
                {s === 'all' ? L.all : statusWord(s, kind)}
                <span className="text-muted-foreground tabular-nums">
                  {s === 'all' ? all.length : counts[s]}
                </span>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Scroller>
      ) : null}

      {body}
    </div>
  );
}

// ---------------------------------------------------------------- rows

interface RowsProps {
  orders: readonly BoardOrder[];
  kind: ShopKind;
  now: Date;
  today: string;
  multiDay: boolean;
  footer: string;
  onOpen: (order: BoardOrder) => void;
}

/** Phones: cards, a day heading when the list covers more than one day, and Show more (no pager). */
function PhoneList({ orders, kind, now, today, multiDay, footer, onOpen }: RowsProps) {
  const [shown, setShown] = React.useState(PAGE_SIZE);
  const visible = orders.slice(0, shown);
  const left = orders.length - visible.length;
  const groups: [string, BoardOrder[]][] = [];
  for (const o of visible) {
    const key = multiDay ? manilaDate(o.dueAt) : '';
    const last = groups.at(-1);
    if (last && last[0] === key) last[1].push(o);
    else groups.push([key, [o]]);
  }
  return (
    <div className="flex flex-col gap-3">
      {groups.map(([key, list]) => (
        <section key={key || 'day'} className="flex flex-col gap-2">
          {key ? (
            <h2 className="sticky top-0 z-sticky -mx-1 flex items-center gap-2 bg-background/95 px-1 py-1.5 text-sm font-semibold backdrop-blur-sm">
              <CalendarDaysIcon className="size-4 text-muted-foreground" aria-hidden="true" />
              {formatManila(dateFromKey(key), 'date')}
            </h2>
          ) : null}
          <PhoneRows orders={list} kind={kind} now={now} today={today} onOpen={onOpen} />
        </section>
      ))}
      {left > 0 ? (
        <Button variant="outline" className="h-11" onClick={() => setShown((n) => n + PAGE_SIZE)}>
          {L.showMore(Math.min(PAGE_SIZE, left))}
        </Button>
      ) : null}
      <p className="py-2 text-center text-sm text-muted-foreground tabular-nums">{footer}</p>
    </div>
  );
}

function PhoneRows({
  orders,
  kind,
  now,
  today,
  onOpen,
}: Pick<RowsProps, 'orders' | 'kind' | 'now' | 'today' | 'onOpen'>) {
  return (
    <div className="flex flex-col gap-2">
      <AnimatePresence initial={false}>
        {orders.map((order, index) => {
          const TypeIcon = ORDER_TYPE_ICON[order.type];
          const count = order.lines.reduce((n, l) => n + l.qty, 0);
          return (
            <FadeUp key={order.id} index={index}>
              <button
                type="button"
                onClick={() => onOpen(order)}
                aria-label={ordersWords.ticket.open(
                  orderNoLabel(order.orderNo),
                  order.customerName,
                )}
                className="flex w-full flex-col gap-2 rounded-xl border border-border bg-card p-3 text-left shadow-xs transition-colors duration-base hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:bg-muted/60"
              >
                <span className="flex items-center gap-2">
                  <span className="font-bold tabular-nums">{orderNoLabel(order.orderNo)}</span>
                  <TypeIcon
                    className="size-3.5 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {formatClock(order.dueAt)}
                  </span>
                  <span className="ml-auto">
                    <RowStatus order={order} kind={kind} now={now} today={today} />
                  </span>
                </span>
                <span className="flex min-w-0 items-center gap-2">
                  <CustomerFace
                    avatar={order.customerAvatar}
                    name={order.customerName}
                    size="sm"
                    initialsClassName="bg-secondary text-secondary-foreground"
                  />
                  <span className="min-w-0 truncate text-sm font-semibold">
                    {order.customerName}
                  </span>
                  <CustomerChip order={order} />
                </span>
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                  <ItemPhotos order={order} />
                  <span className="text-xs whitespace-nowrap text-muted-foreground">
                    {L.itemCount(count)}
                  </span>
                  <PaymentChip order={order} now={now} />
                  <span className="ml-auto font-bold whitespace-nowrap tabular-nums">
                    {formatPeso(order.total)}
                  </span>
                </span>
              </button>
            </FadeUp>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

/** A column name that sorts the table; the arrow shows which way. */
function SortHeader({
  label,
  column,
  sort,
  onSort,
  end,
}: {
  label: string;
  column: SortKey;
  sort: Sort;
  onSort: (key: SortKey) => void;
  end?: boolean;
}) {
  const on = sort.key === column;
  const Arrow = sort.asc ? ArrowUpIcon : ArrowDownIcon;
  return (
    <button
      type="button"
      onClick={() => onSort(column)}
      aria-label={L.sortBy(label)}
      aria-pressed={on}
      className={cn(
        '-mx-1 flex items-center gap-1 rounded-md px-1 py-0.5 font-medium outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring',
        end && 'ms-auto',
        on ? 'text-foreground' : 'text-muted-foreground',
      )}
    >
      {label}
      {on ? <Arrow aria-hidden="true" className="size-3.5 text-primary" /> : null}
    </button>
  );
}

/**
 * Laptops (T95, decision E3): the table fits the screen and scrolls inside, the column names stay on top,
 * and one footer keeps the count, the total and the pages in view (clear of the chat bubble).
 */
function OrdersGrid({
  orders,
  kind,
  now,
  today,
  multiDay,
  footer,
  sort,
  onSort,
  onOpen,
}: RowsProps & { sort: Sort; onSort: (key: SortKey) => void }) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const columns = React.useMemo<ColumnDef<DataGridFeatures, BoardOrder, unknown>[]>(
    () => [
      {
        accessorKey: 'orderNo',
        header: () => (
          <SortHeader label={L.cols.order} column="order" sort={sort} onSort={onSort} />
        ),
        cell: ({ row }) => {
          const TypeIcon = ORDER_TYPE_ICON[row.original.type];
          return (
            <span className="flex items-center gap-1.5">
              <span className="font-bold tabular-nums">{orderNoLabel(row.original.orderNo)}</span>
              <TypeIcon className="size-3.5 text-muted-foreground" aria-hidden="true" />
              <span className="sr-only">{ordersWords.types[row.original.type]}</span>
            </span>
          );
        },
        size: 96,
      },
      {
        accessorKey: 'dueAt',
        header: () => (
          <SortHeader
            label={multiDay ? L.cols.date : L.cols.time}
            column="time"
            sort={sort}
            onSort={onSort}
          />
        ),
        cell: ({ row }) => (
          <span className="text-sm whitespace-nowrap text-muted-foreground tabular-nums">
            {whenText(row.original, multiDay)}
          </span>
        ),
        size: multiDay ? 170 : 96,
      },
      {
        accessorKey: 'customerName',
        header: L.cols.customer,
        cell: ({ row }) => (
          <span className="flex min-w-0 items-center gap-2">
            <CustomerFace
              avatar={row.original.customerAvatar}
              name={row.original.customerName}
              size="sm"
              initialsClassName="bg-secondary text-secondary-foreground"
            />
            <span className="min-w-0 truncate font-medium">{row.original.customerName}</span>
            <CustomerChip order={row.original} />
          </span>
        ),
        size: 230,
      },
      {
        id: 'items',
        header: L.cols.items,
        cell: ({ row }) => {
          const count = row.original.lines.reduce((n, l) => n + l.qty, 0);
          return (
            <span className="flex items-center gap-2">
              <ItemPhotos order={row.original} />
              <span className="text-sm whitespace-nowrap text-muted-foreground">
                {L.itemCount(count)}
              </span>
            </span>
          );
        },
        size: 180,
      },
      {
        accessorKey: 'total',
        header: () => (
          <span className="flex w-full">
            <SortHeader label={L.cols.total} column="total" sort={sort} onSort={onSort} end />
          </span>
        ),
        cell: ({ row }) => (
          <span className="block text-right font-bold tabular-nums">
            {formatPeso(row.original.total)}
          </span>
        ),
        size: 110,
      },
      {
        accessorKey: 'paymentStatus',
        header: L.cols.payment,
        cell: ({ row }) => <PaymentChip order={row.original} now={now} />,
        size: 210,
      },
      {
        accessorKey: 'status',
        header: L.cols.status,
        cell: ({ row }) => <RowStatus order={row.original} kind={kind} now={now} today={today} />,
        size: 190,
      },
    ],
    [kind, now, today, multiDay, sort, onSort],
  );

  const table = useTable({
    features: dataGridFeatures,
    columns,
    data: orders,
    getRowId: (row) => row.id,
    initialState: { pagination: { pageIndex: 0, pageSize: PAGE_SIZE } },
  });

  const { pageIndex, pageSize } = table.state.pagination;
  const from = orders.length === 0 ? 0 : pageIndex * pageSize + 1;
  const to = Math.min((pageIndex + 1) * pageSize, orders.length);
  const turn = (step: -1 | 1) => {
    if (step < 0) table.previousPage();
    else table.nextPage();
    scrollRef.current?.scrollTo({ top: 0 });
  };

  return (
    <DataGrid
      table={table}
      recordCount={orders.length}
      i18n={GRID_I18N}
      tableLayout={{ dense: false, headerSticky: true }}
      tableClassNames={{
        headerSticky: 'sticky top-0 z-20 bg-muted font-medium text-foreground',
        bodyRow:
          'h-14 cursor-pointer transition-colors duration-base hover:bg-muted/40 active:bg-muted/60',
      }}
      onRowClick={(row) => onOpen(row)}
    >
      <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        <div ref={scrollRef} className="max-h-fill-92 overflow-auto overscroll-contain">
          <DataGridTable />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-border py-2 ps-4 pe-20">
          <p className="text-sm font-medium text-muted-foreground tabular-nums">{footer}</p>
          <div className="flex items-center gap-2">
            <Select
              value={`${pageSize}`}
              onValueChange={(value) => {
                table.setPageSize(Number(value));
                scrollRef.current?.scrollTo({ top: 0 });
              }}
            >
              <SelectTrigger aria-label={L.perPageLabel} className="h-9 w-fit" size="sm">
                <SelectValue>{(value: string) => L.perPage(Number(value))}</SelectValue>
              </SelectTrigger>
              <SelectContent align="end" alignItemWithTrigger={false}>
                {PAGE_SIZES.map((size) => (
                  <SelectItem key={size} value={`${size}`}>
                    {L.perPage(size)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="px-1 text-sm whitespace-nowrap text-muted-foreground tabular-nums">
              {L.range(from, to, orders.length)}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="size-9"
              aria-label={L.previous}
              disabled={!table.getCanPreviousPage()}
              onClick={() => turn(-1)}
            >
              <ChevronLeftIcon aria-hidden="true" className="rtl:rotate-180" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-9"
              aria-label={L.next}
              disabled={!table.getCanNextPage()}
              onClick={() => turn(1)}
            >
              <ChevronRightIcon aria-hidden="true" className="rtl:rotate-180" />
            </Button>
          </div>
        </div>
      </div>
    </DataGrid>
  );
}

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-2" aria-hidden="true">
      <Skeleton className="h-12 w-full rounded-xl" />
      <Skeleton className="h-14 w-full rounded-xl" />
      <Skeleton className="h-14 w-full rounded-xl" />
      <Skeleton className="h-14 w-full rounded-xl" />
    </div>
  );
}
