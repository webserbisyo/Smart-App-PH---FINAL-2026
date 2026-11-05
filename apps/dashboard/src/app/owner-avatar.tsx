import {
  AVATAR_THEMES,
  ownerAvatarFile,
  personInitials,
  type AvatarTheme,
  type OwnerAvatar,
} from '@smartapp/core';
import { useOwnerProfile } from '@smartapp/data';
import { Avatar, AvatarFallback, AvatarImage } from '@smartapp/ui/components/avatar';
import { cn } from 'cn';
import { orderPhotoSrc } from './orders/order-photo.js';

// The owner's picture (decision T68): a ready-made face or a picture made from pieces on a theme
// colour, the initials, or their own photo. Ready-made files ship with the app, so they show at once.

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
export const THEME_ORDER: readonly AvatarTheme[] = AVATAR_THEMES;

// A new photo shows from this device until the page reloads (the mock keeps no file).
const localPhotos = new Map<string, string>();
export function rememberPhoto(ref: string, preview: string): void {
  localPhotos.set(ref, preview);
}

export function ownerAvatarSrc(avatar: OwnerAvatar): string | null {
  if (avatar.kind === 'photo') return localPhotos.get(avatar.ref) ?? orderPhotoSrc(avatar.ref, 256);
  return ownerAvatarFile(avatar);
}

export function OwnerAvatarView({
  avatar,
  name,
  className,
}: {
  avatar: OwnerAvatar;
  name: string;
  className?: string | undefined;
}) {
  const src = ownerAvatarSrc(avatar);
  const theme =
    avatar.kind === 'photo' ? 'bg-muted text-muted-foreground' : AVATAR_BG[avatar.theme];
  return (
    <Avatar className={cn(theme, className)}>
      {src ? <AvatarImage src={src} alt="" className="object-cover" /> : null}
      <AvatarFallback className={cn('bg-transparent font-semibold', theme)}>
        {personInitials(name) || '?'}
      </AvatarFallback>
    </Avatar>
  );
}

/** The signed-in owner's picture, from their profile once it has loaded. */
export function MyAvatar({
  fallbackName,
  className,
}: {
  fallbackName: string;
  className?: string;
}) {
  const profile = useOwnerProfile();
  if (!profile.data)
    return (
      <Avatar className={className}>
        <AvatarFallback>{personInitials(fallbackName) || '?'}</AvatarFallback>
      </Avatar>
    );
  return (
    <OwnerAvatarView avatar={profile.data.avatar} name={profile.data.name} className={className} />
  );
}
