'use client';

import type * as React from 'react';
import { ownerAvatarFile, personInitials, type OwnerAvatar } from '@smartapp/core';
import { Avatar, AvatarFallback, AvatarImage } from '@smartapp/ui/components/avatar';
import { cn } from 'cn';
import { AVATAR_BG, directPhotoSrc } from '@smartapp/ui/compositions/avatar-theme';

// One picture for owners and members (decisions T68, T95): a ready-made face or a customised one on a
// theme colour, the initials, or a photo. Ready-made files ship with each app under /avatars/owner.

export { AVATAR_BG, directPhotoSrc };

export function PersonAvatar({
  avatar,
  name,
  photoSrc = directPhotoSrc,
  size,
  className,
  badge,
}: {
  avatar: OwnerAvatar;
  name: string;
  // How this app shows an uploaded photo's ref.
  photoSrc?: ((ref: string) => string | null) | undefined;
  size?: 'default' | 'sm' | 'lg' | undefined;
  className?: string | undefined;
  // An AvatarBadge, such as the online dot.
  badge?: React.ReactNode;
}) {
  const src = avatar.kind === 'photo' ? photoSrc(avatar.ref) : ownerAvatarFile(avatar);
  const theme =
    avatar.kind === 'photo' ? 'bg-muted text-muted-foreground' : AVATAR_BG[avatar.theme];
  return (
    <Avatar size={size ?? 'default'} className={cn(theme, className)}>
      {src ? <AvatarImage src={src} alt="" className="object-cover" /> : null}
      <AvatarFallback className={cn('bg-transparent font-semibold', theme)}>
        {personInitials(name) || '?'}
      </AvatarFallback>
      {badge}
    </Avatar>
  );
}

// A picture as a member's phone has it (T95): a face record, or an older picture kept as a file.
export type PersonPicture = { kind: 'avatar'; avatar: OwnerAvatar } | { kind: 'file'; src: string };

export function PictureAvatar({
  picture,
  name,
  className,
  fileClassName,
}: {
  picture: PersonPicture;
  name: string;
  className?: string | undefined;
  // The colour behind an older picture (the shop's soft colour on the storefront).
  fileClassName?: string | undefined;
}) {
  if (picture.kind === 'avatar')
    return <PersonAvatar avatar={picture.avatar} name={name} className={className} />;
  return (
    <Avatar className={cn(fileClassName, className)}>
      <AvatarImage src={picture.src} alt="" className="object-cover" />
      <AvatarFallback className={cn('font-semibold', fileClassName)}>
        {personInitials(name) || '?'}
      </AvatarFallback>
    </Avatar>
  );
}
