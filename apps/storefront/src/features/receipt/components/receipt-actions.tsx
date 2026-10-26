'use client';

import { useId, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { artPath, formatPeso, words, type OrderReceipt, type Storefront } from '@smartapp/core';
import {
  useBasket,
  useMyAccount,
  useOnline,
  usePushOrders,
  useRateOrder,
  useSubscribePush,
} from '@smartapp/data';
import { Button } from '@smartapp/ui/components/button';
import { ClientOnly } from '@smartapp/ui/components/client-only';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@smartapp/ui/components/dropdown-menu';
import { Label } from '@smartapp/ui/components/label';
import { Rating, RatingItem } from '@smartapp/ui/components/rating';
import { Switch } from '@smartapp/ui/components/switch';
import { Textarea } from '@smartapp/ui/components/textarea';
import {
  Bell,
  BellOff,
  Check,
  Copy,
  Download,
  ExternalLink,
  MoreVertical,
  Printer,
  RefreshCw,
  Share2,
  Star,
} from 'lucide-react';
import { InstallCard } from '../../install/components/install-card';
import { enablePush, pushState, type PushState } from '../../install/push';
import { useShop } from '../../shell/components/shop-context';
import { buildMessengerOrderText, formatOrderNumber, isOrderCancelled } from '../receipt-rules';

export interface ReceiptActionsProps {
  readonly slug: string;
  readonly order: OrderReceipt;
  readonly storefront: Storefront;
  readonly receiptUrl: string;
}

const CARD = 'rounded-3xl bg-card p-5 shadow-xs ring-1 ring-foreground/8 sm:p-6';
const MENU_ITEM = 'min-h-11 gap-2.5 px-3 text-base';

function noSubscribe() {
  return () => {};
}

function NotifyCard({ slug, token }: { slug: string; token: string }) {
  const state = useSyncExternalStore<PushState>(noSubscribe, pushState, () => 'unsupported');
  const isOnline = useOnline();
  const subscribe = useSubscribePush(slug, token);
  const pushOrders = usePushOrders(slug);
  const [asking, setAsking] = useState(false);
  const switchId = useId();
  const W = words.receipt.notify;

  if (state === 'unsupported') return null;
  const on = state === 'granted' && pushOrders.isOn(token);
  const blocked = state === 'needs_install' || state === 'denied';
  const line =
    state === 'needs_install'
      ? words.install.pushIphone
      : state === 'denied'
        ? words.install.pushDenied
        : subscribe.isError
          ? W.failed
          : on
            ? W.on
            : W.off;

  // Asks for permission only on this tap (T13); turning it off is kept on the phone.
  async function handleChange(next: boolean) {
    if (!next) {
      pushOrders.set(token, false);
      return;
    }
    setAsking(true);
    const result = await enablePush();
    setAsking(false);
    if (!result.ok) return;
    subscribe.mutate(result.subscription, { onSuccess: () => pushOrders.set(token, true) });
  }

  return (
    <div className={`${CARD} flex items-center justify-between gap-4`}>
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-shop-10-soft text-shop-10-soft-foreground">
          {blocked ? (
            <BellOff aria-hidden="true" className="size-5" />
          ) : (
            <Bell aria-hidden="true" className="size-5" />
          )}
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <Label htmlFor={switchId} className="text-base font-semibold">
            {W.title}
          </Label>
          <p id={`${switchId}-line`} className="text-sm text-muted-foreground">
            {line}
          </p>
        </div>
      </div>
      <Switch
        id={switchId}
        checked={on}
        onCheckedChange={(next) => void handleChange(next)}
        disabled={blocked || !isOnline || asking || subscribe.isPending}
        aria-describedby={`${switchId}-line`}
      />
    </div>
  );
}

function StampLine({ slug, completed }: { slug: string; completed: boolean }) {
  const account = useMyAccount(slug).data;
  const W = words.receipt.stamps;

  if (account) {
    return (
      <div className="flex items-center gap-3 rounded-3xl bg-member-soft p-4 text-member-soft-foreground">
        <img
          src={artPath('gift')}
          alt=""
          width={40}
          height={40}
          loading="lazy"
          className="size-10 shrink-0 object-contain"
        />
        <p className="text-sm font-semibold">{completed ? W.earned : W.pending}</p>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-3xl bg-member-soft p-4 text-member-soft-foreground">
      <img
        src={artPath('gift')}
        alt=""
        width={48}
        height={48}
        loading="lazy"
        className="size-12 shrink-0 object-contain"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="text-base font-semibold">{W.joinTitle}</p>
        <p className="text-sm opacity-90">{W.joinText}</p>
      </div>
      <Button
        nativeButton={false}
        render={<Link href={`/${slug}/join`} />}
        className="h-11 shrink-0 rounded-full bg-member px-5 text-member-foreground hover:bg-member-hover"
      >
        {W.join}
      </Button>
    </div>
  );
}

function RatingCard({
  slug,
  order,
  googleReviewUrl,
}: {
  slug: string;
  order: OrderReceipt;
  googleReviewUrl: string | null;
}) {
  const rate = useRateOrder(slug, order.token);
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState('');
  const [sent, setSent] = useState(false);
  const commentId = useId();
  const W = words.receipt.rating;

  const shownStars = order.rating?.stars ?? stars;
  const shownComment = order.rating?.comment ?? comment.trim();

  async function handleSend() {
    if (stars < 1) return;
    try {
      await rate.mutateAsync({ stars, comment: comment.trim() || null });
      setSent(true);
    } catch {
      // The message below says what to do.
    }
  }

  return (
    <section
      id="receipt-rating-section"
      aria-labelledby="receipt-rating-title"
      className={`${CARD} flex flex-col gap-4`}
    >
      <h2 id="receipt-rating-title" className="text-base font-semibold">
        {W.title}
      </h2>

      {order.rating || sent ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl bg-muted/50 p-4 text-center">
          <div className="flex gap-1 text-warning" aria-label={W.starsLabel(shownStars)}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                aria-hidden="true"
                className={star <= shownStars ? 'size-6 fill-current' : 'size-6 text-muted'}
              />
            ))}
          </div>
          <p className="text-base font-semibold">{W.thanks}</p>
          {shownComment ? (
            <p className="text-sm break-words text-muted-foreground">“{shownComment}”</p>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <Rating
            value={stars}
            onValueChange={setStars}
            aria-label={W.stars}
            className="justify-center gap-2"
          >
            {[1, 2, 3, 4, 5].map((value) => (
              <RatingItem
                key={value}
                value={value}
                aria-label={W.starsLabel(value)}
                className="size-11"
              />
            ))}
          </Rating>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={commentId} className="text-sm text-muted-foreground">
              {W.comment}
            </Label>
            <Textarea
              id={commentId}
              placeholder={W.commentPlaceholder}
              maxLength={300}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              className="resize-none rounded-xl text-base"
            />
          </div>
          {rate.isError ? (
            <p role="alert" className="text-sm text-destructive-text">
              {W.failed}
            </p>
          ) : null}
          <Button
            type="button"
            id="receipt-submit-rating-button"
            onClick={handleSend}
            disabled={rate.isPending}
            className="h-11 w-full rounded-full text-base"
          >
            {W.send}
          </Button>
        </div>
      )}

      {googleReviewUrl ? (
        <Button
          variant="ghost"
          nativeButton={false}
          render={<a href={googleReviewUrl} target="_blank" rel="noopener noreferrer" />}
          className="h-11 gap-1.5 self-center rounded-full px-4"
        >
          {W.google}
          <ExternalLink aria-hidden="true" className="size-4" />
        </Button>
      ) : null}
    </section>
  );
}

