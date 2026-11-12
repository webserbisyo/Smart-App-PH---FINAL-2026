import * as React from 'react';
import { CalendarIcon, CheckIcon, ChevronDownIcon } from 'lucide-react';
import {
  addDays,
  formatManila,
  homeWords,
  HOME_PERIOD_MAX_DAYS,
  manilaToDate,
  periodDates,
  type HomePeriod,
  type PeriodDates,
} from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import { Calendar } from '@smartapp/ui/components/calendar';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@smartapp/ui/components/drawer';
import { Popover, PopoverContent, PopoverTrigger } from '@smartapp/ui/components/popover';
import { useFormFactor } from '@smartapp/ui/hooks/use-form-factor';
import { cssVars } from '@smartapp/ui/lib/css-vars';
import { cn } from 'cn';
import { dateFromKey, keyFromDate } from '@/app/day-key';

const W = homeWords.period;
const QUICK: readonly Exclude<HomePeriod, 'custom'>[] = [
  'today',
  'yesterday',
  '7d',
  '30d',
  'month',
];

interface Draft {
  from: Date | undefined;
  to?: Date | undefined;
}

const dayText = (key: string) => formatManila(manilaToDate(key, '12:00'), 'date');

/** "Last 7 days", or the picked dates. */
export function periodLabel(period: HomePeriod, dates: PeriodDates): string {
  return period === 'custom' ? W.range(dayText(dates.from), dayText(dates.to)) : W.picks[period];
}

/**
 * The Home period picker (T83), composed the way ReUI c-calendar-29 does it: quick picks beside a range
 * calendar in a Popover, a bottom Drawer on phones. Only the last 60 days and never the future.
 */
export function PeriodPicker({
  period,
  dates,
  today,
  onChange,
}: {
  period: HomePeriod;
  dates: PeriodDates;
  today: string;
  onChange: (period: HomePeriod, dates?: PeriodDates) => void;
}) {
  const isPhone = useFormFactor() === 'phone';
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<Draft | undefined>();
  const [month, setMonth] = React.useState(() => dateFromKey(dates.to));

  const openChange = (next: boolean) => {
    if (next) {
      setDraft({ from: dateFromKey(dates.from), to: dateFromKey(dates.to) });
      setMonth(dateFromKey(dates.to));
    }
    setOpen(next);
  };
  const pick = (p: Exclude<HomePeriod, 'custom'>) => {
    onChange(p);
    setOpen(false);
  };
  const apply = () => {
    if (!draft?.from) return;
    const from = keyFromDate(draft.from);
    const to = keyFromDate(draft.to ?? draft.from);
    const picked = { from, to };
    const quick = QUICK.find((p) => {
      const d = periodDates(p, today);
      return d.from === from && d.to === to;
    });
    onChange(quick ?? 'custom', quick ? undefined : picked);
    setOpen(false);
  };

  const earliest = dateFromKey(addDays(today, -(HOME_PERIOD_MAX_DAYS - 1)));
  const last = dateFromKey(today);
  const waitingForLast = draft?.from !== undefined && draft.to === undefined;

  const presets = (
    <div
      role="group"
      aria-label={W.label}
      className={cn(
        isPhone ? 'grid grid-cols-2 gap-2' : 'flex w-36 flex-col gap-0.5 border-e py-3 pe-2',
      )}
    >
      {QUICK.map((p) => {
        const active = p === period;
        return (
          <Button
            key={p}
            type="button"
            variant={isPhone ? (active ? 'secondary' : 'outline') : 'ghost'}
            size="sm"
            aria-pressed={active}
            className={cn(
              'justify-between gap-1.5 font-medium',
              isPhone ? 'h-11 text-sm' : 'h-8 w-full',
              active && !isPhone && 'bg-accent text-accent-foreground',
            )}
            onClick={() => pick(p)}
          >
            {W.picks[p]}
            {active ? <CheckIcon aria-hidden="true" className="size-4" /> : null}
          </Button>
        );
      })}
    </div>
  );

  const calendar = (
    <div className="flex flex-col gap-2">
      <Calendar
        // Day cells big enough for a thumb in the phone drawer (44 px); the calendar's own size elsewhere.
        mode="range"
        selected={draft}
        // First tap starts new dates, the second ends them (either order), as the hint says.
        onSelect={(_, day) =>
          setDraft((d) => {
            if (!d?.from || d.to) return { from: day, to: undefined };
            return day < d.from ? { from: day, to: d.from } : { from: d.from, to: day };
          })
        }
        month={month}
        onMonthChange={setMonth}
        startMonth={earliest}
        endMonth={last}
        disabled={[{ before: earliest }, { after: last }]}
        style={cssVars({ '--cell-size': isPhone ? 'calc(var(--spacing) * 11)' : undefined })}
        className={cn(isPhone && 'mx-auto bg-transparent p-0')}
      />
      <p aria-live="polite" className="px-2 text-xs text-muted-foreground">
        {waitingForLast ? W.pickLast : W.pickFirst}
      </p>
      <div className="flex flex-col gap-2 px-2 pb-2">
        <Button type="button" className="h-11 md:h-9" disabled={!draft?.from} onClick={apply}>
          {W.apply}
        </Button>
        <p className="text-xs text-muted-foreground">{W.limit}</p>
      </div>
    </div>
  );

  const label = periodLabel(period, dates);
  const triggerProps = {
    type: 'button' as const,
    variant: 'outline' as const,
    className: 'h-11 gap-2 bg-card px-3 font-semibold md:h-9',
    'aria-label': `${W.label}: ${label}`,
    children: (
      <>
        <CalendarIcon aria-hidden="true" className="text-muted-foreground" />
        <span className="truncate">{label}</span>
        <ChevronDownIcon aria-hidden="true" className="text-muted-foreground" />
      </>
    ),
  };

  if (isPhone) {
    return (
      <>
        <Button {...triggerProps} onClick={() => openChange(true)} />
        <Drawer open={open} onOpenChange={openChange} showSwipeHandle>
          <DrawerContent className="max-h-vh-92 pb-safe">
            <DrawerHeader className="pb-2">
              <DrawerTitle>{W.label}</DrawerTitle>
              <DrawerDescription className="sr-only">{W.limit}</DrawerDescription>
            </DrawerHeader>
            <div className="flex min-h-0 flex-col gap-4 overflow-y-auto overscroll-contain px-4 pb-4">
              {presets}
              {calendar}
            </div>
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  return (
    <Popover open={open} onOpenChange={openChange}>
      <PopoverTrigger render={<Button {...triggerProps} />} />
      <PopoverContent align="end" className="w-auto p-0">
        <div className="flex">
          {presets}
          {calendar}
        </div>
      </PopoverContent>
    </Popover>
  );
}
