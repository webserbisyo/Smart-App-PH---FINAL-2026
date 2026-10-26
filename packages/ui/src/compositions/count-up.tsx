'use client';

import { lazy, Suspense } from 'react';
import { cn } from 'cn';
import { useReducedMotion } from '../hooks/use-reduced-motion';

// Magic UI Number Ticker pulls in motion; it loads only where CountUp is used (Rewards).
const NumberTicker = lazy(() =>
  import('@smartapp/ui/components/number-ticker').then((m) => ({ default: m.NumberTicker })),
);

export interface CountUpProps {
  value: number;
  decimalPlaces?: number | undefined;
  className?: string | undefined;
}

function formatCount(value: number, decimalPlaces: number): string {
  return Intl.NumberFormat('en-PH', {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  }).format(value);
}

// The final number shows at once under reduced motion. While the ticker loads it shows where the count
// starts (0), so the number never jumps back down when the ticker takes over.
export function CountUp({ value, decimalPlaces = 0, className }: CountUpProps) {
  const reducedMotion = useReducedMotion();
  if (reducedMotion) {
    return (
      <span className={cn('tabular-nums', className)}>{formatCount(value, decimalPlaces)}</span>
    );
  }
  return (
    <Suspense
      fallback={
        <span className={cn('tabular-nums', className)}>{formatCount(0, decimalPlaces)}</span>
      }
    >
      <NumberTicker
        value={value}
        decimalPlaces={decimalPlaces}
        className={cn('tracking-normal text-current', className)}
      />
    </Suspense>
  );
}
