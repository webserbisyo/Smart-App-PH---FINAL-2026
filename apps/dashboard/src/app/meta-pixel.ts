// Meta Pixel and ad attribution for the sign-up page (decision T90). The pixel loads only on /signup and
// only when VITE_META_PIXEL_ID is set; every browser event also goes to NestJS with the same event id, so
// Meta counts it once even when an ad blocker stops the pixel. Nothing here is a secret.
import {
  fbcFromClick,
  metaEventId,
  signupSourceOf,
  type BrowserTrackEvent,
  type SignupSource,
} from '@smartapp/core';
import { env } from './env.js';

type Fbq = ((...args: unknown[]) => void) & {
  callMethod?: ((...args: unknown[]) => void) | undefined;
  queue: unknown[][];
  push?: Fbq | undefined;
  loaded: boolean;
  version: string;
};

declare global {
  interface Window {
    fbq?: Fbq | undefined;
    _fbq?: Fbq | undefined;
  }
}

const KEY = 'smartapp.attribution';
// Meta keeps a click for 90 days; so do we.
const KEEP_MS = 90 * 86_400_000;

export interface Attribution {
  source: SignupSource;
  fbc: string | null;
}

interface Stored {
  source: SignupSource;
  fbclid: string | null;
  firstSeenMs: number;
}

function readStored(): Stored | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (typeof value !== 'object' || value === null) return null;
    const source = 'source' in value ? value.source : null;
    const fbclid = 'fbclid' in value && typeof value.fbclid === 'string' ? value.fbclid : null;
    const firstSeenMs =
      'firstSeenMs' in value && typeof value.firstSeenMs === 'number' ? value.firstSeenMs : 0;
    if (typeof source !== 'object' || source === null || !('channel' in source)) return null;
    const channel = source.channel;
    const campaign =
      'campaign' in source && typeof source.campaign === 'string' ? source.campaign : null;
    if (channel !== 'facebook_ad' && channel !== 'link' && channel !== 'direct') return null;
    return { source: { channel, campaign }, fbclid, firstSeenMs };
  } catch {
    return null;
  }
}

/**
 * Where this visitor came from. A new ad click replaces the old one and keeps the time it was FIRST seen
 * (Meta's fbc rule); a plain visit keeps the last ad for 90 days.
 */
export function captureAttribution(search: string, now = Date.now()): Attribution {
  const params = new URLSearchParams(search);
  const fresh = signupSourceOf(params);
  const fbclid = params.get('fbclid');
  const stored = readStored();
  let next: Stored;
  if (fbclid && stored?.fbclid === fbclid) next = stored;
  else if (fbclid) next = { source: fresh, fbclid, firstSeenMs: now };
  else if (fresh.channel !== 'direct') next = { source: fresh, fbclid: null, firstSeenMs: now };
  else if (stored && now - stored.firstSeenMs < KEEP_MS) next = stored;
  else next = { source: fresh, fbclid: null, firstSeenMs: now };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Private mode: this visit still counts.
  }
  return {
    source: next.source,
    fbc: next.fbclid ? fbcFromClick(next.fbclid, next.firstSeenMs) : null,
  };
}

/** The pixel's browser id (_fbp cookie), once the pixel has set it. */
export function readFbp(): string | null {
  const match = /(?:^|;\s*)_fbp=(fb\.\d\.\d{10,14}\.[\w-]+)/.exec(document.cookie);
  return match?.[1] ?? null;
}

let started = false;

/** Loads fbevents.js once (Meta's own snippet, written out) and counts the page view. */
export function startPixel(): boolean {
  const id = env.VITE_META_PIXEL_ID;
  if (!id) return false;
  if (started) return true;
  started = true;
  const queue: unknown[][] = [];
  const fbq: Fbq = Object.assign(
    (...args: unknown[]) => {
      if (fbq.callMethod) fbq.callMethod(...args);
      else fbq.queue.push(args);
    },
    { queue, loaded: true, version: '2.0', callMethod: undefined, push: undefined },
  );
  fbq.push = fbq;
  window.fbq = fbq;
  window._fbq = fbq;
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://connect.facebook.net/en_US/fbevents.js';
  document.head.append(script);
  fbq('init', id);
  return true;
}

/** A new event id for one step, shared by the pixel and the server. */
export function newEventId(name: BrowserTrackEvent): string {
  return metaEventId(name, crypto.randomUUID());
}

/** Tells the pixel (when it runs) about one step, with the id the server will also use. */
export function pixelTrack(name: BrowserTrackEvent, eventId: string): void {
  window.fbq?.('track', name, {}, { eventID: eventId });
}
