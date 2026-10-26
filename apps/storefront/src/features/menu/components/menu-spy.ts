'use client';

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { useReducedMotion } from '@smartapp/ui/hooks/use-reduced-motion';

// ReUI Scrollspy notes (docs/components.md): with the page as its target it reads the first
// scroll-area viewport anywhere in the document, so the Menu page has no ScrollArea. It measures
// sections by offsetTop, so a section's offsetParent must be <body> (no positioned wrapper).

export interface MenuSpy {
  target: RefObject<Document | null>;
  // Height covered by the top bar and the sticky menu bar, plus a gap.
  offset: number;
  smooth: boolean;
}

export function sectionId(categoryId: string): string {
  return `cat-${categoryId}`;
}

/** Scrolls a chip row (x) or the rail (y) just enough to show the active category. */
export function keepInView(container: HTMLElement | null, id: string, axis: 'x' | 'y'): void {
  if (!container) return;
  const anchor = container.querySelector(`[data-scrollspy-anchor="${CSS.escape(id)}"]`);
  if (!(anchor instanceof HTMLElement)) return;
  const box = container.getBoundingClientRect();
  const item = anchor.getBoundingClientRect();
  const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const behavior = smooth ? 'smooth' : 'auto';
  if (axis === 'x') {
    const delta = item.left - box.left - (box.width - item.width) / 2;
    container.scrollBy({ left: delta, behavior });
  } else if (item.top < box.top || item.bottom > box.bottom) {
    container.scrollBy({ top: item.top - box.top - (box.height - item.height) / 2, behavior });
  }
}

/**
 * The page as the spy's target and the offset under the sticky bars, measured from the bar
 * itself (its sticky top plus its height), so the safe area and both layouts are covered.
 */
export function useMenuSpy(bar: RefObject<HTMLElement | null>): {
  spy: MenuSpy | null;
  jumpTo: (categoryId: string, smooth: boolean) => boolean;
} {
  const target = useRef<Document | null>(null);
  const [offset, setOffset] = useState(0);
  const reduced = useReducedMotion();

  // Read fresh each time: the bar grows when the chips come back after a search.
  const measure = useCallback(() => {
    const element = bar.current;
    if (!element) return 0;
    return Math.round(Number.parseFloat(getComputedStyle(element).top) + element.offsetHeight + 16);
  }, [bar]);

  useEffect(() => {
    target.current = document;
    const element = bar.current;
    if (!element) return;
    const update = () => setOffset(measure());
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [bar, measure]);

  const jumpTo = useCallback(
    (categoryId: string, smooth: boolean) => {
      const section = document.getElementById(sectionId(categoryId));
      if (!section) return false;
      const top = section.getBoundingClientRect().top + window.scrollY - measure();
      window.scrollTo({ top, behavior: smooth && !reduced ? 'smooth' : 'auto' });
      return true;
    },
    [measure, reduced],
  );

  return { spy: offset > 0 ? { target, offset, smooth: !reduced } : null, jumpTo };
}
