'use client';

import * as React from 'react';
import { cn } from 'cn';
import { useReducedMotion } from '../hooks/use-reduced-motion';

export interface CountUpProps {
  value: number;
  // Where the first count starts (default 0), for example the stamps the member saw last time.
  from?: number | undefined;
  decimalPlaces?: number | undefined;
  className?: string | undefined;
}

// ux.md: motion stays under 400 ms. The count lands on the real number well inside that.
const DURATION_MS = 380;

function formatCount(value: number, decimalPlaces: number): string {
  return Intl.NumberFormat('en-PH', {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  }).format(value);
}

// Writes into the text node React made, so React and the count always share one node.
function write(node: HTMLSpanElement, text: string): void {
  const first = node.firstChild;
  if (first && first.nodeType === Node.TEXT_NODE) first.nodeValue = text;
  else node.textContent = text;
}

// Fast at first, gentle at the end.
function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

/**
 * A number that counts up once, from 0 to its value in under 400 ms (decision T110), then follows later
 * changes with the same short count. Use it on one headline number per page at most: every other number
 * shows its final value at once. It writes the text straight into the span on each frame, so nothing above
 * it re-renders, and stops as soon as the value is reached. Under reduced motion the final number shows.
 *
 * Replaces the Magic UI Number Ticker here (T110): its spring took 9 to 18 seconds to settle and kept
 * the page busy the whole time.
 */
export function CountUp({ value, from = 0, decimalPlaces = 0, className }: CountUpProps) {
  const reducedMotion = useReducedMotion();
  const ref = React.useRef<HTMLSpanElement>(null);
  // What React writes once; after that only the effect changes the text (React sees the same string).
  const [first] = React.useState(() => (reducedMotion ? value : from));
  // Where the next count starts: 0 the first time, then the number on screen.
  const shown = React.useRef(first);

  React.useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const start0 = shown.current;
    if (reducedMotion || start0 === value) {
      shown.current = value;
      write(node, formatCount(value, decimalPlaces));
      return;
    }
    let frame = 0;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION_MS);
      const current = start0 + (value - start0) * easeOutCubic(t);
      shown.current = current;
      write(node, formatCount(t === 1 ? value : current, decimalPlaces));
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(frame);
      // A stopped count jumps to its number, so the next one never starts below the truth.
      shown.current = value;
      write(node, formatCount(value, decimalPlaces));
    };
  }, [value, decimalPlaces, reducedMotion]);

  return (
    <span ref={ref} className={cn('tabular-nums', className)}>
      {formatCount(first, decimalPlaces)}
    </span>
  );
}
