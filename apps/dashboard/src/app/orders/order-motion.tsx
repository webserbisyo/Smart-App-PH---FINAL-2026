import * as React from 'react';
import { AnimatePresence, motion, useReducedMotion } from '@smartapp/ui/lib/motion';

export { AnimatePresence };

// Durations in seconds, matching the dashboard's duration tokens (180 / 260 ms).
const BASE = 0.18;
const SLOW = 0.26;
const STAGGER = 0.03;
const MAX_STAGGERED = 10;

export interface FadeUpProps {
  index?: number;
  children: React.ReactNode;
  className?: string | undefined;
  // In an AnimatePresence list: slide out when the card leaves (phone stage list).
  exit?: boolean;
}

/** First load: cards fade up 8 px, 30 ms apart (only the first 10 wait). Off for reduced motion. */
export function FadeUp({ index = 0, children, className, exit = false }: FadeUpProps) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      {...(exit ? { exit: { opacity: 0, x: -24, transition: { duration: BASE } } } : {})}
      transition={{
        duration: SLOW,
        ease: 'easeOut',
        delay: Math.min(index, MAX_STAGGERED) * STAGGER,
      }}
      layout={exit ? 'position' : false}
    >
      {children}
    </motion.div>
  );
}

/** Ids of orders that arrived after the first load, kept for 2 seconds (the new-order glow, D12). */
export function useFreshIds(ids: readonly string[], ready: boolean): ReadonlySet<string> {
  const known = React.useRef<Set<string> | null>(null);
  const timers = React.useRef<number[]>([]);
  const [fresh, setFresh] = React.useState<ReadonlySet<string>>(() => new Set());
  const key = ids.join(',');
  React.useEffect(() => {
    if (!ready) return;
    const current = key ? key.split(',') : [];
    if (known.current === null) {
      known.current = new Set(current);
      return;
    }
    const seen = known.current;
    const arrived = current.filter((id) => !seen.has(id));
    for (const id of current) seen.add(id);
    if (arrived.length === 0) return;
    setFresh((prev) => new Set([...prev, ...arrived]));
    timers.current.push(
      window.setTimeout(() => {
        setFresh((prev) => new Set([...prev].filter((id) => !arrived.includes(id))));
      }, 2000),
    );
  }, [key, ready]);
  React.useEffect(() => {
    const list = timers.current;
    return () => {
      for (const t of list) window.clearTimeout(t);
    };
  }, []);
  return fresh;
}
