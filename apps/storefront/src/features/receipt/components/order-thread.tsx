'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import {
  formatPeso,
  hasReference,
  imageSources,
  isTransfer,
  words,
  type OrderMessage,
  type OrderReceipt,
  type Proof,
} from '@smartapp/core';
import { useProofPreview } from '@smartapp/data';
import {
  Attachment,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
  AttachmentTrigger,
} from '@smartapp/ui/components/attachment';
import { Bubble, BubbleContent } from '@smartapp/ui/components/bubble';
import { Marker, MarkerContent, MarkerIcon } from '@smartapp/ui/components/marker';
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
  MessageGroup,
} from '@smartapp/ui/components/message';
import { ShopLogo } from '@smartapp/ui/compositions/shop-logo';
import { cn } from '@smartapp/ui/lib/utils';
import {
  CalendarClock,
  CircleCheckIcon,
  HourglassIcon,
  ImageIcon,
  LinkIcon,
  ReceiptTextIcon,
  XCircle,
} from 'lucide-react';
import { useShop } from '../../shell/components/shop-context';
import { useWhenIdle } from '../../shell/use-when-idle';
import { statusChip } from '../receipt-look';
import { formatManilaTime } from '../receipt-rules';

// The bigger photo (Base UI dialog and drawer) loads only on orders with a proof, once the page is idle.
const ProofViewer = dynamic(() => import('./proof-viewer').then((m) => m.ProofViewer), {
  ssr: false,
});

export interface OrderThreadProps {
  readonly order: OrderReceipt;
}

const PROOF_STATE = {
  pending: { icon: HourglassIcon, className: 'text-info-text' },
  approved: { icon: CircleCheckIcon, className: 'text-success-text' },
  rejected: { icon: XCircle, className: 'text-destructive-text' },
} as const;

/** The customer's proof (c-message-5): the photo this phone sent, the reference and its check state. */
function ProofMessage({
  slug,
  proof,
  time,
  onView,
}: {
  slug: string;
  proof: Proof;
  time: string;
  onView: (src: string) => void;
}) {
  const preview = useProofPreview(slug, proof.path);
  const T = words.receipt.thread;
  const state = PROOF_STATE[proof.status];
  const StateIcon = state.icon;
  return (
    <Message align="end">
      <MessageContent>
        <Attachment orientation="vertical" className="w-full max-w-44">
          <AttachmentMedia variant="image">
            {preview ? (
              <img
                src={preview}
                alt={T.proofAlt(proof.referenceNo)}
                width={176}
                height={176}
                decoding="async"
              />
            ) : (
              <ImageIcon aria-hidden="true" className="text-muted-foreground" />
            )}
          </AttachmentMedia>
          {preview ? null : (
            <AttachmentContent>
              <AttachmentTitle>{words.receipt.proof.photoSent}</AttachmentTitle>
              <AttachmentDescription>{words.receipt.proof.photoElsewhere}</AttachmentDescription>
            </AttachmentContent>
          )}
          {preview ? (
            <AttachmentTrigger
              aria-label={T.viewProof(proof.referenceNo)}
              onClick={() => onView(preview)}
            />
          ) : null}
        </Attachment>
        <Bubble>
          <BubbleContent>
            {hasReference(proof.referenceNo)
              ? words.shop.thread.proofSent(proof.referenceNo)
              : words.shop.thread.photoSent}
          </BubbleContent>
        </Bubble>
        <MessageFooter className="gap-1.5 tabular">
          <StateIcon aria-hidden="true" className={cn('size-3.5', state.className)} />
          <span>{T.proofState[proof.status]}</span>
          <span aria-hidden="true">·</span>
          <span>{time}</span>
        </MessageFooter>
      </MessageContent>
    </Message>
  );
}

/**
 * The order chat (decisions R34 and T81): the customer's payment photos on the right as bubbles, the
 * shop's replies on the left with its logo (c-message-5), and status changes as markers (c-marker-2).
 * It opens from the chat head on the receipt; free-text chat is MVP B (S7).
 */
