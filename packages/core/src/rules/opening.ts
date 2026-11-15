// The installed app's opening screen (decisions T93, T94): its name, the home screen label and the logo size.
import type { OpeningLogoSize } from '../schemas/enums.js';
import type { OpeningScreen } from '../schemas/storefront.js';

// A home screen label fits about 12 characters.
export const SHORT_NAME_MAX = 12;

/** The logo's size on the opening screen, in CSS pixels (the iPhone pictures draw the same). */
export const OPENING_LOGO_PX: Record<OpeningLogoSize, number> = {
  small: 64,
  medium: 96,
  large: 128,
};

/** The installed app's name: the owner's app name, else the shop name. */
export function appNameOf(shopName: string, opening: Pick<OpeningScreen, 'appName'>): string {
  const own = opening.appName?.trim().replace(/\s+/g, ' ');
  return own ? own : shopName;
}

/** The home screen label: the name when it fits, else its first words, else cut at 12. */
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
