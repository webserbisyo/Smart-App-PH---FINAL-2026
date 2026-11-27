// Install as an app (T13): which install help to show, when the card hides, and the app's short name.

export const INSTALL_PLATFORMS = ['installed', 'prompt', 'ios', 'none'] as const;
export type InstallPlatform = (typeof INSTALL_PLATFORMS)[number];

// The card stays hidden this long after the customer hides it (per shop).
export const INSTALL_DISMISS_DAYS = 30;
const DAY_MS = 86_400_000;
// The home screen label moved to core (T94) so the Editor counts it the same way.
export { SHORT_NAME_MAX, shortName } from '@smartapp/core';

// The installed app's splash (T94): its element id. It leaves once the page can be tapped, but never before
// 1 s from launch (T121), so a fast phone still sees the logo instead of a flash; CSS removes it at 3 s.
export const SPLASH_ID = 'app-splash';
export const SPLASH_MIN_MS = 1000;

/**
 * Runs before the first paint (T122). iPhone draws the launch picture over the whole screen, but an installed
 * web app's page starts under the status bar, so a logo centred in the page sits half a status bar lower than
 * the picture's and jumps at the handoff. This sets `--launch-lift` to that half (iPhone only, portrait), and
 * the opening screen moves up by it (`launch-lift`). The dashboard's index.html carries the same lines.
 */
export const LAUNCH_LIFT_SCRIPT =
  "try{if(navigator.standalone===true){var l=(screen.height-innerHeight)/2;if(l>0&&l<40)document.documentElement.style.setProperty('--launch-lift',l+'px')}}catch(e){}";

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

// The launch pictures' screens moved to core (T121) so the dashboard makes the same set.
export {
  IOS_SCREENS,
  splashMedia,
  splashScreen,
  splashSizeName,
  type IosScreen,
} from '@smartapp/core';
