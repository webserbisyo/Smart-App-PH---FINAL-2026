import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { HomeRange } from '@smartapp/core';
import { useAdapters } from '../../adapters/index';
import { ownerHomeQk } from './qk';

// Home follows the board: the same 15 s as the open orders, and again when the owner comes back to the tab.
export const HOME_REFRESH_MS = 15_000;
// The 7 or 30 days change slowly; 5 minutes is fresh enough.
export const HOME_TRENDS_STALE_MS = 5 * 60_000;

export function useHome() {
  const { ownerHome } = useAdapters();
  return useQuery({
    queryKey: ownerHomeQk.summary(),
    queryFn: () => ownerHome.getHome(),
    refetchInterval: HOME_REFRESH_MS,
    refetchOnWindowFocus: true,
  });
}

export function useHomeTrends(range: HomeRange) {
  const { ownerHome } = useAdapters();
  return useQuery({
    queryKey: ownerHomeQk.trends(range),
    queryFn: () => ownerHome.getHomeTrends({ range }),
    staleTime: HOME_TRENDS_STALE_MS,
    placeholderData: keepPreviousData,
  });
}

/**
 * One period from the Home period picker (T83). Today keeps the board's 15 s refresh; past periods
 * change only when an order is changed late, so 5 minutes is fresh enough. The last period stays on
 * screen while the next one loads, so the cards never jump.
 */
export function useHomePeriod(dates: { from: string; to: string }, today: string) {
  const { ownerHome } = useAdapters();
  const live = dates.to >= today;
  return useQuery({
    queryKey: ownerHomeQk.period(dates.from, dates.to),
    queryFn: () => ownerHome.getHomePeriod(dates),
    staleTime: live ? 0 : HOME_TRENDS_STALE_MS,
    refetchInterval: live ? HOME_REFRESH_MS : false,
    refetchOnWindowFocus: live,
    placeholderData: keepPreviousData,
  });
}
