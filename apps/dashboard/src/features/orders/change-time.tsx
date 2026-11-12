import * as React from 'react';
import {
  ArrowLeftIcon,
  BanIcon,
  CalendarDaysIcon,
  CircleSlashIcon,
  HourglassIcon,
  WifiOffIcon,
} from 'lucide-react';
import type { BoardOrder, Schedule, ScheduleDayState } from '@smartapp/core';
import { errorWords, formatClock, manilaDate, ordersWords } from '@smartapp/core';
import { errorCodeOf, useRescheduleOrder, useRescheduleSchedule } from '@smartapp/data';
import { Button } from '@smartapp/ui/components/button';
import { Calendar } from '@smartapp/ui/components/calendar';
import { Field, FieldContent, FieldDescription, FieldLabel } from '@smartapp/ui/components/field';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { Switch } from '@smartapp/ui/components/switch';
import { Textarea } from '@smartapp/ui/components/textarea';
import { AsyncButton, useAsyncAction } from '@smartapp/ui/compositions/async-button';
import { notify } from '@smartapp/ui/compositions/notify';
import { DayChips, TimeChips, type SlotChip } from '@smartapp/ui/compositions/slot-chips';
import { copyText } from '@smartapp/ui/lib/copy-text';
import { Notice } from '@/app/notice';
import { dayAsDate, dayChipLabel, periodOf, whenShort } from '@/app/orders/calendar-days';
import { orderNoLabel } from '@/app/orders/order-ticket-label';
import { useOnlineStatus } from '@/app/use-online-status';
import { PAGE_INBOX_URL } from './messenger-inbox.js';

const W = ordersWords.changeTime;
const PRESSED = 'aria-pressed:bg-primary aria-pressed:text-primary-foreground';
// Days in the chip row; a longer booking window adds "More dates" with a month.
const STRIP_DAYS = 14;
// A time says how many are left once only this many remain.
const FEW_LEFT = 2;
const PERIODS = ['morning', 'afternoon', 'evening'] as const;

const DAY_ICON: Record<Exclude<ScheduleDayState, 'open'>, typeof BanIcon> = {
  closed: CircleSlashIcon,
  full: BanIcon,
  too_soon: HourglassIcon,
};

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

function sameTime(a: string, b: string): boolean {
  return new Date(a).getTime() === new Date(b).getTime();
}

