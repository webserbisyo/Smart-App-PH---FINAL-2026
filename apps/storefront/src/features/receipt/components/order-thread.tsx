'use client';

import { useState } from 'react';
import Image from 'next/image';
import { words, type OrderMessage, type OrderReceipt } from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import { ResponsiveDialog } from '@smartapp/ui/compositions/responsive-dialog';
import { Bike, ExternalLink, Expand, Phone, ShieldCheck, XCircle } from 'lucide-react';
import { formatManilaTime } from '../receipt-rules';

export interface OrderThreadProps {
  readonly order: OrderReceipt;
}

function formatProofSrc(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('/')) {
    return path;
  }
  return `/${path}`;
}

export function OrderThread({ order }: OrderThreadProps) {
  const [selectedProofPath, setSelectedProofPath] = useState<string | null>(null);

  if (!order.messages || order.messages.length === 0) {
    return null;
  }

  return (
    <div
      id="receipt-order-thread"
      className="flex flex-col gap-3 rounded-3xl bg-card p-5 shadow-xs ring-1 ring-foreground/8 sm:p-6 print:hidden"
    >
      <h2 className="text-base font-semibold">{words.receipt.thread.title}</h2>

      <div className="flex flex-col gap-2.5">
        {order.messages.map((msg: OrderMessage) => {
          const timeStr = formatManilaTime(msg.at);

          // Proof message bubble (c-message-5)
          if (msg.proof) {
            const proofSrc = formatProofSrc(msg.proof.path);
            return (
              <div
                key={msg.id}
                className="flex max-w-xs flex-col gap-1.5 self-end rounded-2xl rounded-tr-xs bg-shop-10-soft p-2.5 text-sm text-shop-10-soft-foreground"
              >
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="font-semibold">
                    {words.shop.thread.proofSent(msg.proof.referenceNo)}
                  </span>
                  <span className="tabular-nums">{timeStr}</span>
                </div>

                {/* Proof preview thumbnail */}
                <button
                  type="button"
                  onClick={() => setSelectedProofPath(msg.proof?.path ?? null)}
                  className="group relative overflow-hidden rounded-xl bg-background text-left transition-opacity hover:opacity-90"
                  aria-label={words.receipt.thread.viewProof(msg.proof.referenceNo)}
                >
                  <Image
                    src={proofSrc}
                    alt={words.receipt.thread.proofAlt(msg.proof.referenceNo)}
                    width={176}
                    height={112}
                    unoptimized
                    className="h-28 w-44 object-cover"
                  />
                  <span
                    aria-hidden="true"
                    className="absolute right-1.5 bottom-1.5 flex size-8 items-center justify-center rounded-full glass"
                  >
                    <Expand className="size-4" />
                  </span>
                </button>

                {msg.proof.status === 'rejected' && msg.proof.rejectReason && (
                  <span className="text-xs font-medium text-destructive-text">
                    {words.shop.thread.paymentRejected(msg.proof.rejectReason)}
                  </span>
                )}
              </div>
            );
          }

          const isStatusCompleted = msg.kind === 'status' && msg.status === 'completed';
          const isStatusCancelled =
            msg.kind === 'status' && (msg.status === 'cancelled' || msg.status === 'expired');
          const isRider = msg.kind === 'rider';
          const isTracking = msg.kind === 'tracking';

          const lineText =
            msg.text ??
            (isRider && order.rider
              ? words.shop.thread.rider(order.rider.name)
              : isTracking
                ? words.shop.thread.tracking
                : msg.status
                  ? words.shop.orderStatus[msg.status]
                  : null);
          if (!lineText) return null;

          // System line (c-marker-2)
          return (
            <div
              key={msg.id}
              className="flex items-start gap-2.5 rounded-xl bg-muted/50 px-3 py-2.5 text-sm text-muted-foreground"
            >
              <div className="mt-0.5 shrink-0" aria-hidden="true">
                {isStatusCompleted ? (
                  <ShieldCheck className="size-4 text-success-text" />
                ) : isStatusCancelled ? (
                  <XCircle className="size-4 text-destructive-text" />
                ) : isRider ? (
                  <Bike className="size-4 text-info-text" />
                ) : (
                  <div className="m-1.5 size-1.5 rounded-full bg-muted-foreground/60" />
                )}
              </div>
              <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                <span className="text-foreground">{lineText}</span>
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {timeStr}
                </span>
              </div>
            </div>
          );
        })}

        {/* Rider details & tracking link (c-item-4) if delivery is active */}
        {order.rider && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-muted/50 p-3 text-sm">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-shop-10-soft text-shop-10-soft-foreground">
                <Bike aria-hidden="true" className="size-5" />
              </div>
              <div className="flex min-w-0 flex-col">
                <span className="truncate font-semibold text-foreground">{order.rider.name}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {order.rider.provider ?? words.receipt.thread.rider}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {order.rider.phone && (
                <Button
                  variant="outline"
                  nativeButton={false}
                  render={<a href={`tel:${order.rider.phone}`} />}
                  aria-label={words.receipt.thread.callRider(order.rider.name)}
                  className="h-11 gap-1.5 rounded-full bg-card px-4"
                >
                  <Phone aria-hidden="true" className="size-4" />
                  {words.receipt.thread.call}
                </Button>
              )}
              {order.trackingUrl && (
                <Button
                  nativeButton={false}
                  render={<a href={order.trackingUrl} target="_blank" rel="noopener noreferrer" />}
                  className="h-11 gap-1.5 rounded-full px-4"
                >
                  {words.receipt.thread.track}
                  <ExternalLink aria-hidden="true" className="size-4" />
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Proof Viewer Dialog */}
      <ResponsiveDialog
        open={selectedProofPath !== null}
        onOpenChange={(open) => !open && setSelectedProofPath(null)}
        title={words.receipt.thread.proofDialog}
      >
        <div className="flex flex-col items-center justify-center p-2">
          {selectedProofPath && (
            <Image
              src={formatProofSrc(selectedProofPath)}
              alt={words.receipt.thread.proofDialog}
              width={800}
              height={600}
              unoptimized
              className="max-h-96 w-auto max-w-full rounded-lg object-contain"
            />
          )}
        </div>
      </ResponsiveDialog>
    </div>
  );
}
