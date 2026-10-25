'use client';

import { useState } from 'react';
import { HeartIcon } from 'lucide-react';
import { cn } from 'cn';
import { Hitbox } from '@smartapp/ui/components/hitbox';
import { Toggle } from '@smartapp/ui/components/toggle';
import { Burst } from '../vendor/opensource-ui/like-toggle';

export interface HeartToggleProps {
  pressed: boolean;
  onPressedChange: (pressed: boolean) => void;
  // Spoken label while off ("Save Classic Smash") and on ("Remove Classic Smash from favourites").
  label: string;
  pressedLabel: string;
  // glass: a frosted chip on a photo. card: a solid round button on a card.
  variant?: 'glass' | 'card' | undefined;
  // sm: 32 px chip with a 56 px touch area. md: 44 px.
  size?: 'sm' | 'md' | undefined;
  className?: string | undefined;
}

/**
 * Save-to-favourites heart (c-toggle-9) with the Like Toggle's spring, glow and particle burst
 * (composition C5). The chip has no z-index, so sticky bars always cover it.
 */
export function HeartToggle({
  pressed,
  onPressedChange,
  label,
  pressedLabel,
  variant = 'glass',
  size = 'sm',
  className,
}: HeartToggleProps) {
  // Each save restarts the burst; removing a save plays nothing.
  const [bursts, setBursts] = useState(0);
  return (
    <span
      data-slot="heart-toggle"
      className={cn(
        'inline-flex rounded-full border',
        variant === 'glass' ? 'glass shadow-sm' : 'bg-card shadow-xs',
        className,
      )}
    >
      <Hitbox
        size={size === 'sm' ? 'default' : 'sm'}
        radius="full"
        render={
          <Toggle
            pressed={pressed}
            onPressedChange={(next) => {
              if (next) setBursts(bursts + 1);
              onPressedChange(next);
            }}
            aria-label={pressed ? pressedLabel : label}
            className={cn(
              'rounded-full bg-transparent p-0 hover:bg-transparent aria-pressed:bg-transparent',
              size === 'sm' ? 'size-8 min-w-8' : 'size-11 min-w-11',
            )}
          >
            <span className="relative flex size-5 items-center justify-center">
              {pressed && bursts > 0 ? <Burst key={bursts} /> : null}
              <HeartIcon
                aria-hidden="true"
                strokeWidth={2.25}
                className={cn(
                  'relative size-4.5 transition-all duration-slow ease-spring motion-reduce:transition-none',
                  pressed
                    ? 'scale-110 fill-shop-10 text-shop-10 heart-glow'
                    : 'scale-100 fill-transparent text-foreground heart-shadow',
                )}
              />
            </span>
          </Toggle>
        }
      />
    </span>
  );
}
