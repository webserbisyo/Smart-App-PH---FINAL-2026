'use client';

import { useMemo } from 'react';
import { artPath, words, type OrderReceipt, type Storefront } from '@smartapp/core';
import { Badge } from '@smartapp/ui/components/reui/badge';
import {
  Stepper,
  StepperDescription,
  StepperIndicator,
  StepperItem,
  StepperNav,
  StepperTitle,
} from '@smartapp/ui/components/reui/stepper';
import { QRCode, QRCodeSvg } from '@smartapp/ui/components/qr-code';
import { cn } from '@smartapp/ui/lib/utils';
import { CheckIcon } from 'lucide-react';
import { CopyButton } from '@/features/checkout/components/copy-button';
import {
  formatManilaDateTime,
  formatOrderNumber,
  isOrderCancelled,
  resolveReceiptSteps,
  type ReceiptStepItem,
} from '../receipt-rules';
import { paymentChip, receiptHero, statusChip, type ReceiptChip } from '../receipt-look';

export interface ReceiptHeaderProps {
  readonly order: OrderReceipt;
  readonly storefront: Storefront;
  readonly receiptUrl: string;
  readonly justPlaced?: boolean;
}

/** The success check that draws itself (draw-check motion, off under reduced motion). */
function DrawnCheck({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex size-8 items-center justify-center rounded-full bg-success text-success-foreground shadow-md ring-4 ring-card',
        className,
      )}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} className="size-4">
        <path
          d="M5 12.5l4.5 4.5L19 7.5"
          pathLength={1}
          className="draw-check"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function Chip({ chip, check = false }: { chip: ReceiptChip; check?: boolean }) {
  const Icon = chip.icon;
  return (
    <Badge variant={chip.tone} size="xl" radius="full" className="gap-1.5 px-2.5">
      {check ? (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
          aria-hidden="true"
          className="size-3.5"
        >
          <path
            d="M5 12.5l4.5 4.5L19 7.5"
            pathLength={1}
            className="draw-check"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <Icon aria-hidden="true" className="size-3.5" />
      )}
      {chip.label}
    </Badge>
  );
}

// The c-stepper-26 track, read only: times above, the shop colour fills the steps done.
const DONE = <CheckIcon strokeWidth={3.36} className="size-2.5" aria-hidden="true" />;
function DashedRing({ spin = false }: { spin?: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className={cn('size-4', spin && 'motion-safe:animate-spin')}
    >
      <circle
        cx="8"
        cy="8"
        r="4.45"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeDasharray="3 1"
        pathLength={28}
      />
    </svg>
  );
}
const INDICATORS = { completed: DONE, inactive: <DashedRing />, loading: <DashedRing spin /> };

function StatusTrack({ steps }: { steps: readonly ReceiptStepItem[] }) {
  const currentIndex = steps.findIndex((s) => s.state === 'current');
  // One past the last step marks every step done.
  const value = currentIndex === -1 ? steps.length + 1 : currentIndex + 1;
  const current = steps[currentIndex];

  return (
    <div
      id="receipt-status-track"
      className="flex flex-col gap-3 rounded-3xl bg-card p-4 shadow-xs ring-1 ring-foreground/8 sm:p-5"
    >
      <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {words.receipt.progress}
      </h2>
      <p role="status" className="sr-only">
        {current ? current.label : null}
      </p>
      <Stepper value={value} indicators={INDICATORS} aria-label={words.receipt.progress}>
        <StepperNav>
          {steps.map((step, index) => (
            <StepperItem key={step.id} step={index + 1} loading className="min-w-0 flex-1">
              <div className="flex w-full flex-col gap-2">
                <StepperDescription className="text-center text-xs whitespace-nowrap tabular">
                  {step.timestamp ?? <span aria-hidden="true">--</span>}
                </StepperDescription>
                <span className="flex h-1 w-full items-center gap-0.75">
                  <span className="flex h-full flex-1 bg-ring/20 group-first/step:rounded-s-full">
                    <span className="flex-1 group-first/step:rounded-s-full group-state-active/step:bg-primary group-state-completed/step:bg-primary" />
                  </span>
                  <StepperIndicator className="size-4 bg-ring/20 text-ring state-active:bg-primary state-active:text-primary-foreground state-completed:bg-primary state-completed:text-primary-foreground" />
                  <span className="flex h-full flex-1 bg-ring/20 group-last/step:rounded-e-full">
                    <span className="flex-1 group-last/step:rounded-e-full group-state-completed/step:bg-primary" />
                  </span>
                </span>
                <StepperTitle className="px-0.5 text-center text-xs leading-snug text-balance text-muted-foreground state-active:font-semibold state-active:text-foreground state-completed:text-foreground">
                  {step.label}
                  <span className="sr-only">
                    {step.state === 'completed'
                      ? `, ${words.receipt.stepDone}`
                      : step.state === 'current'
                        ? `, ${words.receipt.stepNow}`
                        : ''}
                  </span>
                </StepperTitle>
              </div>
            </StepperItem>
          ))}
        </StepperNav>
      </Stepper>
    </div>
  );
}

