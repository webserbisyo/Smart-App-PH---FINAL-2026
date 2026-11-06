'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from 'cn';
import type { IconKey, CategoryIcon as CategoryIconType } from '@smartapp/core/icons';
import { srcsetUrls, type ImageSources } from '@smartapp/core/media';
import { AspectRatio } from '@smartapp/ui/components/aspect-ratio';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { CategoryIcon } from './category-icon';

export const SHOP_IMAGE_RATIOS = {
  '1:1': 1,
  '4:3': 4 / 3,
  '16:9': 16 / 9,
  '21:9': 21 / 9,
} as const;

export type ShopImageRatio = keyof typeof SHOP_IMAGE_RATIOS;

export interface ShopImageProps {
  src: ImageSources | null;
  alt: string;
  ratio: ShopImageRatio;
  // Fluent icon shown on the shop-coloured tile when there is no photo.
  fallbackIcon?: IconKey | CategoryIconType | undefined;
  // Initials of this text are shown when there is no icon either.
  fallbackText?: string | undefined;
  sizes: string;
  // Above the fold: load at once, high priority (first banner, item sheet photo).
  priority?: boolean | undefined;
  // Data still loading: a skeleton of the same ratio.
  isLoading?: boolean | undefined;
  // Origin for the Fluent icon files (the storefront serves them; the dashboard kit page passes the storefront URL).
  assetOrigin?: string | undefined;
  className?: string | undefined;
}

export function initials(text: string): string {
  const parts = text
    .trim()
    .split(/\s+/)
    .filter((part) => /[\p{L}\p{N}]/u.test(part));
  const first = parts[0]?.match(/[\p{L}\p{N}]/u)?.[0] ?? '';
  const second = parts[1]?.match(/[\p{L}\p{N}]/u)?.[0] ?? '';
  return (first + second).toUpperCase();
}

function largestWebp(src: ImageSources): string {
  const entries = srcsetUrls(src.webp);
  return entries[entries.length - 1] ?? '';
}

// Photo → shop-coloured tile with the category's Fluent icon → initials. Never a broken image or an empty box.
export function ShopImage({
  src,
  alt,
  ratio,
  fallbackIcon,
  fallbackText,
  sizes,
  priority = false,
  isLoading = false,
  assetOrigin = '',
  className,
}: ShopImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const photoUrl = src ? largestWebp(src) : '';
  const failed = failedSrc !== null && failedSrc === photoUrl;

  // An image that failed before hydration never fires onError in React, so check once on mount.
  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) setFailedSrc(photoUrl);
  }, [photoUrl]);

  const aspect = SHOP_IMAGE_RATIOS[ratio];
  const width = src?.widths[src.widths.length - 1] ?? 640;
  const height = Math.round(width / aspect);

  if (isLoading) {
    return (
      <AspectRatio ratio={aspect} className={cn('overflow-hidden rounded-lg', className)}>
        <Skeleton className="absolute inset-0 rounded-none bg-skeleton" />
      </AspectRatio>
    );
  }

  if (!src || failed) {
    const text = fallbackText ? initials(fallbackText) : '';
    return (
      <AspectRatio
        ratio={aspect}
        role="img"
        aria-label={alt}
        className={cn(
          'flex items-center justify-center overflow-hidden rounded-lg bg-shop-10-soft text-shop-10',
          className,
        )}
      >
        {fallbackIcon ? (
          <CategoryIcon
            icon={fallbackIcon}
            size={64}
            assetOrigin={assetOrigin}
            className="size-1/3 max-h-16 min-h-6 max-w-16 min-w-6 object-contain"
            textClassName="text-2xl font-semibold tracking-wide"
          />
        ) : text ? (
          <span aria-hidden="true" className="text-2xl font-semibold tracking-wide">
            {text}
          </span>
        ) : null}
      </AspectRatio>
    );
  }

  return (
    <AspectRatio
      ratio={aspect}
      className={cn('overflow-hidden rounded-lg bg-shop-10-soft', className)}
    >
      <picture>
        {src.avif ? <source type="image/avif" srcSet={src.avif} sizes={sizes} /> : null}
        <source type="image/webp" srcSet={src.webp} sizes={sizes} />
        <img
          ref={imgRef}
          src={photoUrl}
          alt={alt}
          width={width}
          height={height}
          sizes={sizes}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          decoding="async"
          onError={() => setFailedSrc(photoUrl)}
          className="absolute inset-0 size-full object-cover"
        />
      </picture>
    </AspectRatio>
  );
}
