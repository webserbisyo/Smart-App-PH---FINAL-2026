import * as React from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import {
  ChefHatIcon,
  PackageIcon,
  ReceiptTextIcon,
  SearchIcon,
  Share2Icon,
  Volume2Icon,
  WifiOffIcon,
} from 'lucide-react';
import type { BoardOrder } from '@smartapp/core';
import { errorWords, ordersWords, vocab, words } from '@smartapp/core';
import { errorCodeOf, useOpenOrders } from '@smartapp/data';
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
import { storefrontUrl } from '@/app/use-nav-items';
import { BusyMenu } from '../busy-menu.js';
import { FindOrderDialog } from '../find-order-dialog.js';
import { NowBoard } from '../now-board.js';
import { OrdersDevScenarioPanel } from '../orders-dev-scenario-panel.js';
import { useOrdersSearch, useOrdersTabs } from '../tabs.js';
import { ScheduledScreen } from './scheduled.js';
import { HistoryScreen } from './history.js';

export function OrdersScreen() {
  const shop = useShop();
  const search = useOrdersSearch();
  const currentView = search.view ?? 'now';
  const navigate = useNavigate();

  const isOnline = useOnlineStatus();
  const now = useNow(30_000);

  const {
    data: orders = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useOpenOrders(shop.slug, search.q);

  const { soundEnabled, enableSound } = useOrderSound(orders);

  // Tab title shows open count: "(5) Orders · Kanto Smash Burgers"
  const openCount = orders.length;
  React.useEffect(() => {
    const prefix = openCount > 0 ? `(${openCount}) ` : '';
    document.title = `${prefix}${words.screens.orders.title} · ${shop.name}`;
  }, [openCount, shop.name]);

  const tabs = useOrdersTabs();
  const [findOpen, setFindOpen] = React.useState(false);
  const KitchenIcon = shop.kind === 'retail' ? PackageIcon : ChefHatIcon;
  const kitchenLabel = vocab(shop.kind).kitchenView;

  const handleShare = async () => {
    const url = storefrontUrl(shop.slug);
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
      notify({ title: words.share.copied, tone: 'success' });
    }
  };

  const handleSelectOrder = (order: BoardOrder) => {
    void navigate({
      to: '/orders/$orderId',
      params: { orderId: order.id },
      search,
    });
  };

  return (
    <div className="flex min-h-full flex-col pb-16 md:pb-8">
      <PageHeader
        title={words.screens.orders.title}
        tabs={tabs}
        actions={
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => setFindOpen(true)}
              aria-label={ordersWords.find.button}
              className="h-11 gap-1.5 px-3 md:h-9"
            >
              <SearchIcon className="size-4" aria-hidden="true" />
              <span className="sr-only md:not-sr-only">{ordersWords.find.button}</span>
            </Button>
            <Button
              variant="outline"
              aria-label={kitchenLabel}
              className="h-11 gap-1.5 px-3 md:h-9"
              nativeButton={false}
              render={<Link to="/orders/kitchen" search={{ type: search.type }} />}
            >
              <KitchenIcon className="size-4" aria-hidden="true" />
              <span className="sr-only md:not-sr-only">{kitchenLabel}</span>
            </Button>
            <BusyMenu slug={shop.slug} />
          </div>
        }
      />
      <FindOrderDialog open={findOpen} onOpenChange={setFindOpen} slug={shop.slug} />

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
            <span>{ordersWords.states.soundHint}</span>
          </Notice>
        )}

        {/* View switching */}
        {currentView === 'scheduled' ? (
          <ScheduledScreen slug={shop.slug} />
        ) : currentView === 'history' ? (
          <HistoryScreen slug={shop.slug} />
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
            message={errorWords(errorCodeOf(error))}
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
