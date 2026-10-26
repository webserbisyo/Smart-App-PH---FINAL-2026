'use client';

import { artPath, words } from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@smartapp/ui/components/dialog';
import {
  ThermalReceiptCard,
  type ThermalReceiptItem,
} from '@smartapp/ui/vendor/opensource-ui/thermal-receipt';

export type PrinterState = 'printing' | 'printed' | 'jam' | 'offline';

export interface PrinterSlip {
  storeName: string;
  date: string;
  items: readonly ThermalReceiptItem[];
  subtotal: string;
  total: string;
}

export interface OrderPrinterProps {
  state: PrinterState | null;
  slip: PrinterSlip;
  // The error in words (paper jam), from the error code.
  error: string | null;
  onSkip: () => void;
  onRetry: () => void;
  onClose: () => void;
}

/**
 * Place order (decision R32): a Fluent printer feeds the order slip out line by line (Thermal Receipt)
 * while the order is sent, then the receipt opens. Skip opens it at once; an error is a paper jam with
 * Try again; offline says so. Composes the installed Dialog, so focus and Escape work as usual.
 */
export function OrderPrinter({ state, slip, error, onSkip, onRetry, onClose }: OrderPrinterProps) {
  const P = words.checkout.printer;
  const stuck = state === 'jam' || state === 'offline';
  const title =
    state === 'jam'
      ? P.jamTitle
      : state === 'offline'
        ? P.offlineTitle
        : state === 'printed'
          ? P.printed
          : P.printing;
  const hint =
    state === 'jam'
      ? (error ?? words.checkout.placeFailed)
      : state === 'offline'
        ? P.offlineHint
        : state === 'printed'
          ? P.printedHint
          : P.printingHint;

  return (
    <Dialog
      open={state !== null}
      onOpenChange={(open) => {
        // Only a stuck printer can be closed; a sending order can't be dismissed half way.
        if (!open && stuck) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        aria-label={P.label}
        data-printer={state === 'offline' ? 'jam' : (state ?? undefined)}
        className="flex flex-col items-center gap-5 rounded-3xl p-6 text-center sm:max-w-sm"
      >
        <div aria-hidden="true" className="flex w-full flex-col items-center">
          <img
            src={artPath(state === 'offline' ? 'offline' : 'printer')}
            alt=""
            width={176}
            height={176}
            decoding="async"
            className="relative z-10 size-36 print-head object-contain drop-shadow-md"
          />
          {state === 'offline' ? null : (
            <div className="-mt-12 w-48 overflow-hidden px-2 pt-6 pb-3">
              <ThermalReceiptCard
                className="print-feed"
                storeName={slip.storeName}
                orderId={P.newOrder}
                date={slip.date}
                items={slip.items}
                subtotalLabel={words.basket.subtotal}
                subtotal={slip.subtotal}
                totalLabel={words.basket.total}
                total={slip.total}
              />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1.5" role="status" aria-live="polite">
          <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
          <DialogDescription className="text-pretty">{hint}</DialogDescription>
        </div>

        {stuck ? (
          <div className="flex w-full flex-col gap-2">
            <Button size="lg" className="h-11 rounded-full" onClick={onRetry}>
              {P.tryAgain}
            </Button>
            <Button variant="outline" size="lg" className="h-11 rounded-full" onClick={onClose}>
              {P.back}
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="lg" className="h-11 rounded-full px-6" onClick={onSkip}>
            {P.skip}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
