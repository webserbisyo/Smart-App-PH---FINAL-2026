'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  BanIcon,
  CalendarDaysIcon,
  CalendarIcon,
  CircleSlashIcon,
  HourglassIcon,
  InfoIcon,
  MessageCircleIcon,
  type LucideIcon,
} from 'lucide-react';
import {
  formatClock,
  manilaDate,
  openState,
  openStateText,
  words,
  type ScheduleDayState,
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
import { Popover, PopoverContent, PopoverTrigger } from '@smartapp/ui/components/popover';
import { RadioGroup, RadioGroupItem } from '@smartapp/ui/components/radio-group';
import { Alert, AlertDescription } from '@smartapp/ui/components/reui/alert';
import { Scroller } from '@smartapp/ui/components/scroller';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@smartapp/ui/components/toggle-group';
import { cn } from '@smartapp/ui/lib/utils';
import { useShop } from '../../shell/components/shop-context';
import {
  asapChoice,
  asapDetail,
  dayChipLabel,
  DAY_CHIPS,
  firstOpenDay,
  nextOpenSlot,
  noDaysLine,
  noticeLine,
  resolvePick,
  slotPeriods,
  whenSummary,
  type BookableType,
  type WhenMode,
} from '../when-rules';

// The full calendar loads only when "More dates" opens (react-day-picker stays out of the page).
const MoreDatesCalendar = dynamic(() => import('./more-dates-calendar'), {
  ssr: false,
  loading: () => <Skeleton className="m-3 h-72 w-64 rounded-xl" />,
});

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

const DAY_CHIP =
  'h-16 min-w-18 shrink-0 flex-col gap-0.5 rounded-2xl px-3 text-sm font-semibold aria-pressed:border-transparent aria-pressed:bg-shop-10 aria-pressed:text-shop-10-foreground';
const TIME_CHIP =
  'h-11 min-w-22 rounded-full px-3 text-base font-medium tabular aria-pressed:border-transparent aria-pressed:bg-shop-10 aria-pressed:text-shop-10-foreground';

/**
 * The When picker (O6), used by the How and where sheet (also opened from checkout): ASAP or Schedule,
 * then a day strip (up to 14 chips, More dates beyond) and time chips grouped Morning, Afternoon and
 * Evening. Days, notice and limits come from the shop's schedule; it refreshes with the basket and never
 * keeps a time that is no longer open.
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
  const [moreOpen, setMoreOpen] = useState(false);

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
  const chips = data?.days.slice(0, DAY_CHIPS) ?? [];
  const hasMore = (data?.days.length ?? 0) > DAY_CHIPS;
  const dayInStrip = chips.some((d) => d.date === day);
  const notice = data ? noticeLine(data, type) : null;
  const periods = activeDay?.state === 'open' ? slotPeriods(activeDay.slots) : [];
  const messenger = sf.info.contact.messengerUsername;

  const pickDay = (date: string) => {
    setPickedDay(date);
    if (value.at && manilaDate(value.at) !== date) onChange({ mode: 'schedule', at: null });
  };

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

            {/* Day strip: Today, Tomorrow, then "Wed 5"; closed, full and too-soon days say so. */}
            <div className="flex min-w-0 flex-col gap-2">
              <span className="text-sm font-medium">{words.location.dayLabel}</span>
              <Scroller orientation="horizontal" hideScrollbar className="-mx-1 min-w-0 px-1">
                <div className="flex w-max items-stretch gap-2">
                  <ToggleGroup
                    value={day && dayInStrip ? [day] : []}
                    onValueChange={(next) => {
                      const picked = next[0];
                      if (picked) pickDay(picked);
                    }}
                    aria-label={words.location.dayLabel}
                    spacing={2}
                    className="flex w-max items-stretch"
                  >
                    {chips.map((d) => {
                      const label = dayChipLabel(d.date, now);
                      const StateIcon = d.state === 'open' ? null : DAY_STATE_ICON[d.state];
                      const stateWord =
                        d.state === 'open' ? null : words.location.dayState[d.state];
                      return (
                        <ToggleGroupItem
                          key={d.date}
                          value={d.date}
                          variant="outline"
                          disabled={d.state !== 'open'}
                          aria-label={
                            stateWord ? words.location.dayDisabled(label, stateWord) : label
                          }
                          className={cn(DAY_CHIP, d.state !== 'open' && 'opacity-60')}
                        >
                          <span>{label}</span>
                          {StateIcon && stateWord ? (
                            <span className="flex items-center gap-1 text-xs font-medium">
                              <StateIcon aria-hidden="true" className="size-3" />
                              {stateWord}
                            </span>
                          ) : null}
                        </ToggleGroupItem>
                      );
                    })}
                  </ToggleGroup>
                  {hasMore ? (
                    <Popover open={moreOpen} onOpenChange={setMoreOpen}>
                      <PopoverTrigger
                        render={
                          <Button
                            type="button"
                            variant="outline"
                            aria-pressed={Boolean(day && !dayInStrip)}
                            className={DAY_CHIP}
                          />
                        }
                      >
                        <CalendarDaysIcon aria-hidden="true" className="size-4" />
                        <span>
                          {day && !dayInStrip ? dayChipLabel(day, now) : words.location.moreDates}
                        </span>
                      </PopoverTrigger>
                      <PopoverContent align="end" className="w-auto p-0">
                        {moreOpen ? (
                          <MoreDatesCalendar
                            days={data.days}
                            selected={day}
                            onPick={(date) => {
                              pickDay(date);
                              setMoreOpen(false);
                            }}
                          />
                        ) : null}
                      </PopoverContent>
                    </Popover>
                  ) : null}
                </div>
              </Scroller>
            </div>

            {notice ? (
              <p className="flex items-start gap-2 text-sm text-muted-foreground">
                <HourglassIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                {notice}
              </p>
            ) : null}

            {/* Time chips for the picked day, grouped Morning, Afternoon and Evening. */}
            {activeDay ? (
              <div className="flex flex-col gap-3">
                <span className="text-sm font-medium">{words.location.timeLabel(type)}</span>
                {periods.map((group) => (
                  <div key={group.period} className="flex flex-col gap-2">
                    <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                      {words.location.periods[group.period]}
                    </span>
                    <ToggleGroup
                      value={value.at ? [value.at] : []}
                      onValueChange={(next) => {
                        const picked = next[0];
                        if (picked) onChange({ mode: 'schedule', at: picked });
                      }}
                      aria-label={words.location.periods[group.period]}
                      spacing={2}
                      className="flex flex-wrap"
                    >
                      {group.slots.map((slot) => {
                        const full = slot.state === 'full';
                        return (
                          <ToggleGroupItem
                            key={slot.at}
                            value={slot.at}
                            variant="outline"
                            disabled={full}
                            className={cn(TIME_CHIP, full && 'opacity-60')}
                          >
                            <span className={full ? 'line-through' : undefined}>
                              {formatClock(slot.at)}
                            </span>
                            {full ? (
                              <span className="text-xs font-medium">{words.location.slotFull}</span>
                            ) : null}
                          </ToggleGroupItem>
                        );
                      })}
                    </ToggleGroup>
                  </div>
                ))}
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
