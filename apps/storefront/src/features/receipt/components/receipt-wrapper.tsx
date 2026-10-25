'use client';

import { useSyncExternalStore } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { OrderReceipt } from '@smartapp/core';
import { useOnline, useOrder, useSavedReceipt } from '@smartapp/data';
import { Alert, AlertDescription, AlertTitle } from '@smartapp/ui/components/reui/alert';
import { Button } from '@smartapp/ui/components/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@smartapp/ui/components/empty';
import { ArrowLeft, SearchX, WifiOff } from 'lucide-react';
import { useShop } from '../../shell/components/shop-context';
import { ReceiptHeader } from './receipt-header';
import { PayCountdown } from './pay-countdown';
import { ProofUploader } from './proof-uploader';
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
  const isNewOrder = searchParams.get('new') === '1';

  const isOnline = useOnline();
  const { shop } = useShop();
  const { data: order, isLoading: orderLoading, error } = useOrder(slug, token, initialOrder);
  const saved = useSavedReceipt(slug, token);

  const currentOrder = order ?? saved?.receipt ?? initialOrder;

  const origin = useSyncExternalStore(
    emptySubscribe,
    () => window.location.origin,
    () => '',
  );
  const receiptUrl = origin ? `${origin}/${slug}/o/${token}` : `/${slug}/o/${token}`;

  if (orderLoading && !currentOrder) {
    return <ReceiptSkeleton />;
  }

  // Not found or unknown order token (c-empty-7 pattern)
  if (!currentOrder && (error || !orderLoading)) {
    return (
      <div className="flex min-h-96 flex-col items-center justify-center p-4">
        <Empty id="receipt-not-found" className="max-w-md text-center">
          <EmptyHeader>
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <SearchX className="size-6" />
            </div>
            <EmptyTitle>We can't find this order</EmptyTitle>
            <EmptyDescription>
              This order link is incorrect or has expired. Please check your link or contact the
              shop.
            </EmptyDescription>
          </EmptyHeader>
          <div className="mt-4 flex justify-center">
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href={`/${slug}`} />}
              className="gap-2"
            >
              <ArrowLeft className="size-4" />
              <span>Back to the shop</span>
            </Button>
          </div>
        </Empty>
      </div>
    );
  }

  if (!currentOrder) {
    return <ReceiptSkeleton />;
  }

  const storefront = shop.storefront;

  const lastUpdatedTime =
    currentOrder.events.length > 0
      ? formatManilaTime(
          currentOrder.events[currentOrder.events.length - 1]?.at ?? currentOrder.placedAt,
        )
      : formatManilaTime(currentOrder.placedAt);

  return (
    <div
      id="receipt-container"
      className="mx-auto flex w-full max-w-xl flex-col gap-5 px-4 py-6 sm:py-8"
    >
      {/* Offline banner */}
      {!isOnline && (
        <Alert variant="info" className="bg-muted">
          <WifiOff className="size-4 text-muted-foreground" />
          <AlertTitle>You're offline</AlertTitle>
          <AlertDescription>
            Showing saved copy from your phone. Last updated {lastUpdatedTime}.
          </AlertDescription>
        </Alert>
      )}

      {/* 1. Header with order #, QR, and c-stepper-26 status track */}
      <ReceiptHeader
        order={currentOrder}
        storefront={storefront}
        receiptUrl={receiptUrl}
        isNewOrder={isNewOrder}
      />

      {/* 2. Pay countdown for unpaid transfer orders */}
      <PayCountdown order={currentOrder} />

      {/* 3. Proof uploader */}
      <ProofUploader slug={slug} order={currentOrder} />

      {/* 4. Order thread (proofs, system lines, rider delivery tracking) */}
      <OrderThread order={currentOrder} />

      {/* 5. Thermal slip */}
      <ThermalSlip order={currentOrder} storefront={storefront} receiptUrl={receiptUrl} />

      {/* 6. Messenger handoff */}
      <MessengerHandoff order={currentOrder} storefront={storefront} receiptUrl={receiptUrl} />

      {/* 7. Receipt actions (more menu, rating, install card, order again) */}
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
