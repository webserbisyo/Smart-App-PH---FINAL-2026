'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Autoplay from 'embla-carousel-autoplay';
import { PauseIcon, PlayIcon } from 'lucide-react';
import { cn } from 'cn';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from '@smartapp/ui/components/carousel';
import { Hitbox } from '@smartapp/ui/components/hitbox';
import { useReducedMotion } from '../hooks/use-reduced-motion';
import { cssVars } from '../lib/css-vars';
import { BANNER_SLIDE, BannerFrame, type BannerCarouselProps } from './banner-carousel';

const MIN_SECONDS = 3;
const MAX_SECONDS = 10;

function clampSeconds(seconds: number | undefined): number {
  const value = seconds ?? 5;
  return Math.min(MAX_SECONDS, Math.max(MIN_SECONDS, Math.round(value)));
}

// Arrows show on hover from 768 px, only where a mouse can hover (decision R41).
const ARROW =
  'hidden size-10 bg-card/90 opacity-0 shadow-md backdrop-blur-sm transition-opacity duration-base hover-hover:md:flex group-hover/banner:opacity-100 focus-visible:opacity-100';

// Loaded lazily by BannerCarousel (decision R41). Dots sit under the banner and the active one fills like a
// timer; the timer pauses on hover, a drag and focus, stops off-screen, and the Pause button removes
// autoplay until Play. Nothing moves under reduced motion.
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
  const [api, setApi] = useState<CarouselApi>();
  const [selected, setSelected] = useState(0);
  const [running, setRunning] = useState(false);
  const [timerRun, setTimerRun] = useState(0);
  const [paused, setPaused] = useState(false);
  const reducedMotion = useReducedMotion();
  const delay = clampSeconds(seconds) * 1000;
  const autoplays = !reducedMotion && !paused;

  // Changing the plugins re-inits embla on the same slide, so Pause simply drops autoplay.
  const plugins = useMemo(
    () =>
      autoplays
        ? [
            Autoplay({
              delay,
              stopOnInteraction: false,
              stopOnMouseEnter: true,
              stopOnFocusIn: true,
            }),
          ]
        : [],
    [autoplays, delay],
  );
  const opts = useMemo(
    () => ({ loop: true, align: 'start' as const, duration: reducedMotion ? 10 : 25 }),
    [reducedMotion],
  );

  useEffect(() => {
    if (!api) return;
    const onSelect = () => {
      setSelected(api.selectedScrollSnap());
      // A dot, an arrow or a swipe gives the new slide its full time.
      api.plugins().autoplay?.reset();
    };
    const onTimerSet = () => {
      setRunning(true);
      setTimerRun((run) => run + 1);
    };
    const onTimerStopped = () => setRunning(false);
    onSelect();
    api.on('select', onSelect);
    api.on('autoplay:timerset', onTimerSet);
    api.on('autoplay:timerstopped', onTimerStopped);
    return () => {
      api.off('select', onSelect);
      api.off('autoplay:timerset', onTimerSet);
      api.off('autoplay:timerstopped', onTimerStopped);
    };
  }, [api]);

  // Off-screen: stop; back on screen: play again.
  useEffect(() => {
    const root = rootRef.current;
    if (!api || !root || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => {
      const autoplay = api.plugins().autoplay;
      if (!autoplay) return;
      if (entry?.isIntersecting) autoplay.play();
      else autoplay.stop();
    });
    observer.observe(root);
    return () => observer.disconnect();
  }, [api, plugins]);

  return (
    <div
      ref={rootRef}
      data-paused={running && autoplays ? undefined : ''}
      style={cssVars({ '--banner-delay': `${delay}ms` })}
      className={cn('group/banner flex flex-col gap-3', className)}
    >
      <Carousel setApi={setApi} opts={opts} plugins={plugins} aria-label={labels.region}>
        <CarouselContent className="-ml-3">
          {slides.map((slide, index) => (
            <CarouselItem
              key={`${index}-${slide.alt}`}
              data-banner-slide=""
              data-active={selected === index ? '' : undefined}
              className={BANNER_SLIDE}
              aria-label={labels.slideOf(index + 1, slides.length)}
            >
              <BannerFrame
                slide={slide}
                ratio={ratio}
                sizes={sizes}
                priority={index === 0}
                zoom={selected === index}
                fallbackText={fallbackText}
                assetOrigin={assetOrigin}
              />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious aria-label={labels.previous} className={cn(ARROW, 'left-3')} />
        <CarouselNext aria-label={labels.next} className={cn(ARROW, 'right-3')} />
      </Carousel>

      <div className="flex min-h-7 items-center justify-center gap-3">
        <div className="flex items-center gap-2">
          {slides.map((slide, index) => {
            const active = selected === index;
            return (
              <Hitbox
                key={`dot-${index}-${slide.alt}`}
                size="18px"
                radius="full"
                render={
                  <button
                    type="button"
                    aria-label={labels.showBanner(index + 1)}
                    aria-current={active ? 'true' : undefined}
                    onClick={() => api?.scrollTo(index)}
                    className={cn(
                      'h-2 w-2 overflow-hidden rounded-full bg-muted-foreground/30 transition-[width,background-color] duration-base ease-standard',
                      active && 'w-6 bg-primary/25',
                    )}
                  >
                    {active ? (
                      <span
                        key={`${index}-${timerRun}`}
                        className={cn(
                          'block h-full rounded-full bg-primary',
                          autoplays && 'banner-fill',
                        )}
                      />
                    ) : null}
                  </button>
                }
              />
            );
          })}
        </div>
        {reducedMotion ? null : (
          <Hitbox
            size="8px"
            radius="full"
            render={
              <button
                type="button"
                aria-label={paused ? labels.play : labels.pause}
                onClick={() => setPaused((value) => !value)}
                className="flex size-7 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors duration-base hover-hover:hover:bg-muted hover-hover:hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                {paused ? (
                  <PlayIcon aria-hidden="true" className="size-3.5 fill-current" />
                ) : (
                  <PauseIcon aria-hidden="true" className="size-3.5 fill-current" />
                )}
              </button>
            }
          />
        )}
      </div>
    </div>
  );
}
