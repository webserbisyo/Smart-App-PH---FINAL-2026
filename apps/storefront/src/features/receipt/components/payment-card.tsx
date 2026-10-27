import { lazy, Suspense } from 'react';
import { isTransfer, type OrderReceipt } from '@smartapp/core';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { isOrderCancelled } from '../receipt-rules';
import { PayCountdown } from './pay-countdown';

// The proof picker (photo compression, upload progress) loads after the page's first JavaScript; the
// server's copy shows meanwhile (decision R49).
const ProofUploader = lazy(() =>
  import('./proof-uploader').then((m) => ({ default: m.ProofUploader })),
);

export interface PaymentCardProps {
  readonly slug: string;
  readonly order: OrderReceipt;
  readonly shopName: string;
}

/** One card while a transfer is unpaid or being checked: the countdown and details, then the proof. */
export function PaymentCard({ slug, order, shopName }: PaymentCardProps) {
  const open =
    isTransfer(order.paymentMethod) &&
    !isOrderCancelled(order.status) &&
    (order.paymentStatus === 'unpaid' || order.paymentStatus === 'pending');
  if (!open) return null;

  return (
    <section
      id="receipt-payment"
      className="flex flex-col gap-5 divide-y divide-dashed rounded-3xl bg-card p-5 shadow-xs ring-1 ring-foreground/8 *:not-first:pt-5 sm:p-6 print:hidden"
    >
      <PayCountdown order={order} shopName={shopName} />
      <Suspense fallback={<Skeleton className="h-40 w-full rounded-2xl" />}>
        <ProofUploader slug={slug} order={order} />
      </Suspense>
    </section>
  );
}
