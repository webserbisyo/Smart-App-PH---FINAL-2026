import * as React from 'react';
import { BanIcon, CalendarIcon, WifiOffIcon } from 'lucide-react';
import type { OwnerOrder, ScheduleDay } from '@smartapp/core';
import { errorWords, formatClock, formatManila, manilaDate, ordersWords } from '@smartapp/core';
import {
  errorCodeOf,
  useBookingRules,
  useOrderDetail,
  useRescheduleOrder,
  useSchedule,
} from '@smartapp/data';
import { Button } from '@smartapp/ui/components/button';
import { Calendar } from '@smartapp/ui/components/calendar';
import { Field, FieldContent, FieldDescription, FieldLabel } from '@smartapp/ui/components/field';
import { Popover, PopoverContent, PopoverTrigger } from '@smartapp/ui/components/popover';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { Switch } from '@smartapp/ui/components/switch';
import { ToggleGroup, ToggleGroupItem } from '@smartapp/ui/components/toggle-group';
import {
  WeekStripCalendar,
  type WeekStripDayState,
} from '@smartapp/ui/vendor/opensource-ui/week-strip-calendar';
import {
  ResponsiveDialog,
  ResponsiveDialogFooter,
} from '@smartapp/ui/compositions/responsive-dialog';
import { AsyncButton, useAsyncAction } from '@smartapp/ui/compositions/async-button';
import { notify } from '@smartapp/ui/compositions/notify';
import { Notice } from '@/app/notice';
import { orderNoLabel } from '@/app/orders/order-card';
import { useOnlineStatus } from '@/app/use-online-status';

export interface ChangeTimeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slug: string;
  orderId: string;
  /** The time a calendar drop proposed; the owner still confirms (T52). */
  initialAt?: Date | undefined;
}

export function ChangeTimeDialog({
  open,
  onOpenChange,
  slug,
  orderId,
  initialAt,
}: ChangeTimeDialogProps) {
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={ordersWords.changeTime.dialogTitle}
      description={ordersWords.changeTime.dialogDesc}
      scroll
    >
      {open && (
        <ChangeTimeLoader
          slug={slug}
          orderId={orderId}
          initialAt={initialAt}
          onClose={() => onOpenChange(false)}
        />
      )}
    </ResponsiveDialog>
  );
}

function FormSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-14 w-full rounded-lg" />
      <Skeleton className="h-16 w-full rounded-lg" />
      <Skeleton className="h-40 w-full rounded-lg" />
    </div>
  );
}

// The order's own lines (item ids) drive notice and daily limits, so load the full order.
function ChangeTimeLoader({
  slug,
  orderId,
  initialAt,
  onClose,
}: {
  slug: string;
  orderId: string;
  initialAt: Date | undefined;
  onClose: () => void;
}) {
  const { data: order, isLoading, isError, error, refetch } = useOrderDetail(slug, orderId);
  if (isLoading) return <FormSkeleton />;
  if (isError || !order) {
    return (
      <Notice
        tone="error"
        icon={<BanIcon className="size-4" />}
        action={
          <Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>
            {ordersWords.states.tryAgain}
          </Button>
        }
      >
        {errorWords(errorCodeOf(error))}
      </Notice>
    );
  }
  return <ChangeTimeForm slug={slug} order={order} initialAt={initialAt} onClose={onClose} />;
}

function weekStripState(day: ScheduleDay): WeekStripDayState {
  if (day.state === 'closed') return 'closed';
  if (day.state === 'open') return 'open';
  return 'full';
}

