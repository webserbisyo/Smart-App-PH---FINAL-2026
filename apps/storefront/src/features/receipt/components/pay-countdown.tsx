'use client';

import { useSyncExternalStore } from 'react';
import { formatPeso, imageSources, words, type OrderReceipt } from '@smartapp/core';
import { Alert, AlertDescription, AlertTitle } from '@smartapp/ui/components/reui/alert';
import { Progress } from '@smartapp/ui/components/progress';
import { ShopImage } from '@smartapp/ui/compositions/shop-image';
import { Clock, AlertTriangle } from 'lucide-react';
import { CopyButton } from '@/features/checkout/components/copy-button';
import { formatCountdown } from '../receipt-rules';

export interface PayCountdownProps {
  readonly order: OrderReceipt;
}

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

function getServerTimerSnapshot(): number | null {
  return null;
}

export function PayCountdown({ order }: PayCountdownProps) {
  // Reads current second via useSyncExternalStore to avoid SSR hydration mismatch and cascading renders
  const activeSeconds = useSyncExternalStore(
    subscribeTimer,
    getTimerSnapshot,
    getServerTimerSnapshot,
  );

  if (order.paymentStatus !== 'unpaid' || !order.expiresAt) {
    return null;
  }

  const exactAmountFormatted = formatPeso(order.totals.total);

  // Stable placeholder during SSR and initial hydration before mount
  if (activeSeconds === null) {
    return (
      <div id="receipt-pay-countdown" className="flex flex-col gap-4">
        <Alert variant="warning" className="flex flex-col gap-2 p-4">
          <div className="flex w-full items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-warning" />
              <AlertTitle className="text-sm font-semibold">
                Please complete your transfer
              </AlertTitle>
            </div>
          </div>
          <AlertDescription className="text-xs text-muted-foreground">
            Complete your transfer before the timer ends to keep this order.
          </AlertDescription>
        </Alert>

        {order.payment && (
          <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Payment details ({order.payment.method.toUpperCase()})
              </h3>
              <span className="text-xs font-medium text-muted-foreground">
                {order.payment.accountName ?? ''}
              </span>
            </div>

            {order.payment.accountNumber && (
              <div className="flex items-center justify-between rounded-lg bg-muted/50 p-2.5">
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-muted-foreground uppercase">
                    Account number
                  </span>
                  <span className="font-mono text-sm font-bold tabular-nums">
                    {order.payment.accountNumber}
                  </span>
                </div>
                <CopyButton textToCopy={order.payment.accountNumber} label="Copy account number" />
              </div>
            )}

            <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 p-2.5">
              <div className="flex flex-col">
                <span className="text-xs font-medium text-muted-foreground uppercase">
                  Amount to transfer
                </span>
                <span className="font-mono text-base font-extrabold text-primary tabular-nums">
                  {words.shop.sendExactly(exactAmountFormatted)}
                </span>
              </div>
              <CopyButton
                textToCopy={String(order.totals.total / 100)}
                label="Copy exact transfer amount"
              />
            </div>

            {order.payment.qr && (
              <div className="flex flex-col items-center gap-1.5 p-2">
                <ShopImage
                  src={imageSources(order.payment.qr)}
                  alt="Payment QR code"
                  ratio="1:1"
                  sizes="192px"
                  className="size-48 rounded-lg border shadow-xs"
                />
                <span className="text-xs text-muted-foreground">Scan QR with your payment app</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  const now = new Date(activeSeconds * 1000);
  const { formatted, isExpired, shouldAnnounce, progressPercent } = formatCountdown(
    order.expiresAt,
    now,
  );

  return (
    <div id="receipt-pay-countdown" className="flex flex-col gap-4">
      {/* Alert timer with c-progress-2 */}
      {isExpired ? (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>Payment time is over</AlertTitle>
          <AlertDescription>{words.shop.thread.expired}</AlertDescription>
        </Alert>
      ) : (
        <Alert
          variant="warning"
          role={shouldAnnounce ? 'alert' : undefined}
          aria-live={shouldAnnounce ? 'assertive' : 'off'}
          className="flex flex-col gap-2 p-4"
        >
          <div className="flex w-full items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-warning" />
              <AlertTitle className="text-sm font-semibold">
                {words.shop.payWithin(formatted)}
              </AlertTitle>
            </div>
            <span className="font-mono text-xs font-bold text-muted-foreground tabular-nums">
              {formatted}
            </span>
          </div>

          <Progress value={progressPercent} className="h-1.5 w-full" />
          <AlertDescription className="text-xs text-muted-foreground">
            Complete your transfer before the timer ends to keep this order.
          </AlertDescription>
        </Alert>
      )}

      {/* Account Details & QR code */}
      {order.payment && !isExpired && (
        <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Payment details ({order.payment.method.toUpperCase()})
            </h3>
            <span className="text-xs font-medium text-muted-foreground">
              {order.payment.accountName ?? ''}
            </span>
          </div>

          {order.payment.accountNumber && (
            <div className="flex items-center justify-between rounded-lg bg-muted/50 p-2.5">
              <div className="flex flex-col">
                <span className="text-xs font-medium text-muted-foreground uppercase">
                  Account number
                </span>
                <span className="font-mono text-sm font-bold tabular-nums">
                  {order.payment.accountNumber}
                </span>
              </div>
              <CopyButton textToCopy={order.payment.accountNumber} label="Copy account number" />
            </div>
          )}

          {/* Send Exactly amount banner */}
          <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 p-2.5">
            <div className="flex flex-col">
              <span className="text-xs font-medium text-muted-foreground uppercase">
                Amount to transfer
              </span>
              <span className="font-mono text-base font-extrabold text-primary tabular-nums">
                {words.shop.sendExactly(exactAmountFormatted)}
              </span>
            </div>
            <CopyButton
              textToCopy={String(order.totals.total / 100)}
              label="Copy exact transfer amount"
            />
          </div>

          {/* Shop QR photo if set */}
          {order.payment.qr && (
            <div className="flex flex-col items-center gap-1.5 p-2">
              <ShopImage
                src={imageSources(order.payment.qr)}
                alt="Payment QR code"
                ratio="1:1"
                sizes="192px"
                className="size-48 rounded-lg border shadow-xs"
              />
              <span className="text-xs text-muted-foreground">Scan QR with your payment app</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
