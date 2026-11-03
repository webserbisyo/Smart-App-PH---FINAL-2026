import * as React from 'react';
import { CalendarIcon, ClockIcon, AlertTriangleIcon } from 'lucide-react';
import {
  errorWords,
  formatClock,
  formatManila,
  manilaDate,
  ordersWords,
  type OrderStatus,
  type OrderType,
} from '@smartapp/core';
import { errorCodeOf, useBookingRules, useRescheduleOrder, useSchedule } from '@smartapp/data';
import { Button } from '@smartapp/ui/components/button';
import { Switch } from '@smartapp/ui/components/switch';
import { Calendar } from '@smartapp/ui/components/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@smartapp/ui/components/popover';
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
import { useOnlineStatus } from '@/app/use-online-status';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { cn } from 'cn';

export interface RescheduleOrderTarget {
  id: string;
  orderNo: number;
  type: OrderType;
  status: OrderStatus;
  dueAt: string;
  scheduledAt?: string | null;
  lines: readonly { itemId: string; qty: number; name?: string }[];
}

export interface ChangeTimeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slug: string;
  order: RescheduleOrderTarget | null;
  initialDate?: Date | null;
  initialSlotAt?: string | null;
}

export function ChangeTimeDialog({
  open,
  onOpenChange,
  slug,
  order,
  initialDate,
  initialSlotAt,
}: ChangeTimeDialogProps) {
  if (!order) return null;

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={ordersWords.changeTime.dialogTitle}
      description={ordersWords.changeTime.dialogDesc}
      scroll
    >
      {open && (
        <ChangeTimeForm
          slug={slug}
          order={order}
          initialDate={initialDate}
          initialSlotAt={initialSlotAt}
          onClose={() => onOpenChange(false)}
        />
      )}
    </ResponsiveDialog>
  );
}

