import * as React from 'react';
import { ArrowLeftIcon, ArrowRightIcon, BanIcon, WifiOffIcon } from 'lucide-react';
import type { BoardOrder, Schedule } from '@smartapp/core';
import { errorWords, formatClock, manilaDate, ordersWords } from '@smartapp/core';
import { errorCodeOf, useRescheduleOrder, useRescheduleSchedule } from '@smartapp/data';
import { Button } from '@smartapp/ui/components/button';
import { Field, FieldContent, FieldDescription, FieldLabel } from '@smartapp/ui/components/field';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { Switch } from '@smartapp/ui/components/switch';
import { Textarea } from '@smartapp/ui/components/textarea';
import { AsyncButton, useAsyncAction } from '@smartapp/ui/compositions/async-button';
import { notify } from '@smartapp/ui/compositions/notify';
import { SlotPeriodTabs, type SlotChip } from '@smartapp/ui/compositions/slot-chips';
import { SlotMonth, type SlotMonthDay } from '@smartapp/ui/compositions/slot-month';
import { copyText } from '@smartapp/ui/lib/copy-text';
import { Notice } from '@/app/notice';
import { dayLong, periodOf, whenShort } from '@/app/orders/calendar-days';
import { orderNoLabel } from '@/app/orders/order-ticket-label';
import { useOnlineStatus } from '@/app/use-online-status';
import { clockOf } from './calendar-facts.js';
import { PAGE_INBOX_URL } from '@/app/orders/messenger-inbox';

const W = ordersWords.changeTime;
const PRESSED = 'aria-pressed:bg-primary aria-pressed:text-primary-foreground';
// A time says how many are left once only this many remain.
const FEW_LEFT = 2;
const PERIODS = ['morning', 'afternoon', 'evening'] as const;
type Period = (typeof PERIODS)[number];

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

function sameTime(a: string, b: string): boolean {
  return new Date(a).getTime() === new Date(b).getTime();
}

/**
 * Change time inside the order panel (T85, T86): the panel slides to this step instead of opening a
 * second sheet on top. A month is always on screen (any open day in the next 60), then the times by part
 * of the day. Picking another day keeps the time when it is open there. The order's own time says "Now",
 * nearly full times say "2 left", and the customer can be told on Messenger in the same step.
 */
export interface ChangeTime {
  order: BoardOrder;
  schedule: Schedule | undefined;
  loading: boolean;
  failed: boolean;
  retry: () => void;
  today: string;
  currentAt: string;
  day: string | null;
  setDay: (date: string) => void;
  at: string | null;
  setAt: (at: string) => void;
  allowAnyway: boolean;
  setAllowAnyway: (on: boolean) => void;
  tell: boolean;
  setTell: (on: boolean) => void;
  message: string;
  setMessage: (text: string) => void;
  // The part of the day on screen; the order's own part until the owner picks another.
  period: Period;
  setPeriod: (period: Period) => void;
  canConfirm: boolean;
  online: boolean;
  status: ReturnType<typeof useAsyncAction>['status'];
  submit: () => void;
}

