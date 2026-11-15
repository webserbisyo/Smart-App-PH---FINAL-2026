import type { AvatarTheme } from '@smartapp/core';

// The colour behind a face or initials (T68, T95): one token each, with a dark version. Its own module, so
// a top bar that shows a member's face needs only these class names.
export const AVATAR_BG: Record<AvatarTheme, string> = {
  sky: 'bg-avatar-sky text-avatar-ink',
  mint: 'bg-avatar-mint text-avatar-ink',
  sun: 'bg-avatar-sun text-avatar-ink',
  blush: 'bg-avatar-blush text-avatar-ink',
  lilac: 'bg-avatar-lilac text-avatar-ink',
  sand: 'bg-avatar-sand text-avatar-ink',
  navy: 'bg-avatar-navy text-avatar-ink-on-dark',
  brand: 'bg-avatar-brand text-avatar-ink-on-dark',
};

/** A photo ref the browser can show as it is (a small crop kept on the device, or a full URL). */
export function directPhotoSrc(ref: string): string | null {
  return /^(blob:|data:|https?:\/\/)/.test(ref) ? ref : null;
}
