'use client';

import { lazy, Suspense, useId, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { artPath, words, type OrderReceipt, type Storefront } from '@smartapp/core';
import {
  useBasket,
  useMyAccount,
  useOnline,
  usePushOrders,
  useSubscribePush,
} from '@smartapp/data';
import { Button } from '@smartapp/ui/components/button';
import { ClientOnly } from '@smartapp/ui/components/client-only';
import { Label } from '@smartapp/ui/components/label';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { Switch } from '@smartapp/ui/components/switch';
import { Bell, BellOff, MoreVertical, RefreshCw } from 'lucide-react';
import { InstallCard } from '../../install/components/install-card';
import { enablePush, pushState, type PushState } from '../../install/push';
import { useShop } from '../../shell/components/shop-context';
import { useLaterPart } from '../../shell/use-when-idle';
import { isOrderCancelled } from '../receipt-rules';

// The More menu (Base UI menu and its positioning) loads when the page is idle or the button is touched,
// so it stays out of the receipt's first JavaScript (decision R49).
const ReceiptMoreMenu = lazy(() =>
  import('./receipt-more-menu').then((m) => ({ default: m.ReceiptMoreMenu })),
);
// Rating only shows on a finished order: its code loads after the page's first JavaScript, and the
// server's copy shows meanwhile (decision R49).
const RatingCard = lazy(() => import('./rating-card').then((m) => ({ default: m.RatingCard })));
const MORE_ID = 'receipt-more-actions-button';
const MORE_CLASS = 'size-12 shrink-0 rounded-full bg-card';

export interface ReceiptActionsProps {
  readonly slug: string;
  readonly order: OrderReceipt;
  readonly storefront: Storefront;
  readonly receiptUrl: string;
}

const CARD = 'rounded-3xl bg-card p-5 shadow-xs ring-1 ring-foreground/8 sm:p-6';

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

export function ReceiptActions({ slug, order, storefront, receiptUrl }: ReceiptActionsProps) {
  const basket = useBasket(slug);
  const { setBasketOpen } = useShop();
  const more = useLaterPart();
  const W = words.receipt.actions;

  const isCompleted = order.status === 'completed';
  const cancelled = isOrderCancelled(order.status);
  const stampsOn = storefront.stampCard.status === 'on';

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

  // Looks and reads the same as the menu's own button; a tap opens the menu as soon as it arrives.
  const moreStandIn = (
    <Button
      type="button"
      id={MORE_ID}
      variant="outline"
      size="icon"
      aria-label={W.more}
      aria-haspopup="menu"
      aria-expanded={false}
      className={MORE_CLASS}
      {...more.standIn}
    >
      <MoreVertical aria-hidden="true" className="size-5" />
    </Button>
  );

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

        {more.loaded ? (
          <Suspense fallback={moreStandIn}>
            <ReceiptMoreMenu
              slug={slug}
              order={order}
              storefront={storefront}
              receiptUrl={receiptUrl}
              triggerId={MORE_ID}
              triggerClassName={MORE_CLASS}
              openNow={more.openNow}
              focused={more.focused}
            />
          </Suspense>
        ) : (
          moreStandIn
        )}
      </div>

      {!cancelled && !isCompleted ? <NotifyCard slug={slug} token={order.token} /> : null}

      {stampsOn && !cancelled ? (
        <ClientOnly>
          <StampLine slug={slug} completed={isCompleted} />
        </ClientOnly>
      ) : null}

      {isCompleted ? (
        <Suspense fallback={<Skeleton className="h-64 w-full rounded-3xl" />}>
          <RatingCard
            slug={slug}
            order={order}
            googleReviewUrl={storefront.info.contact.googleReviewUrl}
          />
        </Suspense>
      ) : null}

      <ClientOnly>
        <InstallCard slug={slug} shopName={storefront.info.name} />
      </ClientOnly>
    </div>
  );
}
