'use client';

import { useCallback, useSyncExternalStore } from 'react';

// How many of the shop's answers this phone has seen in an order's chat (T81), so the chat head shows a
// dot for a new one. Kept per order token in this browser only; a blocked storage just means no dot.
const listeners = new Set<() => void>();

function keyOf(token: string): string {
  return `smartapp:chat-seen:${token}`;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener('storage', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
}

function read(token: string): number {
  try {
    const value = Number(window.localStorage.getItem(keyOf(token)) ?? '0');
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

/** The answers seen so far (null on the server and the first paint), and a way to mark them seen. */
export function useChatSeen(token: string): [number | null, (count: number) => void] {
  const seen = useSyncExternalStore(
    subscribe,
    () => read(token),
    () => null,
  );
  const markSeen = useCallback(
    (count: number) => {
      if (read(token) === count) return;
      try {
        window.localStorage.setItem(keyOf(token), String(count));
      } catch {
        // Storage blocked (private window): the dot simply comes back next visit.
      }
      for (const listener of listeners) listener();
    },
    [token],
  );
  return [seen, markSeen];
}
