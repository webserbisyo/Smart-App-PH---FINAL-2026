'use client';

import { useState } from 'react';
import { formatPeso, words, type OrderReceipt, type Storefront } from '@smartapp/core';
import { useOnline } from '@smartapp/data';
import { Button } from '@smartapp/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@smartapp/ui/components/dropdown-menu';
import { notify } from '@smartapp/ui/compositions/notify';
import { Copy, Download, MoreVertical, Printer, Share2 } from 'lucide-react';
import { useFocusOnArrival } from '../../shell/use-when-idle';
import { buildMessengerOrderText, formatOrderNumber } from '../receipt-rules';

const MENU_ITEM = 'min-h-11 gap-2.5 px-3 text-base';

export interface ReceiptMoreMenuProps {
  readonly slug: string;
  readonly order: OrderReceipt;
  readonly storefront: Storefront;
  readonly receiptUrl: string;
  readonly triggerId: string;
  readonly triggerClassName: string;
  // The button was tapped before the menu had loaded: open at once, and keep keyboard focus on it.
  readonly openNow: boolean;
  readonly focused: boolean;
}

/** More on the receipt (copy details, save the picture, print, share), loaded once the page is idle. */
export function ReceiptMoreMenu({
  slug,
  order,
  storefront,
  receiptUrl,
  triggerId,
  triggerClassName,
  openNow,
  focused,
}: ReceiptMoreMenuProps) {
  const isOnline = useOnline();
  const [savingImage, setSavingImage] = useState(false);
  const trigger = useFocusOnArrival<HTMLButtonElement>(focused);
  const W = words.receipt.actions;
  const orderNo = formatOrderNumber(order.orderNo);

  async function handleCopyDetails() {
    const text = buildMessengerOrderText({
      orderNo: order.orderNo,
      lineCount: order.lines.length,
      totalFormatted: formatPeso(order.totals.total),
      receiptUrl,
    });
    try {
      await navigator.clipboard.writeText(text);
      // The menu closes on tap, so the toast is the feedback.
      notify({ title: W.copied, tone: 'success' });
    } catch {
      // Copy is not allowed here; Share still works.
    }
  }

  // The image is fetched and checked first: an error answer is text, and handing it over as a file left
  // customers on a "receipt.png.txt" page with no way back in the installed app (decision R44). Phones
  // get the share sheet (Save Image puts it in Photos); computers download it. Nothing navigates.
  async function handleSaveImage() {
    if (savingImage) return;
    setSavingImage(true);
    const name = `receipt-${order.orderNo}.png`;
    try {
      const response = await fetch(`/${slug}/o/${order.token}/image`, { cache: 'no-store' });
      const blob = await response.blob();
      if (!response.ok || !blob.type.startsWith('image/')) throw new Error('Not an image');
      const file = new File([blob], name, { type: blob.type });
      const phone = window.matchMedia('(pointer: coarse)').matches;
      if (
        phone &&
        typeof navigator.canShare === 'function' &&
        navigator.canShare({ files: [file] })
      ) {
        try {
          await navigator.share({
            files: [file],
            title: W.shareTitle(storefront.info.name, orderNo),
          });
          return;
        } catch (error) {
          // Closed by the customer: done. Refused (the tap was too long ago): download instead.
          if (error instanceof DOMException && error.name === 'AbortError') return;
        }
      }
      const href = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = href;
      link.download = name;
      link.click();
      setTimeout(() => URL.revokeObjectURL(href), 10_000);
    } catch {
      notify({ title: W.imageFailed, tone: 'error' });
    } finally {
      setSavingImage(false);
    }
  }

  async function handleShare() {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: W.shareTitle(storefront.info.name, orderNo),
          text: W.shareText(orderNo),
          url: receiptUrl,
        });
        return;
      } catch {
        // Closed or not allowed: copy the link instead.
      }
    }
    try {
      await navigator.clipboard.writeText(receiptUrl);
      notify({ title: W.linkCopied, tone: 'success' });
    } catch {
      // Nothing else to try.
    }
  }

  return (
    <DropdownMenu defaultOpen={openNow}>
      <DropdownMenuTrigger
        id={triggerId}
        render={
          <Button
            ref={trigger}
            variant="outline"
            size="icon"
            aria-label={W.more}
            className={triggerClassName}
          />
        }
      >
        <MoreVertical aria-hidden="true" className="size-5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuItem onClick={handleCopyDetails} className={MENU_ITEM}>
          <Copy aria-hidden="true" />
          {W.copyDetails}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => void handleSaveImage()}
          disabled={!isOnline || savingImage}
          className={MENU_ITEM}
        >
          <Download aria-hidden="true" />
          <span className="flex-1">{W.saveImage}</span>
          {!isOnline ? (
            <span className="text-xs text-muted-foreground">{W.needsInternet}</span>
          ) : null}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => window.print()} className={MENU_ITEM}>
          <Printer aria-hidden="true" />
          {W.print}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleShare} className={MENU_ITEM}>
          <Share2 aria-hidden="true" />
          {W.share}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
