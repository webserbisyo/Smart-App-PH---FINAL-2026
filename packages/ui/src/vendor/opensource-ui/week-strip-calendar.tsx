// Source: https://opensourceui.in/components/week-strip-calendar · copied 2026-11-03 · MIT, Opensource UI by Bidyut Kundu
// Changes: our cn, token classes instead of raw neutral palette, dark mode support,
// customizable day states (closed, full), controlled/uncontrolled selection, and Manila-safe day helpers.
import { forwardRef, useMemo, useState, type ComponentPropsWithoutRef } from 'react';

import { cn } from 'cn';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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

export type WeekStripDayState = 'open' | 'closed' | 'full';

export type WeekStripCalendarProps = Readonly<
  {
    selected?: Date;
    defaultDate?: Date;
    onSelect?: (date: Date) => void;
    dayStates?: Record<string, WeekStripDayState>;
    getDayState?: (date: Date) => WeekStripDayState | undefined;
  } & Omit<ComponentPropsWithoutRef<'div'>, 'onSelect'>
>;

// Week strip — swipe weeks with arrows, tap a day to select it.
export const WeekStripCalendar = forwardRef<HTMLDivElement, WeekStripCalendarProps>(
  (
    {
      className,
      selected: controlledSelected,
      defaultDate,
      onSelect,
      dayStates,
      getDayState,
      ...props
    },
    ref,
  ) => {
    const today = useMemo(() => startOfDay(new Date()), []);
    const [weekStart, setWeekStart] = useState(() => startOfWeek(defaultDate ?? today));
    const [internalSelected, setInternalSelected] = useState<Date>(() => defaultDate ?? today);
    const [slideDirection, setSlideDirection] = useState(0);

    const selected =
      controlledSelected !== undefined ? startOfDay(controlledSelected) : internalSelected;

    const days = useMemo(
      () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
      [weekStart],
    );

    const monthLabel = days[3]?.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });

    const rangeLabel = `${days[0]?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${days[6]?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

    const selectDay = (date: Date) => {
      const day = startOfDay(date);
      if (controlledSelected === undefined) {
        setInternalSelected(day);
      }
      onSelect?.(day);
    };

    const goPrevWeek = () => {
      setSlideDirection(-1);
      setWeekStart((prev) => addDays(prev, -7));
    };

    const goNextWeek = () => {
      setSlideDirection(1);
      setWeekStart((prev) => addDays(prev, 7));
    };

    const resolveState = (date: Date): WeekStripDayState | undefined => {
      if (getDayState) return getDayState(date);
      if (dayStates) {
        const isoKey = date.toISOString().slice(0, 10);
        return dayStates[isoKey];
      }
      return undefined;
    };

    return (
      <div
        ref={ref}
        data-slot="week-strip-calendar"
        className={cn(
          'w-80 overflow-hidden rounded-2xl border border-border bg-card px-5 py-4 font-sans text-card-foreground select-none',
          'shadow-sm',
          className,
        )}
        {...props}
      >
        <div className="mb-1 flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">{monthLabel}</p>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              aria-label="Previous week"
              onClick={goPrevWeek}
              className="flex size-8 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors duration-150 outline-none hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
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

        <p
          key={rangeLabel}
          className="mb-4 text-xs font-medium text-muted-foreground opacity-100 transition-opacity duration-300 ease-out"
        >
          {rangeLabel}
        </p>

        <div
          key={weekStart.toISOString()}
          className={cn(
            'grid grid-cols-7 opacity-100 transition-all duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]',
            slideDirection >= 0 ? 'starting:translate-x-2' : 'starting:-translate-x-2',
          )}
        >
          {days.map((date) => {
            const isSelected = isSameDate(date, selected);
            const isToday = isSameDate(date, today);
            const state = resolveState(date);
            const isClosed = state === 'closed';
            const isFull = state === 'full';

            return (
              <button
                key={date.toISOString()}
                type="button"
                aria-pressed={isSelected}
                disabled={isClosed}
                onClick={() => selectDay(date)}
                className={cn(
                  'group flex flex-col items-center gap-1.5 outline-none',
                  isClosed ? 'cursor-not-allowed opacity-40' : 'cursor-pointer',
                )}
              >
                <span
                  className={cn(
                    'text-[10px] font-medium tracking-wide uppercase',
                    isSelected ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {date.toLocaleDateString('en-US', { weekday: 'narrow' })}
                </span>
                <span
                  className={cn(
                    'relative flex size-9 items-center justify-center rounded-full text-sm font-medium tabular-nums',
                    'transition-colors duration-150',
                    'group-focus-visible:outline-2 group-focus-visible:outline-offset-1 group-focus-visible:outline-ring',
                    isSelected && 'bg-primary font-semibold text-primary-foreground',
                    !isSelected &&
                      isToday &&
                      'bg-muted font-semibold text-foreground group-hover:bg-accent',
                    !isSelected && !isToday && 'text-foreground group-hover:bg-muted',
                    isFull && !isSelected && 'text-warning ring-1 ring-warning',
                  )}
                >
                  {date.getDate()}
                  {isToday && !isSelected && (
                    <span
                      aria-hidden
                      className="absolute -bottom-0.5 left-1/2 size-1 -translate-x-1/2 rounded-full bg-primary"
                    />
                  )}
                </span>
                {state && (
                  <span
                    className={cn(
                      'text-[9px] leading-none font-medium',
                      isClosed && 'text-muted-foreground line-through',
                      isFull && 'font-semibold text-warning',
                      state === 'open' && 'text-success',
                    )}
                  >
                    {isClosed ? 'Closed' : isFull ? 'Full' : ''}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  },
);

WeekStripCalendar.displayName = 'WeekStripCalendar';
