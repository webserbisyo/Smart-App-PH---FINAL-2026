'use client';

import { CalendarOffIcon } from 'lucide-react';
import {
  groupedHours,
  manilaDate,
  manilaParts,
  upcomingClosures,
  type Storefront,
} from '@smartapp/core';
import { useNow } from '@smartapp/data';
import { InfoList } from '@smartapp/ui/compositions/info-list';

// Grouped hours ("Mon to Thu 11 AM to 10 PM", decision R9), today's group highlighted once the clock
// is known, then upcoming closures.
export function HoursList({ storefront }: { storefront: Pick<Storefront, 'hours' | 'closures'> }) {
  const now = useNow();
  const today = now ? manilaParts(now).weekday : null;
  const closures = now ? upcomingClosures(storefront.closures, manilaDate(now)) : [];
  return (
    <div className="flex flex-col gap-2">
      <InfoList
        rows={groupedHours(storefront.hours).map((group) => ({
          id: group.label,
          label: group.label,
          value: group.hours,
          highlight: today !== null && group.days.some((day) => day === today),
        }))}
      />
      {closures.length > 0 ? (
        <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
          {closures.map((line) => (
            <li key={line} className="flex items-center gap-2">
              <CalendarOffIcon aria-hidden="true" className="size-4 shrink-0" />
              {line}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
