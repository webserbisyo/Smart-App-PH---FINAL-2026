'use client';

import { useEffect, useRef, useState, useSyncExternalStore, type RefCallback } from 'react';
import {
  CircularProgress,
  CircularProgressIndicator,
  CircularProgressRange,
  CircularProgressTrack,
} from '@smartapp/ui/components/circular-progress';
import { cssVars, setCssVars } from '@smartapp/ui/lib/css-vars';
import { ArrowDownIcon } from 'lucide-react';

/*
 * Pull to refresh, hand-written on the founder's yes (decision R46) and copied from Ionic's ion-refresher:
 * at the top of the page a downward drag pulls the page with resistance, a ring fills as it goes, past the
 * line the arrow turns, letting go there refreshes and holds the page open on a spinning ring, then it
 * glides back. A sideways first move belongs to carousels and chip rows, so it never starts a pull.
 */

/** Ionic's pullMin is 60: past this much page travel, letting go refreshes. */
export const PULL_LINE = 64;
// The page never travels further than this, however far the finger goes.
const PULL_MAX = 140;
const PULL_GIVE = 0.8;
const RING = 32;
// The ring spins at least this long so a fast refresh is still seen, and at most this long if the
// network stalls.
const MIN_SPIN_MS = 600;
const MAX_SPIN_MS = 8000;
// Matches --duration-slow, the glide back.
const SETTLE_MS = 300;

type PullPhase = 'idle' | 'pulling' | 'refreshing' | 'settling';

interface PullView {
  readonly phase: PullPhase;
  readonly travel: number;
}

export interface PullStore {
  readonly get: () => PullView;
  readonly subscribe: (listener: () => void) => () => void;
  readonly set: (view: PullView) => void;
}

const IDLE: PullView = { phase: 'idle', travel: 0 };

function createPullStore(): PullStore {
  let view = IDLE;
  const listeners = new Set<() => void>();
  return {
    get: () => view,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    set(next) {
      view = next;
      for (const listener of listeners) listener();
    },
  };
}

// Rubber band: close to the finger at first, then ever stiffer towards PULL_MAX.
function resist(distance: number): number {
  return PULL_MAX * (1 - 1 / ((distance * PULL_GIVE) / PULL_MAX + 1));
}

/**
 * Wires pull to refresh onto the page element (`ref`). The page moves through the --pull variable and a
 * data-pull attribute, set straight on the element so a drag never re-renders the shell; the ring reads
 * the same moves from `store`. Touch screens only.
 */
