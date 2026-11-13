import * as React from 'react';
import { ArrowLeftIcon, ArrowRightIcon, BanIcon, WifiOffIcon } from 'lucide-react';
import type { BoardOrder, Schedule, ScheduleDay } from '@smartapp/core';
import { errorWords, formatClock, manilaDate, ordersWords } from '@smartapp/core';
import { errorCodeOf, useRescheduleOrder, useRescheduleSchedule } from '@smartapp/data';
import { Button } from '@smartapp/ui/components/button';
import { Calendar, CalendarDayButton } from '@smartapp/ui/components/calendar';
import { Field, FieldContent, FieldDescription, FieldLabel } from '@smartapp/ui/components/field';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { Switch } from '@smartapp/ui/components/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@smartapp/ui/components/tabs';
import { Textarea } from '@smartapp/ui/components/textarea';
import { AsyncButton, useAsyncAction } from '@smartapp/ui/compositions/async-button';
import { notify } from '@smartapp/ui/compositions/notify';
import { TimeChips, type SlotChip } from '@smartapp/ui/compositions/slot-chips';
import { copyText } from '@smartapp/ui/lib/copy-text';
import { cn } from 'cn';
import { dateFromKey, keyFromDate } from '@/app/day-key';
import { Notice } from '@/app/notice';
import { dayLong, periodOf, whenShort } from '@/app/orders/calendar-days';
import { orderNoLabel } from '@/app/orders/order-ticket-label';
import { useOnlineStatus } from '@/app/use-online-status';
import { clockOf } from './calendar-facts.js';
import { PAGE_INBOX_URL } from './messenger-inbox.js';

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

interface MonthFacts {
  days: ReadonlyMap<string, ScheduleDay>;
  // The day the order is on now.
  current: string;
}

const MonthFactsContext = React.createContext<MonthFacts | null>(null);

/** A day of the month: its number, how many orders are on it, crossed out when closed, "Full" in red. */
function MonthDayButton({
  className,
  children: _children,
  ...props
}: React.ComponentProps<typeof CalendarDayButton>) {
  const facts = React.useContext(MonthFactsContext);
  const key = keyFromDate(props.day.date);
  const day = facts?.days.get(key);
  const count = day?.booked ?? 0;
  const word =
    day?.state === 'closed'
      ? ordersWords.bookings.closed
      : day?.state === 'full'
        ? ordersWords.bookings.full
        : day?.state === 'too_soon'
          ? ordersWords.bookings.tooSoon
          : count > 0
            ? W.dayOrders(count)
            : null;
  return (
    <CalendarDayButton
      {...props}
      aria-label={[dayLong(key), word, key === facts?.current ? W.now : null]
        .filter(Boolean)
        .join(', ')}
      className={cn(
        'aspect-auto h-11 gap-0 tabular-nums',
        day?.state === 'closed' && 'line-through',
        key === facts?.current && 'border-2 border-dashed border-primary',
        className,
      )}
    >
      {props.day.date.getDate()}
      {day?.state === 'full' ? (
        <span className="font-semibold text-destructive">{ordersWords.bookings.full}</span>
      ) : count > 0 ? (
        <span>{count}</span>
      ) : null}
    </CalendarDayButton>
  );
}

const MONTH_COMPONENTS = { DayButton: MonthDayButton };

function MonthPicker({ ct, days }: { ct: ChangeTime; days: Schedule['days'] }) {
  const first = days[0]?.date;
  const last = days.at(-1)?.date;
  const facts = React.useMemo<MonthFacts>(
    () => ({ days: new Map(days.map((d) => [d.date, d])), current: manilaDate(ct.currentAt) }),
    [days, ct.currentAt],
  );
  const [month, setMonth] = React.useState(() => dateFromKey(ct.day ?? first ?? ct.today));
  if (!first || !last) return null;
  return (
    <MonthFactsContext value={facts}>
      <div className="rounded-2xl border bg-card p-1">
        <Calendar
          mode="single"
          month={month}
          onMonthChange={setMonth}
          selected={ct.day ? dateFromKey(ct.day) : undefined}
          startMonth={dateFromKey(first)}
          endMonth={dateFromKey(last)}
          onSelect={(d) => {
            if (d) ct.setDay(keyFromDate(d));
          }}
          disabled={(d) => {
            const state = facts.days.get(keyFromDate(d))?.state;
            return state !== 'open' && !(state === 'full' && ct.allowAnyway);
          }}
          showOutsideDays={false}
          className="w-full bg-transparent"
          classNames={{
            root: 'w-full',
            day: 'group/day relative w-full p-0 text-center select-none',
            today: 'rounded-md bg-muted text-foreground',
          }}
          components={MONTH_COMPONENTS}
        />
      </div>
    </MonthFactsContext>
  );
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
        <MonthPicker ct={ct} days={days} />
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
          <Tabs
            value={shown.period}
            onValueChange={(value) => {
              const next = PERIODS.find((p) => p === value);
              if (next) ct.setPeriod(next);
            }}
            className="gap-3"
          >
            <TabsList aria-label={W.partLabel} className="h-auto w-full">
              {groups.map((group) => (
                <TabsTrigger
                  key={group.period}
                  value={group.period}
                  className="h-11 flex-1 flex-col gap-0 py-1 md:h-10"
                >
                  <span className="font-semibold">{ordersWords.bookings[group.period]}</span>
                  <span className="text-xs font-normal text-muted-foreground tabular-nums">
                    {W.openCount(group.open)}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
            {groups.map((group) => (
              <TabsContent key={group.period} value={group.period}>
                <TimeChips
                  label={ordersWords.bookings[group.period]}
                  value={ct.at}
                  onValueChange={ct.setAt}
                  pressedClassName={PRESSED}
                  chips={timeChips(ct, group.slots)}
                  className="grid grid-cols-3 sm:grid-cols-4"
                />
              </TabsContent>
            ))}
          </Tabs>
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
