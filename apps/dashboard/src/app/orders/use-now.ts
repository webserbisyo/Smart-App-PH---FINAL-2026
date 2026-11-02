import * as React from 'react';

/**
 * Shared page clock hook (O3 speed rule 1).
 * Updates every intervalMs (default 30 seconds) to avoid per-ticket timers.
 */
export function useNow(intervalMs = 30_000): Date {
  const [now, setNow] = React.useState(() => new Date());

  React.useEffect(() => {
    const id = setInterval(() => {
      setNow(new Date());
    }, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