/**
 * Change time inside the order panel (T85): the panel slides to this step instead of opening a second
 * sheet on top. The order's own time and items don't count against it, its current time says "Now",
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
  moreOpen: boolean;
  setMoreOpen: (open: boolean) => void;
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
  onMoved,
}: {
  slug: string;
  // Undefined while the panel is still loading the order: the step then has nothing to show.
  order: BoardOrder | undefined;
  active: boolean;
  shopName: string;
  today: string;
  onMoved: () => void;
}): ChangeTime | null {
  const online = useOnlineStatus();
  const query = useRescheduleSchedule(slug, order?.id ?? '', active && order !== undefined);
  const reschedule = useRescheduleOrder(slug);
  const action = useAsyncAction();
  const currentAt = order ? (order.scheduledAt ?? order.dueAt) : '';

  const [day, setDayState] = React.useState<string | null>(
    currentAt ? manilaDate(currentAt) : null,
  );
  const [at, setAtState] = React.useState<string | null>(null);
  const [allowAnyway, setAllowAnyway] = React.useState(false);
  const [tell, setTell] = React.useState(true);
  const [message, setMessageState] = React.useState('');
  const [edited, setEdited] = React.useState(false);
  const [moreOpen, setMoreOpen] = React.useState(false);

  // Another order, or the step opened again: start over from the order's own time.
  const source = `${order?.id ?? ''}|${currentAt}|${String(active)}`;
  const [seen, setSeen] = React.useState(source);
  if (seen !== source) {
    setSeen(source);
    setDayState(currentAt ? manilaDate(currentAt) : null);
    setAtState(null);
    setAllowAnyway(false);
    setTell(true);
    setEdited(false);
    setMessageState('');
    setMoreOpen(false);
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
      setAtState(null);
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
    moreOpen,
    setMoreOpen,
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

function dayChips(ct: ChangeTime, days: Schedule['days']): SlotChip[] {
  const currentDay = manilaDate(ct.currentAt);
  return days.map((d): SlotChip => {
    const label = dayChipLabel(d.date, ct.today);
    const isCurrent = d.date === currentDay;
    if (d.state === 'open' || (d.state === 'full' && ct.allowAnyway)) {
      return {
        value: d.date,
        label,
        detail: isCurrent ? W.now : d.state === 'full' ? ordersWords.bookings.full : undefined,
        tone: isCurrent ? 'primary' : d.state === 'full' ? 'danger' : 'muted',
        current: isCurrent,
      };
    }
    const Icon = DAY_ICON[d.state];
    const word = dayStateWord(d.state);
    return {
      value: d.date,
      label,
      detail: word,
      icon: <Icon aria-hidden="true" className="size-3" />,
      tone: d.state === 'full' ? 'danger' : 'muted',
      disabled: true,
      current: isCurrent,
      ariaLabel: `${label}, ${word}`,
    };
  });
}

function dayStateWord(state: Exclude<ScheduleDayState, 'open'>): string {
  if (state === 'closed') return ordersWords.bookings.closed;
  if (state === 'full') return ordersWords.bookings.full;
  return ordersWords.bookings.tooSoon;
}

function timeChips(ct: ChangeTime, slots: Schedule['days'][number]['slots']): SlotChip[] {
  return slots.map((slot): SlotChip => {
    const isCurrent = sameTime(slot.at, ct.currentAt);
    const full = slot.state === 'full';
    const left = slot.left ?? null;
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
      detail: few ? W.left(left) : undefined,
      tone: few ? 'warning' : 'muted',
    };
  });
}

/** The picker: day chips (and a month for long booking windows), times, then telling the customer. */
export function ChangeTimeBody({ ct }: { ct: ChangeTime }) {
  if (ct.loading) {
    return (
      <div className="flex flex-col gap-4 p-4" aria-busy="true">
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((n) => (
            <Skeleton key={n} className="h-16 w-18 shrink-0 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
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
  const strip = days.slice(0, STRIP_DAYS);
  const inStrip = strip.some((d) => d.date === ct.day);
  const hasMore = days.length > STRIP_DAYS;
  const active = days.find((d) => d.date === ct.day);
  const slots = active?.slots ?? [];
  const groups = PERIODS.map((period) => ({
    period,
    slots: slots.filter((s) => periodOf(s.at) === period),
  })).filter((g) => g.slots.length > 0);
  const first = days[0]?.date;
  const last = days.at(-1)?.date;
  const name = firstName(ct.order.customerName);

  return (
    <div className="flex flex-col gap-5 p-4">
      {!ct.online ? (
        <Notice tone="warning" icon={<WifiOffIcon className="size-4" />}>
          {ordersWords.states.offlineDisabled}
        </Notice>
      ) : null}

      <div className="flex min-w-0 flex-col gap-2">
        <span className="text-sm font-semibold">{W.dateLabel}</span>
        <DayChips
          label={W.dateLabel}
          value={ct.day && inStrip ? ct.day : null}
          onValueChange={(date) => {
            ct.setDay(date);
            ct.setMoreOpen(false);
          }}
          pressedClassName={PRESSED}
          chips={dayChips(ct, strip)}
          trailing={
            hasMore ? (
              <Button
                type="button"
                variant="outline"
                aria-expanded={ct.moreOpen}
                aria-pressed={Boolean(ct.day && !inStrip)}
                onClick={() => ct.setMoreOpen(!ct.moreOpen)}
                className="h-16 min-w-18 shrink-0 flex-col gap-0.5 rounded-2xl px-3 text-sm font-semibold aria-pressed:border-transparent aria-pressed:bg-primary aria-pressed:text-primary-foreground"
              >
                <CalendarDaysIcon aria-hidden="true" className="size-4" />
                <span>{ct.day && !inStrip ? dayChipLabel(ct.day, ct.today) : W.moreDates}</span>
              </Button>
            ) : null
          }
        />
        {hasMore && ct.moreOpen && first && last ? (
          <div className="flex justify-center rounded-2xl border bg-card">
            <Calendar
              mode="single"
              selected={ct.day ? dayAsDate(ct.day) : undefined}
              defaultMonth={ct.day ? dayAsDate(ct.day) : dayAsDate(first)}
              startMonth={dayAsDate(first)}
              endMonth={dayAsDate(last)}
              onSelect={(d) => {
                if (!d) return;
                ct.setDay(manilaDate(d));
                ct.setMoreOpen(false);
              }}
              disabled={(d) => {
                const state = days.find((x) => x.date === manilaDate(d))?.state;
                return state !== 'open' && !(state === 'full' && ct.allowAnyway);
              }}
            />
          </div>
        ) : null}
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
        ) : groups.length === 0 ? (
          <p className="rounded-xl border border-dashed py-6 text-center text-sm text-muted-foreground">
            {W.noTimes}
          </p>
        ) : (
          groups.map((group) => (
            <div key={group.period} className="flex flex-col gap-2">
              <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {ordersWords.bookings[group.period]}
              </span>
              <TimeChips
                label={ordersWords.bookings[group.period]}
                value={ct.at}
                onValueChange={ct.setAt}
                pressedClassName={PRESSED}
                chips={timeChips(ct, group.slots)}
              />
            </div>
          ))
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

/** The pinned button: "Move to Sun 15, 11:00 AM", or "Pick a new time" until one is picked. */
export function ChangeTimeFooter({ ct }: { ct: ChangeTime }) {
  const label =
    ct.at && !sameTime(ct.at, ct.currentAt) ? W.moveTo(whenShort(ct.at, ct.today)) : W.pickFirst;
  return (
    <AsyncButton
      type="button"
      status={ct.status}
      busyLabel={W.changing}
      doneLabel={W.changed}
      disabled={!ct.canConfirm}
      onClick={ct.submit}
      className="h-12 w-full text-base font-semibold md:h-11"
    >
      {label}
    </AsyncButton>
  );
}
