'use client';

import { useState } from 'react';
import Image from 'next/image';
import { words, type OrderMessage, type OrderReceipt } from '@smartapp/core';
import { ResponsiveDialog } from '@smartapp/ui/compositions/responsive-dialog';
import { Bike, ExternalLink, Phone, ShieldCheck, XCircle } from 'lucide-react';
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
      className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-xs"
    >
      <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
        Order updates
      </h3>

      <div className="flex flex-col gap-2.5">
        {order.messages.map((msg: OrderMessage) => {
          const timeStr = formatManilaTime(msg.at);

          // Proof message bubble (c-message-5)
          if (msg.proof) {
            const proofSrc = formatProofSrc(msg.proof.path);
            return (
              <div
                key={msg.id}
                className="flex max-w-xs flex-col gap-1.5 self-end rounded-xl rounded-tr-xs bg-primary/10 p-2.5 text-xs text-foreground"
              >
                <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                  <span className="font-semibold text-primary">
                    {words.shop.thread.proofSent(msg.proof.referenceNo)}
                  </span>
                  <span className="tabular-nums">{timeStr}</span>
                </div>

                {/* Proof preview thumbnail */}
                <button
                  type="button"
                  onClick={() => setSelectedProofPath(msg.proof?.path ?? null)}
                  className="group relative overflow-hidden rounded-lg border bg-background text-left transition-opacity hover:opacity-90"
                  aria-label="View uploaded payment proof photo"
                >
                  <Image
                    src={proofSrc}
                    alt={`Payment proof ${msg.proof.referenceNo}`}
                    width={176}
                    height={112}
                    unoptimized
                    className="h-28 w-44 object-cover"
                  />
                  <span className="absolute right-1 bottom-1 rounded bg-black/70 px-1.5 py-0.5 text-xs text-white">
                    Tap to expand
                  </span>
                </button>

                {msg.proof.status === 'rejected' && msg.proof.rejectReason && (
                  <span className="text-xs font-medium text-destructive">
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
                  : msg.kind);

          // System line (c-marker-2)
          return (
            <div
              key={msg.id}
              className="flex items-start gap-2 rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground"
            >
              <div className="mt-0.5 shrink-0">
                {isStatusCompleted ? (
                  <ShieldCheck className="size-3.5 text-success" />
                ) : isStatusCancelled ? (
                  <XCircle className="size-3.5 text-destructive" />
                ) : isRider ? (
                  <Bike className="size-3.5 text-info" />
                ) : (
                  <div className="my-1 size-1.5 rounded-full bg-muted-foreground/60" />
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
          <div className="flex items-center justify-between rounded-lg border bg-background p-3 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Bike className="size-4" />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-foreground">{order.rider.name}</span>
                <span className="text-xs text-muted-foreground">
                  {order.rider.provider ?? 'Assigned rider'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {order.rider.phone && (
                <a
                  href={`tel:${order.rider.phone}`}
                  className="flex items-center gap-1 rounded-md border bg-muted/50 px-2 py-1 font-medium text-foreground hover:bg-muted"
                >
                  <Phone className="size-3 text-primary" />
                  <span>Call</span>
                </a>
              )}
              {order.trackingUrl && (
                <a
                  href={order.trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 font-medium text-primary-foreground hover:bg-primary/90"
                >
                  <span>Track</span>
                  <ExternalLink className="size-3" />
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Proof Viewer Dialog */}
      <ResponsiveDialog
        open={selectedProofPath !== null}
        onOpenChange={(open) => !open && setSelectedProofPath(null)}
        title="Payment proof"
      >
        <div className="flex flex-col items-center justify-center p-2">
          {selectedProofPath && (
            <Image
              src={formatProofSrc(selectedProofPath)}
              alt="Payment proof full preview"
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
