import * as React from 'react';
import {
  CalendarDaysIcon,
  CalendarIcon,
  HistoryIcon,
  TimerOffIcon,
  XCircleIcon,
} from 'lucide-react';
import type { BoardOrder, ShopKind } from '@smartapp/core';
import {
  addDays,
  errorWords,
  formatClock,
  formatManila,
  formatPeso,
  manilaDate,
  ordersWords,
  payWindowOver,
  salesTotal,
  statusStage,
} from '@smartapp/core';
import { errorCodeOf, useOrdersByDate, useScheduledOrders } from '@smartapp/data';
import { Button } from '@smartapp/ui/components/button';
import { Calendar } from '@smartapp/ui/components/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@smartapp/ui/components/popover';
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
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@smartapp/ui/components/toggle-group';
import { useFormFactor } from '@smartapp/ui/hooks/use-form-factor';
import { cn } from 'cn';
import { GRID_I18N, GRID_PAGE_SIZE, GridPager } from '@/app/grid-pager';
import { CustomerChip, ItemPhotos, PaymentChip, orderNoLabel } from '@/app/orders/order-card';
import { dateFromKey, keyFromDate } from '@/app/day-key';
import { AnimatePresence, FadeUp } from '@/app/orders/order-motion';
import { ORDER_TYPE_ICON } from '@/app/orders/order-type-icons';
import { StageChip } from '@/app/orders/stage-chip';
import { stageLabel } from '@/app/orders/stage';
import { PageEmpty, PageError } from '@/app/page-state';
import {
  DAY_PRESETS,
  LIST_STATUSES,
  useOrdersSearch,
  useSetOrdersSearch,
  type ListStatus,
  type OrderFilter,
} from './search.js';

// How far ahead "Upcoming" looks; booking rules allow at most 60 days.
const UPCOMING_DAYS = 60;

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
  if (status === 'cancelled') return ordersWords.list.cancelled;
  if (status === 'expired') return ordersWords.list.expired;
  return stageLabel(status, kind);
}

function StatusChip({ status, kind }: { status: ListStatus; kind: ShopKind }) {
  if (status === 'cancelled') {
    return (
      <Badge variant="destructive-light" size="lg" radius="full" className="gap-1 font-semibold">
        <XCircleIcon aria-hidden="true" />
        {ordersWords.list.cancelled}
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
        {ordersWords.list.expired}
      </Badge>
    );
  }
  return <StageChip stage={status} kind={kind} />;
}