function ChangeTimeForm({
  slug,
  order,
  initialDate,
  initialSlotAt,
  onClose,
}: {
  slug: string;
  order: RescheduleOrderTarget;
  initialDate?: Date | null;
  initialSlotAt?: string | null;
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

  const today = React.useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [selectedDate, setSelectedDate] = React.useState<Date>(() => {
    if (initialDate) return initialDate;
    if (order.scheduledAt) return new Date(order.scheduledAt);
    return new Date(order.dueAt);
  });

  const [selectedSlotAt, setSelectedSlotAt] = React.useState<string | null>(
    () => initialSlotAt ?? null,
  );
  const [allowAnyway, setAllowAnyway] = React.useState<boolean>(false);
  const [isPopoverOpen, setIsPopoverOpen] = React.useState<boolean>(false);

  // Sync initialSlotAt when opened with a dropped slot
  React.useEffect(() => {
    if (initialSlotAt) setSelectedSlotAt(initialSlotAt);
  }, [initialSlotAt]);

  const selectedDateKey = manilaDate(selectedDate);

  // Map schedule days to WeekStrip dayStates
  const dayStates = React.useMemo<Record<string, WeekStripDayState>>(() => {
    if (!schedule?.days) return {};
    const map: Record<string, WeekStripDayState> = {};
    for (const d of schedule.days) {
      if (d.state === 'closed') {
        map[d.date] = 'closed';
      } else if (d.state === 'full') {
        map[d.date] = 'full';
      } else {
        map[d.date] = 'open';
      }
    }
    return map;
  }, [schedule]);

  const activeDay = schedule?.days.find((d) => d.date === selectedDateKey);
  const isDayClosed = activeDay?.state === 'closed';

  const daysAhead = bookingRules?.daysAhead ?? 14;
  const maxDate = React.useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + daysAhead);
    return d;
  }, [today, daysAhead]);

  const handleSelectDate = (date: Date) => {
    setSelectedDate(date);
    setSelectedSlotAt(null);
  };

  const handleSubmit = async () => {
    if (!selectedSlotAt || !isOnline) return;

    await changeAction.run(async () => {
      try {
        await rescheduleMutation.mutateAsync({
          orderId: order.id,
          scheduledAt: selectedSlotAt,
          override: allowAnyway,
        });

        const orderNumStr = `#${String(order.orderNo).padStart(3, '0')}`;
        const newTimeStr = formatManila(selectedSlotAt, 'datetime');
        notify({
          title: ordersWords.changeTime.successToast(orderNumStr, newTimeStr),
          tone: 'success',
        });
        onClose();
      } catch (err) {
        const code = errorCodeOf(err);
        if (code === 'slot_full') {
          notify({ title: ordersWords.changeTime.errors.slot_full, tone: 'error' });
        } else if (code === 'reschedule_not_allowed') {
          notify({ title: ordersWords.changeTime.errors.reschedule_not_allowed, tone: 'error' });
        } else {
          notify({ title: errorWords(code), tone: 'error' });
        }
      }
    });
  };

  const isLoading = rulesLoading || scheduleLoading;

  return (
    <div className="space-y-5 p-4">
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-14 w-full rounded-lg" />
          <Skeleton className="h-40 w-full rounded-lg" />
        </div>
      ) : (
        <>
          {/* 1. Week Strip Calendar + Popover for daysAhead > 14 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Date
              </span>
              {daysAhead > 14 && (
                <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                  <PopoverTrigger
                    render={
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1 text-xs font-medium text-primary"
                      >
                        <CalendarIcon className="size-3.5" />
                        <span>{ordersWords.changeTime.pickAnotherDate}</span>
                      </Button>
                    }
                  />
                  <PopoverContent align="end" className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(d) => {
                        if (d) {
                          handleSelectDate(d);
                          setIsPopoverOpen(false);
                        }
                      }}
                      disabled={{ before: today, after: maxDate }}
                    />
                  </PopoverContent>
                </Popover>
              )}
            </div>

            <WeekStripCalendar
              selected={selectedDate}
              onSelect={handleSelectDate}
              dayStates={dayStates}
              className="w-full"
            />
          </div>

          {/* 2. Allow anyway Switch */}
          <div className="flex items-start justify-between gap-3 rounded-lg border border-border/80 bg-muted/20 p-3">
            <div className="space-y-0.5">
              <label className="text-sm font-semibold text-foreground">
                {ordersWords.changeTime.allowAnywayLabel}
              </label>
              <p className="text-xs text-muted-foreground">
                {ordersWords.changeTime.allowAnywayHint}
              </p>
            </div>
            <Switch
              checked={allowAnyway}
              onCheckedChange={setAllowAnyway}
              aria-label={ordersWords.changeTime.allowAnywayLabel}
            />
          </div>

          {/* 3. Booking Slots Grid */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Available slots
              </span>
              <span className="text-xs text-muted-foreground">
                {formatManila(selectedDate, 'date')}
              </span>
            </div>

            {isDayClosed ? (
              <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border py-8 text-center">
                <AlertTriangleIcon className="size-5 text-muted-foreground" />
                <p className="text-xs font-medium text-muted-foreground">
                  The shop is closed on this day.
                </p>
              </div>
            ) : !activeDay || activeDay.slots.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border py-8 text-center text-xs text-muted-foreground">
                No slots available on this date.
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {activeDay.slots.map((slot) => {
                  const isOpen = slot.state === 'open';
                  const isFull = slot.state === 'full';
                  const isTooSoon = slot.state === 'too_soon';
                  const isSelected = selectedSlotAt === slot.at;

                  const canSelect = isOpen || allowAnyway;

                  return (
                    <button
                      key={slot.at}
                      type="button"
                      disabled={!canSelect}
                      onClick={() => setSelectedSlotAt(slot.at)}
                      className={cn(
                        'flex flex-col items-center justify-center rounded-lg border p-2 text-xs transition-colors',
                        isSelected
                          ? 'border-primary bg-primary font-semibold text-primary-foreground shadow-xs'
                          : canSelect
                            ? 'border-border bg-card text-foreground hover:bg-muted/60 active:scale-[0.98]'
                            : 'cursor-not-allowed border-border/40 bg-muted/30 text-muted-foreground opacity-60',
                        isFull && !isSelected && 'line-through decoration-destructive/60',
                      )}
                    >
                      <span className="font-medium tabular-nums">{slot.label}</span>
                      {isFull && (
                        <span
                          className={cn(
                            'mt-0.5 text-[10px] font-semibold tracking-wider uppercase',
                            isSelected ? 'text-primary-foreground' : 'text-destructive',
                          )}
                        >
                          {ordersWords.schedule.full}
                        </span>
                      )}
                      {isTooSoon && (
                        <span
                          className={cn(
                            'mt-0.5 text-[10px] font-medium',
                            isSelected ? 'text-primary-foreground' : 'text-muted-foreground',
                          )}
                        >
                          {ordersWords.schedule.tooSoon}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Offline warning notice */}
          {!isOnline && (
            <div className="rounded-lg border border-warning/40 bg-warning/10 p-2.5 text-xs text-warning-foreground">
              {ordersWords.states.offlineNotice}
            </div>
          )}

          {/* Footer actions */}
          <ResponsiveDialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <AsyncButton
              type="button"
              variant="default"
              status={changeAction.status}
              busyLabel={ordersWords.changeTime.changing}
              doneLabel={ordersWords.changeTime.changed}
              disabled={!selectedSlotAt || isDayClosed || !isOnline}
              onClick={() => void handleSubmit()}
            >
              {ordersWords.changeTime.confirm}
            </AsyncButton>
          </ResponsiveDialogFooter>
        </>
      )}
    </div>
  );
}
