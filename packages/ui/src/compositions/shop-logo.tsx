'use client';

import { cn } from 'cn';
import type { ImageSources } from '@smartapp/core/media';
import { Avatar, AvatarFallback, AvatarImage } from '@smartapp/ui/components/avatar';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { initials } from './shop-image';

const SIZE_CLASS = {
  sm: 'size-8 text-xs',
  md: 'size-10 text-sm',
  lg: 'size-16 text-xl',
} as const;

export interface ShopLogoProps {
  name: string;
  src: ImageSources | null;
  size?: keyof typeof SIZE_CLASS | undefined;
  isLoading?: boolean | undefined;
  className?: string | undefined;
}

// Square logo (pattern c-avatar-4); initials on the shop colour when there is no logo or it fails (c-avatar-14).
export function ShopLogo({ name, src, size = 'md', isLoading = false, className }: ShopLogoProps) {
  if (isLoading) {
    return (
      <Skeleton className={cn('shrink-0 rounded-lg bg-skeleton', SIZE_CLASS[size], className)} />
    );
  }
  const webp = src?.webp.split(',').map((entry) => entry.trim().split(' ')[0] ?? '');
  return (
    <Avatar
      className={cn('rounded-lg after:rounded-lg', SIZE_CLASS[size], className)}
      aria-label={name}
    >
      {src && webp ? (
        <AvatarImage
          src={webp[webp.length - 1]}
          srcSet={src.webp}
          sizes="64px"
          alt={name}
          className="rounded-lg"
        />
      ) : null}
      <AvatarFallback className="rounded-lg bg-shop-10 font-semibold text-shop-10-foreground">
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