export function useChangeTime({
  slug,
  order,
  active,
  shopName,
  today,
  startDay,
  onMoved,
}: {
  slug: string;
  // Undefined while the panel is still loading the order: the step then has nothing to show.
  order: BoardOrder | undefined;
  active: boolean;
  shopName: string;
  today: string;
  // The day to open on, when the Calendar sent the owner here; else the order's own day.
  startDay?: string | undefined;
  onMoved: () => void;
}): ChangeTime | null {
  const online = useOnlineStatus();
  const query = useRescheduleSchedule(slug, order?.id ?? '', active && order !== undefined);
  const reschedule = useRescheduleOrder(slug);
  const action = useAsyncAction();
  const currentAt = order ? (order.scheduledAt ?? order.dueAt) : '';

  const firstDay = startDay ?? (currentAt ? manilaDate(currentAt) : null);
  const [day, setDayState] = React.useState<string | null>(firstDay);
  const [at, setAtState] = React.useState<string | null>(null);
  const [allowAnyway, setAllowAnyway] = React.useState(false);
  const [tell, setTell] = React.useState(true);
  const [message, setMessageState] = React.useState('');
  const [edited, setEdited] = React.useState(false);
  const [period, setPeriod] = React.useState<Period>(currentAt ? periodOf(currentAt) : 'morning');

  // Another order, or the step opened again: start over from the order's own time.
  const source = `${order?.id ?? ''}|${currentAt}|${String(active)}|${startDay ?? ''}`;
  const [seen, setSeen] = React.useState(source);
  if (seen !== source) {
    setSeen(source);
    setDayState(firstDay);
    setAtState(null);
    setAllowAnyway(false);
    setTell(true);
    setEdited(false);
    setMessageState('');
    setPeriod(currentAt ? periodOf(currentAt) : 'morning');
  }

  if (!order) return null;
  const draft = (pick: string | null) =>
    W.message(
      firstName(order.customerName),
      order.type,
      orderNoLabel(order.orderNo),
      pick ? whenShort(pick, today) : '…',
      shopName,
    );
  const shownMessage = edited ? message : draft(at);

  const schedule = query.data;
  const slot = schedule?.days.find((d) => d.date === day)?.slots.find((s) => s.at === at);
  const canConfirm =
    online &&
    at !== null &&
    !sameTime(at, currentAt) &&
    slot !== undefined &&
    (slot.state === 'open' || allowAnyway);

  const submit = () => {
    if (!canConfirm || at === null) return;
    const before = currentAt;
    const no = orderNoLabel(order.orderNo);
    const text = shownMessage.trim();
    const sendWord = tell && text.length > 0;
    action
      .run(() =>
        reschedule.mutateAsync({ orderId: order.id, scheduledAt: at, override: allowAnyway }),
      )
      .then(async () => {
        onMoved();
        notify({
          title: W.successToast(no, whenShort(at, today)),
          tone: 'success',
          durationMs: 10_000,
          action: {
            label: W.undo,
            // Back to the time the shop already accepted, even if that time has filled since.
            onClick: () =>
              void reschedule
                .mutateAsync({ orderId: order.id, scheduledAt: before, override: true })
                .then(() => notify({ title: W.undone(no, whenShort(before, today)), tone: 'info' }))
                .catch((err: unknown) =>
                  notify({ title: errorWords(errorCodeOf(err)), tone: 'error' }),
                ),
          },
        });
        if (sendWord && (await copyText(text))) {
          notify({
            title: W.messageCopied,
            tone: 'info',
            action: {
              label: ordersWords.detail.messenger,
              onClick: () => window.open(PAGE_INBOX_URL, '_blank', 'noopener,noreferrer'),
            },
          });
        }
      })
      .catch((err: unknown) => {
        const code = errorCodeOf(err);
        notify({
          title:
            code === 'slot_full'
              ? W.errors.slot_full
              : code === 'reschedule_not_allowed'
                ? W.errors.reschedule_not_allowed
                : errorWords(code),
          tone: 'error',
        });
      });
  };

  return {
    order,
    schedule,
    loading: query.isPending && active,
    failed: query.isError,
    retry: () => void query.refetch(),
    today,
    currentAt,
    day,
    setDay: (date) => {
      setDayState(date);
      // The same time on the new day, when it can be picked there.
      const clock = clockOf(at ?? currentAt);
      const same = schedule?.days
        .find((d) => d.date === date)
        ?.slots.find((s) => clockOf(s.at) === clock);
      const pickable =
        same !== undefined &&
        !sameTime(same.at, currentAt) &&
        (same.state === 'open' || allowAnyway);
      setAtState(pickable ? same.at : null);
    },
    at,
    setAt: setAtState,
    allowAnyway,
    setAllowAnyway: (on) => {
      setAllowAnyway(on);
      if (!on) setAtState(null);
    },
    tell,
    setTell,
    message: shownMessage,
    setMessage: (text) => {
      setEdited(true);
      setMessageState(text);
    },
    period,
    setPeriod,
    canConfirm,
    online,
    status: action.status,
    submit,
  };
}

/** The step's pinned header: Back, "Change time", and where the order is now. */
export function ChangeTimeHeader({ ct, onBack }: { ct: ChangeTime; onBack: () => void }) {
  return (
    <div className="flex shrink-0 items-center gap-3 border-b px-4 py-3">
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label={W.back}
        onClick={onBack}
        className="size-11 shrink-0 rounded-full md:size-9"
      >
        <ArrowLeftIcon aria-hidden="true" />
      </Button>
      <div className="min-w-0">
        <h2 className="text-lg font-bold">{W.dialogTitle}</h2>
        <p className="truncate text-sm text-muted-foreground">
          {W.nowAt(ct.order.customerName, whenShort(ct.currentAt, ct.today))}
        </p>
      </div>
    </div>
  );
}

