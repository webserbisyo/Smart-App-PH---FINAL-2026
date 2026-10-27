'use client';

import { openState, openStateText, words } from '@smartapp/core';
import { useNow } from '@smartapp/data';
import { cn } from '@smartapp/ui/lib/utils';
import { useShop } from '../../shell/components/shop-context';

const CHIP_CLASS =
  'glass inline-flex max-w-full min-w-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm';

const DOT_CLASS = {
  open: 'bg-success',
  busy: 'bg-warning',
  closed: 'bg-muted-foreground',
} as const;

// Two glass chips over the hero: the open state in words (dot, word and colour) and "Demo shop". They wrap
// inside the banner's edges on a narrow phone and never spill past it (decision R52).
export function HeroChips({ demo }: { demo: boolean }) {
  const { shop } = useShop();
  const now = useNow();
  const state = now ? openState(shop.storefront, now) : null;
  const kind = state ? (state.paused ? 'closed' : state.state) : null;
  if (!state || !now || !kind) {
    return demo ? (
      <div className="pointer-events-none absolute inset-x-3 top-3 flex flex-wrap gap-2">
        <span className={CHIP_CLASS}>{words.storefrontShell.home.demoChip}</span>
      </div>
    ) : null;
  }
  return (
    <div className="pointer-events-none absolute inset-x-3 top-3 flex flex-wrap gap-2">
      <span className={CHIP_CLASS} role="status">
        <span aria-hidden="true" className={cn('size-2 shrink-0 rounded-full', DOT_CLASS[kind])} />
        <span className="truncate">{openStateText(state, now)}</span>
      </span>
      {demo ? <span className={CHIP_CLASS}>{words.storefrontShell.home.demoChip}</span> : null}
    </div>
  );
}
