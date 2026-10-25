'use client';

import { formatPeso, words } from '@smartapp/core';
import { Separator } from '@smartapp/ui/components/separator';
import { Skeleton } from '@smartapp/ui/components/skeleton';

export interface BasketTotalsProps {
  subtotal: number;
  deliveryFee: number | null;
  discount: number;
  total: number;
  isLoadingQuote: boolean;
  hasQuoteData: boolean;
  quoteError: boolean;
  isOnline: boolean;
}

// Order summary and totals: pattern c-separator-6 (rows wrap, no table).
export function BasketTotals({
  subtotal,
  deliveryFee,
  discount,
  total,
  isLoadingQuote,
  hasQuoteData,
  quoteError,
  isOnline,
}: BasketTotalsProps) {
  const showSkeleton = isLoadingQuote && !hasQuoteData;

  const deliveryFeeLabel =
    deliveryFee !== null && deliveryFee > 0
      ? formatPeso(deliveryFee)
      : words.basket.deliveryFeeAtCheckout;

  return (
    <div className="flex flex-col gap-2 pt-2 text-sm">
      <Separator />

      <dl className="flex items-center justify-between gap-2">
        <dt className="text-muted-foreground">{words.basket.subtotal}</dt>
        <dd className="font-medium whitespace-nowrap text-foreground tabular">
          {showSkeleton ? <Skeleton className="h-4 w-16" /> : formatPeso(subtotal)}
        </dd>
      </dl>

      {discount > 0 ? (
        <dl className="flex items-center justify-between gap-2">
          <dt className="text-muted-foreground">{words.basket.discount}</dt>
          <dd className="font-medium whitespace-nowrap text-success tabular">
            -{formatPeso(discount)}
          </dd>
        </dl>
      ) : null}

      <dl className="flex items-center justify-between gap-2">
        <dt className="text-muted-foreground">{words.basket.deliveryFee}</dt>
        <dd className="text-xs text-muted-foreground tabular sm:text-sm">
          {showSkeleton ? <Skeleton className="h-4 w-20" /> : deliveryFeeLabel}
        </dd>
      </dl>

      <Separator />

      <dl className="flex items-center justify-between gap-2 text-base font-bold">
        <dt className="text-foreground">{words.basket.total}</dt>
        <dd className="font-bold whitespace-nowrap text-foreground tabular">
          {showSkeleton ? <Skeleton className="h-5 w-20" /> : formatPeso(total)}
        </dd>
      </dl>

      {quoteError ? (
        <p className="mt-1 text-xs text-destructive">{words.basket.couldNotCheckPrices}</p>
      ) : null}

      {!isOnline ? (
        <p className="mt-1 text-xs text-muted-foreground">{words.basket.pricesAsLastSeen}</p>
      ) : null}
    </div>
  );
}
