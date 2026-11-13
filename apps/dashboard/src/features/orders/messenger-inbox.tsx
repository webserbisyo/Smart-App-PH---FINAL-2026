import { formatPeso, ordersWords, type BoardOrder } from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import { MessengerIcon } from '@smartapp/ui/compositions/messenger-icon';
import { notify } from '@smartapp/ui/compositions/notify';
import { copyText } from '@smartapp/ui/lib/copy-text';
import { cn } from 'cn';
import { orderNoLabel } from '@/app/orders/order-ticket-label';

// The shop's Page inbox in Meta Business Suite: where a Facebook Page's Messenger chats are answered.
export const PAGE_INBOX_URL = 'https://business.facebook.com/latest/inbox/all';

const W = ordersWords.messenger;

// The link opens the inbox by itself; with an order open, its line is copied to paste into the chat.
function onOpen(order: BoardOrder) {
  const line = W.orderLine(
    orderNoLabel(order.orderNo),
    formatPeso(order.total),
    order.customerName,
  );
  void copyText(line).then((ok) =>
    notify(ok ? { title: W.copied(line), tone: 'success' } : { title: W.opened, tone: 'info' }),
  );
}

/** Messenger beside Call and Text in the order panel: opens the inbox with this order copied. */
export function MessengerOrderButton({
  order,
  className,
}: {
  order: BoardOrder;
  className?: string | undefined;
}) {
  return (
    <Button
      variant="outline"
      nativeButton={false}
      render={<a href={PAGE_INBOX_URL} target="_blank" rel="noopener noreferrer" />}
      onClick={() => onOpen(order)}
      className={cn('h-11 gap-1.5 font-semibold md:h-9', className)}
    >
      <MessengerIcon />
      {ordersWords.detail.messenger}
    </Button>
  );
}
