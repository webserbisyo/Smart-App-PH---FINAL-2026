// Super Admin, sign-up and Meta tracking rules (decisions T88 to T92). Shared by the mock and NestJS, so the
// shapes Meta receives are tested once. Hashing (SHA-256) happens in NestJS; these only normalise.
import type {
  AdminFlag,
  ShopStage,
  SignupChannel,
  TrackEventName,
  TrackProblem,
} from '../schemas/enums.js';
import type { OnboardingStep, SignupSource } from '../schemas/platform.js';
import { PLAN_GRACE_DAYS } from './settings.js';
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

// Meta refuses a WHOLE request when any event in it is more than 7 days old (Server Event parameters,
// read 2026-11-25). We stop an hour short, and an older event is skipped, never sent with a moved time
// (the RSVP app's mistake F3): its true time stays the owner's action.
export const META_SEND_WINDOW_MS = 7 * DAY - 60 * 60_000;

/** Meta's event_time: the Unix seconds of when it really happened (never later than now). */
export function metaEventTime(at: Date | string, now: Date): number {
  return Math.floor(Math.min(new Date(at).getTime(), now.getTime()) / 1000);
}

/** True when Meta would refuse this event's time (past the 7-day window less an hour). */
export function metaTooOld(at: Date | string, now: Date): boolean {
  return now.getTime() - new Date(at).getTime() > META_SEND_WINDOW_MS;
}

/** Whole days left before an owner's payment is too old for Meta (Super Admin's "Meta counts N more days"). */
export function metaDaysLeft(sentAt: Date | string, now: Date): number {
  const left = new Date(sentAt).getTime() + META_SEND_WINDOW_MS - now.getTime();
  return left <= 0 ? 0 : Math.ceil(left / DAY);
}

// The 10 minutes an approval's Meta events wait, so Undo approval can take it back (T118 Q4).
export const UNDO_APPROVAL_MS = 10 * 60_000;

/**
 * Why an event must not go to Meta (T118 section 4.3), or null. One check for every place that writes an
 * event: the founder's own accounts, help mode, demo shops and shops marked as a test never send.
 */
export function trackingBlock(context: {
  // A Super Admin is the one signed in (the founder testing sign-up, or any admin route).
  adminCaller?: boolean;
  // The request runs in help mode (the founder acting as the owner).
  helpMode?: boolean;
  isDemo?: boolean;
  isTest?: boolean;
}): TrackProblem | null {
  if (context.adminCaller) return 'admin';
  if (context.helpMode) return 'help_mode';
  if (context.isDemo) return 'demo_shop';
  if (context.isTest) return 'test_shop';
  return null;
}

// ---------- plan reminders (T118 Q9) ----------

export const PLAN_REMINDER_STAGES = [
  'trial_3d',
  'trial_last',
  'due_7d',
  'end_day',
  'grace_3d',
  'paused',
] as const;
export type PlanReminderStage = (typeof PLAN_REMINDER_STAGES)[number];

/**
 * The reminder a shop is owed on a Manila day, with the end day it is about (the dedupe key), or null.
 * Trial: 3 days before and on the last day. Paid plan: 7 days before, on the end day. Both: 3 days into the
 * grace and the day it pauses. A missed day is still sent the next day; an older one is not.
 */
export function planReminderStage(
  plan: { trialEndsAt: string | null; paidUntil: string | null },
  now: Date,
): { stage: PlanReminderStage; end: string } | null {
  const end = plan.paidUntil ?? (plan.trialEndsAt ? manilaDate(plan.trialEndsAt) : null);
  if (!end) return null;
  const trial = plan.paidUntil === null;
  const days: [PlanReminderStage, string][] = trial
    ? [
        ['trial_3d', addDays(end, -3)],
        ['trial_last', end],
      ]
    : [
        ['due_7d', addDays(end, -7)],
        ['end_day', end],
      ];
  days.push(['grace_3d', addDays(end, 3)], ['paused', addDays(end, PLAN_GRACE_DAYS + 1)]);
  const today = manilaDate(now);
  const yesterday = addDays(today, -1);
  let found: { stage: PlanReminderStage; end: string } | null = null;
  for (const [stage, day] of days) {
    if (day <= today && day >= yesterday) found = { stage, end };
  }
  return found;
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
