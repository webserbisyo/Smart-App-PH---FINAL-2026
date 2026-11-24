import { cn } from 'cn';
import type { OpenStateKind } from '@smartapp/core';
import type { ImageSources } from '@smartapp/core/media';
import { AvatarBadge } from '@smartapp/ui/components/avatar';
import { ShopLogo } from './shop-logo';

export interface StatusLogoProps {
  name: string;
  src: ImageSources | null;
  // null while the clock loads: no dot.
  state: OpenStateKind | null;
  size?: 'md' | 'lg' | undefined;
  // The owner's pick in the Editor (decision T76 C7): a circle or a rounded square.
  logoShape?: 'circle' | 'rounded' | undefined;
  // The dot's outline matches what is behind the logo (the shop page colour in the top bar).
  dotRingClassName?: string | undefined;
  className?: string | undefined;
}

// Decision T115: a still dot on the logo's corner (shadcn AvatarBadge). Green open, orange busy, grey
// closed or paused (never red, decision R4). The word sits beside the logo, never on it.
const DOT_CLASS = {
  open: 'bg-success',
  busy: 'bg-warning',
  closed: 'bg-muted-foreground',
} as const;

const DOT_SIZE = { md: 'size-3', lg: 'size-4' } as const;

/** The shop logo with its open, busy or closed dot (composition C1). The dot is decoration: say the state in words nearby. */
export function StatusLogo({
  name,
  src,
  state,
  size = 'md',
  logoShape = 'circle',
  dotRingClassName,
  className,
}: StatusLogoProps) {
  return (
    <ShopLogo
      name={name}
      src={src}
      size={size}
      shape={logoShape === 'circle' ? 'round' : 'square'}
      className={cn('shrink-0', className)}
      badge={
        state ? (
          <AvatarBadge
            aria-hidden="true"
            data-state={state}
            className={cn(
              '-right-0.5 -bottom-0.5',
              DOT_SIZE[size],
              DOT_CLASS[state],
              dotRingClassName,
            )}
          />
        ) : null
      }
    />
  );
}
