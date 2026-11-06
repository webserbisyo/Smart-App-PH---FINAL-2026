import * as React from 'react';

/**
 * The phone Editor's sheet gestures (T78, the approved hand-written hook): drag the handle up or down to
 * pick a height or close, and swipe right on the panel to go back. Pointer events only; nothing moves under
 * reduced motion except the sheet following the finger.
 */

// A flick faster than this (px per ms) picks the next height in its direction.
const FLICK = 0.5;
// How far right a swipe must travel to go back, unless it was a flick.
const BACK_DISTANCE = 80;
// Movement before a touch counts as a swipe in one direction.
const DECIDE_AFTER = 10;

// Places a swipe must never start: typing, sliders, colour areas and rows that scroll sideways.
const NO_SWIPE = 'input, textarea, select, [contenteditable], [role="slider"], [data-no-swipe]';

function scrollsSideways(start: Element, stop: Element): boolean {
  let node: Element | null = start;
  while (node && node !== stop) {
    if (node instanceof HTMLElement && node.scrollWidth > node.clientWidth + 1) {
      const overflow = getComputedStyle(node).overflowX;
      if (overflow === 'auto' || overflow === 'scroll') return true;
    }
    node = node.parentElement;
  }
  return false;
}

export interface SheetDrag {
  /** Props for the drag handle. */
  handle: {
    onPointerDown: (event: React.PointerEvent<HTMLElement>) => void;
    onPointerMove: (event: React.PointerEvent<HTMLElement>) => void;
    onPointerUp: (event: React.PointerEvent<HTMLElement>) => void;
    onPointerCancel: (event: React.PointerEvent<HTMLElement>) => void;
    // A tap (no drag) steps to the next height; arrow keys step too, Escape closes.
    onClick: () => void;
    onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => void;
  };
  /** The sheet's height while the finger is down (a share of the area, 0 to 1), else null. */
  dragging: number | null;
}

/**
 * Drag the handle: the sheet follows the finger as a share of `area`'s height, then settles on the nearest
 * of `snaps` (sorted low to high), or the next one after a flick. Below the lowest by a margin, it closes.
 */
export function useSheetDrag({
  area,
  snaps,
  snap,
  onSnap,
  onClose,
}: {
  area: React.RefObject<HTMLElement | null>;
  snaps: readonly number[];
  snap: number;
  onSnap: (index: number) => void;
  onClose: () => void;
}): SheetDrag {
  const start = React.useRef<{ y: number; at: number; share: number; height: number } | null>(null);
  const last = React.useRef<{ y: number; at: number }>({ y: 0, at: 0 });
  const [dragging, setDragging] = React.useState<number | null>(null);
  // Set when the finger moved, so the click that follows a drag doesn't also step the height.
  const moved = React.useRef(false);

  const shareAt = (y: number) => {
    const from = start.current;
    if (!from) return null;
    return Math.min(0.95, Math.max(0.1, from.share - (y - from.y) / from.height));
  };

  const finish = (event: React.PointerEvent<HTMLElement>, cancelled: boolean) => {
    const from = start.current;
    const share = shareAt(event.clientY) ?? from?.share ?? 0;
    start.current = null;
    setDragging(null);
    if (!from || cancelled) return;
    const elapsed = Math.max(1, event.timeStamp - last.current.at);
    const speed = (event.clientY - last.current.y) / elapsed;
    const lowest = snaps[0] ?? 0;
    if (share < lowest - 0.08 || (speed > FLICK && snap === 0)) {
      onClose();
      return;
    }
    if (Math.abs(speed) > FLICK) {
      const next = speed > 0 ? snap - 1 : snap + 1;
      onSnap(Math.min(snaps.length - 1, Math.max(0, next)));
      return;
    }
    let best = 0;
    snaps.forEach((value, index) => {
      if (Math.abs(value - share) < Math.abs((snaps[best] ?? 0) - share)) best = index;
    });
    onSnap(best);
  };

  return {
    dragging,
    handle: {
      onPointerDown: (event) => {
        const height = area.current?.getBoundingClientRect().height ?? 0;
        if (height === 0) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        start.current = {
          y: event.clientY,
          at: event.timeStamp,
          share: snaps[snap] ?? 0.5,
          height,
        };
        last.current = { y: event.clientY, at: event.timeStamp };
        moved.current = false;
      },
      onPointerMove: (event) => {
        if (!start.current) return;
        if (Math.abs(event.clientY - start.current.y) > 4) moved.current = true;
        // The speed is read over the last stretch of the drag, not from the start.
        if (event.timeStamp - last.current.at > 60) {
          last.current = { y: event.clientY, at: event.timeStamp };
        }
        setDragging(shareAt(event.clientY));
      },
      onPointerUp: (event) => {
        if (moved.current) finish(event, false);
        else {
          start.current = null;
          setDragging(null);
        }
      },
      onPointerCancel: (event) => finish(event, true),
      onClick: () => {
        if (moved.current) {
          moved.current = false;
          return;
        }
        onSnap(snap + 1 < snaps.length ? snap + 1 : 0);
      },
      onKeyDown: (event) => {
        if (event.key === 'ArrowUp') onSnap(Math.min(snaps.length - 1, snap + 1));
        else if (event.key === 'ArrowDown') onSnap(Math.max(0, snap - 1));
        else if (event.key === 'Escape') onClose();
        else return;
        event.preventDefault();
      },
    },
  };
}

export interface SwipeBack {
  props: {
    onPointerDown: (event: React.PointerEvent<HTMLElement>) => void;
    onPointerMove: (event: React.PointerEvent<HTMLElement>) => void;
    onPointerUp: (event: React.PointerEvent<HTMLElement>) => void;
    onPointerCancel: () => void;
  };
  /** How far the panel follows the finger to the right, in px (0 when still). */
  offset: number;
}

/** Swipe right with a finger to go back. Vertical scrolling stays the browser's (`touch-action: pan-y`). */
export function useSwipeBack(onBack: (() => void) | undefined): SwipeBack {
  const start = React.useRef<{ x: number; y: number; at: number; way: 'x' | 'y' | null } | null>(
    null,
  );
  const [offset, setOffset] = React.useState(0);

  const reset = () => {
    start.current = null;
    setOffset(0);
  };

  return {
    offset,
    props: {
      onPointerDown: (event) => {
        if (!onBack || event.pointerType !== 'touch') return;
        const target = event.target;
        if (!(target instanceof Element)) return;
        if (target.closest(NO_SWIPE) || scrollsSideways(target, event.currentTarget)) return;
        start.current = { x: event.clientX, y: event.clientY, at: event.timeStamp, way: null };
      },
      onPointerMove: (event) => {
        const from = start.current;
        if (!from) return;
        const dx = event.clientX - from.x;
        const dy = event.clientY - from.y;
        if (from.way === null) {
          if (Math.abs(dx) < DECIDE_AFTER && Math.abs(dy) < DECIDE_AFTER) return;
          from.way = dx > 0 && Math.abs(dx) > Math.abs(dy) * 1.5 ? 'x' : 'y';
        }
        if (from.way === 'x') setOffset(Math.max(0, dx));
      },
      onPointerUp: (event) => {
        const from = start.current;
        reset();
        if (!from || from.way !== 'x' || !onBack) return;
        const dx = event.clientX - from.x;
        const speed = dx / Math.max(1, event.timeStamp - from.at);
        if (dx > BACK_DISTANCE || (dx > DECIDE_AFTER * 2 && speed > FLICK)) onBack();
      },
      onPointerCancel: reset,
    },
  };
}
