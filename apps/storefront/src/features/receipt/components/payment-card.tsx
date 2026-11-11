import { isTransfer, orderProofs, words, type OrderReceipt } from '@smartapp/core';
import { Alert, AlertDescription, AlertTitle } from '@smartapp/ui/components/reui/alert';
import { Button } from '@smartapp/ui/components/button';
import { Camera, CheckCircle2, MessageCircle, XCircle } from 'lucide-react';
import { isOrderCancelled } from '../receipt-rules';
import { PayCountdown } from './pay-countdown';

export interface PaymentCardProps {
  readonly order: OrderReceipt;
  readonly shopName: string;
  // Opens the order chat, where the payment photo is sent (T81).
  readonly onOpenChat: () => void;
  // Loads the chat before the tap when a finger or mouse comes near.
  readonly onWarmChat: () => void;
}

/** True while a transfer is unpaid or being checked: the pay card shows and the chat takes photos. */
export function paymentOpen(order: OrderReceipt): boolean {
  return (
    isTransfer(order.paymentMethod) &&
    !isOrderCancelled(order.status) &&
    (order.paymentStatus === 'unpaid' || order.paymentStatus === 'pending')
  );
}

/** One card while a transfer is unpaid or being checked: the countdown and details, then the photo step. */
export function PaymentCard({ order, shopName, onOpenChat, onWarmChat }: PaymentCardProps) {
  if (!paymentOpen(order)) return null;

  const W = words.receipt.proof;
  const C = words.receipt.chat;
  const proofs = orderProofs(order.messages);
  const latest = proofs[proofs.length - 1];
  const checking = order.paymentStatus === 'pending';
  const rejected = !checking && latest?.status === 'rejected';

  return (
    <section
      id="receipt-payment"
      className="flex flex-col gap-5 divide-y divide-dashed rounded-3xl bg-card p-5 shadow-xs ring-1 ring-foreground/8 *:not-first:pt-5 sm:p-6 print:hidden"
    >
      <PayCountdown order={order} shopName={shopName} />
      <div className="flex flex-col gap-3">
        {checking ? (
          <Alert variant="info">
            <CheckCircle2 />
            <AlertTitle>{W.sentTitle}</AlertTitle>
            <AlertDescription>
              {W.sentText} {W.waiting}.
            </AlertDescription>
          </Alert>
        ) : rejected ? (
          <Alert variant="destructive">
            <XCircle />
            <AlertTitle>{W.rejectedTitle}</AlertTitle>
            <AlertDescription>
              {latest.rejectReason ? W.rejectedReason(latest.rejectReason) : W.rejectedNoReason}
            </AlertDescription>
          </Alert>
        ) : (
          <p className="text-sm text-muted-foreground">{C.openHint}</p>
        )}
        <Button
          type="button"
          id="receipt-open-chat"
          size="lg"
          variant={checking ? 'outline' : 'default'}
          onClick={onOpenChat}
          onPointerEnter={onWarmChat}
          onFocus={onWarmChat}
          className="h-12 w-full gap-2 rounded-full text-base font-semibold"
        >
          {checking ? (
            <MessageCircle aria-hidden="true" className="size-5" />
          ) : (
            <Camera aria-hidden="true" className="size-5" />
          )}
          {checking ? C.openChat : rejected ? C.sendNewPhoto : C.sendPhoto}
        </Button>
      </div>
    </section>
  );
}
