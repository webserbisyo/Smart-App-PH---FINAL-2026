import * as React from 'react';
import { useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { ReceiptTextIcon } from 'lucide-react';
import type { BoardOrder } from '@smartapp/core';
import { ordersWords, words } from '@smartapp/core';
import { useOrderDetail, useOpenOrders } from '@smartapp/data';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { PageHeader } from '@smartapp/ui/compositions/page-header';
import { useNow } from '@/app/orders/use-now';
import { PageError } from '@/app/page-state';
import { useShop } from '@/app/shop';
import { BusyMenu } from '../components/busy-menu.js';
import { NowBoard } from '../components/now-board.js';
import { OrderDetailContent } from '../components/order-detail-content.js';
import { useOrdersTabs, type OrdersSearch } from '../tabs.js';

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = React.useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  React.useEffect(() => {
    const m = window.matchMedia(query);
    const handler = () => setMatches(m.matches);
    m.addEventListener('change', handler);
    return () => m.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

export function OrderDetailScreen() {
  const { orderId } = useParams({ strict: false }) as { orderId: string };
  const search = useSearch({ strict: false }) as OrdersSearch;
  const shop = useShop();
  const navigate = useNavigate();
  const now = useNow(30_000);

  const isDesktopWide = useMediaQuery('(min-width: 1280px)');

  const {
    data: order,
    isLoading: isOrderLoading,
    isError: isOrderError,
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
      <div className="flex flex-col min-h-full p-4 md:p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="size-9 rounded-lg" />
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl">
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
          title="Order not found"
          message="Could not load the details for this order. It may have been completed or removed."
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
      <div className="flex flex-col min-h-full">
        <PageHeader
          title={words.screens.orders.title}
          tabs={useOrdersTabs()}
          actions={<BusyMenu slug={shop.slug} />}
        />

        <div className="flex flex-1 min-h-0 overflow-hidden border-t border-border/60">
          {/* Left: The board */}
          <div className="flex-1 min-w-0 overflow-y-auto px-4 py-4 md:px-6">
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
          <aside className="w-[440px] shrink-0 border-l border-border/80 bg-background overflow-y-auto">
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
      <OrderDetailContent
        order={order}
        slug={shop.slug}
        kind={shop.kind}
        isFullPage={true}
        onBack={handleBack}
      />
    </div>
  );
}