function timeChips(ct: ChangeTime, slots: Schedule['days'][number]['slots']): SlotChip[] {
  return slots.map((slot): SlotChip => {
    const isCurrent = sameTime(slot.at, ct.currentAt);
    const full = slot.state === 'full';
    const left = slot.left ?? null;
    const booked = slot.booked ?? 0;
    if (isCurrent) {
      return {
        value: slot.at,
        label: formatClock(slot.at),
        detail: W.now,
        tone: 'primary',
        current: true,
        disabled: true,
      };
    }
    if (full) {
      return ct.allowAnyway
        ? { value: slot.at, label: formatClock(slot.at), detail: W.overLimit, tone: 'danger' }
        : {
            value: slot.at,
            label: formatClock(slot.at),
            detail: ordersWords.bookings.full,
            tone: 'danger',
            disabled: true,
            struck: true,
          };
    }
    const few = left !== null && left <= FEW_LEFT;
    return {
      value: slot.at,
      label: formatClock(slot.at),
      detail: few ? W.left(left) : booked > 0 ? W.booked(booked) : undefined,
      tone: few ? 'warning' : 'muted',
    };
  });
}

// ---------------------------------------------------------------- The month

/** A day of the month for the shared picker (T127): crossed out when closed, "Full" in red, else its count. */
function monthDays(ct: ChangeTime, days: Schedule['days']): SlotMonthDay[] {
  const current = manilaDate(ct.currentAt);
  return days.map((day): SlotMonthDay => {
    const count = day.booked ?? 0;
    const word =
      day.state === 'closed'
        ? ordersWords.bookings.closed
        : day.state === 'full'
          ? ordersWords.bookings.full
          : day.state === 'too_soon'
            ? ordersWords.bookings.tooSoon
            : day.state === 'no_times'
              ? ordersWords.bookings.noTimes
              : count > 0
                ? W.dayOrders(count)
                : null;
    return {
      date: day.date,
      disabled: day.state !== 'open' && !(day.state === 'full' && ct.allowAnyway),
      detail: day.state === 'full' ? ordersWords.bookings.full : count > 0 ? count : undefined,
      tone: day.state === 'full' ? 'danger' : 'muted',
      struck: day.state === 'closed',
      current: day.date === current,
      ariaLabel: [dayLong(day.date), word, day.date === current ? W.now : null]
        .filter(Boolean)
        .join(', '),
    };
  });
}

