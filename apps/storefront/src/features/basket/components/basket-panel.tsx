'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShoppingBagIcon } from 'lucide-react';
import {
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
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@smartapp/ui/components/empty';
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

// The basket's lines, totals, alerts, and checkout CTA, shared by the drawer and 1280px sticky column.
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
    // Pattern c-empty-11
    return (
      <Empty className="py-12">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ShoppingBagIcon />
          </EmptyMedia>
          <EmptyTitle>{words.basket.empty}</EmptyTitle>
          <EmptyDescription>{words.basket.emptyHint}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href={`/${slug}/menu`} {...(onBrowse ? { onClick: onBrowse } : {})} />}
          >
            {words.basket.browse(catalog)}
          </Button>
        </EmptyContent>
      </Empty>
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
      : 'next opening';
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
    <div className="flex flex-col gap-3">
      {/* Header with Clear basket menu & confirm */}
      <BasketHeader count={count} onClear={() => basket.clear()} />

      {/* Version reset notice & closed/offline alerts */}
      <BasketClosedAlert
        decision={closedDecision}
        versionResetNotice={basket.notice === 'storage_reset'}
      />

      {/* Basket Lines */}
      <ul className="flex flex-col gap-2.5">
        {rows.map((row) => (
          <li key={row.identity}>
            <BasketLine row={row} basket={basket} onChooseAgain={handleOpenItem} />
          </li>
        ))}
      </ul>

      {/* Goes Well With */}
      <BasketGoesWellWith
        items={companionItems}
        optionGroups={shop.catalog.optionGroups}
        basket={basket}
        onOpenItem={handleOpenItem}
      />

      {/* Stamp Progress */}
      <BasketStampProgress stampCard={shop.storefront.stampCard} subtotal={subtotal} />

      {/* Order Summary / Totals (c-separator-6) */}
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

      {/* Checkout / Schedule CTA button */}
      <div className="pt-2">{mainAction}</div>
    </div>
  );
}