export function ReceiptActions({ slug, order, storefront, receiptUrl }: ReceiptActionsProps) {
  const basket = useBasket(slug);
  const { setBasketOpen } = useShop();
  const isOnline = useOnline();
  const [copied, setCopied] = useState<'details' | 'link' | null>(null);
  const W = words.receipt.actions;

  const orderNo = formatOrderNumber(order.orderNo);
  const isCompleted = order.status === 'completed';
  const cancelled = isOrderCancelled(order.status);
  const stampsOn = storefront.stampCard.status === 'on';

  function flashCopied(kind: 'details' | 'link') {
    setCopied(kind);
    setTimeout(() => setCopied(null), 3000);
  }

  async function handleCopyDetails() {
    const text = buildMessengerOrderText({
      orderNo: order.orderNo,
      lineCount: order.lines.length,
      totalFormatted: formatPeso(order.totals.total),
      receiptUrl,
    });
    try {
      await navigator.clipboard.writeText(text);
      flashCopied('details');
    } catch {
      // Copy is not allowed here; Share still works.
    }
  }

  function handleSaveImage() {
    const link = document.createElement('a');
    link.href = `/${slug}/o/${order.token}/image`;
    link.download = `receipt-${order.orderNo}.png`;
    link.click();
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
      flashCopied('link');
    } catch {
      // Nothing else to try.
    }
  }

  function handleOrderAgain() {
    for (const line of order.lines) {
      basket.add({
        itemId: line.itemId,
        variantId: line.variantId,
        optionIds: [...line.optionIds],
        note: line.note,
        qty: line.qty,
      });
    }
    setBasketOpen(true);
  }

  return (
    <div id="receipt-actions-section" className="flex flex-col gap-4 print:hidden">
      <div className="flex items-center gap-3">
        <Button
          type="button"
          id="receipt-order-again-button"
          variant="secondary"
          onClick={handleOrderAgain}
          className="h-12 flex-1 gap-2 rounded-full text-base font-semibold"
        >
          <RefreshCw aria-hidden="true" className="size-5" />
          {W.orderAgain}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger
            id="receipt-more-actions-button"
            render={
              <Button
                variant="outline"
                size="icon"
                aria-label={W.more}
                className="size-12 shrink-0 rounded-full bg-card"
              />
            }
          >
            <MoreVertical aria-hidden="true" className="size-5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuItem onClick={handleCopyDetails} className={MENU_ITEM}>
              {copied === 'details' ? (
                <Check aria-hidden="true" className="text-success-text" />
              ) : (
                <Copy aria-hidden="true" />
              )}
              {copied === 'details' ? W.copied : W.copyDetails}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSaveImage} disabled={!isOnline} className={MENU_ITEM}>
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
              {copied === 'link' ? (
                <Check aria-hidden="true" className="text-success-text" />
              ) : (
                <Share2 aria-hidden="true" />
              )}
              {copied === 'link' ? W.linkCopied : W.share}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {!cancelled && !isCompleted ? <NotifyCard slug={slug} token={order.token} /> : null}

      {stampsOn && !cancelled ? (
        <ClientOnly>
          <StampLine slug={slug} completed={isCompleted} />
        </ClientOnly>
      ) : null}

      {isCompleted ? (
        <RatingCard
          slug={slug}
          order={order}
          googleReviewUrl={storefront.info.contact.googleReviewUrl}
        />
      ) : null}

      <ClientOnly>
        <InstallCard slug={slug} shopName={storefront.info.name} />
      </ClientOnly>
    </div>
  );
}
