'use client';

import { useState } from 'react';
import {
  imageSources,
  words,
  type OrderMessage,
  type OrderReceipt,
  type Proof,
} from '@smartapp/core';
import { useProofPreview } from '@smartapp/data';
import {
  Attachment,
  AttachmentContent,
  AttachmentMedia,
  AttachmentTitle,
  AttachmentTrigger,
} from '@smartapp/ui/components/attachment';
import { Bubble, BubbleContent } from '@smartapp/ui/components/bubble';
import { Button } from '@smartapp/ui/components/button';
import { Marker, MarkerContent, MarkerIcon } from '@smartapp/ui/components/marker';
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
  MessageGroup,
} from '@smartapp/ui/components/message';
import { ResponsiveDialog } from '@smartapp/ui/compositions/responsive-dialog';
import { ShopLogo } from '@smartapp/ui/compositions/shop-logo';
import { cn } from '@smartapp/ui/lib/utils';
import {
  Bike,
  CircleCheckIcon,
  ExternalLink,
  HourglassIcon,
  ImageIcon,
  LinkIcon,
  Phone,
  XCircle,
} from 'lucide-react';
import { useShop } from '../../shell/components/shop-context';
import { statusChip } from '../receipt-look';
import { formatManilaTime } from '../receipt-rules';

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
          <BubbleContent>{words.shop.thread.proofSent(proof.referenceNo)}</BubbleContent>
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
 * Order updates as a chat (decision R34): the customer's proofs on the right as bubbles with the photo,
 * the shop's replies on the left with its logo (c-message-5), and status changes as markers (c-marker-2).
 * Free-text chat is MVP B (S7).
 */
export function OrderThread({ order }: OrderThreadProps) {
  const { slug, shop } = useShop();
  const [viewing, setViewing] = useState<string | null>(null);
  const info = shop.storefront.info;
  const logo = info.logo ? imageSources(info.logo) : null;
  const T = words.receipt.thread;

  if (!order.messages || order.messages.length === 0) {
    return null;
  }

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

  return (
    <div
      id="receipt-order-thread"
      className="flex flex-col gap-4 rounded-3xl bg-card p-5 shadow-xs ring-1 ring-foreground/8 sm:p-6 print:hidden"
    >
      <h2 className="text-base font-semibold">{T.title}</h2>

      <MessageGroup className="gap-4">
        {order.messages.map((msg) => {
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
                {order.rider.provider ?? T.rider}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {order.rider.phone && (
              <Button
                variant="outline"
                nativeButton={false}
                render={<a href={`tel:${order.rider.phone}`} />}
                aria-label={T.callRider(order.rider.name)}
                className="h-11 gap-1.5 rounded-full bg-card px-4"
              >
                <Phone aria-hidden="true" className="size-4" />
                {T.call}
              </Button>
            )}
            {order.trackingUrl && (
              <Button
                nativeButton={false}
                render={<a href={order.trackingUrl} target="_blank" rel="noopener noreferrer" />}
                className="h-11 gap-1.5 rounded-full px-4"
              >
                {T.track}
                <ExternalLink aria-hidden="true" className="size-4" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* The proof photo, bigger */}
      <ResponsiveDialog
        open={viewing !== null}
        onOpenChange={(open) => !open && setViewing(null)}
        title={T.proofDialog}
      >
        <div className="flex flex-col items-center justify-center p-2">
          {viewing ? (
            <img
              src={viewing}
              alt={T.proofDialog}
              decoding="async"
              className="max-h-vh-70 w-auto max-w-full rounded-lg object-contain"
            />
          ) : null}
        </div>
      </ResponsiveDialog>
    </div>
  );
}
