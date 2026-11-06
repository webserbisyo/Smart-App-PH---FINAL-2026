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
