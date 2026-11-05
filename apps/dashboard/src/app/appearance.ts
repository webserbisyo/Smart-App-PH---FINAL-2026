import { useSyncExternalStore } from 'react';
import { AppearanceEnum, type Appearance } from '@smartapp/core';

// Light, Dark or System for the dashboard, saved on this phone or computer (decision T64). Light until
// the owner picks, so nothing changes by surprise. index.html sets the class before the first paint.
const KEY = 'smartapp.dashboard.appearance';
const listeners = new Set<() => void>();

function read(): Appearance {
  try {
    const parsed = AppearanceEnum.safeParse(window.localStorage.getItem(KEY));
    return parsed.success ? parsed.data : 'light';
  } catch {
    return 'light';
  }
}

const darkQuery = (): MediaQueryList | null =>
  typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null;

/** Puts the dark class on <html> for the saved choice (System follows the phone). */
export function applyAppearance(appearance: Appearance = read()): void {
  const dark = appearance === 'dark' || (appearance === 'system' && darkQuery()?.matches === true);
  document.documentElement.classList.toggle('dark', dark);
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', dark ? '#040f2e' : '#f9fafd');
}

export function setAppearance(appearance: Appearance): void {
  try {
    window.localStorage.setItem(KEY, appearance);
  } catch {
    // Private mode: the choice lasts until the page closes.
  }
  applyAppearance(appearance);
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const query = darkQuery();
  const onChange = () => applyAppearance();
  query?.addEventListener('change', onChange);
  return () => {
    listeners.delete(listener);
    query?.removeEventListener('change', onChange);
  };
}

export function useAppearance(): Appearance {
  return useSyncExternalStore(subscribe, read, () => 'light');
}
