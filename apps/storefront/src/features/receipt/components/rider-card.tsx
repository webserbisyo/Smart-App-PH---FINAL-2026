import { words, type OrderReceipt } from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import { Bike, ExternalLink, Phone } from 'lucide-react';

/** The rider and the tracking link (c-item-4), on the receipt while a delivery is on its way. */
export function RiderCard({ order }: { readonly order: OrderReceipt }) {
  const rider = order.rider;
  if (!rider) return null;
  const T = words.receipt.thread;
  return (
    <section
      id="receipt-rider"
      aria-label={T.rider}
      className="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-card p-4 text-sm shadow-xs ring-1 ring-foreground/8 print:hidden"
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-shop-10-soft text-shop-10-soft-foreground">
          <Bike aria-hidden="true" className="size-5" />
        </div>
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-semibold text-foreground">{rider.name}</span>
          <span className="truncate text-xs text-muted-foreground">
            {rider.provider ?? T.rider}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {rider.phone ? (
          <Button
            variant="outline"
            nativeButton={false}
            render={<a href={`tel:${rider.phone}`} />}
            aria-label={T.callRider(rider.name)}
            className="h-11 gap-1.5 rounded-full bg-card px-4"
          >
            <Phone aria-hidden="true" className="size-4" />
            {T.call}
          </Button>
        ) : null}
        {order.trackingUrl ? (
          <Button
            nativeButton={false}
            render={<a href={order.trackingUrl} target="_blank" rel="noopener noreferrer" />}
            className="h-11 gap-1.5 rounded-full px-4"
          >
            {T.track}
            <ExternalLink aria-hidden="true" className="size-4" />
          </Button>
        ) : null}
      </div>
    </section>
  );
}
