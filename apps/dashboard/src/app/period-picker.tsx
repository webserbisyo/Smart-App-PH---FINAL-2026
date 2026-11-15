import * as React from 'react';
import { CalendarIcon, CheckIcon, ChevronDownIcon } from 'lucide-react';
import { addDays, formatManila, manilaToDate, type PeriodDates } from '@smartapp/core';
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
import { dateFromKey, keyFromDate } from './day-key';
import { daysFrom } from './orders/calendar-days';

export interface PeriodPick<Id extends string> {
  id: Id;
  label: string;
}

export interface PeriodPickerWords {
  // The trigger's name and the phone sheet's title ("Show sales for").
  label: string;
  pickFirst: string;
  pickLast: string;
  apply: string;
  // The rule under Apply ("Home keeps the last 60 days…").
  limit: string;
}

interface Draft {
  from: Date | undefined;
  to?: Date | undefined;
}

/** "Sat 14 Nov", or "Sat 14 Nov – Fri 20 Nov". */
export function rangeText(dates: PeriodDates, range: (from: string, to: string) => string): string {
  const day = (key: string) => formatManila(manilaToDate(key, '12:00'), 'date');
  return range(day(dates.from), day(dates.to));
}

/**
 * A period picker composed the way ReUI c-calendar-29 does it (Home T83, Orders List T95): quick picks
 * beside a range calendar in a Popover, a bottom Drawer on phones. The caller names the picks and the
 * days that can be picked; a range never runs past `maxDays`.
 */
export function PeriodPicker<Id extends string>({
  picks,
  picked,
  dates,
  label,
  words,
  earliest,
  latest,
  maxDays,
  align = 'end',
  onPick,
  onRange,
}: {
  picks: readonly PeriodPick<Id>[];
  // The quick pick in use, or null for picked dates.
  picked: Id | null;
  // The days on screen, where the calendar opens.
  dates: PeriodDates;
  // What the trigger says ("Last 7 days", "Sat 14 Nov – Fri 20 Nov").
  label: string;
  words: PeriodPickerWords;
  earliest: string;
  latest: string;
  maxDays: number;
  align?: 'start' | 'end';
  onPick: (id: Id) => void;
  onRange: (dates: PeriodDates) => void;
}) {
  const isPhone = useFormFactor() === 'phone';
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<Draft | undefined>();
  const [month, setMonth] = React.useState(() => dateFromKey(dates.to));

  const openChange = (next: boolean) => {
    if (next) {
      setDraft({ from: dateFromKey(dates.from), to: dateFromKey(dates.to) });
      setMonth(dateFromKey(dates.to > latest ? latest : dates.to));
    }
    setOpen(next);
  };
  const pick = (id: Id) => {
    onPick(id);
    setOpen(false);
  };
  const apply = () => {
    if (!draft?.from) return;
    const from = keyFromDate(draft.from);
    onRange({ from, to: keyFromDate(draft.to ?? draft.from) });
    setOpen(false);
  };

  const waitingForLast = draft?.from !== undefined && draft.to === undefined;
  // While the last day is still to come, only days within `maxDays` of the first can be tapped.
  const anchor = waitingForLast && draft.from ? keyFromDate(draft.from) : null;
  const first = anchor ? maxOf(earliest, addDays(anchor, -(maxDays - 1))) : earliest;
  const last = anchor ? minOf(latest, addDays(anchor, maxDays - 1)) : latest;

  const presets = (
    <div
      role="group"
      aria-label={words.label}
      className={cn(
        isPhone ? 'grid grid-cols-2 gap-2' : 'flex w-36 flex-col gap-0.5 border-e py-3 pe-2',
      )}
    >
      {picks.map((p) => {
        const active = p.id === picked;
        return (
          <Button
            key={p.id}
            type="button"
            variant={isPhone ? (active ? 'secondary' : 'outline') : 'ghost'}
            size="sm"
            aria-pressed={active}
            className={cn(
              'justify-between gap-1.5 font-medium',
              isPhone ? 'h-11 text-sm' : 'h-8 w-full',
              active && !isPhone && 'bg-accent text-accent-foreground',
            )}
            onClick={() => pick(p.id)}
          >
            {p.label}
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
        startMonth={dateFromKey(earliest)}
        endMonth={dateFromKey(latest)}
        disabled={[{ before: dateFromKey(first) }, { after: dateFromKey(last) }]}
        style={cssVars({ '--cell-size': isPhone ? 'calc(var(--spacing) * 11)' : undefined })}
        className={cn(isPhone && 'mx-auto bg-transparent p-0')}
      />
      <p aria-live="polite" className="px-2 text-xs text-muted-foreground">
        {waitingForLast ? words.pickLast : words.pickFirst}
      </p>
      <div className="flex flex-col gap-2 px-2 pb-2">
        <Button type="button" className="h-11 md:h-9" disabled={!draft?.from} onClick={apply}>
          {words.apply}
        </Button>
        <p className="max-w-64 text-xs text-muted-foreground">{words.limit}</p>
      </div>
    </div>
  );

  const triggerProps = {
    type: 'button' as const,
    variant: 'outline' as const,
    className: 'h-11 max-w-full gap-2 bg-card px-3 font-semibold md:h-9',
    'aria-label': `${words.label}: ${label}`,
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
              <DrawerTitle>{words.label}</DrawerTitle>
              <DrawerDescription className="sr-only">{words.limit}</DrawerDescription>
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
      <PopoverContent align={align} className="w-auto p-0">
        <div className="flex">
          {presets}
          {calendar}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function maxOf(a: string, b: string): string {
  return a > b ? a : b;
}

function minOf(a: string, b: string): string {
  return a < b ? a : b;
}

/** How many days a range covers, both ends included. */
export function rangeDays(dates: PeriodDates): number {
  return daysFrom(dates.from, dates.to) + 1;
}
