import { useNavigate, useSearch } from '@tanstack/react-router';
import { useCallback } from 'react';
import { z } from 'zod';
import { HomeRangeEnum, type HomeRange } from '@smartapp/core';

// Home's address (T69): which trend range shows. `/insights?range=` lands here too.
export const HomeSearchSchema = z.object({
  range: HomeRangeEnum.optional().catch(undefined),
});
export type HomeSearch = z.infer<typeof HomeSearchSchema>;

export function useHomeRange(): HomeRange {
  const search = useSearch({ strict: false });
  return HomeSearchSchema.parse({ range: search.range }).range ?? '7d';
}

export function useSetHomeRange(): (range: HomeRange) => void {
  const navigate = useNavigate();
  return useCallback(
    (range: HomeRange) =>
      void navigate({
        to: '/',
        search: { range: range === '7d' ? undefined : range },
        replace: true,
        resetScroll: false,
      }),
    [navigate],
  );
}
