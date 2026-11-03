import * as React from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  HistoryIcon,
  WifiOffIcon,
} from 'lucide-react';
import type { BoardOrder, OrderStatus, PaymentStatus } from '@smartapp/core';
import {
  addDays,
  formatClock,
  formatManila,
  errorWords,
  formatPeso,
  manilaDate,
  ordersWords,
  words,
} from '@smartapp/core';
import { errorCodeOf, useOrdersByDate } from '@smartapp/data';
import { Button } from '@smartapp/ui/components/button';
import { Calendar } from '@smartapp/ui/components/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@smartapp/ui/components/popover';
import { Status, StatusIndicator } from '@smartapp/ui/components/status';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import {
  DataGrid,
  DataGridTable,
  dataGridFeatures,
  useTable,
  type ColumnDef,
  type DataGridFeatures,
} from '@smartapp/ui/components/reui/data-grid/index';
import { Notice } from '@/app/notice';
import { PageEmpty, PageError } from '@/app/page-state';
import { SearchField } from '@/app/search-field';
import { useOnlineStatus } from '@/app/use-online-status';
import { useNow } from '@/app/orders/use-now';
import { useMediaQuery } from '@/app/use-media-query';
import { ORDER_TYPE_ICON } from '@/app/orders/order-type-icons';
import { useOrdersSearch, withSearch } from '../tabs.js';
import { TypeFilter } from '../type-filter.js';
import { orderNoLabel } from '@/app/orders/order-ticket';

export interface HistoryScreenProps {
  slug: string;
}

function orderStatusVariant(
  status: OrderStatus,
): 'default' | 'success' | 'error' | 'warning' | 'info' {
  switch (status) {
    case 'completed':
    case 'ready':
      return 'success';
    case 'cancelled':
    case 'expired':
      return 'error';
    case 'preparing':
      return 'warning';
    case 'placed':
    case 'out_for_delivery':
      return 'info';
  }
}

function paymentWord(order: BoardOrder): string {
  return words.shop.paymentStatus[order.paymentStatus];
}

function paymentStatusVariant(
  status: PaymentStatus,
): 'default' | 'success' | 'error' | 'warning' | 'info' {
  switch (status) {
    case 'paid':
      return 'success';
    case 'pending':
      return 'warning';
    case 'refunded':
    case 'unpaid':
      return 'default';
  }
}

