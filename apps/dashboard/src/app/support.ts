// Help mode (decision T91): the founder opens a shop as its owner for 60 minutes. The session lives in this
// tab only (sessionStorage), so closing the tab ends it; NestJS holds the real one and logs every change.
import { useSyncExternalStore } from 'react';
import { SupportSessionSchema, type SupportSession } from '@smartapp/core';
import { setMockSupportSession } from '@smartapp/data';

const KEY = 'smartapp.support';
const listeners = new Set<() => void>();
let cached: { raw: string | null; session: SupportSession | null } = { raw: null, session: null };

function readRaw(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function read(): SupportSession | null {
  const raw = readRaw();
  if (raw === cached.raw) return cached.session;
  let session: SupportSession | null = null;
  if (raw) {
    try {
      const parsed = SupportSessionSchema.safeParse(JSON.parse(raw));
      session = parsed.success ? parsed.data : null;
    } catch {
      session = null;
    }
  }
  cached = { raw, session };
  return session;
}

/** The live help session, or null once it has ended or run out. */
export function currentSupport(now = Date.now()): SupportSession | null {
  const session = read();
  if (!session) return null;
  if (new Date(session.endsAt).getTime() <= now) {
    clearSupport();
    return null;
  }
  return session;
}

export function saveSupport(session: SupportSession): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    // Private mode: the session still works until the page reloads.
  }
  cached = { raw: JSON.stringify(session), session };
  setMockSupportSession(session);
  for (const l of listeners) l();
}

export function clearSupport(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // nothing kept
  }
  cached = { raw: null, session: null };
  setMockSupportSession(null);
  for (const l of listeners) l();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The help session for screens: the banner, and the locks on password, plan payments and deleting. */
export function useSupport(): SupportSession | null {
  return useSyncExternalStore(subscribe, read, () => null);
}