/** The picker: a month that is always there, the times by part of the day, then telling the customer. */
export function ChangeTimeBody({ ct }: { ct: ChangeTime }) {
  if (ct.loading) {
    return (
      <div className="flex flex-col gap-4 p-4" aria-busy="true">
        <Skeleton className="h-72 w-full rounded-2xl" />
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
      </div>
    );
  }
  if (ct.failed || !ct.schedule) {
    return (
      <div className="p-4">
        <Notice
          tone="error"
          icon={<BanIcon className="size-4" />}
          action={
            <Button type="button" variant="outline" size="sm" onClick={ct.retry}>
              {ordersWords.states.tryAgain}
            </Button>
          }
        >
          {ordersWords.states.errorBoard}
        </Notice>
      </div>
    );
  }

  const days = ct.schedule.days;
  const active = days.find((d) => d.date === ct.day);
  const slots = active?.slots ?? [];
  const groups = PERIODS.map((period) => {
    const inPeriod = slots.filter((s) => periodOf(s.at) === period);
    return {
      period,
      slots: inPeriod,
      open: inPeriod.filter((s) => s.state === 'open' && !sameTime(s.at, ct.currentAt)).length,
    };
  }).filter((g) => g.slots.length > 0);
  // The part the owner is on, or the first part that has times on this day.
  const shown = groups.find((g) => g.period === ct.period) ?? groups[0];
  const name = firstName(ct.order.customerName);

  return (
    <div className="flex flex-col gap-5 p-4">
      {!ct.online ? (
        <Notice tone="warning" icon={<WifiOffIcon className="size-4" />}>
          {ordersWords.states.offlineDisabled}
        </Notice>
      ) : null}

      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-sm font-semibold">{W.dateLabel}</span>
          {ct.day ? (
            <span className="truncate text-sm text-muted-foreground tabular-nums">
              {dayLong(ct.day)}
            </span>
          ) : null}
        </div>
        {/* Month, then day, then time (T128): the same month as the storefront and New order. */}
        <SlotMonth
          days={monthDays(ct, days)}
          value={ct.day}
          onValueChange={ct.setDay}
          today={ct.today}
        />
        <p className="text-xs text-muted-foreground">{W.legend}</p>
      </div>

      <div className="flex flex-col gap-3">
        <span className="text-sm font-semibold">{W.timesLabel}</span>
        {!active || active.state === 'closed' ? (
          <p className="rounded-xl border border-dashed py-6 text-center text-sm text-muted-foreground">
            {W.closedDay}
          </p>
        ) : active.state === 'too_soon' ? (
          <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
            {W.tooSoonDay(
              ct.schedule?.noticeItem?.name ?? null,
              ct.schedule?.noticeItem?.noticeDays ?? null,
            )}
          </p>
        ) : !shown ? (
          <p className="rounded-xl border border-dashed py-6 text-center text-sm text-muted-foreground">
            {W.noTimes}
          </p>
        ) : (
          <SlotPeriodTabs
            label={W.partLabel}
            periods={groups.map((group) => ({
              value: group.period,
              label: ordersWords.bookings[group.period],
              detail: W.openCount(group.open),
              chips: timeChips(ct, group.slots),
            }))}
            period={shown.period}
            onPeriodChange={(value) => {
              const next = PERIODS.find((p) => p === value);
              if (next) ct.setPeriod(next);
            }}
            value={ct.at}
            onValueChange={ct.setAt}
            pressedClassName={PRESSED}
            chipsClassName="grid grid-cols-3 sm:grid-cols-4"
          />
        )}
      </div>

      <Field orientation="horizontal" className="rounded-xl border p-3">
        <FieldContent>
          <FieldLabel htmlFor="change-time-allow">{W.allowAnywayLabel}</FieldLabel>
          <FieldDescription>{W.allowAnywayHint}</FieldDescription>
        </FieldContent>
        <Switch
          id="change-time-allow"
          checked={ct.allowAnyway}
          onCheckedChange={ct.setAllowAnyway}
        />
      </Field>

      <div className="flex flex-col gap-2 rounded-xl border p-3">
        <Field orientation="horizontal">
          <FieldContent>
            <FieldLabel htmlFor="change-time-tell">{W.tellLabel(name)}</FieldLabel>
            <FieldDescription>{W.tellHint}</FieldDescription>
          </FieldContent>
          <Switch id="change-time-tell" checked={ct.tell} onCheckedChange={ct.setTell} />
        </Field>
        {ct.tell ? (
          <Textarea
            value={ct.message}
            onChange={(e) => ct.setMessage(e.target.value)}
            aria-label={W.messageLabel}
            rows={3}
            className="text-base md:text-sm"
          />
        ) : null}
      </div>
    </div>
  );
}

/** The pinned footer: the change in one line (old time struck, then the new one) and the button. */
export function ChangeTimeFooter({ ct }: { ct: ChangeTime }) {
  const picked = ct.at && !sameTime(ct.at, ct.currentAt) ? ct.at : null;
  return (
    <div className="flex w-full flex-col gap-2">
      {picked ? (
        <p
          data-slot="change-time-summary"
          aria-label={W.summaryLabel}
          className="flex min-w-0 flex-wrap items-center justify-center gap-x-2 text-sm tabular-nums"
        >
          <s className="text-muted-foreground">{whenShort(ct.currentAt, ct.today)}</s>
          <ArrowRightIcon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
          <span className="font-semibold">{whenShort(picked, ct.today)}</span>
        </p>
      ) : null}
      <AsyncButton
        type="button"
        status={ct.status}
        busyLabel={W.changing}
        doneLabel={W.changed}
        disabled={!ct.canConfirm}
        onClick={ct.submit}
        className="h-12 w-full text-base font-semibold md:h-11"
      >
        {picked ? W.moveTo(whenShort(picked, ct.today)) : W.pickFirst}
      </AsyncButton>
    </div>
  );
}
