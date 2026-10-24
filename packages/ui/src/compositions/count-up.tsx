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

// The final number shows at once under reduced motion and before the ticker loads.
export function CountUp({ value, decimalPlaces = 0, className }: CountUpProps) {
  const reducedMotion = useReducedMotion();
  const final = (
    <span className={cn('tabular-nums', className)}>
      {Intl.NumberFormat('en-PH', {
        minimumFractionDigits: decimalPlaces,
        maximumFractionDigits: decimalPlaces,
      }).format(value)}
    </span>
  );
  if (reducedMotion) return final;
  return (
    <Suspense fallback={final}>
      <NumberTicker
        value={value}
        decimalPlaces={decimalPlaces}
        className={cn('tracking-normal text-current', className)}
      />
    </Suspense>
  );
}
