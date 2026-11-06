import * as React from 'react';
import { editorWords } from '@smartapp/core';
import { ScrollHint } from '@smartapp/ui/compositions/scroll-hint';
import { useReducedMotion } from '@smartapp/ui/hooks/use-reduced-motion';
import { cssVars } from '@smartapp/ui/lib/css-vars';
import { cn } from 'cn';
import { useSheetDrag, useSwipeBack } from './use-sheet-gestures.js';

const W = editorWords.phone;

// The sheet's heights, as a share of the space between the top bar and the dock (T78).
export const SHEET_SNAPS = [0.35, 0.55, 0.85] as const;

/**
 * Phones (T78): the list, a part or the pages sit in a sheet docked above the Editor's dock, never over it,
 * so the preview always shows above. Drag the handle for a height (or tap it), swipe right to go back.
 */
export function PhoneSheet({
  area,
  snap,
  onSnap,
  onClose,
  onBack,
  label,
  children,
}: {
  area: React.RefObject<HTMLElement | null>;
  snap: number;
  onSnap: (index: number) => void;
  onClose: () => void;
  onBack?: (() => void) | undefined;
  label: string;
  children: React.ReactNode;
}) {
  const drag = useSheetDrag({ area, snaps: SHEET_SNAPS, snap, onSnap, onClose });
  const swipe = useSwipeBack(onBack);
  const reduced = useReducedMotion();
  const share = drag.dragging ?? SHEET_SNAPS[snap] ?? 0.55;
  const still = drag.dragging === null && swipe.offset === 0;

  return (
    <section
      aria-label={label}
      className={cn(
        'relative flex h-(--sheet-h) shrink-0 flex-col overflow-hidden rounded-t-2xl border-t border-border bg-background shadow-lg',
        still && !reduced && 'transition-all duration-base ease-out',
      )}
      style={cssVars({ '--sheet-h': `${Math.round(share * 1000) / 10}%` })}
    >
      <button
        type="button"
        aria-label={W.handle}
        title={W.handleHint}
        className="flex h-10 w-full shrink-0 touch-none items-center justify-center outline-none focus-visible:bg-muted"
        {...drag.handle}
      >
        <span aria-hidden className="h-1 w-10 rounded-full bg-border" />
      </button>
      <div
        className="flex min-h-0 flex-1 translate-x-(--swipe-x) flex-col pb-safe"
        style={cssVars({ '--swipe-x': `${swipe.offset}px` })}
        {...swipe.props}
      >
        {/* Up and down stay the browser's scroll; sideways is the swipe back (on the scroller itself, since
            touch-action stops at the nearest scrolling box). */}
        <ScrollHint className="touch-pan-y">{children}</ScrollHint>
      </div>
    </section>
  );
}
