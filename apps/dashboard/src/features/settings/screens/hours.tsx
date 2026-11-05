import * as React from 'react';
import { CalendarIcon, CopyIcon, PlusIcon, Trash2Icon, XIcon } from 'lucide-react';
import {
  WEEKDAYS,
  copyDayToAll,
  formatManila,
  hoursProblems,
  manilaDate,
  manilaToDate,
  settingsWords,
  words,
  type Closure,
  type HoursSettings,
  type OpeningRange,
  type OwnerSettings,
  type Weekday,
} from '@smartapp/core';
import { useNow, useSaveHours } from '@smartapp/data';
import { Button } from '@smartapp/ui/components/button';
import { Calendar } from '@smartapp/ui/components/calendar';
import { Field, FieldError, FieldLabel } from '@smartapp/ui/components/field';
import { Input } from '@smartapp/ui/components/input';
import { Popover, PopoverContent, PopoverTrigger } from '@smartapp/ui/components/popover';
import { Switch } from '@smartapp/ui/components/switch';
import {
  TimePicker,
  TimePickerContent,
  TimePickerHour,
  TimePickerInput,
  TimePickerInputGroup,
  TimePickerLabel,
  TimePickerMinute,
  TimePickerPeriod,
  TimePickerSeparator,
  TimePickerTrigger,
} from '@smartapp/ui/components/time-picker';
import { notify } from '@smartapp/ui/compositions/notify';
import { cn } from 'cn';
import { useShop } from '@/app/shop';
import { useCoarsePointer } from '@/app/use-coarse-pointer';
import { HoursPreview } from '../previews.js';
import {
  SaveBar,
  SettingsCard,
  SettingsPage,
  WithSettings,
  useDraft,
  useSectionSave,
} from '../settings-ui.js';

const W = settingsWords.hours;
const DAY_NAMES = words.storefrontShell.info.dayNames;
// Monday first, like a printed week.
const WEEK: readonly Weekday[] = [...WEEKDAYS.slice(1), WEEKDAYS[0]];
const MAX_RANGES_PER_DAY = 4;

const dayName = (day: Weekday): string => DAY_NAMES[day] ?? '';

/** 12 MN as a closing time is stored as "24:00"; the pickers show it as 12:00 AM. */
const toPicker = (clock: string): string => (clock === '24:00' ? '00:00' : clock);
const fromPicker = (clock: string, isClose: boolean): string =>
  isClose && clock === '00:00' ? '24:00' : clock;

function dateKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function localDate(key: string): Date {
  const [y = 1970, m = 1, d = 1] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function HoursSettingsScreen() {
  return <WithSettings>{(settings) => <HoursForm settings={settings} />}</WithSettings>;
}

function HoursForm({ settings }: { settings: OwnerSettings }) {
  const shop = useShop();
  const { draft, setDraft, dirty, reset } = useDraft<HoursSettings>(settings.hours);
  const saveHours = useSaveHours();
  const section = useSectionSave(settingsWords.sectionTitles.hours);
  const now = useNow();
  const today = manilaDate(now ?? new Date());
  const problems = hoursProblems(draft.hours);
  const valid = problems.size === 0;
  const todayDay = manilaToDate(today, '12:00').getUTCDay();

  const setHours = (hours: OpeningRange[]) => setDraft((d) => ({ ...d, hours }));
  const setClosures = (closures: Closure[]) => setDraft((d) => ({ ...d, closures }));

  const openDays = WEEK.filter((day) => draft.hours.some((h) => h.day === day));
  const mondayOpen = draft.hours.some((h) => h.day === 1);

  const copyMonday = () => {
    const before = draft.hours;
    const targets = openDays.filter((d) => d !== 1);
    setHours(copyDayToAll(before, 1, openDays));
    notify({
      title: W.copied(targets.length),
      tone: 'success',
      action: { label: W.undo, onClick: () => setHours(before) },
    });
  };

  const save = () => void section.save(() => saveHours.mutateAsync(draft));

  return (
    <SettingsPage
      id="hours"
      preview={<HoursPreview slug={shop.slug} hours={draft.hours} closures={draft.closures} />}
    >
      <SettingsCard
        title={W.card}
        action={
          <Button
            variant="outline"
            size="sm"
            className="h-11 md:h-8"
            disabled={!mondayOpen || openDays.length < 2}
            onClick={copyMonday}
          >
            <CopyIcon />
            <span className="hidden sm:inline">{W.copyMonday}</span>
            <span className="sm:hidden">{W.copyMondayShort}</span>
          </Button>
        }
      >
        <ul className="@container -my-2 flex flex-col divide-y divide-border">
          {WEEK.map((day) => (
            <DayRow
              key={day}
              day={day}
              isToday={day === todayDay}
              hours={draft.hours}
              problems={problems}
              onChange={setHours}
            />
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">{W.lateHint}</p>
      </SettingsCard>

      <ClosuresCard closures={draft.closures} today={today} onChange={setClosures} />

      <SaveBar
        dirty={dirty}
        valid={valid}
        status={section.status}
        onDiscard={() => {
          reset();
          section.clear();
        }}
        onSave={save}
      />
    </SettingsPage>
  );
}

function DayRow({
  day,
  isToday,
  hours,
  problems,
  onChange,
}: {
  day: Weekday;
  isToday: boolean;
  hours: OpeningRange[];
  problems: Map<number, 'order' | 'overlap'>;
  onChange: (hours: OpeningRange[]) => void;
}) {
  const ranges = hours.map((range, index) => ({ range, index })).filter((r) => r.range.day === day);
  const open = ranges.length > 0;
  const name = dayName(day);

  const toggle = (next: boolean) => {
    if (next) {
      // A new open day starts with the hours of the nearest open day, or 9 AM to 6 PM.
      const like = hours.find((h) => h.day !== day);
      onChange([...hours, { day, open: like?.open ?? '09:00', close: like?.close ?? '18:00' }]);
    } else onChange(hours.filter((h) => h.day !== day));
  };

  const update = (index: number, patch: Partial<OpeningRange>) =>
    onChange(hours.map((h, i) => (i === index ? { ...h, ...patch } : h)));

  const last = ranges[ranges.length - 1]?.range;

  return (
    <li className="flex flex-col gap-2 py-3 @lg:flex-row @lg:items-start @lg:gap-4">
      <div className="flex min-h-11 items-center gap-3 @lg:w-40 @lg:shrink-0">
        <Switch
          id={`day-${day}`}
          checked={open}
          onCheckedChange={toggle}
          aria-label={W.open(name)}
        />
        <label htmlFor={`day-${day}`} className="flex items-center gap-2 text-sm font-medium">
          {name}
          {isToday ? (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              {W.today}
            </span>
          ) : null}
        </label>
      </div>
      {open ? (
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          {ranges.map(({ range, index }, i) => {
            const problem = problems.get(index);
            return (
              <div key={index} className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <TimeField
                    label={W.opens(name)}
                    value={range.open}
                    invalid={problem !== undefined}
                    onChange={(open) => update(index, { open })}
                  />
                  <span className="text-sm text-muted-foreground">{W.to}</span>
                  <TimeField
                    label={W.closes(name)}
                    value={range.close}
                    isClose
                    invalid={problem !== undefined}
                    onChange={(close) => update(index, { close })}
                  />
                  {i > 0 ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-11 text-muted-foreground md:size-9"
                      aria-label={W.removeRange(name)}
                      onClick={() => onChange(hours.filter((_, j) => j !== index))}
                    >
                      <XIcon />
                    </Button>
                  ) : null}
                </div>
                {problem ? (
                  <p role="alert" className="text-xs font-medium text-destructive-text">
                    {W.problems[problem]}
                  </p>
                ) : null}
              </div>
            );
          })}
          {ranges.length < MAX_RANGES_PER_DAY && last ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-11 self-start px-2 text-primary md:h-8"
              aria-label={W.addRangeAria(name)}
              onClick={() =>
                onChange([
                  ...hours,
                  { day, open: last.close === '24:00' ? '23:00' : last.close, close: '24:00' },
                ])
              }
            >
              <PlusIcon />
              {W.addRange}
            </Button>
          ) : null}
        </div>
      ) : (
        <p className="flex min-h-11 items-center text-sm text-muted-foreground @lg:flex-1">
          {W.closed}
        </p>
      )}
    </li>
  );
}

/**
 * A time: the phone's own wheel on touch screens, DiceUI Time Picker with a keyboard and mouse
 * (decision T64). 5-minute steps.
 */
function TimeField({
  label,
  value,
  isClose = false,
  invalid,
  onChange,
}: {
  label: string;
  value: string;
  isClose?: boolean;
  invalid: boolean;
  onChange: (clock: string) => void;
}) {
  const coarse = useCoarsePointer();
  if (coarse)
    return (
      <Input
        type="time"
        step={300}
        aria-label={label}
        aria-invalid={invalid || undefined}
        value={toPicker(value)}
        className="h-11 w-36"
        onChange={(e) => {
          if (e.target.value) onChange(fromPicker(e.target.value, isClose));
        }}
      />
    );
  return (
    <TimePicker
      value={toPicker(value)}
      onValueChange={(next) => {
        if (next) onChange(fromPicker(next.slice(0, 5), isClose));
      }}
      locale="en-PH"
      minuteStep={5}
      invalid={invalid}
      className="w-36"
    >
      <TimePickerLabel className="sr-only">{label}</TimePickerLabel>
      <TimePickerInputGroup className={cn('h-9', invalid && 'border-destructive')}>
        <TimePickerInput segment="hour" />
        <TimePickerSeparator />
        <TimePickerInput segment="minute" />
        <TimePickerInput segment="period" />
        <TimePickerTrigger />
      </TimePickerInputGroup>
      <TimePickerContent>
        <TimePickerHour />
        <TimePickerMinute />
        <TimePickerPeriod />
      </TimePickerContent>
    </TimePicker>
  );
}

function ClosuresCard({
  closures,
  today,
  onChange,
}: {
  closures: Closure[];
  today: string;
  onChange: (closures: Closure[]) => void;
}) {
  const [date, setDate] = React.useState<string | null>(null);
  const [reason, setReason] = React.useState('');
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const upcoming = closures.filter((c) => c.date >= today);
  const taken = date !== null && closures.some((c) => c.date === date);
  const problem = taken ? W.closureTaken : date !== null && date < today ? W.closurePast : null;

  const add = () => {
    if (!date || problem) return;
    onChange(
      [...closures, { date, reason: reason.trim() || null }].sort((a, b) =>
        a.date.localeCompare(b.date),
      ),
    );
    setDate(null);
    setReason('');
  };

  const label = (key: string) => formatManila(manilaToDate(key, '12:00'), 'date');

  return (
    <SettingsCard title={W.closuresCard} description={W.closuresLine}>
      {upcoming.length === 0 ? (
        <p className="text-sm text-muted-foreground">{W.noClosures}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {upcoming.map((c) => (
            <li key={c.date} className="flex min-h-12 items-center gap-3 px-3 py-1.5">
              <CalendarIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="min-w-0 flex-1 text-sm">
                <span className="font-medium text-foreground">{label(c.date)}</span>
                {c.reason ? <span className="text-muted-foreground"> · {c.reason}</span> : null}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="size-11 text-muted-foreground md:size-9"
                aria-label={W.removeClosure(label(c.date))}
                onClick={() => onChange(closures.filter((x) => x.date !== c.date))}
              >
                <Trash2Icon />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <div className="@container">
        <div className="flex flex-col gap-3 @lg:flex-row @lg:items-end">
          <Field className="@lg:w-48" data-invalid={problem ? true : undefined}>
            <FieldLabel htmlFor="closure-date">{W.date}</FieldLabel>
            <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
              <PopoverTrigger
                render={
                  <Button
                    id="closure-date"
                    variant="outline"
                    className="h-11 justify-start font-normal md:h-9"
                  />
                }
              >
                <CalendarIcon />
                {date ? label(date) : W.pickDate}
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date ? localDate(date) : undefined}
                  disabled={[
                    { before: localDate(today) },
                    ...closures.map((c) => localDate(c.date)),
                  ]}
                  onSelect={(picked) => {
                    setDate(picked ? dateKey(picked) : null);
                    setPickerOpen(false);
                  }}
                />
              </PopoverContent>
            </Popover>
          </Field>
          <Field className="min-w-0 flex-1">
            <FieldLabel htmlFor="closure-reason">{W.reason}</FieldLabel>
            <Input
              className="h-11 md:h-9"
              id="closure-reason"
              value={reason}
              maxLength={80}
              placeholder={W.reasonPlaceholder}
              onChange={(e) => setReason(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  add();
                }
              }}
            />
          </Field>
          <Button
            variant="outline"
            className="h-11 md:h-9"
            disabled={!date || problem !== null}
            onClick={add}
          >
            <PlusIcon />
            {W.addClosure}
          </Button>
        </div>
      </div>
      {problem ? <FieldError>{problem}</FieldError> : null}
    </SettingsCard>
  );
}
