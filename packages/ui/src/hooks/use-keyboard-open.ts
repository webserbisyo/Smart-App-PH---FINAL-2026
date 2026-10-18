import { useSyncExternalStore } from 'react';

const KEYBOARD_THRESHOLD_PX = 150;

function getSnapshot(): boolean {
  if (typeof window === 'undefined') return false;
  const vv = window.visualViewport;
  if (!vv) return false;
  return window.innerHeight - vv.height > KEYBOARD_THRESHOLD_PX;
}

function getServerSnapshot(): boolean {
  return false;
}

function subscribe(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const vv = window.visualViewport;
  if (!vv) return () => {};

  vv.addEventListener('resize', callback);
  vv.addEventListener('scroll', callback);

  return () => {
    vv.removeEventListener('resize', callback);
    vv.removeEventListener('scroll', callback);
  };
}

export function useKeyboardOpen(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
