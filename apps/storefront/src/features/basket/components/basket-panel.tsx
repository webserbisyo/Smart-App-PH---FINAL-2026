'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  artPath,
  formatClock,
  formatPeso,
  openState,
  vocab,
  words,
  type OrderPayload,
} from '@smartapp/core';
import {
  useCheckoutDraft,
  useLastAddress,
  useNow,
  useOnline,
  useOrderType,
  useQuote,
} from '@smartapp/data';
import { Button } from '@smartapp/ui/components/button';
import { EmptyState } from '@smartapp/ui/compositions/empty-state';
import { useShop } from '../../shell/components/shop-context';
import { closedStateDecision } from '../basket-rules';
import { BasketClosedAlert } from './basket-closed-alert';
import { BasketGoesWellWith } from './basket-goes-well-with';
import { BasketHeader } from './basket-header';
import { BasketLine } from './basket-line';
import { BasketStampProgress } from './basket-stamp-progress';
import { BasketTotals } from './basket-totals';
import { useBasketView } from './use-basket-view';

export interface BasketPanelProps {
  onBrowse?: (() => void) | undefined;
}

// The basket's lines, alerts, totals and checkout button, laid out to fill the basket drawer.
export function BasketPanel({ onBrowse }: BasketPanelProps) {
  const router = useRouter();
  const { slug, shop } = useShop();
  const now = useNow();
  const isOnline = useOnline();

  const { type: savedType } = useOrderType(slug);
  const { address } = useLastAddress(slug);
  const { draft } = useCheckoutDraft(slug);

  const orderType = savedType ?? shop.storefront.orderTypes[0] ?? 'pickup';
  const paymentMethod = shop.storefront.payments[0]?.method ?? 'cash';

  // Base basket view without quote to get initial lines
  const initialView = useBasketView(shop, null, now);
  const { basket } = initialView;

  // Build quote payload only if basket has items
  const quotePayload: OrderPayload | null = useMemo(() => {
    if (basket.lines.length === 0) return null;
    return {
      type: orderType,
      scheduledAt: null,
      lines: basket.lines,
      customer: {
        name: draft?.name || 'Customer',
        phone: draft?.phone || '09170000000',
        email: draft?.email ?? null,
      },
      delivery: address
        ? {
            spot: address.spot ?? null,
            zoneId: address.zoneId ?? null,
            addressLine: address.addressLine ?? '',
            houseNo: address.houseNo ?? null,
            floor: address.floor ?? null,
            landmark: address.landmark ?? null,
          }
        : null,
      paymentMethod,
      note: null,
      useReward: false,
    };
  }, [basket.lines, orderType, draft, address, paymentMethod]);

  const quoteQuery = useQuote(slug, quotePayload);
  const quote = quoteQuery.data ?? null;

  // Full basket view with live quote data
  const { rows, goodRows, count } = useBasketView(shop, quote, now);

  const catalog = vocab(shop.storefront.info.kind).catalog;

  // Open state evaluation from live quote or fallback to shop rules
  const currentOpenState =
    quote?.openState ?? openState(shop.storefront, now ? new Date(now) : new Date());

  const closedDecision = closedStateDecision({
    sf: shop.storefront,
    openState: currentOpenState,
    isOnline,
    now: now ? new Date(now) : new Date(),
  });

  // Calculate totals
  const localSubtotal = goodRows.reduce((sum, r) => sum + r.lineTotal, 0);
  const subtotal = quote?.subtotal ?? localSubtotal;
  const deliveryFee = orderType === 'delivery' ? (quote?.deliveryFee ?? null) : null;
  const discount = quote?.discount ?? 0;
  const total = quote?.total ?? Math.max(0, subtotal - discount) + (deliveryFee ?? 0);

  // Companion items for "Goes well with"
  const basketItemIds = new Set(basket.lines.map((l) => l.itemId));
  const companionItems = shop.catalog.items
    .filter((item) => !basketItemIds.has(item.id) && item.status === 'active')
    .slice(0, 3);

  const handleOpenItem = (itemId: string) => {
    if (onBrowse) onBrowse();
    router.push(`/${slug}/menu?item=${itemId}`);
  };

  if (rows.length === 0) {
    return (
      <EmptyState
        art={artPath('basket_empty')}
        title={words.basket.empty}
        description={words.basket.emptyHint}
        variant="plain"
        className="px-4"
        action={
          <Button
            className="h-11 rounded-full px-6"
            nativeButton={false}
            render={<Link href={`/${slug}/menu`} {...(onBrowse ? { onClick: onBrowse } : {})} />}
          >
            {words.basket.browse(catalog)}
          </Button>
        }
      />
    );
  }

  // Determine Main Action Button
  let mainAction = (
    <Button
      size="lg"
      className="w-full font-semibold shadow-xs"
      disabled={goodRows.length === 0}
      nativeButton={false}
      render={<Link href={`/${slug}/checkout`} {...(onBrowse ? { onClick: onBrowse } : {})} />}
    >
      {words.basket.checkoutWithPrice(formatPeso(total))}
    </Button>
  );

  if (closedDecision.state === 'closed_with_scheduling') {
    const slotText = closedDecision.scheduleSlot
      ? formatClock(closedDecision.scheduleSlot)
      : words.basket.nextOpening;
    mainAction = (
      <Button
        size="lg"
        className="w-full font-semibold shadow-xs"
        disabled={goodRows.length === 0}
        nativeButton={false}
        render={
          <Link
            href={`/${slug}/checkout?scheduled=${closedDecision.scheduleSlot ?? ''}`}
            {...(onBrowse ? { onClick: onBrowse } : {})}
          />
        }
      >
        {words.basket.scheduleFor(slotText)}
      </Button>
    );
  } else if (closedDecision.buttonDisabled) {
    mainAction = (
      <Button size="lg" className="w-full text-xs font-semibold sm:text-sm" disabled>
        {closedDecision.buttonReason ?? words.basket.goToCheckout}
      </Button>
    );
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="shrink-0 px-4 pt-3">
        <BasketHeader count={count} onClear={() => basket.clear()} />
      </div>

      {/* One scroll area; the totals and the main button stay pinned below it (redesign I9). */}
      <div className="scrollbar-none flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-4 pb-4">
        <BasketClosedAlert
          decision={closedDecision}
          versionResetNotice={basket.notice === 'storage_reset'}
        />

        <ul className="flex flex-col gap-2.5">
          {rows.map((row) => (
            <li key={row.identity}>
              <BasketLine row={row} basket={basket} onChooseAgain={handleOpenItem} />
            </li>
          ))}
        </ul>

        <BasketGoesWellWith
          items={companionItems}
          optionGroups={shop.catalog.optionGroups}
          basket={basket}
          onOpenItem={handleOpenItem}
        />

        <BasketStampProgress stampCard={shop.storefront.stampCard} subtotal={subtotal} />
      </div>

      <div className="shrink-0 border-t bg-popover pb-safe">
        <div className="flex flex-col gap-3 px-4 pt-3 pb-4">
          <BasketTotals
            subtotal={subtotal}
            deliveryFee={deliveryFee}
            discount={discount}
            total={total}
            isLoadingQuote={quoteQuery.isFetching}
            hasQuoteData={Boolean(quote)}
            quoteError={quoteQuery.isError}
            isOnline={isOnline}
          />
          {mainAction}
        </div>
      </div>
    </div>
  );
}
