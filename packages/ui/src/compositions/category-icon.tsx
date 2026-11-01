'use client';

import { useState } from 'react';
import { cn } from 'cn';
import type {
  CategoryIcon as CategoryIconType,
  CategoryIconStyle,
  IconKey,
} from '@smartapp/core/icons';
import { iconPath } from '@smartapp/core/icons';
import { imageSources } from '@smartapp/core/media';

export interface CategoryIconProps {
  icon: CategoryIconType | IconKey;
  style?: CategoryIconStyle | undefined;
  size?: number | undefined;
  alt?: string | undefined;
  className?: string | undefined;
  textClassName?: string | undefined;
  loading?: 'lazy' | 'eager' | undefined;
  assetOrigin?: string | undefined;
}

/**
 * Renders a category icon as native emoji text, as an <img> for Fluent icons,
 * or via imageSources for custom uploaded images (with fallback to Fluent flat "other" on error).
 */
export function CategoryIcon({
  icon,
  style,
  size = 32,
  alt = '',
  className,
  textClassName,
  loading = 'lazy',
  assetOrigin = '',
}: CategoryIconProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (typeof icon === 'object' && icon.kind === 'emoji') {
    return (
      <span
        aria-hidden="true"
        className={cn(
          'text-2xl leading-none font-semibold tracking-wide select-none',
          textClassName,
        )}
      >
        {icon.char}
      </span>
    );
  }

  const cleanOrigin = assetOrigin ? assetOrigin.replace(/\/+$/, '') : '';
  const fallbackOtherSrc = `${cleanOrigin}${iconPath('other', 'flat')}`;

  if (typeof icon === 'object' && icon.kind === 'image') {
    const isBlobOrData = icon.ref.startsWith('blob:') || icon.ref.startsWith('data:');

    if (isBlobOrData) {
      if (failedSrc === icon.ref) {
        return (
          <img
            src={fallbackOtherSrc}
            alt={alt}
            aria-hidden={alt ? undefined : 'true'}
            width={size}
            height={size}
            loading={loading}
            decoding="async"
            className={cn('size-8 object-contain', className)}
          />
        );
      }

      return (
        <img
          src={icon.ref}
          alt={alt}
          aria-hidden={alt ? undefined : 'true'}
          width={size}
          height={size}
          loading={loading}
          decoding="async"
          onError={() => setFailedSrc(icon.ref)}
          className={cn('size-8 object-contain', className)}
        />
      );
    }

    const sources = imageSources(icon.ref, assetOrigin);
    if (!sources) {
      return (
        <img
          src={fallbackOtherSrc}
          alt={alt}
          aria-hidden={alt ? undefined : 'true'}
          width={size}
          height={size}
          loading={loading}
          decoding="async"
          className={cn('size-8 object-contain', className)}
        />
      );
    }

    const fallbackImgSrc = sources.webp.split(',')[0]?.trim().split(' ')[0] ?? '';

    if (failedSrc === fallbackImgSrc) {
      return (
        <img
          src={fallbackOtherSrc}
          alt={alt}
          aria-hidden={alt ? undefined : 'true'}
          width={size}
          height={size}
          loading={loading}
          decoding="async"
          className={cn('size-8 object-contain', className)}
        />
      );
    }

    return (
      <picture>
        <source type="image/avif" srcSet={sources.avif} />
        <source type="image/webp" srcSet={sources.webp} />
        <img
          src={fallbackImgSrc}
          alt={alt}
          aria-hidden={alt ? undefined : 'true'}
          width={size}
          height={size}
          loading={loading}
          decoding="async"
          onError={() => setFailedSrc(fallbackImgSrc)}
          className={cn('size-8 object-contain', className)}
        />
      </picture>
    );
  }

  const src = `${cleanOrigin}${iconPath(icon, style)}`;
  if (failedSrc === src) {
    return (
      <img
        src={fallbackOtherSrc}
        alt={alt}
        aria-hidden={alt ? undefined : 'true'}
        width={size}
        height={size}
        loading={loading}
        decoding="async"
        className={cn('size-8 object-contain', className)}
      />
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      aria-hidden={alt ? undefined : 'true'}
      width={size}
      height={size}
      loading={loading}
      decoding="async"
      onError={() => setFailedSrc(src)}
      className={cn('size-8 object-contain', className)}
    />
  );
}
