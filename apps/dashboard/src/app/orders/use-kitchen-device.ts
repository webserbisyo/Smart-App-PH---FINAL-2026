import * as React from 'react';
import { pruneKitchenChecks, toggleKitchenCheck, type KitchenChecks } from '@smartapp/core';
import { getDeviceStorage, useDeviceEntry, type KitchenTheme } from '@smartapp/data';

const NO_CHECKS: KitchenChecks = {};
const KITCHEN_THEME_SCOPE = 'all';

/** The cook's line ticks, kept on this device only (never sent), dropped once an order leaves the wall. */
export function useKitchenChecks(slug: string, openIds: ReadonlySet<string> | null) {
  const entry = getDeviceStorage().kitchenChecks;
  const { value } = useDeviceEntry(entry, slug);
  const checks = value ?? NO_CHECKS;

  const toggle = React.useCallback(
    (orderId: string, line: number) => {
      entry.write(slug, toggleKitchenCheck(entry.read(slug).value ?? {}, orderId, line));
    },
    [entry, slug],
  );

  React.useEffect(() => {
    if (!openIds) return;
    const current = entry.read(slug).value;
    if (!current) return;
    const kept = pruneKitchenChecks(current, openIds);
    if (Object.keys(kept).length !== Object.keys(current).length) entry.write(slug, kept);
  }, [entry, slug, openIds]);

  return { checks, toggle };
}

/** Kitchen view is dark by default; the light switch is remembered on this device. */
export function useKitchenTheme(): [KitchenTheme, (theme: KitchenTheme) => void] {
  const entry = getDeviceStorage().kitchenTheme;
  const { value } = useDeviceEntry(entry, KITCHEN_THEME_SCOPE);
  const setTheme = React.useCallback(
    (theme: KitchenTheme) => entry.write(KITCHEN_THEME_SCOPE, theme),
    [entry],
  );
  return [value ?? 'dark', setTheme];
}

/** Puts the dashboard's dark tokens on the page while mounted, and restores what was there after. */
export function useDarkPage(dark: boolean) {
  React.useEffect(() => {
    const root = document.documentElement;
    const had = root.classList.contains('dark');
    root.classList.toggle('dark', dark);
    return () => {
      root.classList.toggle('dark', had);
    };
  }, [dark]);
}

/**
 * Keeps the screen on (Screen Wake Lock) while the view is open, asking again whenever it becomes
 * visible (browsers drop the lock when the tab hides). `refused` is true when the browser said no or
 * has no wake lock.
 */
export function useWakeLock(): { refused: boolean } {
  const [refused, setRefused] = React.useState(false);

  React.useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    let active = true;

    const request = async () => {
      if (document.visibilityState !== 'visible') return;
      if (!('wakeLock' in navigator)) {
        setRefused(true);
        return;
      }
      try {
        const sentinel = await navigator.wakeLock.request('screen');
        if (active) lock = sentinel;
        else void sentinel.release();
      } catch {
        if (active) setRefused(true);
      }
    };

    void request();
    const onVisible = () => {
      if (document.visibilityState === 'visible') void request();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      active = false;
      document.removeEventListener('visibilitychange', onVisible);
      void lock?.release();
    };
  }, []);

  return { refused };
}
