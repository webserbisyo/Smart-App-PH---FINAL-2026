// Source: https://opensourceui.in/components/booking-slot-calendar · copied 2026-11-03 · MIT, Opensource UI by Bidyut Kundu
// Changes: our cn, token classes instead of raw neutral palette, dark mode support,
// flexible slot groups (Morning/Afternoon/Evening), configurable taken slots, and customizable header icon/copy.
import {
  forwardRef,
  useMemo,
  useState,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from 'react';

import { cn } from 'cn';
import { CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

export interface BookingSlotGroup {
  name: string;
  slots: readonly string[];
}

function startOfWeek(date: Date): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() - copy.getDay());
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function isSameDate(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isBeforeDay(date: Date, day: Date): boolean {
  return startOfDay(date).getTime() < startOfDay(day).getTime();
}

const DEFAULT_SLOTS = [
  '9:00 AM',
  '9:30 AM',
  '10:00 AM',
  '10:30 AM',
  '11:00 AM',
  '2:00 PM',
  '2:30 PM',
  '3:00 PM',
] as const;

export type BookingSlotCalendarProps = Readonly<
  {
    title?: string;
    subtitle?: string;
    icon?: ReactNode;
    slots?: readonly string[] | readonly BookingSlotGroup[];
    takenSlots?: readonly string[];
    onBook?: (date: Date, slot: string) => void;
  } & ComponentPropsWithoutRef<'div'>
>;

function isRecord(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null;
}

function isStringArray(val: unknown): val is readonly string[] {
  return Array.isArray(val) && val.every((item) => typeof item === 'string');
}

function isBookingSlotGroup(val: unknown): val is BookingSlotGroup {
  return isRecord(val) && typeof val['name'] === 'string' && isStringArray(val['slots']);
}

function isBookingSlotGroupArray(
  val: readonly (string | BookingSlotGroup)[],
): val is readonly BookingSlotGroup[] {
  return val.every(isBookingSlotGroup);
}

function isStringSlotsArray(val: readonly (string | BookingSlotGroup)[]): val is readonly string[] {
  return val.every((item) => typeof item === 'string');
}

// Booking calendar — appointment and slot picker: pick a day, then tap an available time slot.
export const BookingSlotCalendar = forwardRef<HTMLDivElement, BookingSlotCalendarProps>(
  (
    {
      className,
      title = 'Book a slot',
      subtitle = '30 min · Pickup or delivery window',
      icon,
      slots = DEFAULT_SLOTS,
      takenSlots = ['10:30 AM', '2:30 PM'],
      onBook,
      ...props
    },
    ref,
  ) => {
    const today = useMemo(() => startOfDay(new Date()), []);
    const [weekStart, setWeekStart] = useState(() => startOfWeek(today));
    const [selectedDay, setSelectedDay] = useState(today);
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
    const [slideDirection, setSlideDirection] = useState(0);

    const days = useMemo(
      () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
      [weekStart],
    );

    const canGoPrev = !isBeforeDay(addDays(weekStart, -1), today);

    const monthLabel = days[3]?.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });

    const dayLabel = selectedDay.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });

    const pickDay = (date: Date) => {
      if (isBeforeDay(date, today)) return;
      setSelectedDay(startOfDay(date));
      setSelectedSlot(null);
    };

    const pickSlot = (slot: string) => {
      if (isBeforeDay(selectedDay, today)) return;
      setSelectedSlot(slot);
      onBook?.(selectedDay, slot);
    };

    const goPrevWeek = () => {
      if (!canGoPrev) return;
      setSlideDirection(-1);
      setWeekStart((prev) => addDays(prev, -7));
    };

    const goNextWeek = () => {
      setSlideDirection(1);
      setWeekStart((prev) => addDays(prev, 7));
    };

    // Normalize slots into groups
    const slotGroups: readonly BookingSlotGroup[] = useMemo(() => {
      if (slots.length === 0) return [];
      if (isBookingSlotGroupArray(slots)) {
        return slots;
      }
      if (isStringSlotsArray(slots)) {
        return [{ name: '', slots }];
      }
      return [];
    }, [slots]);

    return (
      <div
        ref={ref}
        data-slot="booking-slot-calendar"
        className={cn(
          'w-80 overflow-hidden rounded-2xl border border-border bg-card font-sans text-card-foreground select-none',
          'shadow-sm',
          className,
        )}
        {...props}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {icon ?? <CalendarIcon className="size-5" aria-hidden />}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">{title}</p>
            {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
          </div>
        </div>

        <div className="px-5 py-4">
          {/* Month + week navigation */}
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[13px] font-medium text-foreground">{monthLabel}</p>
            <div className="flex items-center">
              <button
                type="button"
                aria-label="Previous week"
                disabled={!canGoPrev}
                onClick={goPrevWeek}
                className={cn(
                  'flex size-8 items-center justify-center rounded-full transition-colors duration-150 outline-none',
                  'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring',
                  canGoPrev
                    ? 'cursor-pointer text-muted-foreground hover:bg-muted hover:text-foreground'
                    : 'cursor-not-allowed text-muted-foreground/30',
                )}
              >
                <ChevronLeft size={16} strokeWidth={2} aria-hidden />
              </button>
              <button
                type="button"
                aria-label="Next week"
                onClick={goNextWeek}
                className="flex size-8 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors duration-150 outline-none hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
              >
                <ChevronRight size={16} strokeWidth={2} aria-hidden />
              </button>
            </div>
          </div>

          {/* Week strip */}
          <div
            key={weekStart.toISOString()}
            className={cn(
              'mb-4 grid grid-cols-7 opacity-100 transition-all duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]',
              slideDirection >= 0 ? 'starting:translate-x-2' : 'starting:-translate-x-2',
            )}
          >
            {days.map((date) => {
              const active = isSameDate(date, selectedDay);
              const isToday = isSameDate(date, today);
              const past = isBeforeDay(date, today);

              return (
                <button
                  key={date.toISOString()}
                  type="button"
                  aria-pressed={active}
                  aria-disabled={past || undefined}
                  disabled={past}
                  onClick={() => pickDay(date)}
                  className={cn(
                    'group flex flex-col items-center gap-1 outline-none',
                    past ? 'cursor-not-allowed' : 'cursor-pointer',
                  )}
                >
                  <span
                    className={cn(
                      'text-[10px] font-medium tracking-wide uppercase',
                      past ? 'text-muted-foreground/40' : 'text-muted-foreground',
                    )}
                  >
                    {date.toLocaleDateString('en-US', { weekday: 'narrow' })}
                  </span>
                  <span
                    className={cn(
                      'flex size-8 items-center justify-center rounded-full text-xs font-medium tabular-nums',
                      'transition-colors duration-150',
                      !past &&
                        'group-focus-visible:outline-2 group-focus-visible:outline-offset-1 group-focus-visible:outline-ring',
                      past && 'text-muted-foreground/40',
                      !past && active && 'bg-primary font-semibold text-primary-foreground',
                      !past &&
                        !active &&
                        isToday &&
                        'bg-muted font-semibold text-foreground group-hover:bg-accent',
                      !past && !active && !isToday && 'text-foreground group-hover:bg-muted',
                    )}
                  >
                    {date.getDate()}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Selected day */}
          <p
            key={dayLabel}
            className="mb-2.5 text-xs font-medium text-muted-foreground opacity-100 transition-all duration-300 ease-out"
          >
            {dayLabel}
          </p>

          {/* Time slots */}
          <div className="space-y-3">
            {slotGroups.map((group) => (
              <div key={group.name || 'default'} className="space-y-1.5">
                {group.name && (
                  <p className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                    {group.name}
                  </p>
                )}
                <div className="grid grid-cols-2 gap-2">
                  {group.slots.map((slot) => {
                    const taken = takenSlots.includes(slot);
                    const active = selectedSlot === slot;

                    return (
                      <button
                        key={slot}
                        type="button"
                        disabled={taken}
                        aria-pressed={active}
                        onClick={() => pickSlot(slot)}
                        className={cn(
                          'h-9 rounded-lg text-xs font-medium tabular-nums outline-none',
                          'transition-colors duration-150',
                          'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring',
                          taken &&
                            'cursor-not-allowed bg-muted/40 text-muted-foreground/40 line-through',
                          !taken && active && 'cursor-pointer bg-primary text-primary-foreground',
                          !taken &&
                            !active &&
                            'cursor-pointer bg-muted text-foreground hover:bg-accent',
                        )}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  },
);

BookingSlotCalendar.displayName = 'BookingSlotCalendar';