function ChangeTimeForm({
  slug,
  order,
  initialAt,
  onClose,
}: {
  slug: string;
  order: OwnerOrder;
  initialAt: Date | undefined;
  onClose: () => void;
}) {
  const isOnline = useOnlineStatus();
  const rescheduleMutation = useRescheduleOrder(slug);
  const changeAction = useAsyncAction();
  const { data: bookingRules, isLoading: rulesLoading } = useBookingRules(slug);

  const orderLines = React.useMemo(
    () => order.lines.map((l) => ({ itemId: l.itemId, qty: l.qty })),
    [order.lines],
  );
  const { data: schedule, isLoading: scheduleLoading } = useSchedule(slug, order.type, orderLines);

  const startAt = initialAt ?? new Date(order.scheduledAt ?? order.dueAt);
  const [selectedDate, setSelectedDate] = React.useState<Date>(startAt);
  const [selectedSlotAt, setSelectedSlotAt] = React.useState<string | null>(
    initialAt ? initialAt.toISOString() : null,
  );
  const [allowAnyway, setAllowAnyway] = React.useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);

  const selectedDateKey = manilaDate(selectedDate);
  const toggleValue = React.useMemo(
    () => (selectedSlotAt ? [selectedSlotAt] : []),
    [selectedSlotAt],
  );

  const dayStates = React.useMemo<Record<string, WeekStripDayState>>(() => {
    const map: Record<string, WeekStripDayState> = {};
    for (const d of schedule?.days ?? []) map[d.date] = weekStripState(d);
    return map;
  }, [schedule]);

  const activeDay = schedule?.days.find((d) => d.date === selectedDateKey);
  const isDayClosed = !activeDay || activeDay.state === 'closed';
  const slots = activeDay?.slots ?? [];
  const selectedSlot = slots.find((slot) => slot.at === selectedSlotAt);
  const canConfirm =
    isOnline && selectedSlot !== undefined && (selectedSlot.state === 'open' || allowAnyway);

  const daysAhead = bookingRules?.daysAhead ?? 14;
  const firstDay = schedule?.days[0]?.date;
  const lastDay = schedule?.days.at(-1)?.date;

  const handleSelectDate = (date: Date) => {
    setSelectedDate(date);
    setSelectedSlotAt(null);
  };

  const handleSubmit = async () => {
    if (!selectedSlot || !canConfirm) return;
    const at = selectedSlot.at;
    try {
      await changeAction.run(() =>
        rescheduleMutation.mutateAsync({
          orderId: order.id,
          scheduledAt: at,
          override: allowAnyway,
        }),
      );
      notify({
        title: ordersWords.changeTime.successToast(
          orderNoLabel(order.orderNo),
          formatManila(at, 'datetime'),
        ),
        tone: 'success',
      });
      onClose();
    } catch (err: unknown) {
      const code = errorCodeOf(err);
      notify({
        title:
          code === 'slot_full'
            ? ordersWords.changeTime.errors.slot_full
            : code === 'reschedule_not_allowed'
              ? ordersWords.changeTime.errors.reschedule_not_allowed
              : errorWords(code),
        tone: 'error',
      });
    }
  };

  if (rulesLoading || scheduleLoading) return <FormSkeleton />;

  return (
    <div className="space-y-5">
      {!isOnline && (
        <Notice tone="warning" icon={<WifiOffIcon className="size-4" />}>
          {ordersWords.states.offlineDisabled}
        </Notice>
      )}

      {/* 1. Date: week strip, plus a full calendar when the shop books more than 2 weeks ahead */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-foreground">
            {ordersWords.changeTime.dateLabel}
          </span>
          {daysAhead > 14 && firstDay && lastDay && (
            <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
              <PopoverTrigger
                render={
                  <Button type="button" variant="ghost" size="sm" className="gap-1 text-primary">
                    <CalendarIcon className="size-4" aria-hidden="true" />
                    <span>{ordersWords.changeTime.pickAnotherDate}</span>
                  </Button>
                }
              />
              <PopoverContent align="end" className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(d) => {
                    if (!d) return;
                    handleSelectDate(d);
                    setIsPopoverOpen(false);
                  }}
                  disabled={(d) => {
                    const key = manilaDate(d);
                    return key < firstDay || key > lastDay || dayStates[key] === 'closed';
                  }}
                />
              </PopoverContent>
            </Popover>
          )}
        </div>
        <WeekStripCalendar
          selected={selectedDate}
          defaultDate={startAt}
          onSelect={handleSelectDate}
          // Manila day keys (the strip's own dayStates lookup keys by UTC date).
          getDayState={(d) => dayStates[manilaDate(d)]}
          className="w-full"
        />
      </div>

      {/* 2. Allow anyway (off by default): Full slots become pickable; closed days never are */}
      <Field orientation="horizontal" className="rounded-lg border border-border p-3">
        <FieldContent>
          <FieldLabel htmlFor="change-time-allow">
            {ordersWords.changeTime.allowAnywayLabel}
          </FieldLabel>
          <FieldDescription>{ordersWords.changeTime.allowAnywayHint}</FieldDescription>
        </FieldContent>
        <Switch id="change-time-allow" checked={allowAnyway} onCheckedChange={setAllowAnyway} />
      </Field>

      {/* 3. Times for the picked day */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-foreground">
            {ordersWords.changeTime.timesLabel}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatManila(selectedDate, 'date')}
          </span>
        </div>

        {isDayClosed ? (
          <p className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
            {ordersWords.changeTime.closedDay}
          </p>
        ) : slots.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
            {ordersWords.changeTime.noTimes}
          </p>
        ) : (
          <ToggleGroup
            value={toggleValue}
            onValueChange={(value) => setSelectedSlotAt(value[0] ?? null)}
            aria-label={ordersWords.changeTime.timesLabel}
            className="grid w-full grid-cols-3 gap-2 sm:grid-cols-4"
          >
            {slots.map((slot) => {
              const isFull = slot.state === 'full';
              return (
                <ToggleGroupItem
                  key={slot.at}
                  value={slot.at}
                  disabled={isFull && !allowAnyway}
                  variant="outline"
                  className="h-auto min-h-11 flex-col gap-0 rounded-lg py-1.5 tabular-nums aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground"
                >
                  <span className={isFull ? 'line-through' : undefined}>
                    {formatClock(slot.at)}
                  </span>
                  {isFull && (
                    <span className="inline-flex items-center gap-0.5 text-xs font-semibold">
                      <BanIcon className="size-3" aria-hidden="true" />
                      {ordersWords.schedule.full}
                    </span>
                  )}
                </ToggleGroupItem>
              );
            })}
          </ToggleGroup>
        )}
      </div>

      <ResponsiveDialogFooter>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            {ordersWords.changeTime.cancel}
          </Button>
          <AsyncButton
            type="button"
            status={changeAction.status}
            busyLabel={ordersWords.changeTime.changing}
            doneLabel={ordersWords.changeTime.changed}
            disabled={!canConfirm}
            onClick={() => void handleSubmit()}
          >
            {ordersWords.changeTime.confirm}
          </AsyncButton>
        </div>
      </ResponsiveDialogFooter>
    </div>
  );
}
