'use client';

import { openState, openStateText } from '@smartapp/core';
import { useNow } from '@smartapp/data';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { Status, StatusIndicator, StatusLabel } from '@smartapp/ui/components/status';
import { useShop } from './shop-context';

// "Open until 9 PM", "Closed · Opens 5 AM", "Busy · back 3:40 PM": status dot, word and colour.
export function OpenState() {
  const { shop } = useShop();
  const now = useNow();
  if (!now) return <Skeleton className="h-6 w-28 rounded-full" />;
  const state = openState(shop.storefront, now);
  const variant = state.paused
    ? 'default'
    : state.state === 'open'
      ? 'success'
      : state.state === 'busy'
        ? 'warning'
        : 'default';
  return (
    <Status variant={variant} className="max-w-full">
      <StatusIndicator />
      <StatusLabel className="truncate">{openStateText(state, now)}</StatusLabel>
    </Status>
  );
}
