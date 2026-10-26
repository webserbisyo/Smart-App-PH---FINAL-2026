'use client';

import { CalendarOffIcon } from 'lucide-react';
import { manilaDate, upcomingClosures, weekHours, words, type Storefront } from '@smartapp/core';
import { useNow } from '@smartapp/data';
import { Badge } from '@smartapp/ui/components/reui/badge';
import { InfoList } from '@smartapp/ui/compositions/info-list';
import { cn } from '@smartapp/ui/lib/utils';

const W = words.storefrontShell.info;

// Monday to Sunday, one row each (decision R26): today tinted with a Today badge once the clock is
// known, a closed day says so in muted text, a lunch break shows two lines, then upcoming closures.
export function HoursList({
  storefront,
  className,
}: {
  storefront: Pick<Storefront, 'hours' | 'closures'>;
  className?: string | undefined;
}) {
  const now = useNow();
  const today = now ? manilaDate(now) : null;
  const closures = today ? upcomingClosures(storefront.closures, today) : [];
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <InfoList
        rows={weekHours(storefront, today).map((row) => {
          const closed = row.lines.length === 0 || row.closedFor !== null;
          return {
            id: String(row.day),
            label: row.name,
            badge: row.isToday ? (
              <Badge variant="primary-light" size="sm" radius="full">
                {W.today}
              </Badge>
            ) : null,
            highlight: row.isToday,
            value: closed ? (
              <span className="text-muted-foreground">{row.closedFor ?? W.closedAllDay}</span>
            ) : (
              <span className="flex flex-col items-end gap-0.5">
                {row.lines.map((line) => (
                  <span key={line}>{line}</span>
                ))}
              </span>
            ),
          };
        })}
      />
      {closures.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {W.specialDays}
          </p>
          <ul className="flex flex-col gap-1.5 text-sm">
            {closures.map((line) => (
              <li key={line} className="flex items-center gap-2">
                <CalendarOffIcon aria-hidden="true" className="size-4 shrink-0 text-warning-text" />
                {line}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
