import * as React from 'react';
import { PackageIcon, UtensilsIcon } from 'lucide-react';
import { imageUrl, vocab } from '@smartapp/core';
import { env } from '@/app/env';
import { useShop } from '@/app/shop';
import { cn } from 'cn';

/** The address to draw a saved photo ref (or a just-picked blob/data photo) at about this width. */
export function catalogPhotoSrc(photoRef: string | null | undefined, width: number): string | null {
  if (!photoRef) return null;
  if (/^(blob:|data:|https?:\/\/)/.test(photoRef)) return photoRef;
  return imageUrl(photoRef, width, env.VITE_STOREFRONT_URL);
}

export interface CatalogPhotoProps {
  photoRef: string | null | undefined;
  alt: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function CatalogPhoto({ photoRef, alt, size = 'md', className }: CatalogPhotoProps) {
  const { kind } = useShop();
  const PlaceholderIcon = vocab(kind).catalogIcon === 'package' ? PackageIcon : UtensilsIcon;
  const sizeClasses = {
    sm: 'size-10 rounded-lg',
    md: 'size-14 rounded-xl',
    lg: 'size-20 rounded-2xl',
  }[size];

  const iconSizes = {
    sm: 'size-4',
    md: 'size-6',
    lg: 'size-8',
  }[size];

  const src = React.useMemo(
    () => catalogPhotoSrc(photoRef, size === 'sm' ? 128 : size === 'md' ? 256 : 512),
    [photoRef, size],
  );

  if (!src) {
    return (
      <div
        className={cn(
          'flex shrink-0 items-center justify-center border border-border/40 bg-muted/60 text-muted-foreground',
          sizeClasses,
          className,
        )}
        aria-hidden="true"
      >
        <PlaceholderIcon className={iconSizes} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className={cn('shrink-0 border border-border/40 object-cover', sizeClasses, className)}
    />
  );
}