export function ReceiptHeader({
  order,
  storefront,
  receiptUrl,
  justPlaced = false,
}: ReceiptHeaderProps) {
  const kind = storefront.info.kind;
  const orderNo = formatOrderNumber(order.orderNo);
  const hero = receiptHero(order, kind, justPlaced);
  const status = statusChip(order.status);
  const payment = paymentChip(order);
  const cancelled = isOrderCancelled(order.status);
  const steps = useMemo(() => resolveReceiptSteps(order, kind), [order, kind]);

  const typeLine = order.scheduledAt
    ? `${words.shop.orderType[order.type]} · ${words.receipt.scheduled(formatManilaDateTime(order.scheduledAt))}`
    : words.shop.orderType[order.type];

  return (
    <section aria-labelledby="receipt-title" className="flex flex-col gap-4">
      <div className="flex flex-col gap-5 rounded-3xl bg-card p-5 shadow-xs ring-1 ring-foreground/8 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="relative shrink-0">
            <img
              src={artPath(hero.art)}
              alt=""
              width={80}
              height={80}
              decoding="async"
              className="motion-safe:animate-in motion-safe:zoom-in-90 motion-safe:fade-in size-20 object-contain drop-shadow-md"
            />
            {justPlaced ? <DrawnCheck className="absolute -right-1 -bottom-1" /> : null}
          </div>
          <div className="flex min-w-0 flex-col gap-2">
            <h1 id="receipt-title" className="text-xl leading-tight font-bold text-balance">
              {hero.title}
            </h1>
            <p className="text-sm text-pretty text-muted-foreground">{hero.hint}</p>
            <div className="flex flex-wrap gap-1.5">
              <Chip chip={status} />
              <Chip chip={payment} check={order.paymentStatus === 'paid'} />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-5 border-t border-dashed pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-col gap-1">
            <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {words.receipt.orderLabel}
            </span>
            <div className="flex items-center gap-2">
              <span
                id="receipt-order-number"
                tabIndex={-1}
                className="text-5xl font-extrabold tracking-tight tabular outline-none"
              >
                {orderNo}
              </span>
              <CopyButton
                textToCopy={orderNo}
                label={words.receipt.copyNumber(orderNo)}
                iconOnly
                className="size-11 rounded-full"
              />
            </div>
            <p className="text-sm font-medium">{typeLine}</p>
            {order.deliveryAddress ? (
              <p className="text-sm text-pretty break-words text-muted-foreground">
                {order.deliveryAddress}
              </p>
            ) : null}
          </div>

          {/* The QR stays black on white on every shop so any scanner reads it. */}
          <figure className="flex shrink-0 flex-col items-center gap-2 self-center rounded-2xl bg-paper p-3 text-paper-foreground ring-1 ring-foreground/8">
            <QRCode value={receiptUrl} size={160}>
              <QRCodeSvg
                role="img"
                aria-label={words.receipt.qrLabel(orderNo)}
                className="rounded-sm"
              />
            </QRCode>
            <figcaption className="text-xs font-medium">
              {order.type === 'delivery' ? words.receipt.qrLive : words.receipt.qrCounter}
            </figcaption>
          </figure>
        </div>
      </div>

      {cancelled ? null : <StatusTrack steps={steps} />}
    </section>
  );
}
