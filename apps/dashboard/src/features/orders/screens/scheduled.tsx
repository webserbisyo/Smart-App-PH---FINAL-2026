import * as React from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SlidersHorizontalIcon,
  WifiOffIcon,
} from 'lucide-react';
import type { BoardOrder, OrderType } from '@smartapp/core';
import { addDays, formatManila, manilaDate, ordersWords, words } from '@smartapp/core';
import { useScheduledOrders } from '@smartapp/data';
import { Button } from '@smartapp/ui/components/button';
import { Switch } from '@smartapp/ui/components/switch';
import { ToggleGroup, ToggleGroupItem } from '@smartapp/ui/components/toggle-group';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { Notice } from '@/app/notice';
import { PageEmpty, PageError } from '@/app/page-state';
import { useOnlineStatus } from '@/app/use-online-status';
import { useNow } from '@/app/orders/use-now';
import { useMediaQuery } from '@/app/use-media-query';
import { useOrdersSearch, withSearch, type CalendarViewParam } from '../tabs.js';
import { TypeFilter } from '../type-filter.js';
import { ScheduledCalendar } from '../scheduled-calendar.js';
import { DayAgenda } from '../day-agenda.js';
import { BookingRulesSheet } from '../booking-rules-sheet.js';
import { ChangeTimeDialog, type RescheduleOrderTarget } from '../change-time-dialog.js';

export interface ScheduledScreenProps {
  slug: string;
}

