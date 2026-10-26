'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { artPath, words, type OrderReceipt } from '@smartapp/core';
import { useOnline, useOrder, useSavedReceipt } from '@smartapp/data';
import { Alert, AlertDescription, AlertTitle } from '@smartapp/ui/components/reui/alert';
import { Button } from '@smartapp/ui/components/button';
import { EmptyState } from '@smartapp/ui/compositions/empty-state';
import { ArrowLeft, WifiOff } from 'lucide-react';
import { useShop } from '../../shell/components/shop-context';
import { ReceiptHeader } from './receipt-header';
import { PaymentCard } from './payment-card';
import { OrderThread } from './order-thread';
import { ThermalSlip } from './thermal-slip';
import { MessengerHandoff } from './messenger-handoff';
import { ReceiptActions } from './receipt-actions';
import { ReceiptSkeleton } from './receipt-skeleton';
import { formatManilaTime } from '../receipt-rules';

export interface ReceiptWrapperProps {
  readonly slug: string;
  readonly token: string;
  readonly initialOrder?: OrderReceipt | null;
}

function emptySubscribe() {
  return () => {};
}

// Dev-only panel dynamically imported so it is completely excluded from production builds
const DevControls =
  process.env.NODE_ENV !== 'production'
    ? dynamic(() => import('./demo-owner-panel').then((m) => m.DemoOwnerPanel), { ssr: false })
    : () => null;

export function ReceiptWrapper({ slug, token, initialOrder }: ReceiptWrapperProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  // Checkout opens the receipt with ?new=1: keep "just placed" for this visit, then drop the flag.
  const [justPlaced] = useState(() => searchParams.get('new') === '1');

  const isOnline = useOnline();
  const { shop } = useShop();
  const { data: order, isLoading: orderLoading, error } = useOrder(slug, token, initialOrder);
  const saved = useSavedReceipt(slug, token);

  const currentOrder = order ?? saved?.receipt ?? initialOrder;
  const hasOrder = Boolean(currentOrder);

  useEffect(() => {
    if (!justPlaced || !hasOrder) return;
    // Next keeps useSearchParams in step with the History API, without a new navigation.
    window.history.replaceState(window.history.state, '', pathname);
    document.getElementById('receipt-order-number')?.focus({ preventScroll: true });
  }, [justPlaced, hasOrder, pathname]);

  const origin = useSyncExternalStore(
    emptySubscribe,
    () => window.location.origin,
    () => '',
  );
  const receiptUrl = origin ? `${origin}/${slug}/o/${token}` : `/${slug}/o/${token}`;

  if (orderLoading && !currentOrder) {
    return <ReceiptSkeleton />;
  }

  if (!currentOrder && (error || !orderLoading)) {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col py-6">
        <EmptyState
          id="receipt-not-found"
          art={artPath('not_found')}
          title={words.receipt.notFoundTitle}
          description={words.receipt.notFoundDescription}
          action={
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href={`/${slug}`} />}
              className="h-11 gap-2 rounded-full bg-card px-5"
            >
              <ArrowLeft aria-hidden="true" className="size-4" />
              {words.receipt.backToShop}
            </Button>
          }
        />
      </div>
    );
  }

  if (!currentOrder) {
    return <ReceiptSkeleton />;
  }

  const storefront = shop.storefront;
  const lastEvent = currentOrder.events[currentOrder.events.length - 1];
  const lastUpdatedTime = formatManilaTime(lastEvent?.at ?? currentOrder.placedAt);

  return (
    <div id="receipt-container" className="mx-auto flex w-full max-w-xl flex-col gap-4 pb-6">
      {!isOnline && (
        <Alert variant="info" className="print:hidden">
          <WifiOff />
          <AlertTitle>{words.receipt.offlineTitle}</AlertTitle>
          <AlertDescription>{words.receipt.offlineSaved(lastUpdatedTime)}</AlertDescription>
        </Alert>
      )}

      <ReceiptHeader
        order={currentOrder}
        storefront={storefront}
        receiptUrl={receiptUrl}
        justPlaced={justPlaced}
      />

      <PaymentCard slug={slug} order={currentOrder} shopName={storefront.info.name} />

      <OrderThread order={currentOrder} />

      <ThermalSlip order={currentOrder} storefront={storefront} receiptUrl={receiptUrl} />

      <MessengerHandoff order={currentOrder} storefront={storefront} receiptUrl={receiptUrl} />

      <ReceiptActions
        slug={slug}
        order={currentOrder}
        storefront={storefront}
        receiptUrl={receiptUrl}
      />

      {/* Dev-only controls for testing without dashboard */}
      <DevControls slug={slug} order={currentOrder} />
    </div>
  );
}
