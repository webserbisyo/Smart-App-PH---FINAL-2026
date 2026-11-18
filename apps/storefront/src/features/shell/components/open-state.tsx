'use client';

import { openState, openStateText } from '@smartapp/core';
import { useNow } from '@smartapp/data';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { Status, StatusIndicator, StatusLabel } from '@smartapp/ui/components/status';
import { cn } from '@smartapp/ui/lib/utils';
import { useShop } from './shop-context';

// Token colours, not the installed Status variants (they ship raw green and orange; decision T99). The dot
// takes `!` because the installed variant colours it from the parent.
const TONES = {
  open: { chip: 'border-success/30 bg-success-soft text-success-text', dot: 'bg-success!' },
  busy: { chip: 'border-warning/40 bg-warning-soft text-warning-text', dot: 'bg-warning!' },
  idle: { chip: 'border-transparent bg-muted text-muted-foreground', dot: 'bg-muted-foreground!' },
} as const;

// "Open until 9 PM", "Closed · Opens 5 AM", "Busy · back 3:40 PM": status dot, word and colour.
export function OpenState() {
  const { shop } = useShop();
  const now = useNow();
  if (!now) return <Skeleton className="h-6 w-28 rounded-full" />;
  const state = openState(shop.storefront, now);
  const tone = state.paused
    ? TONES.idle
    : state.state === 'open'
      ? TONES.open
      : state.state === 'busy'
        ? TONES.busy
        : TONES.idle;
  return (
    <Status className={cn('max-w-full', tone.chip)}>
      <StatusIndicator className={tone.dot} />
      <StatusLabel className="truncate">{openStateText(state, now)}</StatusLabel>
    </Status>
  );
}
