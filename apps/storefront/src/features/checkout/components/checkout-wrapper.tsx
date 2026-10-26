'use client';

import { useNow } from '@smartapp/data';
import { CheckoutForm } from './checkout-form';
import { CheckoutSkeleton } from './checkout-skeleton';

export function CheckoutFormWrapper() {
  const now = useNow();
  if (!now) {
    return <CheckoutSkeleton />;
  }

  return <CheckoutForm now={now} />;
}
