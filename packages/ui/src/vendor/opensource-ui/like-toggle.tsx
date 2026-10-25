// Source: https://opensourceui.in/components/like-button · copied 2026-10-25, re-checked against the source the
// same day (redesign plan, item I8) · MIT, Opensource UI by Bidyut Kundu
// Changes: our cn, rose → shop-10 tokens, shadows, the heart's drop shadow and glow, the springy pop curve
// (ease-spring) and particles as utilities with cssVars() (no inline style), labels from props, particles
// skipped under reduced motion. Particles run 400 ms, not the source's 500 ms (docs/ux.md: motion under 400 ms).
// Burst is exported so the storefront heart chip (compositions/heart-toggle) plays the same particles.
// Nothing auto-updates.
'use client';

import {
  forwardRef,
  useEffect,
  useState,
  type ComponentPropsWithoutRef,
  type MouseEvent,
} from 'react';

import { cn } from 'cn';
import { Heart } from 'lucide-react';
import { cssVars } from '../../lib/css-vars';

const PARTICLES = [
  { x: 0, y: -22 },
  { x: 18, y: -14 },
  { x: 22, y: 4 },
  { x: 13, y: 20 },
  { x: -13, y: 20 },
  { x: -22, y: 4 },
  { x: -18, y: -14 },
];

// Particles fly outward once on mount using a rAF-triggered transition.
export function Burst() {
  const [out, setOut] = useState(false);

  useEffect(() => {
    const id = globalThis.requestAnimationFrame(() => setOut(true));
    return () => globalThis.cancelAnimationFrame(id);
  }, []);

  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0 flex items-center justify-center motion-reduce:hidden"
    >
      {PARTICLES.map((particle) => (
        <span
          key={`${particle.x}:${particle.y}`}
          data-out={out ? '' : undefined}
          className="absolute top-1/2 left-1/2 size-1.5 like-particle rounded-full bg-shop-10"
          style={cssVars({
            '--particle-x': `${particle.x}px`,
            '--particle-y': `${particle.y}px`,
          })}
        />
      ))}
    </span>
  );
}

export type LikeButtonProps = Readonly<
  {
    label: string;
    likedLabel: string;
    defaultLiked?: boolean;
    count?: number;
  } & ComponentPropsWithoutRef<'button'>
>;

// Like — heart pops and scatters particles when toggled on.
export const LikeButton = forwardRef<HTMLButtonElement, LikeButtonProps>(
  ({ className, label, likedLabel, defaultLiked = false, count = 0, onClick, ...props }, ref) => {
    const [liked, setLiked] = useState(defaultLiked);
    const [burstKey, setBurstKey] = useState(0);

    const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
      onClick?.(event);
      setLiked((prev) => {
        if (!prev) setBurstKey((key) => key + 1);
        return !prev;
      });
    };

    const shown = count + (liked && !defaultLiked ? 1 : 0);

    return (
      <button
        ref={ref}
        type="button"
        aria-pressed={liked}
        aria-label={liked ? likedLabel : label}
        data-slot="like-button"
        onClick={handleClick}
        className={cn(
          'inline-flex h-10 cursor-pointer items-center gap-2 rounded-full pr-4 pl-3 font-sans text-sm font-medium select-none',
          'transition-[background-color,box-shadow,color] duration-base ease-standard',
          // Soft blurred top highlight (not a hard white rim) + lift shadows.
          'shadow-pill active:shadow-pill-pressed',
          liked
            ? 'bg-shop-10-soft text-shop-10-soft-foreground active:brightness-95'
            : 'bg-muted text-muted-foreground active:bg-accent hover-hover:hover:text-foreground',
          className,
        )}
        {...props}
      >
        <span className="relative flex size-5 items-center justify-center">
          {liked && <Burst key={burstKey} />}
          <Heart
            size={16}
            strokeWidth={2}
            aria-hidden
            className={cn(
              'relative z-10 transition-[transform,fill,color,filter] duration-slow ease-spring motion-reduce:transition-none',
              liked
                ? 'scale-110 fill-shop-10 text-shop-10 heart-glow'
                : 'scale-100 fill-transparent text-current heart-shadow',
            )}
          />
        </span>

        <span className="tabular-nums">{shown.toLocaleString('en-PH')}</span>
      </button>
    );
  },
);

LikeButton.displayName = 'LikeButton';
