import * as React from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import {
  CalendarIcon,
  HistoryIcon,
  ReceiptTextIcon,
  Share2Icon,
  Volume2Icon,
  WifiOffIcon,
} from 'lucide-react';
import type { BoardOrder } from '@smartapp/core';
import { ordersWords, words } from '@smartapp/core';
import { useOpenOrders } from '@smartapp/data';
import { Button } from '@smartapp/ui/components/button';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { PageHeader } from '@smartapp/ui/compositions/page-header';
import { copyText } from '@smartapp/ui/lib/copy-text';
import { notify } from '@smartapp/ui/compositions/notify';
import { Notice } from '@/app/notice';
import { useNow } from '@/app/orders/use-now';
import { useOrderSound } from '@/app/orders/use-order-sound';
import { PageEmpty, PageError } from '@/app/page-state';
import { useOnlineStatus } from '@/app/use-online-status';
import { useShop } from '@/app/shop';
import { BusyMenu } from '../components/busy-menu.js';
import { NowBoard } from '../components/now-board.js';
import { OrdersDevScenarioPanel } from '../components/orders-dev-scenario-panel.js';
import { useOrdersTabs, type OrdersSearch } from '../tabs.js';

export function OrdersScreen() {
  const shop = useShop();
  const search = useSearch({ strict: false }) as OrdersSearch;
  const currentView = search.view ?? 'now';
  const navigate = useNavigate();

  const isOnline = useOnlineStatus();
  const now = useNow(30_000);

  const { data: orders = [], isLoading, isError, refetch } = useOpenOrders(shop.slug, search.q);

  const { soundEnabled, enableSound } = useOrderSound(orders);

  // Tab title shows open count: "(5) Orders · Kanto Smash Burgers"
  const openCount = orders.length;
  React.useEffect(() => {
    const prefix = openCount > 0 ? `(${openCount}) ` : '';
    document.title = `${prefix}${words.screens.orders.title} · ${shop.name}`;
  }, [openCount, shop.name]);

  const tabs = useOrdersTabs();

  const handleShare = async () => {
    const url = `${window.location.origin}/${shop.slug}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: shop.name, url });
        return;
      } catch {
        // Fall back to copy
      }
    }
    const ok = await copyText(url);
    if (ok) {
      notify({
        title: 'Shop link copied to clipboard',
        tone: 'success',
      });
    }
  };

  const handleSelectOrder = (order: BoardOrder) => {
    void navigate({
      to: '/orders/$orderId',
      params: { orderId: order.id },
      search: (prev) => prev,
    });
  };

  return (
    <div className="flex min-h-full flex-col pb-16 md:pb-8">
      <PageHeader
        title={words.screens.orders.title}
        tabs={tabs}
        actions={<BusyMenu slug={shop.slug} />}
      />

      <main className="flex-1 space-y-4 px-4 py-4 md:px-6">
        {/* Offline Notice */}
        {!isOnline && (
          <Notice tone="warning" icon={<WifiOffIcon className="size-4" />}>
            <span>{ordersWords.states.offlineNotice}</span>
          </Notice>
        )}

        {/* Turn on sound Notice until tapped */}
        {!soundEnabled && currentView === 'now' && (
          <Notice
            tone="brand"
            icon={<Volume2Icon className="size-4" />}
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={enableSound}
                className="h-8 text-xs font-semibold"
              >
                {ordersWords.states.soundNotice}
              </Button>
            }
          >
            <span>Turn on sound to hear a chime whenever a new order arrives.</span>
          </Notice>
        )}

        {/* View switching */}
        {currentView === 'scheduled' ? (
          <PageEmpty
            className="py-16"
            icon={<CalendarIcon className="size-8 text-muted-foreground" />}
            description={words.screens.orders.emptyScheduled}
          />
        ) : currentView === 'history' ? (
          <PageEmpty
            className="py-16"
            icon={<HistoryIcon className="size-8 text-muted-foreground" />}
            description={words.screens.orders.emptyHistory}
          />
        ) : isLoading ? (
          /* Loading Skeletons in board shape */
          <div className="space-y-4">
            <div className="flex gap-2">
              <Skeleton className="h-9 w-20 rounded-lg" />
              <Skeleton className="h-9 w-24 rounded-lg" />
              <Skeleton className="h-9 w-24 rounded-lg" />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {[1, 2, 3, 4].map((col) => (
                <div key={col} className="space-y-3 rounded-2xl border border-border/40 p-3">
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-44 w-full rounded-xl" />
                  <Skeleton className="h-44 w-full rounded-xl" />
                </div>
              ))}
            </div>
          </div>
        ) : isError ? (
          <PageError
            title={ordersWords.states.errorBoard}
            message="Could not load live orders. Check your connection and try again."
            retryLabel={ordersWords.states.tryAgain}
            onRetry={() => {
              void refetch();
            }}
          />
        ) : orders.length === 0 ? (
          <PageEmpty
            className="py-16"
            icon={<ReceiptTextIcon className="size-8 text-muted-foreground" />}
            title="No orders yet"
            description={ordersWords.states.emptyBoard}
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleShare()}
                className="h-9 gap-1.5 font-semibold"
              >
                <Share2Icon className="size-4" />
                {ordersWords.states.shareMyShop}
              </Button>
            }
          />
        ) : (
          <NowBoard
            orders={orders}
            now={now}
            slug={shop.slug}
            kind={shop.kind}
            onSelectOrder={handleSelectOrder}
          />
        )}
      </main>

      <OrdersDevScenarioPanel />
    </div>
  );
}
