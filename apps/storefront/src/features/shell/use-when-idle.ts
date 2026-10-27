'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';

// Safari has no requestIdleCallback: a short wait after load stands in.
const FALLBACK_MS = 1500;

/**
 * True once the phone is idle after the page starts, or as soon as `now()` is called (a tap or a hover on
 * the part). Parts that are not needed for the first paint load then, so they stay out of the page's
 * first JavaScript (decision T31's budget).
 */
export function useWhenIdle(enabled = true): [boolean, () => void] {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (ready || !enabled) return;
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(() => setReady(true), { timeout: 4000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = setTimeout(() => setReady(true), FALLBACK_MS);
    return () => clearTimeout(id);
  }, [ready, enabled]);

  return [ready, () => setReady(true)];
}

/** A menu or dialog that loads later, and the light button that stands in for its trigger meanwhile. */
export interface LaterPart {
  readonly loaded: boolean;
  // The stand-in was tapped before the part had loaded: the part opens as soon as it arrives.
  readonly openNow: boolean;
  // The stand-in had keyboard focus when the part replaced it: the part's own button takes it.
  readonly focused: boolean;
  // Spread on the stand-in: hover, focus or a tap loads the part at once.
  readonly standIn: {
    readonly onPointerEnter: () => void;
    readonly onFocus: () => void;
    readonly onBlur: () => void;
    readonly onClick: () => void;
  };
}

/** Loads a menu or dialog when the page is idle or its stand-in is touched (decision R49). */
export function useLaterPart(enabled = true): LaterPart {
  const [loaded, load] = useWhenIdle(enabled);
  const [openNow, setOpenNow] = useState(false);
  const [focused, setFocused] = useState(false);
  return {
    loaded,
    openNow,
    focused,
    standIn: {
      onPointerEnter: load,
      onFocus: () => {
        setFocused(true);
        load();
      },
      onBlur: () => setFocused(false),
      onClick: () => {
        setOpenNow(true);
        load();
      },
    },
  };
}

/** For the loaded part's own button: takes focus once if the stand-in had it (see `useLaterPart`). */
export function useFocusOnArrival<T extends HTMLElement>(focused: boolean): RefObject<T | null> {
  const ref = useRef<T>(null);
  const takeFocus = useRef(focused);
  useEffect(() => {
    if (takeFocus.current) ref.current?.focus();
  }, []);
  return ref;
}
