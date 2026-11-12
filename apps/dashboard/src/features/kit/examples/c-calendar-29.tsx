import { useId, useState } from 'react';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@smartapp/ui/components/button';
import { Calendar } from '@smartapp/ui/components/calendar';
import { Card, CardContent } from '@smartapp/ui/components/card';
import { Popover, PopoverContent, PopoverTrigger } from '@smartapp/ui/components/popover';
import { cn } from 'cn';

// ReUI c-calendar-29 (Range Picker Presets), from the registry through the shadcn CLI view. The dashboard
// has no date-fns of its own, so the presets use plain Date math; IconPlaceholder became the Lucide icon.
// Home's period picker (T83) composes the same parts.
const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (from: Date, n: number) => new Date(from.getTime() - n * DAY);
const fmt = (d: Date) =>
  d.toLocaleDateString('en-PH', { month: 'short', day: '2-digit', year: 'numeric' });

interface Range {
  from: Date | undefined;
  to?: Date | undefined;
}

export function Pattern() {
  const id = useId();
  const today = new Date();
  const presets: { label: string; range: { from: Date; to: Date } }[] = [
    { label: 'Today', range: { from: today, to: today } },
    { label: 'Yesterday', range: { from: daysAgo(today, 1), to: daysAgo(today, 1) } },
    { label: 'Last 7 days', range: { from: daysAgo(today, 6), to: today } },
    { label: 'Last 30 days', range: { from: daysAgo(today, 29), to: today } },
    {
      label: 'Month to date',
      range: { from: new Date(today.getFullYear(), today.getMonth(), 1), to: today },
    },
  ];
  const [month, setMonth] = useState(today);
  const [date, setDate] = useState<Range | undefined>(presets[2]?.range);

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button className="group/pick-date w-60 justify-between" id={id} variant="outline">
            <span className={cn('truncate', date && 'text-muted-foreground')}>
              {date?.from
                ? date.to
                  ? `${fmt(date.from)} - ${fmt(date.to)}`
                  : fmt(date.from)
                : 'Pick a date range'}
            </span>
            <CalendarIcon
              aria-hidden="true"
              className="shrink-0 text-muted-foreground/80 transition-colors group-hover:text-foreground"
            />
          </Button>
        }
      />
      <PopoverContent align="start" className="w-auto p-0">
        <Card className="p-0">
          <CardContent className="p-0">
            <div className="flex max-sm:flex-col">
              <div className="relative py-4 max-sm:order-1 max-sm:border-t sm:w-32">
                <div className="h-full sm:border-e">
                  <div className="flex flex-col px-2">
                    {presets.map((p) => (
                      <Button
                        key={p.label}
                        className="w-full justify-start"
                        onClick={() => {
                          setDate(p.range);
                          setMonth(p.range.to);
                        }}
                        size="sm"
                        variant="ghost"
                      >
                        {p.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
              <Calendar
                disabled={[{ after: today }]}
                mode="range"
                month={month}
                onMonthChange={setMonth}
                onSelect={(next) => {
                  if (next) setDate(next);
                }}
                selected={date}
              />
            </div>
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
}
