'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  BanIcon,
  CalendarIcon,
  CircleSlashIcon,
  HourglassIcon,
  InfoIcon,
  MessageCircleIcon,
  type LucideIcon,
} from 'lucide-react';
import {
  dayPeriodOf,
  formatClock,
  manilaDate,
  openingPeriod,
  openState,
  openStateText,
  SLOT_STRIP_DAYS,
  slotsByPeriod,
  words,
  type ScheduleDayState,
  orderFlowWords,
} from '@smartapp/core';
import { useBasket, useSchedule } from '@smartapp/data';
import { Button } from '@smartapp/ui/components/button';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from '@smartapp/ui/components/field';
import { RadioGroup, RadioGroupItem } from '@smartapp/ui/components/radio-group';
import { Alert, AlertDescription } from '@smartapp/ui/components/reui/alert';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { DayChips, SlotPeriodTabs, type SlotChip } from '@smartapp/ui/compositions/slot-chips';
import { useShop } from '../../shell/components/shop-context';
import {
  asapChoice,
  asapDetail,
  dayChipLabel,
  dayLongLabel,
  firstOpenDay,
  nextOpenSlot,
  noDaysLine,
  noticeLine,
  resolvePick,
  whenSummary,
  type BookableType,
  type WhenMode,
} from '../when-rules';

// The month (the owner's Change time one, T127) loads only for a shop that books more than a week ahead,
// so react-day-picker stays out of every page's first JavaScript.
const SlotMonth = dynamic(
  () => import('@smartapp/ui/compositions/slot-month').then((m) => m.SlotMonth),
  { ssr: false, loading: () => <Skeleton className="h-80 w-full rounded-2xl" /> },
);

export interface WhenValue {
  mode: WhenMode;
  at: string | null;
  /** The picker replaced a time that was no longer open (it says so). */
  moved?: boolean | undefined;
}

export interface WhenPickerProps {
  type: BookableType;
  now: string;
  value: WhenValue;
  onChange: (value: WhenValue) => void;
  /** Whether any time can be booked, so the form only asks for a time when there is one. */
  onBookableChange?: ((bookable: boolean) => void) | undefined;
  /** The time the shop just turned away (slot_unavailable): say so and open at its day. */
  rejectedAt?: string | null | undefined;
}

const DAY_STATE_ICON: Record<Exclude<ScheduleDayState, 'open'>, LucideIcon> = {
  closed: CircleSlashIcon,
  full: BanIcon,
  too_soon: HourglassIcon,
};

// The shared day and time chips (T85) in the shop's own colour.
const PRESSED = 'aria-pressed:bg-shop-10 aria-pressed:text-shop-10-foreground';
// A time says how many are left once only this many remain.
const FEW_LEFT = 2;

/**
 * The When picker (O6), used by the How and where sheet (also opened from checkout): ASAP or Schedule,
 * then the shared slot picker (T127, the same one as the owner's Change time and New order): day chips
 * for a window of a week or less, a month for a longer one, and the times in Morning, Afternoon and
 * Evening tabs. Days, notice and limits come from the shop's schedule; it refreshes with the basket and
 * never keeps a time that is no longer open.
 */
