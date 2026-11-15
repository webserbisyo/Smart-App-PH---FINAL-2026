// Install as an app (T13): which install help to show, when the card hides, and the app's short name.

export const INSTALL_PLATFORMS = ['installed', 'prompt', 'ios', 'none'] as const;
export type InstallPlatform = (typeof INSTALL_PLATFORMS)[number];

// The card stays hidden this long after the customer hides it (per shop).
export const INSTALL_DISMISS_DAYS = 30;
const DAY_MS = 86_400_000;
// The home screen label moved to core (T94) so the Editor counts it the same way.
export { SHORT_NAME_MAX, shortName } from '@smartapp/core';

// The installed app's splash (T94): its element id, and how long the logo's motion needs (80 ms wait + the
// slow duration) before the splash may leave.
export const SPLASH_ID = 'app-splash';
export const SPLASH_MIN_MS = 450;

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

/**
 * iPhone screens in CSS pixels and pixel ratio. iOS shows an installed app's launch picture only when one
 * matches the screen exactly, else white (decision R51), so each gets its own picture.
 */
export const IOS_SCREENS = [
  { width: 440, height: 956, ratio: 3 },
  { width: 430, height: 932, ratio: 3 },
  { width: 428, height: 926, ratio: 3 },
  { width: 414, height: 896, ratio: 3 },
  { width: 414, height: 896, ratio: 2 },
  { width: 414, height: 736, ratio: 3 },
  { width: 402, height: 874, ratio: 3 },
  { width: 393, height: 852, ratio: 3 },
  { width: 390, height: 844, ratio: 3 },
  { width: 375, height: 812, ratio: 3 },
  { width: 375, height: 667, ratio: 2 },
  { width: 320, height: 568, ratio: 2 },
] as const;

export type IosScreen = (typeof IOS_SCREENS)[number];

/** "1170x2532": the picture's size in real pixels, as its address names it. */
export function splashSizeName(screen: IosScreen): string {
  return `${screen.width * screen.ratio}x${screen.height * screen.ratio}`;
}

/** The screen a picture address names, or null for any size we don't make. */
export function splashScreen(sizeName: string): IosScreen | null {
  return IOS_SCREENS.find((screen) => splashSizeName(screen) === sizeName) ?? null;
}

/** The media query iOS matches a launch picture with (portrait only, as the manifest). */
export function splashMedia(screen: IosScreen): string {
  return `(device-width: ${screen.width}px) and (device-height: ${screen.height}px) and (-webkit-device-pixel-ratio: ${screen.ratio}) and (orientation: portrait)`;
}
