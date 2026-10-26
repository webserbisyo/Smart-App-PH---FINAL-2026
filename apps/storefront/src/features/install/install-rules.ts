// Install as an app (T13): which install help to show, when the card hides, and the app's short name.

export const INSTALL_PLATFORMS = ['installed', 'prompt', 'ios', 'none'] as const;
export type InstallPlatform = (typeof INSTALL_PLATFORMS)[number];

// The card stays hidden this long after the customer hides it (per shop).
export const INSTALL_DISMISS_DAYS = 30;
const DAY_MS = 86_400_000;
// A home screen label fits about 12 characters.
export const SHORT_NAME_MAX = 12;

/** iPhone and iPad Safari: no install prompt, so the card shows the Share steps. Other iOS browsers: none. */
export function isIosSafari(userAgent: string): boolean {
  const ios = /iPhone|iPad|iPod/.test(userAgent);
  const otherBrowser = /CriOS|FxiOS|EdgiOS|OPiOS|GSA\//.test(userAgent);
  return ios && !otherBrowser && /Safari\//.test(userAgent);
}

/** Installed beats everything; then Chrome's own prompt; then iPhone steps; else nothing to show. */
export function installPlatform(input: {
  standalone: boolean;
  hasPrompt: boolean;
  userAgent: string;
}): InstallPlatform {
  if (input.standalone) return 'installed';
  if (input.hasPrompt) return 'prompt';
  if (isIosSafari(input.userAgent)) return 'ios';
  return 'none';
}

/** The card shows when there is a way to install and it was not hidden in the last 30 days. */
export function installCardVisible(input: {
  platform: InstallPlatform;
  dismissedAt: string | null;
  now: string | null;
}): boolean {
  if (input.platform === 'installed' || input.platform === 'none') return false;
  if (!input.dismissedAt) return true;
  if (!input.now) return false;
  return (
    new Date(input.now).getTime() - new Date(input.dismissedAt).getTime() >
    INSTALL_DISMISS_DAYS * DAY_MS
  );
}

/** The home screen label: the shop's name when it fits, else its first words, else cut at 12. */
export function shortName(name: string): string {
  const clean = name.trim().replace(/\s+/g, ' ');
  if (clean.length <= SHORT_NAME_MAX) return clean;
  const words = clean.split(' ');
  let out = '';
  for (const word of words) {
    const next = out ? `${out} ${word}` : word;
    if (next.length > SHORT_NAME_MAX) break;
    out = next;
  }
  return out || clean.slice(0, SHORT_NAME_MAX);
}
