import { personInitials, type OwnerAvatar } from '@smartapp/core';
import { useOwnerProfile } from '@smartapp/data';
import { Avatar, AvatarFallback } from '@smartapp/ui/components/avatar';
import { PersonAvatar } from '@smartapp/ui/compositions/person-avatar';
import type * as React from 'react';
import { cn } from 'cn';
import { orderPhotoSrc } from './orders/order-photo.js';

// The owner's picture (decision T68): a ready-made face or a picture made from pieces on a theme
// colour, the initials, or their own photo. Ready-made files ship with the app, so they show at once.

// A new photo shows from this device until the page reloads (the mock keeps no file).
const localPhotos = new Map<string, string>();
export function rememberPhoto(ref: string, preview: string): void {
  localPhotos.set(ref, preview);
}

function photoSrc(ref: string): string | null {
  return localPhotos.get(ref) ?? orderPhotoSrc(ref, 256);
}

export function OwnerAvatarView({
  avatar,
  name,
  className,
  badge,
}: {
  avatar: OwnerAvatar;
  name: string;
  className?: string | undefined;
  // An AvatarBadge, such as the online dot.
  badge?: React.ReactNode;
}) {
  return (
    <PersonAvatar
      avatar={avatar}
      name={name}
      photoSrc={photoSrc}
      className={className}
      badge={badge}
    />
  );
}

/** The signed-in owner's picture, from their profile once it has loaded. */
export function MyAvatar({
  fallbackName,
  className,
  badge,
}: {
  fallbackName: string;
  className?: string;
  badge?: React.ReactNode;
}) {
  const profile = useOwnerProfile();
  if (!profile.data)
    return (
      <Avatar className={className}>
        <AvatarFallback>{personInitials(fallbackName) || '?'}</AvatarFallback>
        {badge}
      </Avatar>
    );
  return (
    <OwnerAvatarView
      avatar={profile.data.avatar}
      name={profile.data.name}
      className={className}
      badge={badge}
    />
  );
}

/**
 * A customer's picture on orders, chats and Members (T95): a member's face, or a guest's initials tinted
 * by who they are.
 */
export function CustomerFace({
  avatar,
  name,
  size,
  className,
  initialsClassName,
}: {
  avatar: OwnerAvatar | null;
  name: string;
  size?: 'default' | 'sm' | 'lg' | undefined;
  className?: string | undefined;
  // The initials' colours (guests, and while a face loads).
  initialsClassName?: string | undefined;
}) {
  if (avatar)
    return (
      <PersonAvatar
        avatar={avatar}
        name={name}
        size={size}
        photoSrc={photoSrc}
        className={cn('shrink-0', className)}
      />
    );
  return (
    <Avatar size={size ?? 'default'} className={cn('shrink-0', className)}>
      <AvatarFallback className={cn('font-semibold', initialsClassName)}>
        {personInitials(name) || '?'}
      </AvatarFallback>
    </Avatar>
  );
}