/**
 * The List view (D8): any day's orders, or everything booked for later days. Replaces History and
 * Scheduled. Rows open the same order panel as the board.
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
  const [pickerOpen, setPickerOpen] = React.useState(false);

  const day = search.day ?? 'today';
  const upcoming = day === 'upcoming';
  const date =
    day === 'today' ? today : day === 'yesterday' ? addDays(today, -1) : upcoming ? today : day;
  const preset =
    day === 'today' || day === 'yesterday' || day === 'upcoming'
      ? day
      : date === today
        ? 'today'
        : undefined;

  const byDate = useOrdersByDate(slug, upcoming ? '' : date, query || undefined);
  const scheduled = useScheduledOrders(
    slug,
    upcoming ? addDays(today, 1) : '',
    upcoming ? addDays(today, UPCOMING_DAYS) : '',
  );
  const source = upcoming ? scheduled : byDate;

  const all = React.useMemo(() => {
    const raw = upcoming ? (scheduled.data?.orders ?? []) : (byDate.data ?? []);
    const q = query.trim().toLowerCase();
    // The scheduled list has no server search; match name or number here.
    const searched =
      upcoming && q
        ? raw.filter(
            (o) =>
              o.customerName.toLowerCase().includes(q) ||
              String(o.orderNo).includes(q.replace(/^#?0*/, '')),
          )
        : raw;
    return searched.filter(matches);
  }, [upcoming, scheduled.data, byDate.data, query, matches]);

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
    () => (status ? all.filter((o) => listStatus(o, now) === status) : all),
    [all, status, now],
  );
  const shownStatuses = LIST_STATUSES.filter((s) => counts[s] > 0 || s === status);
  const footer = ordersWords.list.footer(rows.length, formatPeso(salesTotal(rows, now)));

  let body: React.ReactNode;
  if (source.isPending) {
    body = <ListSkeleton />;
  } else if (source.isError) {
    body = (
      <PageError
        title={ordersWords.states.errorList}
        message={errorWords(errorCodeOf(source.error))}
        retryLabel={ordersWords.states.tryAgain}
        onRetry={() => void source.refetch()}
      />
    );
  } else if (rows.length === 0) {
    const filtered = status !== undefined || onClearFilters !== undefined;
    body = (
      <PageEmpty
        icon={
          upcoming ? (
            <CalendarDaysIcon className="size-8 text-muted-foreground" />
          ) : (
            <HistoryIcon className="size-8 text-muted-foreground" />
          )
        }
        title={filtered ? ordersWords.states.noMatches : undefined}
        description={
          filtered
            ? undefined
            : upcoming
              ? ordersWords.list.emptyUpcoming
              : ordersWords.list.emptyDay(formatManila(dateFromKey(date), 'date'))
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
          ) : date !== today || upcoming ? (
            <Button
              variant="outline"
              className="h-11 md:h-9"
              onClick={() => setSearch({ day: undefined }, { replace: true })}
            >
              {ordersWords.list.showToday}
            </Button>
          ) : undefined
        }
      />
    );
  } else if (upcoming) {
    body = <UpcomingDays orders={rows} kind={kind} now={now} isPhone={isPhone} onOpen={onOpen} />;
  } else if (isPhone) {
    body = <PhoneRows orders={rows} kind={kind} now={now} onOpen={onOpen} />;
  } else {
    body = <OrdersGrid orders={rows} kind={kind} now={now} onOpen={onOpen} />;
  }

  return (
    <div className="flex flex-col gap-3" data-filter={filter ?? 'all'}>
      {/* Day: Today, Yesterday, Pick a date, Upcoming. */}
      <div className="flex flex-wrap items-center gap-2">
        <ToggleGroup
          value={preset ? [preset] : []}
          onValueChange={(next) => {
            const picked = next[0];
            if (picked === 'today')
              setSearch({ day: undefined, status: undefined }, { replace: true });
            if (picked === 'yesterday' || picked === 'upcoming')
              setSearch({ day: picked, status: undefined }, { replace: true });
          }}
          aria-label={ordersWords.list.days}
          spacing={1}
          className="rounded-xl border border-border/60 bg-muted/60 p-1"
        >
          {DAY_PRESETS.map((p) => (
            <ToggleGroupItem
              key={p}
              value={p}
              className="h-9 rounded-lg px-3 text-sm font-semibold text-muted-foreground hover:bg-transparent hover:text-foreground aria-pressed:bg-card aria-pressed:text-foreground aria-pressed:shadow-xs md:h-7"
            >
              {ordersWords.list[p]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <PopoverTrigger
            render={
              <Button
                type="button"
                variant={preset ? 'outline' : 'secondary'}
                className="h-11 gap-1.5 px-3 font-semibold md:h-9"
              >
                <CalendarIcon aria-hidden="true" />
                {preset ? ordersWords.list.pickDate : formatManila(dateFromKey(date), 'date')}
              </Button>
            }
          />
          <PopoverContent align="start" className="w-auto p-0">
            <Calendar
              mode="single"
              selected={dateFromKey(date)}
              disabled={{ after: dateFromKey(today) }}
              onSelect={(d) => {
                if (!d) return;
                const key = keyFromDate(d);
                setSearch(
                  { day: key === today ? undefined : key, status: undefined },
                  { replace: true },
                );
                setPickerOpen(false);
              }}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Status chips with counts; only the ones that have orders (plus the picked one). */}
      {all.length > 0 ? (
        <Scroller orientation="horizontal" hideScrollbar className="-mx-4 px-4 md:mx-0 md:px-0">
          <ToggleGroup
            value={[status ?? 'all']}
            onValueChange={(next) => {
              const picked = LIST_STATUSES.find((s) => s === next[0]);
              setSearch({ status: picked }, { replace: true });
            }}
            aria-label={ordersWords.list.statusLabel}
            spacing={1.5}
            className="w-max"
          >
            <ToggleGroupItem
              value="all"
              className="h-10 gap-1.5 rounded-full border border-border bg-card px-3 text-sm font-semibold text-muted-foreground aria-pressed:border-primary aria-pressed:bg-accent aria-pressed:text-foreground md:h-8"
            >
              {ordersWords.list.all}
              <span className="tabular-nums">{all.length}</span>
            </ToggleGroupItem>
            {shownStatuses.map((s) => (
              <ToggleGroupItem
                key={s}
                value={s}
                className="h-10 gap-1.5 rounded-full border border-border bg-card px-3 text-sm font-semibold text-muted-foreground aria-pressed:border-primary aria-pressed:bg-accent aria-pressed:text-foreground md:h-8"
              >
                {statusWord(s, kind)}
                <span className="tabular-nums">{counts[s]}</span>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Scroller>
      ) : null}

      {body}

      {rows.length > 0 && !source.isPending && !source.isError ? (
        <p className="py-2 text-center text-sm text-muted-foreground tabular-nums md:text-right">
          {footer}
        </p>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------- rows

interface RowsProps {
  orders: readonly BoardOrder[];
  kind: ShopKind;
  now: Date;
  onOpen: (order: BoardOrder) => void;
}

function PhoneRows({ orders, kind, now, onOpen }: RowsProps) {
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
                    <StatusChip status={listStatus(order, now)} kind={kind} />
                  </span>
                </span>
                <span className="flex min-w-0 items-center gap-2">
                  <span className="min-w-0 truncate text-sm font-semibold">
                    {order.customerName}
                  </span>
                  <CustomerChip order={order} />
                </span>
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                  <ItemPhotos order={order} />
                  <span className="text-xs text-muted-foreground">
                    {ordersWords.list.itemCount(count)}
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

function OrdersGrid({ orders, kind, now, onOpen }: RowsProps) {
  const columns = React.useMemo<ColumnDef<DataGridFeatures, BoardOrder, unknown>[]>(
    () => [
      {
        accessorKey: 'orderNo',
        header: ordersWords.list.cols.order,
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
        header: ordersWords.list.cols.time,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground tabular-nums">
            {formatClock(row.original.dueAt)}
          </span>
        ),
        size: 90,
      },
      {
        accessorKey: 'customerName',
        header: ordersWords.list.cols.customer,
        cell: ({ row }) => (
          <span className="flex min-w-0 items-center gap-2">
            <span className="min-w-0 truncate font-medium">{row.original.customerName}</span>
            <CustomerChip order={row.original} />
          </span>
        ),
        size: 240,
      },
      {
        id: 'items',
        header: ordersWords.list.cols.items,
        cell: ({ row }) => {
          const count = row.original.lines.reduce((n, l) => n + l.qty, 0);
          return (
            <span className="flex items-center gap-2">
              <ItemPhotos order={row.original} />
              <span className="text-sm text-muted-foreground">
                {ordersWords.list.itemCount(count)}
              </span>
            </span>
          );
        },
        size: 170,
      },
      {
        accessorKey: 'total',
        header: () => (
          <span className="block w-full text-right">{ordersWords.list.cols.total}</span>
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
        header: ordersWords.list.cols.payment,
        cell: ({ row }) => <PaymentChip order={row.original} now={now} />,
        size: 210,
      },
      {
        accessorKey: 'status',
        header: ordersWords.list.cols.status,
        cell: ({ row }) => <StatusChip status={listStatus(row.original, now)} kind={kind} />,
        size: 140,
      },
    ],
    [kind, now],
  );

  const table = useTable({
    features: dataGridFeatures,
    columns,
    data: orders,
    getRowId: (row) => row.id,
    initialState: { pagination: { pageIndex: 0, pageSize: GRID_PAGE_SIZE } },
  });

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
      <div className="w-full overflow-x-auto">
        <DataGrid
          table={table}
          recordCount={orders.length}
          i18n={GRID_I18N}
          tableLayout={{ dense: false }}
          tableClassNames={{
            headerSticky:
              'sticky top-0 z-20 bg-muted/90 font-medium text-foreground backdrop-blur-xs',
            bodyRow:
              'h-14 cursor-pointer transition-colors duration-base hover:bg-muted/40 active:bg-muted/60',
          }}
          onRowClick={(row) => onOpen(row)}
        >
          <DataGridTable />
          <GridPager count={orders.length} />
        </DataGrid>
      </div>
    </div>
  );
}

function UpcomingDays({ orders, kind, now, isPhone, onOpen }: RowsProps & { isPhone: boolean }) {
  const days = React.useMemo(() => {
    const map = new Map<string, BoardOrder[]>();
    for (const o of orders) {
      const key = manilaDate(o.dueAt);
      const list = map.get(key);
      if (list) list.push(o);
      else map.set(key, [o]);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [orders]);

  return (
    <div className="flex flex-col gap-5">
      {days.map(([key, list]) => (
        <section
          key={key}
          className="flex flex-col gap-2"
          aria-label={formatManila(dateFromKey(key), 'date')}
        >
          <h2
            className={cn(
              'flex items-baseline gap-2 text-sm font-semibold',
              'sticky top-0 z-sticky -mx-1 bg-background/95 px-1 py-1.5 backdrop-blur-sm',
            )}
          >
            <CalendarDaysIcon
              className="size-4 self-center text-muted-foreground"
              aria-hidden="true"
            />
            {formatManila(dateFromKey(key), 'date')}
            <span className="text-xs font-normal text-muted-foreground tabular-nums">
              {ordersWords.list.footer(list.length, formatPeso(salesTotal(list, now)))}
            </span>
          </h2>
          {isPhone ? (
            <PhoneRows orders={list} kind={kind} now={now} onOpen={onOpen} />
          ) : (
            <OrdersGrid orders={list} kind={kind} now={now} onOpen={onOpen} />
          )}
        </section>
      ))}
    </div>
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