export function HistoryScreen({ slug }: HistoryScreenProps) {
  const navigate = useNavigate();
  const search = useOrdersSearch();
  const isOnline = useOnlineStatus();
  const now = useNow(30_000);
  const isDesktop = useMediaQuery('(min-width: 768px)');

  const todayDateStr = React.useMemo(() => manilaDate(now), [now]);
  const activeDateStr = search.date ?? todayDateStr;
  const activeDate = React.useMemo(() => {
    const [y, m, d] = activeDateStr.split('-').map(Number);
    if (y && m && d) return new Date(y, m - 1, d);
    return new Date();
  }, [activeDateStr]);

  const searchQuery = search.q ?? '';
  const typeFilter = search.type ?? 'all';

  const {
    data: orders = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useOrdersByDate(slug, activeDateStr, searchQuery || undefined);

  // Filter orders by order type if selected
  const filteredOrders = React.useMemo(() => {
    if (typeFilter === 'all') return orders;
    return orders.filter((o) => o.type === typeFilter);
  }, [orders, typeFilter]);

  const typeCounts = React.useMemo(() => {
    return {
      all: orders.length,
      walk_in: orders.filter((o) => o.type === 'walk_in').length,
      pickup: orders.filter((o) => o.type === 'pickup').length,
      delivery: orders.filter((o) => o.type === 'delivery').length,
    };
  }, [orders]);

  // Total sales centavos for footer
  const totalSalesCentavos = React.useMemo(() => {
    return filteredOrders
      .filter((o) => o.status !== 'cancelled' && o.status !== 'expired')
      .reduce((sum, o) => sum + o.total, 0);
  }, [filteredOrders]);

  const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);

  // Navigation handlers
  const handleSetDate = (newDate: Date) => {
    const nextDateStr = manilaDate(newDate);
    void navigate({
      to: '/orders',
      search: withSearch(search, { date: nextDateStr }),
    });
  };

  const handleStepDate = (deltaDays: number) => {
    const nextDateStr = addDays(activeDateStr, deltaDays);
    void navigate({
      to: '/orders',
      search: withSearch(search, { date: nextDateStr }),
    });
  };

  const handleSearchChange = (query: string) => {
    void navigate({
      to: '/orders',
      search: withSearch(search, { q: query.trim() || undefined }),
    });
  };

  const handleSelectOrder = (order: BoardOrder) => {
    void navigate({
      to: '/orders/$orderId',
      params: { orderId: order.id },
      search,
    });
  };

  // Columns for ReUI DataGrid
  const columns = React.useMemo<ColumnDef<DataGridFeatures, BoardOrder, unknown>[]>(() => {
    return [
      {
        accessorKey: 'orderNo',
        header: ordersWords.history.cols.orderNo,
        cell: ({ row }) => (
          <span className="font-bold tabular-nums">{orderNoLabel(row.original.orderNo)}</span>
        ),
        size: 70,
      },
      {
        accessorKey: 'placedAt',
        header: ordersWords.history.cols.time,
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground tabular-nums">
            {formatClock(row.original.placedAt)}
          </span>
        ),
        size: 90,
      },
      {
        accessorKey: 'type',
        header: ordersWords.history.cols.type,
        cell: ({ row }) => {
          const t = row.original.type;
          const TypeIcon = ORDER_TYPE_ICON[t];
          return (
            <div className="flex items-center gap-1.5 text-xs">
              <TypeIcon className="size-3.5 text-muted-foreground" aria-hidden="true" />
              <span>{ordersWords.types[t]}</span>
            </div>
          );
        },
        size: 110,
      },
      {
        accessorKey: 'customerName',
        header: ordersWords.history.cols.customer,
        cell: ({ row }) => (
          <span className="block truncate font-medium text-foreground">
            {row.original.customerName}
          </span>
        ),
        size: 150,
      },
      {
        id: 'items',
        header: ordersWords.history.cols.items,
        cell: ({ row }) => {
          const lines = row.original.lines;
          const text = lines.map((l) => `${l.qty}× ${l.name}`).join(', ');
          return <span className="line-clamp-1 text-xs text-muted-foreground">{text}</span>;
        },
        size: 180,
      },
      {
        id: 'total',
        header: () => <div className="w-full text-right">{ordersWords.history.cols.total}</div>,
        cell: ({ row }) => (
          <div className="text-right font-bold tabular-nums">{formatPeso(row.original.total)}</div>
        ),
        size: 110,
      },
      {
        accessorKey: 'paymentStatus',
        header: ordersWords.history.cols.payment,
        cell: ({ row }) => {
          const p = row.original.paymentStatus;
          const variant = paymentStatusVariant(p);
          return (
            <Status variant={variant}>
              <StatusIndicator />
              <span>{paymentWord(row.original)}</span>
            </Status>
          );
        },
        size: 110,
      },
      {
        accessorKey: 'status',
        header: ordersWords.history.cols.status,
        cell: ({ row }) => {
          const st = row.original.status;
          const variant = orderStatusVariant(st);
          return (
            <Status variant={variant}>
              <StatusIndicator />
              <span>{words.shop.orderStatus[st]}</span>
            </Status>
          );
        },
        size: 120,
      },
    ];
  }, []);

  const table = useTable({
    features: dataGridFeatures,
    columns,
    data: filteredOrders,
    getRowId: (row) => row.id,
  });

  return (
    <div className="space-y-4">
      {/* Offline Notice */}
      {!isOnline && (
        <Notice tone="warning" icon={<WifiOffIcon className="size-4" />}>
          <span>{ordersWords.states.offlineNotice}</span>
        </Notice>
      )}

      {/* Header controls: Date Popover, Quick buttons, Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Date Selector */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
            <PopoverTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 gap-1.5 px-3 text-xs font-semibold"
                >
                  <CalendarIcon className="size-3.5" />
                  <span>{formatManila(activeDate, 'date')}</span>
                </Button>
              }
            />
            <PopoverContent align="start" className="w-auto p-0">
              <Calendar
                mode="single"
                selected={activeDate}
                onSelect={(d) => {
                  if (d) {
                    handleSetDate(d);
                    setIsPopoverOpen(false);
                  }
                }}
              />
            </PopoverContent>
          </Popover>

          <Button
            type="button"
            variant={activeDateStr === todayDateStr ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => handleSetDate(new Date())}
            className="h-9 px-3 text-xs font-semibold"
          >
            {ordersWords.history.today}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleSetDate(new Date(now.getTime() - 86_400_000))}
            className="h-9 px-3 text-xs font-semibold"
          >
            {ordersWords.history.yesterday}
          </Button>

          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => handleStepDate(-1)}
              aria-label={ordersWords.history.previousDay}
              className="size-9"
            >
              <ChevronLeftIcon className="size-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => handleStepDate(1)}
              aria-label={ordersWords.history.nextDay}
              className="size-9"
            >
              <ChevronRightIcon className="size-4" />
            </Button>
          </div>
        </div>

        {/* Search Field */}
        <div className="w-full sm:w-72">
          <SearchField
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder={ordersWords.history.searchPlaceholder}
            clearLabel={ordersWords.history.clearSearch}
          />
        </div>
      </div>

      {/* Type filter chips */}
      <TypeFilter counts={typeCounts} />

      {/* States: Loading, Error, Empty, Content */}
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
        </div>
      ) : isError ? (
        <PageError
          title={ordersWords.states.errorHistory}
          message={errorWords(errorCodeOf(error))}
          retryLabel={ordersWords.states.tryAgain}
          onRetry={() => {
            void refetch();
          }}
          className="py-16"
        />
      ) : filteredOrders.length === 0 ? (
        <PageEmpty
          className="py-16"
          icon={<HistoryIcon className="size-8 text-muted-foreground" />}
          description={ordersWords.history.emptyDate(formatManila(activeDate, 'date'))}
          action={
            activeDateStr !== todayDateStr ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSetDate(new Date())}
                className="text-xs font-semibold"
              >
                {ordersWords.history.showToday}
              </Button>
            ) : undefined
          }
        />
      ) : isDesktop ? (
        /* Desktop ReUI Data Grid */
        <div className="flex flex-col gap-3 rounded-xl border border-border/80 bg-card p-3 shadow-2xs">
          <div className="w-full overflow-x-auto">
            <DataGrid
              table={table}
              recordCount={filteredOrders.length}
              tableLayout={{ dense: false }}
              tableClassNames={{
                headerSticky:
                  'sticky top-0 z-20 bg-muted/90 font-medium text-foreground backdrop-blur-xs',
                bodyRow:
                  'h-12 cursor-pointer transition-colors hover:bg-muted/40 active:bg-muted/60',
              }}
              onRowClick={(row) => handleSelectOrder(row)}
            >
              <DataGridTable />
            </DataGrid>
          </div>

          {/* Footer: Count and total sales for the date in tabular format */}
          <div className="flex items-center justify-between border-t border-border/60 pt-3 text-xs text-muted-foreground">
            <span>
              {ordersWords.history.footer(filteredOrders.length, formatPeso(totalSalesCentavos))}
            </span>
          </div>
        </div>
      ) : (
        /* Phone Compact List Cards */
        <div className="space-y-3">
          <div className="space-y-2.5">
            {filteredOrders.map((order) => {
              const TypeIcon = ORDER_TYPE_ICON[order.type];
              return (
                <button
                  type="button"
                  key={order.id}
                  onClick={() => handleSelectOrder(order)}
                  className="flex w-full cursor-pointer flex-col gap-2 rounded-xl border border-border/80 bg-card p-3.5 text-left shadow-2xs transition-shadow focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:bg-muted/30"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold tabular-nums">{orderNoLabel(order.orderNo)}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {formatClock(order.placedAt)}
                      </span>
                    </div>
                    <Status variant={orderStatusVariant(order.status)}>
                      <StatusIndicator />
                      <span>{words.shop.orderStatus[order.status]}</span>
                    </Status>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 truncate">
                      <TypeIcon className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate font-medium text-foreground">
                        {order.customerName}
                      </span>
                    </div>
                    <span className="font-bold text-foreground tabular-nums">
                      {formatPeso(order.total)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-t border-border/40 pt-2 text-xs text-muted-foreground">
                    <span className="line-clamp-1 truncate">
                      {order.lines.map((l) => `${l.qty}× ${l.name}`).join(', ')}
                    </span>
                    <Status variant={paymentStatusVariant(order.paymentStatus)}>
                      <StatusIndicator />
                      <span>{paymentWord(order)}</span>
                    </Status>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Footer for phone */}
          <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-center text-xs text-muted-foreground">
            {ordersWords.history.footer(filteredOrders.length, formatPeso(totalSalesCentavos))}
          </div>
        </div>
      )}
    </div>
  );
}
