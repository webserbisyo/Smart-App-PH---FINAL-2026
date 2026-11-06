import * as React from 'react';

/**
 * Keeps the installed DiceUI Scroller's edge fades right (T77). The Scroller only re-checks its edges on
 * scroll and window resize, so content that loads or grows later (fonts, data) leaves a box that scrolls
 * with no fade. This re-checks whenever the box or its content changes size.
 */
export function useScrollerRecheck<T extends HTMLElement>(): React.RefObject<T | null> {
  const ref = React.useRef<T>(null);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const recheck = () => el.dispatchEvent(new Event('scroll'));
    const observer = new ResizeObserver(recheck);
    observer.observe(el);
    for (const child of Array.from(el.children)) observer.observe(child);
    return () => observer.disconnect();
  }, []);
  return ref;
}
