import { z } from 'zod';

// The push services browsers use today. The API sends to the address a stranger gives it, so anything else
// (an internal address, someone's own server) is refused: the API never becomes a way to call other hosts.
const PUSH_HOSTS = [
  'fcm.googleapis.com',
  'updates.push.services.mozilla.com',
  'web.push.apple.com',
  'android.googleapis.com',
] as const;
const PUSH_HOST_SUFFIXES = ['.push.apple.com', '.notify.windows.com', '.push.services.mozilla.com'];

export function isPushServiceUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) return false;
  const host = url.hostname.toLowerCase();
  return (
    PUSH_HOSTS.some((h) => h === host) || PUSH_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix))
  );
}

const Base64Url = z.string().regex(/^[A-Za-z0-9_-]+=*$/);

/** `PushSubscription.toJSON()` from the browser, checked before it is kept. */
export const PushSubscriptionInputSchema = z
  .object({
    endpoint: z.string().min(10).max(1000).refine(isPushServiceUrl),
    expirationTime: z.number().nullable().optional(),
    keys: z.object({
      p256dh: Base64Url.min(10).max(200),
      auth: Base64Url.min(8).max(100),
    }),
  })
  .strip();
export type PushSubscriptionInput = z.infer<typeof PushSubscriptionInputSchema>;

export const PUSH_PLATFORMS = ['android', 'ios', 'desktop', 'other'] as const;
export type PushPlatform = (typeof PUSH_PLATFORMS)[number];

/** The phone's kind from its browser line, for the News counts; never stored beyond this word. */
export function platformOf(userAgent: string | undefined): PushPlatform {
  if (!userAgent) return 'other';
  if (/iPhone|iPad|iPod/.test(userAgent)) return 'ios';
  if (/Android/.test(userAgent)) return 'android';
  if (/Windows|Macintosh|Linux|CrOS/.test(userAgent)) return 'desktop';
  return 'other';
}