export function ScheduledScreen({ slug }: ScheduledScreenProps) {
  const navigate = useNavigate();
  const search = useOrdersSearch();
  const isOnline = useOnlineStatus();
  const now = useNow(30_000);

  // Responsive breakpoints
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  // Selected date from search param, default to today
  const todayDateStr = React.useMemo(() => manilaDate(now), [now]);
  const activeDateStr = search.date ?? todayDateStr;
  const activeDate = React.useMemo(() => {
    const [y, m, d] = activeDateStr.split('-').map(Number);
    if (y && m && d) return new Date(y, m - 1, d);
    return new Date();
  }, [activeDateStr]);

  // Calendar view param: month | week | agenda (default week on desktop)
  const calView: CalendarViewParam = search.cal ?? 'week';
  const showDone = search.showDone === 'true';
  const typeFilter = search.type ?? 'all';

  // Work out data query range from calView and activeDate (Requirement 3)
  const { fromDateStr, toDateStr } = React.useMemo(() => {
    if (!isDesktop) {
      // Phone/tablet shows month grid, so fetch 35 days centered on month
      const start = addDays(activeDateStr, -14);
      const end = addDays(activeDateStr, 35);
      return { fromDateStr: start, toDateStr: end };
    }

    if (calView === 'month') {
      const start = addDays(activeDateStr, -14);
      const end = addDays(activeDateStr, 35);
      return { fromDateStr: start, toDateStr: end };
    }

    if (calView === 'agenda') {
      return {
        fromDateStr: activeDateStr,
        toDateStr: addDays(activeDateStr, 14),
      };
    }

    // Default 'week': 7 days (current week)
    const start = addDays(activeDateStr, -3);
    const end = addDays(activeDateStr, 4);
    return { fromDateStr: start, toDateStr: end };
  }, [isDesktop, calView, activeDateStr]);

  const { data, isLoading, isError, refetch } = useScheduledOrders(slug, fromDateStr, toDateStr);

  const orders = data?.orders ?? [];
  const days = data?.days ?? [];

  // Filter orders by order type if selected
  const filteredOrders = React.useMemo(() => {
    if (typeFilter === 'all') return orders;
    return orders.filter((o) => o.type === (typeFilter as OrderType));
  }, [orders, typeFilter]);

  const typeCounts = React.useMemo(() => {
    return {
      all: orders.length,
      walk_in: orders.filter((o) => o.type === 'walk_in').length,
      pickup: orders.filter((o) => o.type === 'pickup').length,
      delivery: orders.filter((o) => o.type === 'delivery').length,
    };
  }, [orders]);

  // Sheet & dialog state
  const [isRulesOpen, setIsRulesOpen] = React.useState(false);
  const [rescheduleTarget, setRescheduleTarget] = React.useState<RescheduleOrderTarget | null>(
    null,
  );
  const [rescheduleDate, setRescheduleDate] = React.useState<Date | null>(null);
  const [rescheduleSlotAt, setRescheduleSlotAt] = React.useState<string | null>(null);
  const [isRescheduleOpen, setIsRescheduleOpen] = React.useState(false);

  // Date navigation handlers
  const handleSetDate = (newDate: Date) => {
    const nextDateStr = manilaDate(newDate);
    void navigate({
      to: '/orders',
      search: withSearch(search, { date: nextDateStr }),
    });
  };

  const handleStepDay = (deltaDays: number) => {
    const nextDateStr = addDays(activeDateStr, deltaDays);
    void navigate({
      to: '/orders',
      search: withSearch(search, { date: nextDateStr }),
    });
  };

  const handleSetCalView = (v: CalendarViewParam) => {
    void navigate({
      to: '/orders',
      search: withSearch(search, { cal: v }),
    });
  };

  const handleToggleShowDone = (checked: boolean) => {
    void navigate({
      to: '/orders',
      search: withSearch(search, { showDone: checked ? 'true' : 'false' }),
    });
  };

  const handleSelectOrder = (order: BoardOrder) => {
    void navigate({
      to: '/orders/$orderId',
      params: { orderId: order.id },
      search,
    });
  };

  const handleDropOrder = (order: BoardOrder, proposedStart: Date) => {
    setRescheduleTarget({
      id: order.id,
      orderNo: order.orderNo,
      type: order.type,
      status: order.status,
      dueAt: order.dueAt,
      scheduledAt: order.scheduledAt,
      lines: order.lines,
    });
    setRescheduleDate(proposedStart);
    setRescheduleSlotAt(proposedStart.toISOString());
    setIsRescheduleOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Offline Notice */}
      {!isOnline && (
        <Notice tone="warning" icon={<WifiOffIcon className="size-4" />}>
          <span>{ordersWords.states.offlineNotice}</span>
        </Notice>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: Date nav & Today */}
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleSetDate(new Date())}
            className="h-9 px-3 text-xs font-semibold"
          >
            {ordersWords.schedule.today}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => handleStepDay(calView === 'month' ? -30 : -7)}
            aria-label="Previous period"
            className="size-9"
          >
            <ChevronLeftIcon className="size-4" />
          </Button>

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => handleStepDay(calView === 'month' ? 30 : 7)}
            aria-label="Next period"
            className="size-9"
          >
            <ChevronRightIcon className="size-4" />
          </Button>

          <span className="ml-1 text-sm font-bold text-foreground">
            {formatManila(activeDate, 'date')}
          </span>
        </div>

        {/* Right: View switch, Type chips, Show done, Booking rules */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Desktop view switch */}
          {isDesktop && (
            <ToggleGroup
              type="single"
              value={calView}
              onValueChange={(val) => {
                if (val === 'month' || val === 'week' || val === 'agenda') {
                  handleSetCalView(val);
                }
              }}
              className="h-9"
            >
              <ToggleGroupItem value="month" className="h-9 px-3 text-xs font-semibold">
                {ordersWords.schedule.views.month}
              </ToggleGroupItem>
              <ToggleGroupItem value="week" className="h-9 px-3 text-xs font-semibold">
                {ordersWords.schedule.views.week}
              </ToggleGroupItem>
              <ToggleGroupItem value="agenda" className="h-9 px-3 text-xs font-semibold">
                {ordersWords.schedule.views.agenda}
              </ToggleGroupItem>
            </ToggleGroup>
          )}

          {/* Show done toggle */}
          <div className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs">
            <span className="text-muted-foreground">{ordersWords.schedule.showDone}</span>
            <Switch
              checked={showDone}
              onCheckedChange={handleToggleShowDone}
              aria-label={ordersWords.schedule.showDone}
            />
          </div>

          {/* Booking rules button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsRulesOpen(true)}
            className="h-9 gap-1.5 text-xs font-semibold"
          >
            <SlidersHorizontalIcon className="size-3.5" />
            <span>{ordersWords.schedule.bookingRules}</span>
          </Button>
        </div>
      </div>

      {/* Type filter chips */}
      <TypeFilter counts={typeCounts} />

      {/* States: Loading, Error, Empty, Content */}
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-120 w-full rounded-xl" />
        </div>
      ) : isError ? (
        <PageError
          error={ordersWords.states.errorScheduled}
          onRetry={() => void refetch()}
          className="py-16"
        />
      ) : orders.length === 0 ? (
        <PageEmpty
          className="py-16"
          icon={<CalendarDaysIcon className="size-8 text-muted-foreground" />}
          description={ordersWords.schedule.emptyRange(
            formatManila(fromDateStr, 'date'),
            formatManila(toDateStr, 'date'),
          )}
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRulesOpen(true)}
              className="gap-1.5 text-xs font-semibold"
            >
              <SlidersHorizontalIcon className="size-3.5" />
              <span>{ordersWords.schedule.bookingRules}</span>
            </Button>
          }
        />
      ) : isDesktop ? (
        <ScheduledCalendar
          orders={filteredOrders}
          days={days}
          view={calView}
          onViewChange={handleSetCalView}
          date={activeDate}
          onDateChange={handleSetDate}
          showDone={showDone}
          onSelectOrder={handleSelectOrder}
          onDropOrderToReschedule={handleDropOrder}
        />
      ) : (
        <DayAgenda
          orders={filteredOrders}
          days={days}
          selectedDate={activeDate}
          onSelectDate={handleSetDate}
          onSelectOrder={handleSelectOrder}
          now={now}
        />
      )}

      {/* Booking Rules Sheet */}
      <BookingRulesSheet open={isRulesOpen} onOpenChange={setIsRulesOpen} slug={slug} />

      {/* Change Time Dialog from calendar drop */}
      <ChangeTimeDialog
        open={isRescheduleOpen}
        onOpenChange={setIsRescheduleOpen}
        slug={slug}
        order={rescheduleTarget}
        initialDate={rescheduleDate}
        initialSlotAt={rescheduleSlotAt}
      />
    </div>
  );
}
