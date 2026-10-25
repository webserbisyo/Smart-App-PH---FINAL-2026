'use client';

import { useId, useMemo } from 'react';
import { formatPeso, words, type OrderReceipt, type Storefront } from '@smartapp/core';
import { Alert, AlertDescription, AlertTitle } from '@smartapp/ui/components/reui/alert';
import {
  Stepper,
  StepperDescription,
  StepperIndicator,
  StepperItem,
  StepperSeparator,
  StepperTitle,
} from '@smartapp/ui/components/reui/stepper';
import { QRCode, QRCodeSvg } from '@smartapp/ui/components/qr-code';
import { Check, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { CopyButton } from '@/features/checkout/components/copy-button';
import {
  formatManilaDateTime,
  formatOrderNumber,
  isOrderCancelled,
  resolveReceiptSteps,
} from '../receipt-rules';

export interface ReceiptHeaderProps {
  readonly order: OrderReceipt;
  readonly storefront: Storefront;
  readonly receiptUrl: string;
  readonly isNewOrder?: boolean;
}

export function ReceiptHeader({
  order,
  storefront,
  receiptUrl,
  isNewOrder = false,
}: ReceiptHeaderProps) {
  const headingId = useId();
  const orderNumStr = useMemo(() => formatOrderNumber(order.orderNo), [order.orderNo]);

  const steps = useMemo(
    () => resolveReceiptSteps(order.type, order.status, order.events, storefront.info.kind),
    [order.type, order.status, order.events, storefront.info.kind],
  );

  const activeIndex = useMemo(() => {
    const idx = steps.findIndex((s) => s.state === 'current');
    return idx === -1 ? (steps.every((s) => s.state === 'completed') ? steps.length - 1 : 0) : idx;
  }, [steps]);

  const orderTypeLabel = useMemo(() => {
    const typeLabel = words.shop.orderType[order.type];

    if (order.scheduledAt) {
      return `${typeLabel} · Scheduled ${formatManilaDateTime(order.scheduledAt)}`;
    }
    return typeLabel;
  }, [order.type, order.scheduledAt]);

  const cancelled = isOrderCancelled(order.status);

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      <h2 id={headingId} className="sr-only">
        {words.checkout.title}
      </h2>

      {/* Just placed banner */}
      {isNewOrder && (
        <Alert variant="success" className="animate-in fade-in-50">
          <CheckCircle2 className="size-4" />
          <AlertTitle>Order placed</AlertTitle>
          <AlertDescription>{words.shop.stamps.pending(orderNumStr)}</AlertDescription>
        </Alert>
      )}

      {/* Top Card: Big Order Number, Type, Scheduled time, and QR code */}
      <div className="flex flex-col items-center justify-between gap-4 rounded-xl border bg-card p-5 text-center shadow-xs sm:flex-row sm:text-left">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Order
          </span>
          <div className="flex items-center justify-center gap-2 sm:justify-start">
            <span
              id="receipt-order-number"
              tabIndex={-1}
              className="font-mono text-3xl font-extrabold tracking-tight tabular-nums sm:text-4xl"
            >
              {orderNumStr}
            </span>
            <CopyButton textToCopy={orderNumStr} label={`Copy order number ${orderNumStr}`} />
          </div>
          <p className="text-sm font-medium text-muted-foreground">{orderTypeLabel}</p>
          {order.deliveryAddress && (
            <p className="max-w-xs text-xs text-muted-foreground">{order.deliveryAddress}</p>
          )}
        </div>

        {/* QR Code */}
        <div className="flex flex-col items-center gap-1.5 rounded-lg border bg-background p-2.5 shadow-2xs">
          <QRCode value={receiptUrl} size={120}>
            <QRCodeSvg className="rounded" />
          </QRCode>
          <span className="text-xs font-medium text-muted-foreground">
            {order.type === 'pickup' ? 'Show this at pickup' : 'Scan for live status'}
          </span>
        </div>
      </div>

      {/* Status Track: c-stepper-26 or Cancellation Alert */}
      {cancelled ? (
        <div id="receipt-cancelled-alert">
          {order.status === 'expired' ? (
            <Alert variant="destructive">
              <Clock className="size-4" />
              <AlertTitle>Order expired</AlertTitle>
              <AlertDescription>{words.shop.thread.expired}</AlertDescription>
            </Alert>
          ) : order.refund ? (
            <Alert variant="warning">
              <XCircle className="size-4" />
              <AlertTitle>Order cancelled and refunded</AlertTitle>
              <AlertDescription>
                {words.shop.thread.refunded(formatPeso(order.refund.amount), order.refund.reason)}
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive">
              <XCircle className="size-4" />
              <AlertTitle>Order cancelled</AlertTitle>
              <AlertDescription>
                {words.shop.thread.cancelled(order.cancelReason ?? 'Cancelled by shop')}
              </AlertDescription>
            </Alert>
          )}
        </div>
      ) : (
        <div
          id="receipt-status-track"
          role="status"
          aria-live="polite"
          className="rounded-xl border bg-card p-4 shadow-xs"
        >
          <h3 className="mb-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Order progress
          </h3>
          <Stepper orientation="vertical" value={activeIndex + 1} className="w-full">
            {steps.map((step, idx) => {
              const isLast = idx === steps.length - 1;
              return (
                <StepperItem key={step.id} step={idx + 1} className="gap-3">
                  <StepperIndicator className="size-6 text-xs">
                    {step.state === 'completed' ? <Check className="size-3.5" /> : idx + 1}
                  </StepperIndicator>
                  <div className="flex flex-col pb-4">
                    <StepperTitle className="text-sm font-semibold">{step.label}</StepperTitle>
                    {step.timestamp && (
                      <StepperDescription className="text-xs text-muted-foreground tabular-nums">
                        {step.timestamp}
                      </StepperDescription>
                    )}
                  </div>
                  {!isLast && <StepperSeparator className="top-6" />}
                </StepperItem>
              );
            })}
          </Stepper>
        </div>
      )}
    </section>
  );
}
