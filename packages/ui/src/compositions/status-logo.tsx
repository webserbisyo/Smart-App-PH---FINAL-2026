import { cn } from 'cn';
import type { OpenStateKind } from '@smartapp/core';
import type { ImageSources } from '@smartapp/core/media';
import { ShopLogo } from './shop-logo';

export interface StatusLogoProps {
  name: string;
  src: ImageSources | null;
  // null while the clock loads: a plain ring and no word.
  state: OpenStateKind | null;
  // The word on a chip under the ring: "Busy", "Closed". Open shows the ring alone (decision R21).
  stateLabel: string;
  size?: 'md' | 'lg' | undefined;
  className?: string | undefined;
}

// Open: the turning gradient ring of c-avatar-33 in the success colours. Busy: a still amber ring.
// Closed: a plain grey ring (decision R4), never red.
const RING_CLASS = {
  open: '-inset-1 animate-spin-slow bg-linear-to-tr from-success via-success-soft to-success opacity-80 blur-xs',
  busy: '-inset-0.5 bg-warning',
  closed: '-inset-0.5 bg-muted-foreground/30',
} as const;

const WORD_CLASS = {
  open: 'bg-success text-success-foreground',
  busy: 'bg-warning text-warning-foreground',
  closed: 'bg-muted text-muted-foreground',
} as const;

/** The shop logo inside its open, busy or closed ring; busy and closed add the word on a chip (composition C1). */
export function StatusLogo({
  name,
  src,
  state,
  stateLabel,
  size = 'md',
  className,
}: StatusLogoProps) {
  return (
    <span
      data-slot="status-logo"
      data-state={state ?? undefined}
      className={cn('relative inline-flex shrink-0 rounded-full', className)}
    >
      <span
        aria-hidden="true"
        className={cn('absolute rounded-full', state ? RING_CLASS[state] : '-inset-0.5 bg-border')}
      />
      <ShopLogo
        name={name}
        src={src}
        size={size}
        shape="round"
        className="relative ring-2 ring-background"
      />
      {state && state !== 'open' ? (
        <span
          className={cn(
            'absolute -bottom-1.5 left-1/2 -translate-x-1/2 rounded-full px-1.5 text-xs leading-4 font-semibold whitespace-nowrap ring-2 ring-background',
            WORD_CLASS[state],
          )}
        >
          {stateLabel}
        </span>
      ) : null}
    </span>
  );
}
