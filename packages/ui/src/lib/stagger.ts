// Rows that fade in one after another, once, when a list first shows (decision T110). Plain CSS from
// tw-animate-css: nothing measures the page and nothing moves after the fade, unlike Magic UI Animated
// List, whose layout animation made rows cross each other whenever a card above them changed height.
// Off under reduced motion; the whole run ends within 400 ms (ux.md). `duration-200` is the duration-base
// time: the `duration-base` utility only sets transitions, and this is an animation.

const BASE =
  'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1 motion-safe:duration-200 motion-safe:fill-mode-both';

// Written out in full so Tailwind finds each class.
const DELAYS = ['delay-0', 'delay-40', 'delay-80', 'delay-120', 'delay-160', 'delay-200'] as const;

/** The classes for the row at `index` (0 = top). Rows past the sixth share the last delay. */
export function staggerIn(index: number): string {
  return `${BASE} ${DELAYS[Math.min(Math.max(0, index), DELAYS.length - 1)]}`;
}
