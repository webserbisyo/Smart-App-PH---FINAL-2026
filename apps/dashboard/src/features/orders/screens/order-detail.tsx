import * as React from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import type { BoardOrder } from '@smartapp/core';
import { errorWords, ordersWords, words } from '@smartapp/core';
import { errorCodeOf, useOrderDetail, useOpenOrders } from '@smartapp/data';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { PageHeader } from '@smartapp/ui/compositions/page-header';
import { useNow } from '@/app/orders/use-now';
import { PageError } from '@/app/page-state';
import { useShop } from '@/app/shop';
import { useMediaQuery } from '@/app/use-media-query';
import { BusyMenu } from '../busy-menu.js';
import { NowBoard } from '../now-board.js';
import { OrderDetailContent } from '../order-detail-content.js';
import { useOrdersSearch, useOrdersTabs } from '../tabs.js';

export function OrderDetailScreen() {
  const orderId = useParams({ strict: false }).orderId ?? '';
  const search = useOrdersSearch();
  const shop = useShop();
  const navigate = useNavigate();
  const now = useNow(30_000);

  const isDesktopWide = useMediaQuery('(min-width: 1280px)');
  const tabs = useOrdersTabs();

  const {
    data: order,
    isLoading: isOrderLoading,
    isError: isOrderError,
    error: orderError,
    refetch: refetchOrder,
  } = useOrderDetail(shop.slug, orderId);

  const { data: openOrders = [] } = useOpenOrders(shop.slug, search.q);

  const handleBack = () => {
    void navigate({
      to: '/orders',
      search: (prev: Record<string, unknown>) => ({
        ...prev,
      }),
    });
  };

  const handleSelectOrder = (selected: BoardOrder) => {
    void navigate({
      to: '/orders/$orderId',
      params: { orderId: selected.id },
      search: (prev: Record<string, unknown>) => prev,
    });
  };

  // If order details are loading
  if (isOrderLoading) {
    return (
      <div className="flex min-h-full flex-col space-y-4 p-4 md:p-6">
        <div className="flex items-center gap-3">
          <Skeleton className="size-9 rounded-lg" />
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="grid max-w-4xl grid-cols-1 gap-4 md:grid-cols-2">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  // If order is not found or failed
  if (isOrderError || !order) {
    return (
      <div className="p-4 md:p-6">
        <PageError
          title={ordersWords.states.errorDetail}
          message={errorWords(errorCodeOf(orderError))}
          retryLabel={ordersWords.states.tryAgain}
          onRetry={() => {
            void refetchOrder();
          }}
        />
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={handleBack}
            className="text-xs font-semibold text-primary hover:underline"
          >
            {ordersWords.detail.backToOrders}
          </button>
        </div>
      </div>
    );
  }

  // At ≥1280px: side panel beside the live board
  if (isDesktopWide) {
    return (
      <div className="flex min-h-full flex-col">
        <PageHeader
          title={words.screens.orders.title}
          tabs={tabs}
          actions={<BusyMenu slug={shop.slug} />}
        />

        <div className="flex min-h-0 flex-1 overflow-hidden border-t border-border/60">
          {/* Left: The board */}
          <div className="min-w-0 flex-1 overflow-y-auto px-4 py-4 md:px-6">
            <NowBoard
              orders={openOrders}
              now={now}
              slug={shop.slug}
              kind={shop.kind}
              selectedOrderId={order.id}
              onSelectOrder={handleSelectOrder}
            />
          </div>

          {/* Right: Side panel detail view */}
          <aside className="w-110 shrink-0 overflow-y-auto border-l border-border/80 bg-background">
            <OrderDetailContent
              order={order}
              slug={shop.slug}
              kind={shop.kind}
              onClose={handleBack}
            />
          </aside>
        </div>
      </div>
    );
  }

  // Below 1280px: Full-page view with Back navigation
  return (
    <div className="min-h-full pb-16 md:pb-8">
      <OrderDetailContent order={order} slug={shop.slug} kind={shop.kind} onBack={handleBack} />
    </div>
  );
}
