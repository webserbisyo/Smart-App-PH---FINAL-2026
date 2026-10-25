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

  return (
    <div
      id="receipt-messenger-handoff"
      className="flex flex-col gap-2 rounded-xl border bg-card p-4 shadow-xs"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle className="size-4 text-primary" />
          <h3 className="text-sm font-semibold">{words.storefrontShell.home.messenger}</h3>
        </div>
        {copied && (
          <span className="animate-in fade-in-50 flex items-center gap-1 text-xs font-medium text-success">
            <Check className="size-3" />
            <span>Copied. Paste it in Messenger.</span>
          </span>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Send your order details directly to the shop’s Messenger page for fast support.
      </p>

      <Button
        type="button"
        id="receipt-messenger-button"
        onClick={handleHandoff}
        className="h-11 w-full gap-2 font-medium"
      >
        <MessageCircle className="size-4" />
        <span>Continue in Messenger</span>
      </Button>

      {/* Fallback selectable box if clipboard copy fails */}
      {copyFailed && (
        <div className="mt-2 flex flex-col gap-1.5 rounded-lg bg-muted/60 p-2.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-muted-foreground">Order details to paste:</span>
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(orderText);
                  setCopied(true);
                  setCopyFailed(false);
                } catch {
                  // Keep showing box
                }
              }}
              className="flex items-center gap-1 font-medium text-primary hover:underline"
            >
              <Copy className="size-3" />
              <span>Copy</span>
            </button>
          </div>
          <textarea
            readOnly
            value={orderText}
            rows={2}
            className="w-full resize-none rounded border bg-background p-1.5 font-mono text-xs text-foreground select-all"
            onFocus={(e) => e.target.select()}
          />
        </div>
      )}
    </div>
  );
}
