'use client';

import { lazy, Suspense, useEffect, useState } from 'react';
import type { IconKey } from '@smartapp/core/icons';
import type { ImageSources } from '@smartapp/core/media';
import { ShopImage, type ShopImageRatio } from './shop-image';

export interface BannerSlide {
  src: ImageSources | null;
  alt: string;
  fallbackIcon?: IconKey | undefined;
}

export interface BannerCarouselLabels {
  region: string;
  slideOf: (index: number, total: number) => string;
  showBanner: (index: number) => string;
}

export interface BannerCarouselProps {
  slides: readonly BannerSlide[];
  // Seconds per slide, set by the owner (3 to 10, default 5).
  seconds?: number | undefined;
  ratio?: ShopImageRatio | undefined;
  sizes?: string | undefined;
  labels: BannerCarouselLabels;
  fallbackText?: string | undefined;
  assetOrigin?: string | undefined;
  className?: string | undefined;
}

// The carousel code (embla + autoplay) is its own chunk, loaded only for 2 or more slides and only after the
// first slide is on screen.
const BannerCarouselSlides = lazy(() => import('./banner-carousel-slides'));

export function BannerCarousel(props: BannerCarouselProps) {
  const { slides, ratio = '21:9', sizes = '(min-width: 1280px) 1120px, 100vw' } = props;
  const [ready, setReady] = useState(false);
  const many = slides.length > 1;

  useEffect(() => {
    if (!many) return;
    const id = window.setTimeout(() => setReady(true), 0);
    return () => window.clearTimeout(id);
  }, [many]);

  const first = slides[0];
  if (!first) return null;

  const firstSlide = (
    <ShopImage
      src={first.src}
      alt={first.alt}
      ratio={ratio}
      sizes={sizes}
      fallbackIcon={first.fallbackIcon}
      fallbackText={props.fallbackText}
      assetOrigin={props.assetOrigin}
      priority
      className={props.className}
    />
  );

  if (!many || !ready) return firstSlide;

  return (
    <Suspense fallback={firstSlide}>
      <BannerCarouselSlides {...props} ratio={ratio} sizes={sizes} />
    </Suspense>
  );
}