export function OrderThread({ order }: OrderThreadProps) {
  const { slug, shop } = useShop();
  const [viewing, setViewing] = useState<string | null>(null);
  const [viewerLoaded, loadViewer] = useWhenIdle(order.messages?.some((msg) => msg.proof) ?? false);
  if (viewing !== null && !viewerLoaded) loadViewer();
  const info = shop.storefront.info;
  const logo = info.logo ? imageSources(info.logo) : null;
  const T = words.receipt.thread;

  // The shop's replies (payment checked, rider): its logo and a muted bubble on the left.
  const shopSays = (msg: OrderMessage, text: string) => (
    <Message key={msg.id}>
      <MessageAvatar>
        <ShopLogo name={info.name} src={logo} size="sm" shape="round" />
      </MessageAvatar>
      <MessageContent>
        <Bubble variant="muted">
          <BubbleContent>{text}</BubbleContent>
        </Bubble>
        <MessageFooter className="tabular">{formatManilaTime(msg.at)}</MessageFooter>
      </MessageContent>
    </Message>
  );

  const C = words.receipt.chat;
  // The opening lines: when the order was placed and, for a transfer, what to send (said by the shop).
  const asksToPay = isTransfer(order.paymentMethod);

  return (
    <div id="receipt-order-thread" className="flex flex-col gap-4 px-4 py-4">
      <MessageGroup className="gap-4">
        <Marker variant="separator">
          <MarkerIcon>
            <ReceiptTextIcon />
          </MarkerIcon>
          <MarkerContent className="tabular">
            {C.placed(formatManilaTime(order.placedAt))}
          </MarkerContent>
        </Marker>
        {asksToPay ? (
          <Message>
            <MessageAvatar>
              <ShopLogo name={info.name} src={logo} size="sm" shape="round" />
            </MessageAvatar>
            <MessageContent>
              <Bubble variant="muted">
                <BubbleContent>
                  {C.payAsk(
                    formatPeso(order.totals.total),
                    words.shop.paymentMethod[order.paymentMethod],
                  )}
                </BubbleContent>
              </Bubble>
            </MessageContent>
          </Message>
        ) : null}
        {order.messages.map((msg) => {
          // The placed line is drawn above, once.
          if (msg.kind === 'status' && msg.status === 'placed' && !msg.text) return null;
          const time = formatManilaTime(msg.at);

          if (msg.proof) {
            return (
              <ProofMessage
                key={msg.id}
                slug={slug}
                proof={msg.proof}
                time={time}
                onView={setViewing}
              />
            );
          }

          // An order status change: a marker line with the status icon, word and time.
          if (msg.kind === 'status' && msg.status && !msg.text) {
            const chip = statusChip(msg.status);
            const Icon = chip.icon;
            return (
              <Marker key={msg.id} variant="separator">
                <MarkerIcon>
                  <Icon />
                </MarkerIcon>
                <MarkerContent className="tabular">{T.statusAt(chip.label, time)}</MarkerContent>
              </Marker>
            );
          }

          if (msg.kind === 'schedule') {
            return (
              <Marker key={msg.id} variant="separator">
                <MarkerIcon>
                  <CalendarClock />
                </MarkerIcon>
                <MarkerContent className="tabular">
                  {msg.text ?? T.scheduleChanged(time)}
                </MarkerContent>
              </Marker>
            );
          }

          if (msg.kind === 'tracking') {
            return (
              <Marker key={msg.id} variant="separator">
                <MarkerIcon>
                  <LinkIcon />
                </MarkerIcon>
                <MarkerContent className="tabular">
                  {T.statusAt(msg.text ?? words.shop.thread.tracking, time)}
                </MarkerContent>
              </Marker>
            );
          }

          const text =
            msg.text ??
            (msg.kind === 'rider' && order.rider
              ? words.shop.thread.rider(order.rider.name)
              : null);
          if (!text) return null;
          return shopSays(msg, text);
        })}
      </MessageGroup>

      {viewerLoaded ? <ProofViewer src={viewing} onClose={() => setViewing(null)} /> : null}
    </div>
  );
}
