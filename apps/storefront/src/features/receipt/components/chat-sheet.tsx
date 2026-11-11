'use client';

import { useEffect, useRef } from 'react';
import {
  PROOFS_PER_ORDER,
  formatPeso,
  imageSources,
  orderProofs,
  words,
  type OrderReceipt,
} from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import { MessengerIcon } from '@smartapp/ui/compositions/messenger-icon';
import { notify } from '@smartapp/ui/compositions/notify';
import { ResponsiveSheet } from '@smartapp/ui/compositions/responsive-sheet';
import { ShopLogo } from '@smartapp/ui/compositions/shop-logo';
import { copyText } from '@smartapp/ui/lib/copy-text';
import { LockIcon, PhoneIcon, XIcon } from 'lucide-react';
import { useShop } from '../../shell/components/shop-context';
import { buildMessengerOrderText, buildMessengerUrl, formatOrderNumber } from '../receipt-rules';
import { OrderThread } from './order-thread';
import { ProofUploader } from './proof-uploader';

export interface ChatSheetProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly order: OrderReceipt;
  readonly receiptUrl: string;
  // A transfer still to pay or being checked: the photo button sits where a message box would be.
  readonly payOpen: boolean;
}

// The newest line is in view when the chat opens and when a new one arrives.
function ThreadEnd({ count }: { count: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollIntoView({ block: 'end' });
  }, [count]);
  return <div ref={ref} aria-hidden="true" />;
}

/**
 * The order chat (T81), loaded on the first tap of the chat head: the shop's answers and the customer's
 * payment photos as bubbles, the photo button at the bottom, and a locked message box that points to
 * Messenger until live chat comes (MVP B). Bottom drawer on phones, side sheet from tablets up.
 */
export function ChatSheet({ open, onOpenChange, order, receiptUrl, payOpen }: ChatSheetProps) {
  const { slug, shop } = useShop();
  const info = shop.storefront.info;
  const logo = info.logo ? imageSources(info.logo) : null;
  const C = words.receipt.chat;
  const messengerName = info.contact.messengerUsername;
  const phone = info.contact.phone;
  const orderNo = formatOrderNumber(order.orderNo);
  const sent = orderProofs(order.messages).length;

  const orderText = buildMessengerOrderText({
    orderNo: order.orderNo,
    lineCount: order.lines.length,
    totalFormatted: formatPeso(order.totals.total),
    receiptUrl,
  });
  const messengerUrl = messengerName ? buildMessengerUrl(messengerName, orderText) : null;
  // The link opens Messenger by itself; the copy is a spare in case the text does not carry over.
  const copyForMessenger = () => {
    void copyText(orderText).then((ok) => {
      if (ok) notify({ title: C.copied, tone: 'success' });
    });
  };

  const header = (
    <div className="flex shrink-0 items-center gap-3 border-b px-4 py-3">
      <ShopLogo name={info.name} src={logo} shape="round" />
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="truncate font-semibold">{info.name}</p>
        <p className="truncate text-xs text-muted-foreground tabular">{C.subtitle(orderNo)}</p>
      </div>
      {messengerUrl ? (
        <Button
          variant="ghost"
          size="icon"
          nativeButton={false}
          render={<a href={messengerUrl} target="_blank" rel="noopener noreferrer" />}
          aria-label={C.messengerLabel}
          onClick={copyForMessenger}
          className="size-11 rounded-full"
        >
          <MessengerIcon className="size-5" />
        </Button>
      ) : null}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={C.close}
        onClick={() => onOpenChange(false)}
        className="size-11 rounded-full"
      >
        <XIcon aria-hidden="true" />
      </Button>
    </div>
  );

  const footer = (
    <div className="flex flex-col gap-3">
      {payOpen ? <ProofUploader slug={slug} order={order} /> : null}
      <div className="flex items-center gap-3 rounded-2xl border border-dashed p-2.5 pl-3 text-sm text-muted-foreground">
        <LockIcon aria-hidden="true" className="size-4 shrink-0" />
        <p className="min-w-0 flex-1">
          {sent > 0 ? `${C.used(sent, PROOFS_PER_ORDER)} ` : null}
          {messengerUrl || !phone ? C.locked : C.lockedNoMessenger}
        </p>
        {messengerUrl ? (
          <Button
            variant="outline"
            nativeButton={false}
            render={<a href={messengerUrl} target="_blank" rel="noopener noreferrer" />}
            onClick={copyForMessenger}
            className="h-11 shrink-0 gap-1.5 rounded-full bg-card px-3.5"
          >
            <MessengerIcon className="size-4" />
            {C.messenger}
          </Button>
        ) : phone ? (
          <Button
            variant="outline"
            nativeButton={false}
            render={<a href={`tel:${phone}`} />}
            aria-label={C.callShop(info.name)}
            className="h-11 shrink-0 gap-1.5 rounded-full bg-card px-3.5"
          >
            <PhoneIcon aria-hidden="true" className="size-4" />
            {C.call}
          </Button>
        ) : null}
      </div>
    </div>
  );

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={onOpenChange}
      title={C.title(info.name)}
      header={header}
      footer={footer}
    >
      <OrderThread order={order} />
      <ThreadEnd count={order.messages.length} />
    </ResponsiveSheet>
  );
}
