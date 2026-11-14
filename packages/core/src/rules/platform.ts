// Super Admin, sign-up and Meta tracking rules (decisions T88 to T92). Shared by the mock and NestJS, so the
// shapes Meta receives are tested once. Hashing (SHA-256) happens in NestJS; these only normalise.
import type { AdminFlag, ShopStage, SignupChannel, TrackEventName } from '../schemas/enums.js';
import type { OnboardingStep, SignupSource } from '../schemas/platform.js';
import { addDays, manilaDate } from './time.js';

const DAY = 86_400_000;

// ---------- Meta's customer information shapes (developers.facebook.com, read 2026-11-13) ----------

/** em: trimmed and lowercase. */
export function metaEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** ph: digits only with the country code and no leading zero, +639171234567 → 639171234567. */
export function metaPhone(e164: string): string {
  return e164.replace(/\D/g, '').replace(/^0+/, '');
}

/** fn / ln: lowercase letters, no punctuation (accents kept, Meta reads UTF-8). */
export function metaName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** First and last name from one full name: the last word is the last name. */
export function metaNameParts(fullName: string): { fn: string; ln: string | null } {
  const parts = metaName(fullName).split(' ').filter(Boolean);
  if (parts.length <= 1) return { fn: parts[0] ?? '', ln: null };
  return { fn: parts.slice(0, -1).join(' '), ln: parts.at(-1) ?? null };
}

/** ct: lowercase, no punctuation, no spaces ("Las Piñas" → "laspiñas"). */
export function metaCity(city: string): string {
  return city
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{M}]/gu, '');
}

/** country: always sent, 2-letter lowercase. */
export const META_COUNTRY = 'ph';

/**
 * fbc from an ad's fbclid: fb.1.<the time it was FIRST seen, in ms>.<fbclid as given>. Keeping the first time
 * (not "now" on every event) is what Meta asks for.
 */
export function fbcFromClick(fbclid: string, firstSeenMs: number): string {
  return `fb.1.${Math.floor(firstSeenMs)}.${fbclid}`;
}

/** The click id inside an fbc value (the part after the third dot). */
export function fbclidOf(fbc: string): string | null {
  const parts = fbc.split('.');
  return parts.length >= 4 ? parts.slice(3).join('.') : null;
}

// The event ids the browser and the server share, so Meta counts each step once (T90).
const EVENT_ID_PREFIX: Record<TrackEventName, string> = {
  PageView: 'pv',
  Lead: 'lead',
  CompleteRegistration: 'reg',
  SubmitApplication: 'apply',
  StartTrial: 'trial',
  AddPaymentInfo: 'pay',
  Subscribe: 'sub',
  Purchase: 'buy',
  Contact: 'contact',
};

export function metaEventId(name: TrackEventName, id: string): string {
  return `${EVENT_ID_PREFIX[name]}:${id}`;
}

/** Meta refuses a whole request when an event is older than 7 days, so the time never goes past that. */
export function metaEventTime(at: Date | string, now: Date): number {
  const ms = Math.min(new Date(at).getTime(), now.getTime());
  const oldest = now.getTime() - 7 * DAY + 60_000;
  return Math.floor(Math.max(ms, oldest) / 1000);
}

// ---------- where a sign-up came from ----------

/**
 * The ad from the sign-up link: utm_campaign (or utm_content) names it; fbclid or utm_source=facebook says it
 * came from Meta. A link without either is "link" when it has a campaign, otherwise "direct".
 */
export function signupSourceOf(search: URLSearchParams): SignupSource {
  const campaign =
    (search.get('utm_campaign') ?? search.get('utm_content') ?? '').trim().slice(0, 100) || null;
  const src = (search.get('utm_source') ?? '').toLowerCase();
  const fromMeta =
    search.has('fbclid') || ['facebook', 'fb', 'instagram', 'ig', 'meta'].includes(src);
  const channel: SignupChannel = fromMeta ? 'facebook_ad' : campaign ? 'link' : 'direct';
  return { channel, campaign };
}

/** 0917 555 0142 → "0917 ••• 0142" for the tracking log: enough to tell people apart, not to call them. */
export function maskPhone(e164: string): string {
  const m = /^\+63(9\d{2})\d{3}(\d{4})$/.exec(e164);
  return m ? `0${m[1]} ••• ${m[2]}` : '•••';
}

// ---------- plan money (T92) ----------

/** What a payment of 1, 3 or 6 months costs; with the bonus on, 6 months cost 5. */
export function planAmount(months: number, priceMonthly: number, sixMonthBonus: boolean): number {
  const paid = sixMonthBonus && months === 6 ? 5 : months;
  return paid * priceMonthly;
}

// ---------- shops ----------

export const GO_LIVE_STEPS = ['items', 'look', 'hours', 'payments'] as const;

export function setupDoneCount(steps: readonly OnboardingStep[]): number {
  return steps.filter((s) => s.done).length;
}

export function canAskToGoLive(stage: ShopStage, steps: readonly OnboardingStep[]): boolean {
  return stage === 'setting_up' && steps.every((s) => s.done);
}

export const STUCK_SETUP_DAYS = 3;
export const SHOP_QUIET_DAYS = 7;
export const STORAGE_HIGH_SHARE = 0.8;

/** Small warnings on a shop row (T88): stuck in setup 3 days, quiet 7 days, storage from 80%. */
export function adminFlags(
  shop: {
    stage: ShopStage;
    createdAt: string;
    lastActiveAt: string | null;
    storageUsedBytes: number;
    storageLimitBytes: number;
  },
  now: Date,
): AdminFlag[] {
  const flags: AdminFlag[] = [];
  const ageDays = (now.getTime() - new Date(shop.createdAt).getTime()) / DAY;
  if (shop.stage === 'setting_up' && ageDays >= STUCK_SETUP_DAYS) flags.push('stuck_setup');
  if (
    shop.stage === 'live' &&
    shop.lastActiveAt !== null &&
    (now.getTime() - new Date(shop.lastActiveAt).getTime()) / DAY >= SHOP_QUIET_DAYS
  )
    flags.push('quiet');
  if (shop.storageUsedBytes >= shop.storageLimitBytes * STORAGE_HIGH_SHARE)
    flags.push('storage_high');
  return flags;
}

/** The day a trial that starts now ends, as an instant. */
export function trialEndsFrom(now: Date, trialDays: number): string {
  return new Date(now.getTime() + trialDays * DAY).toISOString();
}

/** Extra days for a shop (T88): on a trial they move the trial's end; otherwise the paid-until day. */
export function extendPlan(
  plan: { trialEndsAt: string | null; paidUntil: string | null },
  days: number,
  now: Date,
): { trialEndsAt: string | null; paidUntil: string | null } {
  if (plan.paidUntil === null && plan.trialEndsAt !== null) {
    const from = Math.max(new Date(plan.trialEndsAt).getTime(), now.getTime());
    return { trialEndsAt: new Date(from + days * DAY).toISOString(), paidUntil: null };
  }
  const today = manilaDate(now);
  const base = plan.paidUntil && plan.paidUntil >= today ? plan.paidUntil : today;
  return { trialEndsAt: plan.trialEndsAt, paidUntil: addDays(base, days) };
}
