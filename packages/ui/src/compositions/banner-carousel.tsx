'use client';

import { lazy, Suspense, useEffect, useState, type ReactElement } from 'react';
import { ArrowRightIcon } from 'lucide-react';
import { cn } from 'cn';
import type { IconKey } from '@smartapp/core/icons';
import type { ImageSources } from '@smartapp/core/media';
import { Button } from '@smartapp/ui/components/button';
import { ShopImage, type ShopImageRatio } from './shop-image';

export interface BannerSlide {
  src: ImageSources | null;
  alt: string;
  fallbackIcon?: IconKey | undefined;
  // Optional words over the photo and one in-shop button (decision R42).
  title?: string | undefined;
  description?: string | undefined;
  // `link` is an element from the app (Next Link); packages/ui never imports a router.
  action?: { label: string; link: ReactElement } | undefined;
}

export interface BannerCarouselLabels {
  region: string;
  slideOf: (index: number, total: number) => string;
  showBanner: (index: number) => string;
  previous: string;
  next: string;
  pause: string;
  play: string;
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

// Phones show banners at 16:9 so the words fit; from 768 px they use the given ratio (21:9).
const BANNER_FRAME = 'rounded-none aspect-video md:aspect-(--ratio)';

// One slide on a phone is 11/12 wide, so the next one peeks in; 12 px between slides.
export const BANNER_TRACK = '-ml-3 flex';
export const BANNER_SLIDE = 'min-w-0 shrink-0 grow-0 basis-11/12 pl-3 md:basis-full';

export interface BannerFrameProps {
  slide: BannerSlide;
  ratio?: ShopImageRatio | undefined;
  sizes: string;
  priority?: boolean | undefined;
  // The active slide zooms slowly to 104 % while its timer runs.
  zoom?: boolean | undefined;
  fallbackText?: string | undefined;
  assetOrigin?: string | undefined;
}

/** One banner: the photo, and when the owner wrote any, a shade with the title, description and button. */
export function BannerFrame({
  slide,
  ratio = '21:9',
  sizes,
  priority,
  zoom,
  fallbackText,
  assetOrigin,
}: BannerFrameProps) {
  const { title, description, action } = slide;
  const hasCopy = Boolean(title || description || action);
  return (
    <div className="relative overflow-hidden rounded-2xl bg-shop-10-soft">
      <ShopImage
        src={slide.src}
        alt={slide.alt}
        ratio={ratio}
        sizes={sizes}
        fallbackIcon={slide.fallbackIcon}
        fallbackText={fallbackText}
        assetOrigin={assetOrigin}
        priority={priority}
        className={cn(BANNER_FRAME, zoom && 'banner-zoom')}
      />
      {hasCopy ? (
        <div className="absolute inset-0 flex items-end bg-linear-to-t from-scrim via-scrim/45 to-transparent to-70% p-3 text-on-scrim sm:p-4 md:p-6">
          <div className="flex max-w-md banner-copy flex-col items-start gap-1">
            {title ? (
              <p className="line-clamp-2 text-base leading-tight font-semibold tracking-tight text-balance sm:text-lg md:text-2xl">
                {title}
              </p>
            ) : null}
            {description ? (
              <p className="line-clamp-1 text-sm text-on-scrim/85 md:line-clamp-2 md:text-base">
                {description}
              </p>
            ) : null}
            {action ? (
              <Button
                size="lg"
                className="mt-1.5 rounded-full pr-3 pl-4 md:mt-2 pointer-coarse:h-11"
                nativeButton={false}
                render={action.link}
              >
                {action.label}
                <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
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

  const frame = (slide: BannerSlide, index: number) => (
    <BannerFrame
      slide={slide}
      ratio={ratio}
      sizes={sizes}
      priority={index === 0}
      fallbackText={props.fallbackText}
      assetOrigin={props.assetOrigin}
    />
  );

  if (!many) return <div className={props.className}>{frame(first, 0)}</div>;

  // Until the carousel code loads: the same track, slides and dot row height, so nothing moves.
  const still = (
    <div className={cn('flex flex-col gap-3', props.className)}>
      <div className="overflow-hidden">
        <div className={BANNER_TRACK}>
          {slides.slice(0, 2).map((slide, index) => (
            <div
              key={`${index}-${slide.alt}`}
              data-banner-slide=""
              data-active={index === 0 ? '' : undefined}
              className={BANNER_SLIDE}
            >
              {frame(slide, index)}
            </div>
          ))}
        </div>
      </div>
      <div aria-hidden="true" className="min-h-7" />
    </div>
  );

  if (!ready) return still;

  return (
    <Suspense fallback={still}>
      <BannerCarouselSlides {...props} ratio={ratio} sizes={sizes} />
    </Suspense>
  );
}
