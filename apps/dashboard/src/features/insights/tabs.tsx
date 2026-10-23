import { Link, useSearch } from '@tanstack/react-router';
import { z } from 'zod';
import { words } from '@smartapp/core';
import type { NavItem } from '@smartapp/ui/lib/nav';

export const INSIGHT_RANGES = ['7d', '30d'] as const;
export const InsightsSearchSchema = z.object({
  range: z.enum(INSIGHT_RANGES).optional().catch(undefined),
});

// 7 days (default) and 30 days, kept in ?range so the URL decides.
export function useInsightsTabs(): NavItem[] {
  const { range } = useSearch({ strict: false });
  return [
    {
      id: '7d',
      label: words.screens.insights.tab7d,
      icon: null,
      link: (
        <Link
          to="/insights"
          search={{ range: '7d' }}
          activeOptions={{ exact: true, includeSearch: true }}
        />
      ),
      active: range !== '30d',
    },
    {
      id: '30d',
      label: words.screens.insights.tab30d,
      icon: null,
      link: (
        <Link
          to="/insights"
          search={{ range: '30d' }}
          activeOptions={{ exact: true, includeSearch: true }}
        />
      ),
      active: range === '30d',
    },
  ];
}
