import { useNavigate, useSearch } from '@tanstack/react-router';
import { useCallback } from 'react';
import { z } from 'zod';
import {
  HomePeriodEnum,
  IsoDateSchema,
  periodDates,
  type HomePeriod,
  type PeriodDates,
} from '@smartapp/core';

// Home's address (T83): which period Sales, the money split and best sellers show. Picked dates ride in
// `from` and `to`; a quick pick needs only its name. `/insights?range=30d` lands here as the last 30 days.
export const HomeSearchSchema = z.object({
  period: HomePeriodEnum.optional().catch(undefined),
  from: IsoDateSchema.optional().catch(undefined),
  to: IsoDateSchema.optional().catch(undefined),
});
export type HomeSearch = z.infer<typeof HomeSearchSchema>;

export interface HomePeriodPick {
  period: HomePeriod;
  dates: PeriodDates;
}

/** The period in the address, as dates inside Home's 60 days; Today when there is none. */
export function useHomePeriodSearch(today: string): HomePeriodPick {
  const search = HomeSearchSchema.parse(useSearch({ strict: false }));
  const period = search.period ?? 'today';
  const custom = search.from ? { from: search.from, to: search.to ?? search.from } : undefined;
  return { period, dates: periodDates(period, today, custom) };
}

export function useSetHomePeriod(): (period: HomePeriod, dates?: PeriodDates) => void {
  const navigate = useNavigate();
  return useCallback(
    (period: HomePeriod, dates?: PeriodDates) =>
      void navigate({
        to: '/',
        search: {
          period: period === 'today' ? undefined : period,
          from: period === 'custom' ? dates?.from : undefined,
          to: period === 'custom' ? dates?.to : undefined,
        },
        replace: true,
        resetScroll: false,
      }),
    [navigate],
  );
}
