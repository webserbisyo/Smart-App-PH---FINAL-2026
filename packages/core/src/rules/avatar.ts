// The picture of an owner or a member (T68, T95): small, so a storefront page that shows a face never
// loads the rest of the Settings rules.
import { avatarSvgSrc } from '../schemas/avatar-make.js';
import type { OwnerAvatar } from '../schemas/owner-avatar.js';

/** Where the dashboard serves the owner faces (tooling/scripts/default-avatars.ts and docs/components.md). */
export const OWNER_AVATAR_DIR = '/avatars/owner';
export const OWNER_FACES_PER_STYLE = 12;

/** The image of a face or a made picture; null for initials and photos (the photo has its own ref). */
export function ownerAvatarFile(avatar: OwnerAvatar): string | null {
  if (avatar.kind === 'face')
    return `${OWNER_AVATAR_DIR}/${avatar.style}-${String(avatar.face).padStart(2, '0')}.webp`;
  if (avatar.kind === 'custom') return avatarSvgSrc(avatar.svg);
  return null;
}

/** "JD" from "Juan Dela Cruz", "K" from "Kris". */
export function personInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.charAt(0) ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.charAt(0) ?? '') : '';
  return `${first}${last}`.toUpperCase();
}
