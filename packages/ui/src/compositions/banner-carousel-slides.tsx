'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Autoplay from 'embla-carousel-autoplay';
import { cn } from 'cn';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '@smartapp/ui/components/carousel';
import { Hitbox } from '@smartapp/ui/components/hitbox';
import { useReducedMotion } from '../hooks/use-reduced-motion';
import type { BannerCarouselProps } from './banner-carousel';
import { ShopImage } from './shop-image';

const MIN_SECONDS = 3;
const MAX_SECONDS = 10;

function clampSeconds(seconds: number | undefined): number {
  const value = seconds ?? 5;
  return Math.min(MAX_SECONDS, Math.max(MIN_SECONDS, Math.round(value)));
}

// Loaded lazily by BannerCarousel. Autoplay stops on touch, hover and focus and while off-screen, and never
// runs under reduced motion.
export default function BannerCarouselSlides({
  slides,
  seconds,
  ratio = '21:9',
  sizes = '100vw',
  labels,
  fallbackText,
  assetOrigin,
  className,
}: BannerCarouselProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const touchedRef = useRef(false);
  const [api, setApi] = useState<CarouselApi>();
  const [selected, setSelected] = useState(0);
  const reducedMotion = useReducedMotion();
  const delay = clampSeconds(seconds) * 1000;

  const plugins = useMemo(
    () =>
      reducedMotion
        ? []
        : [
            Autoplay({
              delay,
              stopOnInteraction: true,
              stopOnMouseEnter: true,
              stopOnFocusIn: true,
            }),
          ],
    [reducedMotion, delay],
  );
  const opts = useMemo(() => ({ loop: true, duration: reducedMotion ? 10 : 25 }), [reducedMotion]);

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setSelected(api.selectedScrollSnap());
    const onPointerDown = () => {
      touchedRef.current = true;
    };
    api.on('select', onSelect);
    api.on('pointerDown', onPointerDown);
    return () => {
      api.off('select', onSelect);
      api.off('pointerDown', onPointerDown);
    };
  }, [api]);

  // Off-screen: stop; back on screen: play again unless the customer already took over.
  useEffect(() => {
    const root = rootRef.current;
    if (!api || !root || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => {
      const autoplay = api.plugins().autoplay;
      if (!autoplay) return;
      if (entry?.isIntersecting && !touchedRef.current) autoplay.play();
      else autoplay.stop();
    });
    observer.observe(root);
    return () => observer.disconnect();
  }, [api]);

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <Carousel setApi={setApi} opts={opts} plugins={plugins} aria-label={labels.region}>
        <CarouselContent className="-ml-0">
          {slides.map((slide, index) => (
            <CarouselItem
              key={`${index}-${slide.alt}`}
              className="pl-0"
              aria-label={labels.slideOf(index + 1, slides.length)}
            >
              <ShopImage
                src={slide.src}
                alt={slide.alt}
                ratio={ratio}
                sizes={sizes}
                fallbackIcon={slide.fallbackIcon}
                fallbackText={fallbackText}
                assetOrigin={assetOrigin}
                priority={index === 0}
              />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
      <div className="absolute inset-x-0 bottom-2 flex justify-center gap-3">
        {slides.map((slide, index) => (
          <Hitbox
            key={`dot-${index}-${slide.alt}`}
            size="18px"
            radius="full"
            render={
              <button
                type="button"
                aria-label={labels.showBanner(index + 1)}
                aria-current={selected === index ? 'true' : undefined}
                onClick={() => api?.scrollTo(index)}
                className={cn(
                  'size-2 rounded-full bg-card/70 shadow-sm ring-1 ring-foreground/10 transition-[width,background-color] duration-base ease-standard',
                  selected === index && 'w-5 bg-card',
                )}
              />
            }
          />
        ))}
      </div>
    </div>
  );
}
