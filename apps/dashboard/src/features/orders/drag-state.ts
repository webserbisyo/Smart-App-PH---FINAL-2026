import { useSyncExternalStore } from 'react';

// Whether an order card is being dragged on the Board or the Calendar (T95): the chat button steps out of
// the way so it never covers a drop target such as "Drop here to finish".
let dragging = false;
const listeners = new Set<() => void>();

export function setCardDragging(next: boolean): void {
  if (dragging === next) return;
  dragging = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useCardDragging(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => dragging,
    () => false,
  );
}