export function usePullToRefresh(
  onRefresh: () => Promise<unknown>,
  enabled: boolean,
): { ref: RefCallback<HTMLElement>; store: PullStore } {
  const [store] = useState(createPullStore);
  const [node, setNode] = useState<HTMLElement | null>(null);
  const refresh = useRef(onRefresh);
  useEffect(() => {
    refresh.current = onRefresh;
  });

  useEffect(() => {
    if (!node || !enabled) return;
    const page = node;
    const touch = window.matchMedia('(pointer: coarse)');
    const timers = new Set<ReturnType<typeof setTimeout>>();
    let alive = true;
    let busy = false;
    let mode: 'none' | 'maybe' | 'pull' = 'none';
    let startX = 0;
    let startY = 0;
    let travel = 0;

    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        const id = setTimeout(() => {
          timers.delete(id);
          resolve();
        }, ms);
        timers.add(id);
      });

    const show = (phase: PullPhase, next: number) => {
      travel = next;
      if (phase === 'idle') delete page.dataset.pull;
      else page.dataset.pull = phase;
      setCssVars(page, { '--pull': `${next}px` });
      store.set(phase === 'idle' ? IDLE : { phase, travel: next });
    };

    const settle = () => {
      show('settling', 0);
      void wait(SETTLE_MS).then(() => {
        busy = false;
        show('idle', 0);
      });
    };

    const onStart = (event: TouchEvent) => {
      const point = event.touches[0];
      mode = 'none';
      if (busy || !point || event.touches.length !== 1 || window.scrollY > 0 || !touch.matches)
        return;
      startX = point.clientX;
      startY = point.clientY;
      mode = 'maybe';
    };

    const onMove = (event: TouchEvent) => {
      const point = event.touches[0];
      if (mode === 'none' || !point) return;
      const dx = point.clientX - startX;
      const dy = point.clientY - startY;
      if (mode === 'maybe') {
        if (dx === 0 && dy === 0) return;
        // iPhone decides on the first move whether a touch scrolls, so this one decides too.
        if (dy <= 0 || Math.abs(dx) > dy || window.scrollY > 0) {
          mode = 'none';
          return;
        }
        mode = 'pull';
      }
      // Stops the browser's own bounce and its full-page reload.
      if (event.cancelable) event.preventDefault();
      show('pulling', resist(Math.max(0, dy)));
    };

    const onEnd = () => {
      if (mode !== 'pull') {
        mode = 'none';
        return;
      }
      mode = 'none';
      busy = true;
      // Offline there is nothing to fetch; the offline banner already says so.
      if (travel < PULL_LINE || !navigator.onLine) {
        settle();
        return;
      }
      show('refreshing', PULL_LINE);
      const work = Promise.resolve()
        .then(() => refresh.current())
        .catch(() => undefined);
      void Promise.race([Promise.all([work, wait(MIN_SPIN_MS)]), wait(MAX_SPIN_MS)]).then(() => {
        if (alive) settle();
      });
    };

    page.addEventListener('touchstart', onStart, { passive: true });
    page.addEventListener('touchmove', onMove, { passive: false });
    page.addEventListener('touchend', onEnd);
    page.addEventListener('touchcancel', onEnd);
    return () => {
      alive = false;
      page.removeEventListener('touchstart', onStart);
      page.removeEventListener('touchmove', onMove);
      page.removeEventListener('touchend', onEnd);
      page.removeEventListener('touchcancel', onEnd);
      for (const id of timers) clearTimeout(id);
      delete page.dataset.pull;
      page.style.removeProperty('--pull');
      store.set(IDLE);
    };
  }, [node, enabled, store]);

  return { ref: setNode, store };
}

/**
 * The ring in the gap the pull opens (our installed DiceUI circular progress): it fills as the page comes
 * down, the arrow turns once letting go would refresh, and it spins while the shop reloads. Sits between
 * the top bar and the page, under the bar.
 */
export function PullRing({ store }: { store: PullStore }) {
  const view = useSyncExternalStore(store.subscribe, store.get, store.get);
  if (view.phase === 'idle') return null;

  const progress = Math.min(view.travel / PULL_LINE, 1);
  const refreshing = view.phase === 'refreshing';
  const armed = refreshing || (view.phase === 'pulling' && progress >= 1);
  // Centred in the gap above the page (the page starts 16 px below its top edge).
  const y = view.travel / 2 - 8;
  const shown = view.phase === 'settling' ? 0 : Math.max(progress, 0.2);

  return (
    <div aria-hidden="true" className="relative h-0">
      <div
        data-phase={view.phase}
        className="absolute inset-x-0 top-0 flex pull-ring justify-center"
        style={cssVars({
          '--pull-y': `${y}px`,
          '--pull-scale': view.phase === 'settling' ? 0.6 : 0.6 + 0.4 * progress,
          '--pull-fade': shown,
        })}
      >
        <CircularProgress
          value={refreshing ? null : Math.round(progress * 100)}
          size={RING}
          thickness={3}
          className="rounded-full bg-card shadow-md ring-1 ring-foreground/8"
        >
          <CircularProgressIndicator>
            <CircularProgressTrack className="text-transparent" />
            <CircularProgressRange
              className={view.phase === 'pulling' ? 'transition-none' : undefined}
            />
          </CircularProgressIndicator>
          {refreshing ? null : (
            <ArrowDownIcon
              data-armed={armed ? '' : undefined}
              className="absolute size-3.5 text-primary transition-transform duration-base data-armed:rotate-180"
            />
          )}
        </CircularProgress>
      </div>
    </div>
  );
}
