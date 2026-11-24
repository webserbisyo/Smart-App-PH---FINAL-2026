'use client';

import { useCallback, useState } from 'react';
import { useNow } from '@smartapp/data';
import { CheckoutForm } from './checkout-form';
import { CheckoutSkeleton } from './checkout-skeleton';

export function CheckoutFormWrapper() {
  const now = useNow();
  // A new round after each placed order: the form starts again from the saved details.
  const [round, setRound] = useState(0);
  const nextRound = useCallback(() => setRound((r) => r + 1), []);
  if (!now) {
    return <CheckoutSkeleton />;
  }

  return <CheckoutForm key={round} now={now} onSpent={nextRound} />;
}
