import * as React from 'react';
import { ChevronDownIcon } from 'lucide-react';
import { scrollWords } from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import { Scroller } from '@smartapp/ui/components/scroller';
import { cn } from 'cn';
import { useReducedMotion } from '../hooks/use-reduced-motion';
import { useScrollerRecheck } from '../hooks/use-scroller-recheck';

export interface ScrollHintProps {
  children: React.ReactNode;
  // Classes for the scrolling box (padding, gaps).
  className?: string | undefined;
  // Shows the "More below" button while content is hidden underneath; the fade always shows.
  withButton?: boolean;
}

/**
 * A scrolling body that says it scrolls (T77): the installed DiceUI Scroller fades the edge where more
 * is hidden, a "More below" button scrolls down a page, and a mouse gets a thin scrollbar back (touch
 * keeps none). useScrollerRecheck keeps the fade right when content grows.
 */
export function ScrollHint({ children, className, withButton = true }: ScrollHintProps) {
  const ref = useScrollerRecheck<HTMLDivElement>();
  const reduced = useReducedMotion();
  const [more, setMore] = React.useState(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => setMore(el.scrollTop + el.clientHeight + 8 < el.scrollHeight);
    check();
    // The re-check fires a scroll event when content grows, so this runs then too.
    el.addEventListener('scroll', check, { passive: true });
    return () => el.removeEventListener('scroll', check);
  }, [ref]);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <Scroller
        ref={ref}
        size={32}
        className={cn('scrollbar-fine min-h-0 flex-1 overscroll-contain', className)}
      >
        <div className="min-w-0">{children}</div>
      </Scroller>
      {withButton && more ? (
        <Button
          type="button"
          variant="secondary"
          className="absolute bottom-3 left-1/2 h-11 -translate-x-1/2 gap-1 rounded-full border bg-popover px-4 shadow-md md:h-9"
          onClick={() => {
            const el = ref.current;
            if (!el) return;
            el.scrollBy({ top: el.clientHeight * 0.7, behavior: reduced ? 'auto' : 'smooth' });
          }}
        >
          {scrollWords.moreBelow}
          <ChevronDownIcon aria-hidden="true" />
        </Button>
      ) : null}
    </div>
  );
}