export function WhenPicker({
  type,
  now,
  value,
  onChange,
  onBookableChange,
  rejectedAt,
}: WhenPickerProps) {
  const { slug, shop } = useShop();
  const sf = shop.storefront;
  const basket = useBasket(slug);
  const lines = useMemo(
    () => basket.lines.map((l) => ({ itemId: l.itemId, qty: l.qty })),
    [basket.lines],
  );
  const schedule = useSchedule(slug, type, lines);
  const data = schedule.data;

  const asap = asapChoice(sf, data, now);
  // The day the customer tapped; the shown day falls back to the picked time's day or the first open.
  const [pickedDay, setPickedDay] = useState<string | null>(null);
  // The part of the day the customer tapped; else the picked time's part or the first with an open time.
  const [pickedPeriod, setPickedPeriod] = useState<string | null>(null);

  // ASAP isn't offered (notice, closed, busy): switch to Schedule on the earliest open time, so one
  // tap on Save still works; the summary shows the time and the customer can change it.
  useEffect(() => {
    if (data && value.mode === 'asap' && !asap.available)
      onChange({ mode: 'schedule', at: nextOpenSlot(data, now) });
  }, [data, value.mode, asap.available, onChange, now]);

  // Keep the picked time valid whenever the schedule changes (basket, other bookings).
  useEffect(() => {
    if (!data || value.mode !== 'schedule') return;
    if (rejectedAt && value.at === rejectedAt) {
      // The shop just turned this time away: clear it (the day stays on it while open).
      onChange({ mode: 'schedule', at: null });
      return;
    }
    const pick = resolvePick(data, value.at);
    if (pick.at !== value.at) onChange({ mode: 'schedule', at: pick.at, moved: pick.moved });
  }, [data, value.mode, value.at, rejectedAt, onChange]);

  const day = useMemo(() => {
    if (!data) return null;
    const isOpen = (date: string) => data.days.some((d) => d.date === date && d.state === 'open');
    if (value.at && isOpen(manilaDate(value.at))) return manilaDate(value.at);
    if (pickedDay && isOpen(pickedDay)) return pickedDay;
    if (rejectedAt && isOpen(manilaDate(rejectedAt))) return manilaDate(rejectedAt);
    return firstOpenDay(data);
  }, [data, value.at, pickedDay, rejectedAt]);
  const movedTo = value.moved ? value.at : null;

  const bookable = Boolean(data?.days.some((d) => d.state === 'open'));
  useEffect(() => {
    if (data) onBookableChange?.(bookable);
  }, [data, bookable, onBookableChange]);

  const activeDay = data?.days.find((d) => d.date === day);
  const days = data?.days ?? [];
  const monthView = days.length > SLOT_STRIP_DAYS;
  const notice = data ? noticeLine(data, type) : null;
  const daySlots = activeDay?.state === 'open' ? activeDay.slots : [];
  const shownPeriod = pickedPeriod ?? openingPeriod(daySlots, value.at);
  const messenger = sf.info.contact.messengerUsername;

  const pickDay = (date: string) => {
    setPickedDay(date);
    setPickedPeriod(null);
    if (value.at && manilaDate(value.at) !== date) onChange({ mode: 'schedule', at: null });
  };

  // Closed, full and too-soon days say so with an icon and a word, and can't be picked.
  const dayChips = days.map((d): SlotChip => {
    const label = dayChipLabel(d.date, now);
    if (d.state === 'open') return { value: d.date, label };
    const StateIcon = DAY_STATE_ICON[d.state];
    const stateWord = words.location.dayState[d.state];
    return {
      value: d.date,
      label,
      detail: stateWord,
      icon: <StateIcon aria-hidden="true" className="size-3" />,
      disabled: true,
      ariaLabel: words.location.dayDisabled(label, stateWord),
    };
  });

  const periods = slotsByPeriod(daySlots).map((group) => ({
    value: group.period,
    label: words.location.periods[group.period],
    detail: orderFlowWords.periodOpen(group.slots.filter((s) => s.state === 'open').length),
    chips: group.slots.map((slot): SlotChip => {
      const full = slot.state === 'full';
      const left = slot.left ?? null;
      const few = !full && left !== null && left <= FEW_LEFT;
      return {
        value: slot.at,
        label: formatClock(slot.at),
        detail: full ? words.location.slotFull : few ? words.location.slotLeft(left) : undefined,
        tone: few ? 'warning' : 'muted',
        disabled: full,
        struck: full,
      };
    }),
  }));

  return (
    <FieldSet className="min-w-0 gap-3">
      <FieldLegend variant="label">{words.location.when}</FieldLegend>

      <RadioGroup
        value={value.mode}
        onValueChange={(next) => {
          if (next === 'asap') onChange({ mode: 'asap', at: null });
          if (next === 'schedule') onChange({ mode: 'schedule', at: value.at });
        }}
        className="grid grid-cols-2 gap-2"
      >
        <FieldLabel htmlFor="when-asap" className="rounded-2xl">
          <Field
            orientation="horizontal"
            data-disabled={asap.available ? undefined : 'true'}
            className="min-h-16 items-start gap-2.5"
          >
            <RadioGroupItem value="asap" id="when-asap" disabled={!asap.available} />
            <FieldContent>
              <FieldTitle>{words.location.asap}</FieldTitle>
              <FieldDescription>{asapDetail(sf, type, now)}</FieldDescription>
            </FieldContent>
          </Field>
        </FieldLabel>
        <FieldLabel htmlFor="when-schedule" className="rounded-2xl">
          <Field orientation="horizontal" className="min-h-16 items-start gap-2.5">
            <RadioGroupItem value="schedule" id="when-schedule" />
            <FieldContent>
              <FieldTitle>{words.location.scheduleOption}</FieldTitle>
              <FieldDescription>{words.location.scheduleDetail}</FieldDescription>
            </FieldContent>
          </Field>
        </FieldLabel>
      </RadioGroup>

      {data && !asap.available ? (
        <p className="text-sm text-muted-foreground">
          {asap.reason === 'notice' && data.noticeItem
            ? words.location.asapNeedsNotice(data.noticeItem.name)
            : `${openStateText(openState(sf, now), now)}. ${words.location.closedNow}`}
        </p>
      ) : null}

      {value.mode === 'schedule' ? (
        schedule.isLoading ? (
          <div className="flex flex-col gap-3" aria-busy="true">
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((n) => (
                <Skeleton key={n} className="h-16 w-18 shrink-0 rounded-2xl" />
              ))}
            </div>
            <Skeleton className="h-24 w-full rounded-2xl" />
          </div>
        ) : schedule.isError || !data ? (
          <Alert variant="destructive" role="alert">
            <InfoIcon aria-hidden="true" />
            <AlertDescription className="flex flex-col items-start gap-2">
              <span>{words.location.timesFailed}</span>
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-full px-4"
                onClick={() => void schedule.refetch()}
              >
                {words.location.tryAgain}
              </Button>
            </AlertDescription>
          </Alert>
        ) : !bookable ? (
          <div className="flex flex-col items-start gap-3 rounded-2xl bg-muted/50 p-4">
            <p className="text-sm">{noDaysLine(data)}</p>
            {messenger ? (
              <Button
                variant="outline"
                nativeButton={false}
                render={
                  <a
                    href={`https://m.me/${encodeURIComponent(messenger.replace(/^@/, ''))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                }
                className="h-11 gap-2 rounded-full px-4"
              >
                <MessageCircleIcon aria-hidden="true" className="size-4" />
                {words.location.messageShop}
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="flex min-w-0 flex-col gap-4">
            {rejectedAt && value.at === null ? (
              <Alert variant="warning" role="alert">
                <InfoIcon aria-hidden="true" />
                <AlertDescription>{words.location.slotFilled}</AlertDescription>
              </Alert>
            ) : null}

            {/* A week or less: Today, Tomorrow, then "Wed 5" chips. Longer: a month (T127). */}
            <div className="flex min-w-0 flex-col gap-2">
              <span className="text-sm font-medium">{words.location.dayLabel}</span>
              {monthView ? (
                <>
                  <SlotMonth
                    days={dayChips.map((chip) => ({
                      date: chip.value,
                      disabled: chip.disabled,
                      ariaLabel: chip.disabled ? chip.ariaLabel : dayLongLabel(chip.value),
                    }))}
                    value={day}
                    onValueChange={pickDay}
                    today={manilaDate(now)}
                  />
                  <p className="text-xs text-muted-foreground">{words.location.moreDatesLegend}</p>
                </>
              ) : (
                <DayChips
                  label={words.location.dayLabel}
                  value={day}
                  onValueChange={pickDay}
                  pressedClassName={PRESSED}
                  chips={dayChips}
                />
              )}
            </div>

            {notice ? (
              <p className="flex items-start gap-2 text-sm text-muted-foreground">
                <HourglassIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                {notice}
              </p>
            ) : null}

            {/* The picked day's times in Morning, Afternoon and Evening tabs (T127). */}
            {activeDay && periods.length > 0 ? (
              <div className="flex flex-col gap-3">
                <span className="text-sm font-medium">{words.location.timeLabel(type)}</span>
                <SlotPeriodTabs
                  label={orderFlowWords.partLabel}
                  periods={periods}
                  period={shownPeriod}
                  onPeriodChange={setPickedPeriod}
                  value={value.at}
                  onValueChange={(at) => {
                    setPickedPeriod(dayPeriodOf(at));
                    onChange({ mode: 'schedule', at });
                  }}
                  pressedClassName={PRESSED}
                  chipsClassName="grid grid-cols-3 sm:grid-cols-4"
                />
              </div>
            ) : null}

            {movedTo ? (
              <p role="status" className="text-sm text-warning-text">
                {words.location.slotMoved(whenSummary(type, movedTo, now))}
              </p>
            ) : null}

            {value.at ? (
              <div
                role="status"
                className="flex items-center gap-3 rounded-2xl bg-shop-10-soft px-3.5 py-3 text-shop-10-soft-foreground"
              >
                <CalendarIcon aria-hidden="true" className="size-5 shrink-0" />
                <span className="text-sm font-semibold tabular">
                  {whenSummary(type, value.at, now)}
                </span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{words.location.pickTime}</p>
            )}
          </div>
        )
      ) : null}
    </FieldSet>
  );
}
