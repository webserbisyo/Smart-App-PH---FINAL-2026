'use client';

import { useSyncExternalStore } from 'react';
import {
  formatPeso,
  imageSources,
  pesoAmountText,
  words,
  type OrderReceipt,
  type PaymentInstructions,
} from '@smartapp/core';
import {
  CircularProgress,
  CircularProgressIndicator,
  CircularProgressRange,
  CircularProgressTrack,
  CircularProgressValueText,
} from '@smartapp/ui/components/circular-progress';
import { ShopImage } from '@smartapp/ui/compositions/shop-image';
import { cn } from '@smartapp/ui/lib/utils';
import { CopyButton } from '@/features/checkout/components/copy-button';
import { formatCountdown } from '../receipt-rules';

export interface PayCountdownProps {
  readonly order: OrderReceipt;
  readonly shopName: string;
}

// One shared one-second clock for every countdown on the page.
let currentEpochSeconds = 0;
const timerListeners = new Set<() => void>();
let timerInterval: ReturnType<typeof setInterval> | null = null;

function subscribeTimer(listener: () => void): () => void {
  timerListeners.add(listener);
  timerInterval ??= setInterval(() => {
    currentEpochSeconds = Math.floor(Date.now() / 1000);
    for (const l of timerListeners) {
      l();
    }
  }, 1000);

  return () => {
    timerListeners.delete(listener);
    if (timerListeners.size === 0 && timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  };
}

function getTimerSnapshot(): number {
  currentEpochSeconds ||= Math.floor(Date.now() / 1000);
  return currentEpochSeconds;
}

// The server and the first paint show no time, so the markup always matches (no hydration error).
function getServerTimerSnapshot(): number | null {
  return null;
}

function DetailRow({
  label,
  value,
  copy,
  copyLabel,
  strong = false,
}: {
  label: string;
  value: string;
  copy?: string;
  copyLabel?: string;
  strong?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex min-h-14 items-center justify-between gap-3 rounded-2xl px-3.5 py-2',
        strong ? 'bg-shop-10-soft text-shop-10-soft-foreground' : 'bg-muted/60',
      )}
    >
      <div className="flex min-w-0 flex-col">
        <dt className={cn('text-xs', strong ? 'opacity-80' : 'text-muted-foreground')}>{label}</dt>
        <dd
          className={cn(
            'font-semibold break-words tabular',
            strong ? 'text-lg font-extrabold' : 'text-base',
          )}
        >
          {value}
        </dd>
      </div>
      {copy && copyLabel ? (
        <CopyButton
          textToCopy={copy}
          label={copyLabel}
          iconOnly
          className="size-11 shrink-0 rounded-full"
        />
      ) : null}
    </div>
  );
}

function PaymentDetails({
  payment,
  total,
  shopName,
}: {
  payment: PaymentInstructions;
  total: number;
  shopName: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold">
        {words.receipt.pay.method(words.shop.paymentMethod[payment.method])}
      </h3>
      <dl className="flex flex-col gap-2">
        {payment.accountName ? (
          <DetailRow label={words.checkout.accountName} value={payment.accountName} />
        ) : null}
        {payment.accountNumber ? (
          <DetailRow
            label={words.checkout.accountNumber}
            value={payment.accountNumber}
            copy={payment.accountNumber}
            copyLabel={words.receipt.pay.copyAccount}
          />
        ) : null}
        <DetailRow
          label={words.receipt.pay.amount}
          value={words.shop.sendExactly(formatPeso(total))}
          copy={pesoAmountText(total)}
          copyLabel={words.receipt.pay.copyAmount}
          strong
        />
      </dl>
      {payment.qr ? (
        <figure className="flex flex-col items-center gap-2 pt-1">
          <ShopImage
            src={imageSources(payment.qr)}
            alt={words.receipt.pay.qrAlt(shopName)}
            ratio="1:1"
            sizes="192px"
            fallbackText={shopName}
            className="size-48 rounded-2xl ring-1 ring-foreground/8"
          />
          <figcaption className="text-xs text-muted-foreground">
            {words.receipt.pay.qrHint}
          </figcaption>
        </figure>
      ) : null}
    </div>
  );
}

/** Pay within 25:00 as a ring that empties, and the shop's details to pay, shown once. */
export function PayCountdown({ order, shopName }: PayCountdownProps) {
  const seconds = useSyncExternalStore(subscribeTimer, getTimerSnapshot, getServerTimerSnapshot);

  if (order.paymentStatus !== 'unpaid' || !order.expiresAt) {
    return null;
  }

  const countdown =
    seconds === null ? null : formatCountdown(order.expiresAt, new Date(seconds * 1000));
  const expired = countdown?.isExpired ?? false;
  const W = words.receipt.pay;

  return (
    <div id="receipt-pay-countdown" className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="text-base font-semibold">{expired ? W.timeOver : W.title}</h2>
          <p className="text-sm text-pretty text-muted-foreground">
            {expired ? W.timeOverText : W.keepOrder}
          </p>
        </div>
        {/* The time left as a ring that empties (DiceUI Circular Progress, decision R38). */}
        <CircularProgress
          value={countdown?.progressPercent ?? 100}
          max={100}
          size={76}
          thickness={6}
          getValueText={() => (countdown ? W.within(countdown.formatted) : W.title)}
          aria-label={W.title}
          className="shrink-0"
        >
          <CircularProgressIndicator>
            <CircularProgressTrack
              className={expired ? 'text-destructive-soft' : 'text-warning-soft'}
            />
            <CircularProgressRange
              className={cn(
                'duration-slow ease-linear',
                expired ? 'text-destructive' : 'text-warning',
              )}
            />
          </CircularProgressIndicator>
          <CircularProgressValueText
            aria-hidden="true"
            className={cn(
              'text-base font-bold tabular',
              expired ? 'text-destructive-text' : 'text-foreground',
            )}
          >
            {countdown?.formatted ?? '--:--'}
          </CircularProgressValueText>
        </CircularProgress>
      </div>
      {/* Read out at 10, 5 and 1 minute only. */}
      <p aria-live="assertive" className="sr-only">
        {countdown?.shouldAnnounce ? W.within(countdown.formatted) : ''}
      </p>
      {!expired && order.payment ? (
        <PaymentDetails payment={order.payment} total={order.totals.total} shopName={shopName} />
      ) : null}
    </div>
  );
}
