import { useSyncExternalStore } from 'react';

const GAP_PX = 12;
const DEFAULT_PX = 24;

function measure(): number {
  const dock = document.querySelector('[data-slot="bottom-dock"]');
  if (!dock) return DEFAULT_PX;
  return Math.round(window.innerHeight - dock.getBoundingClientRect().top + GAP_PX);
}

function subscribe(callback: () => void): () => void {
  window.addEventListener('resize', callback);
  return () => window.removeEventListener('resize', callback);
}

/**
 * Pixels from the bottom of the screen that a floating bar (DiceUI Action Bar, which takes a number)
 * needs so it sits above the phone dock instead of on top of it.
 */
export function useDockClearance(): number {
  return useSyncExternalStore(subscribe, measure, () => DEFAULT_PX);
}
