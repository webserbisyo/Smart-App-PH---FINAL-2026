'use client';

import { useMemo, useState } from 'react';
import { formatPeso, words, type OrderReceipt, type Storefront } from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import { MessageCircle, Check, Copy } from 'lucide-react';
import { buildMessengerOrderText, buildMessengerUrl } from '../receipt-rules';

export interface MessengerHandoffProps {
  readonly order: OrderReceipt;
  readonly storefront: Storefront;
  readonly receiptUrl: string;
}

export function MessengerHandoff({ order, storefront, receiptUrl }: MessengerHandoffProps) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  const messengerUsername = storefront.info.contact.messengerUsername;

  const orderText = useMemo(() => {
    return buildMessengerOrderText({
      orderNo: order.orderNo,
      lineCount: order.lines.length,
      totalFormatted: formatPeso(order.totals.total),
      receiptUrl,
    });
  }, [order.orderNo, order.lines.length, order.totals.total, receiptUrl]);

  if (!messengerUsername) {
    return null;
  }

  const messengerUrl = buildMessengerUrl(messengerUsername, orderText);

  async function handleHandoff() {
    let succeeded = false;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(orderText);
        succeeded = true;
      }
    } catch {
      succeeded = false;
    }

    if (succeeded) {
      setCopied(true);
      setTimeout(() => setCopied(false), 4000);
    } else {
      setCopyFailed(true);
    }

    // Open Messenger
    window.open(messengerUrl, '_blank', 'noopener,noreferrer');
  }

  const W = words.receipt.messenger;

  return (
    <section
      id="receipt-messenger-handoff"
      aria-labelledby="receipt-messenger-title"
      className="flex flex-col gap-3 rounded-3xl bg-card p-5 shadow-xs ring-1 ring-foreground/8 sm:p-6 print:hidden"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-shop-10-soft text-shop-10-soft-foreground">
          <MessageCircle aria-hidden="true" className="size-5" />
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 id="receipt-messenger-title" className="text-base font-semibold">
            {words.storefrontShell.home.messenger}
          </h2>
          <p className="text-sm text-muted-foreground">{W.text}</p>
        </div>
      </div>

      <Button
        type="button"
        id="receipt-messenger-button"
        onClick={handleHandoff}
        className="h-12 w-full gap-2 rounded-full text-base font-semibold"
      >
        <MessageCircle aria-hidden="true" className="size-5" />
        {W.button}
      </Button>

      <p role="status" className="min-h-5 text-center text-sm font-medium text-success-text">
        {copied ? (
          <span className="motion-safe:animate-in motion-safe:fade-in inline-flex items-center gap-1.5">
            <Check aria-hidden="true" className="size-4" />
            {W.copied}
          </span>
        ) : null}
      </p>

      {/* When copying fails, the text shows in a box to copy by hand. */}
      {copyFailed && (
        <div className="flex flex-col gap-2 rounded-2xl bg-muted/60 p-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="font-medium text-muted-foreground">{W.pasteThis}</span>
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(orderText);
                  setCopied(true);
                  setCopyFailed(false);
                } catch {
                  // The box stays for copying by hand.
                }
              }}
              className="h-11 shrink-0 gap-1.5 rounded-full px-4"
            >
              <Copy aria-hidden="true" className="size-4" />
              {W.copy}
            </Button>
          </div>
          <textarea
            readOnly
            value={orderText}
            rows={3}
            aria-label={W.pasteThis}
            className="w-full resize-none rounded-xl border bg-background p-2.5 font-mono text-base text-foreground select-all"
            onFocus={(e) => e.target.select()}
          />
        </div>
      )}
    </section>
  );
}
