import * as React from 'react';
import { UtensilsIcon } from 'lucide-react';
import { imageUrl } from '@smartapp/core';
import { env } from '@/app/env';
import { cn } from 'cn';

export interface CatalogPhotoProps {
  photoRef: string | null | undefined;
  alt: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function CatalogPhoto({ photoRef, alt, size = 'md', className }: CatalogPhotoProps) {
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

  const src = React.useMemo(() => {
    if (!photoRef) return null;
    if (
      photoRef.startsWith('blob:') ||
      photoRef.startsWith('data:') ||
      photoRef.startsWith('http://') ||
      photoRef.startsWith('https://')
    ) {
      return photoRef;
    }
    const width = size === 'sm' ? 128 : size === 'md' ? 256 : 512;
    return imageUrl(photoRef, width, env.VITE_STOREFRONT_URL);
  }, [photoRef, size]);

  if (!src) {
    return (
      <div
        className={cn(
          'flex shrink-0 items-center justify-center bg-muted/60 text-muted-foreground border border-border/40',
          sizeClasses,
          className,
        )}
        aria-hidden="true"
      >
        <UtensilsIcon className={iconSizes} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className={cn('shrink-0 object-cover border border-border/40', sizeClasses, className)}
    />
  );
}
