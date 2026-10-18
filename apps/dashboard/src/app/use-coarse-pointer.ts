import { useSyncExternalStore } from 'react';

const QUERY = '(pointer: coarse)';

function subscribe(callback: () => void): () => void {
  const query = window.matchMedia(QUERY);
  query.addEventListener('change', callback);
  return () => query.removeEventListener('change', callback);
}

// True on touch devices: the tablet rail then widens for 44 px targets.
export function useCoarsePointer(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
