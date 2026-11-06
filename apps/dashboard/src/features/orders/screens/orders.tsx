import * as React from 'react';
import { FilterXIcon, ReceiptTextIcon, Share2Icon, WifiOffIcon } from 'lucide-react';
import type { BoardOrder, OrderType } from '@smartapp/core';
import {
  ORDER_TYPES,
  boardColumn,
  errorWords,
  manilaDate,
  needsProofCheck,
  ordersWords,
  payWindowOver,
  words,
} from '@smartapp/core';
import { errorCodeOf, useOpenOrders, useOrdersByDate, useStorefront } from '@smartapp/data';
import { Button } from '@smartapp/ui/components/button';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { PageHeader } from '@smartapp/ui/compositions/page-header';
import { notify } from '@smartapp/ui/compositions/notify';
import { useFormFactor } from '@smartapp/ui/hooks/use-form-factor';
import { copyText } from '@smartapp/ui/lib/copy-text';
import { Notice } from '@/app/notice';
import { useFreshIds } from '@/app/orders/order-motion';
import { useNow } from '@/app/orders/use-now';
import { useOrderSound } from '@/app/orders/use-order-sound';
import { useStepChange } from '@/app/orders/use-step-change';
import { PageEmpty, PageError } from '@/app/page-state';
import { useOnlineStatus } from '@/app/use-online-status';
import { useShop } from '@/app/shop';
import { storefrontUrl } from '@/app/use-nav-items';
import { Board, groupByStage } from '../board.js';
import { ListView } from '../list-view.js';
import { OrderPanel } from '../order-panel.js';
import { OrdersToolbar } from '../orders-toolbar.js';
import { PHONE_STAGES, useOrdersSearch, useSetOrdersSearch, type OrderFilter } from '../search.js';
import { TypeCards, type TypeTotals } from '../type-cards.js';

function matchesFilter(order: BoardOrder, filter: OrderFilter | undefined): boolean {
  if (!filter) return true;
  if (filter === 'to_check') return needsProofCheck(order);
  return order.type === filter;
}

/**
 * Orders v2 (decision T54): one page with a Board (live stages) and a List (any day), type cards on top
 * and the order panel over either view. Everything that changes the view lives in the address.
 */
export function OrdersScreen() {
  const shop = useShop();
  const search = useOrdersSearch();
  const setSearch = useSetOrdersSearch();
  const view = search.view ?? 'board';
  const query = search.q ?? '';
  const isPhone = useFormFactor() === 'phone';
  const isOnline = useOnlineStatus();
  const now = useNow(30_000);
  const today = manilaDate(now);

  const open = useOpenOrders(shop.slug, query || undefined);
  const todays = useOrdersByDate(shop.slug, today);
  const storefront = useStorefront(shop.slug);

  // Unpaid orders whose pay window ran out leave the board right away (D10), before the server says so.
  const live = React.useMemo(
    () => (open.data ?? []).filter((o) => !payWindowOver(o, now)),
    [open.data, now],
  );

  const types: readonly OrderType[] = storefront.data?.storefront.orderTypes ?? ORDER_TYPES;
  const delivers = types.includes('delivery');

  const totals = React.useMemo(() => {
    const out: Record<OrderType, TypeTotals> = {
      walk_in: { count: 0, total: 0 },
      pickup: { count: 0, total: 0 },
      delivery: { count: 0, total: 0 },
    };
    for (const o of live) {
      out[o.type].count += 1;
      out[o.type].total += o.total;
    }
    return out;
  }, [live]);
  const toCheck = React.useMemo(() => live.filter(needsProofCheck).length, [live]);

  const filter = search.filter === 'to_check' && toCheck === 0 ? undefined : search.filter;
  const shown = React.useMemo(() => live.filter((o) => matchesFilter(o, filter)), [live, filter]);

  const laterCount = React.useMemo(
    () =>
      shown.filter((o) => boardColumn(o, now) === 'scheduled' && manilaDate(o.dueAt) === today)
        .length,
    [shown, now, today],
  );

  const done = React.useMemo(() => {
    const list = (todays.data ?? []).filter(
      (o) => o.status === 'completed' && matchesFilter(o, filter),
    );
    return { count: list.length, total: list.reduce((sum, o) => sum + o.total, 0) };
  }, [todays.data, filter]);

  // The phone list starts on the first stage with work in it, unless the owner picked one.
  const phoneStage = React.useMemo(() => {
    if (search.stage) return search.stage;
    const cols = groupByStage(shown, now);
    return PHONE_STAGES.find((s) => cols[s].length > 0) ?? 'new';
  }, [search.stage, shown, now]);

  const fresh = useFreshIds(
    React.useMemo(() => live.map((o) => o.id), [live]),
    open.isSuccess,
  );
  const { soundEnabled, enableSound, disableSound } = useOrderSound(live);
  const step = useStepChange({ slug: shop.slug, kind: shop.kind });

  // Tab title shows the open count: "(5) Orders · Kanto Smash Burgers".
  const openCount = live.length;
  React.useEffect(() => {
    const prefix = openCount > 0 ? `(${openCount}) ` : '';
    document.title = `${prefix}${words.screens.orders.title} · ${shop.name}`;
  }, [openCount, shop.name]);

  // The panel opens at once from what the board or list already has; the detail fills in behind it.
  const [clicked, setClicked] = React.useState<BoardOrder | undefined>(undefined);
  const seed =
    live.find((o) => o.id === search.order) ??
    (clicked && clicked.id === search.order ? clicked : undefined);

  const openOrder = React.useCallback(
    (order: BoardOrder) => {
      setClicked(order);
      setSearch({ order: order.id });
    },
    [setSearch],
  );
  const closeOrder = React.useCallback(
    () => setSearch({ order: undefined }, { replace: true }),
    [setSearch],
  );

  const handleShare = async () => {
    const url = storefrontUrl(shop.slug);
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: shop.name, url });
        return;
      } catch {
        // Closed or not allowed: copy instead.
      }
    }
    if (await copyText(url)) notify({ title: words.share.copied, tone: 'success' });
  };

  const hasFilters = filter !== undefined || query !== '';
  const clearFilters = () => setSearch({ filter: undefined, q: undefined }, { replace: true });

  let boardBody: React.ReactNode;
  if (open.isPending) {
    boardBody = <BoardSkeleton isPhone={isPhone} />;
  } else if (open.isError) {
    boardBody = (
      <PageError
        title={ordersWords.states.errorBoard}
        message={errorWords(errorCodeOf(open.error))}
        retryLabel={ordersWords.states.tryAgain}
        onRetry={() => void open.refetch()}
      />
    );
  } else if (shown.length === 0 && hasFilters) {
    boardBody = (
      <PageEmpty
        icon={<FilterXIcon className="size-8 text-muted-foreground" />}
        title={ordersWords.states.noMatches}
        action={
          <Button variant="outline" onClick={clearFilters} className="h-11 md:h-9">
            {ordersWords.states.clearFilters}
          </Button>
        }
      />
    );
  } else if (live.length === 0 && done.count === 0) {
    boardBody = (
      <PageEmpty
        icon={<ReceiptTextIcon className="size-8 text-muted-foreground" />}
        title={ordersWords.states.emptyBoardTitle}
        description={ordersWords.states.emptyBoard}
        action={
          <Button
            variant="outline"
            onClick={() => void handleShare()}
            className="h-11 gap-1.5 md:h-9"
          >
            <Share2Icon aria-hidden="true" />
            {ordersWords.states.shareMyShop}
          </Button>
        }
      />
    );
  } else {
    boardBody = (
      <Board
        orders={shown}
        now={now}
        kind={shop.kind}
        delivers={delivers}
        isPhone={isPhone}
        disabled={!isOnline}
        fresh={fresh}
        laterCount={laterCount}
        done={done}
        phoneStage={phoneStage}
        onPhoneStageChange={(stage) => setSearch({ stage }, { replace: true })}
        onOpen={openOrder}
        onAdvance={step.advance}
        onPayAndComplete={step.payAndComplete}
        onShowLater={() => setSearch({ view: 'list', day: 'today', status: 'new' })}
        onShowDone={() => setSearch({ view: 'list', day: 'today', status: 'done' })}
      />
    );
  }

  return (
    <div className="flex min-h-full flex-col pb-24 md:pb-8">
      <PageHeader title={words.screens.orders.title} />

      <div className="flex flex-col gap-3 px-4 pt-2 md:px-6 md:pt-4">
        <OrdersToolbar
          slug={shop.slug}
          view={view}
          onViewChange={(next) => setSearch({ view: next })}
          query={query}
          onQueryChange={(q) => setSearch({ q: q || undefined }, { replace: true })}
          soundOn={soundEnabled}
          onSoundChange={(on) => (on ? enableSound() : disableSound())}
        />

        {!isOnline ? (
          <Notice tone="warning" icon={<WifiOffIcon className="size-4" />}>
            <span>{ordersWords.states.offlineNotice}</span>
          </Notice>
        ) : null}

        <TypeCards
          types={types}
          totals={totals}
          toCheck={toCheck}
          value={filter}
          onChange={(next) => setSearch({ filter: next }, { replace: true })}
        />
      </div>

      <main className="flex-1 px-4 pt-3 md:px-6 md:pt-4">
        {view === 'list' ? (
          <ListView
            slug={shop.slug}
            kind={shop.kind}
            now={now}
            query={query}
            filter={filter}
            matches={(o) => matchesFilter(o, filter)}
            onOpen={openOrder}
            onClearFilters={hasFilters ? clearFilters : undefined}
          />
        ) : (
          boardBody
        )}
      </main>

      <OrderPanel
        orderId={search.order}
        seed={seed}
        slug={shop.slug}
        kind={shop.kind}
        shopName={shop.name}
        onClose={closeOrder}
      />
    </div>
  );
}

function BoardSkeleton({ isPhone }: { isPhone: boolean }) {
  if (isPhone) {
    return (
      <div className="flex flex-col gap-3" aria-hidden="true">
        <div className="flex gap-1.5">
          <Skeleton className="h-10 w-24 rounded-full" />
          <Skeleton className="h-10 w-28 rounded-full" />
          <Skeleton className="h-10 w-24 rounded-full" />
        </div>
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }
  return (
    <div className="flex gap-3" aria-hidden="true">
      {[0, 1, 2, 3].map((col) => (
        <div
          key={col}
          className="flex w-72 shrink-0 flex-col gap-3 rounded-xl border border-border/60 p-3 lg:w-auto lg:flex-1"
        >
          <Skeleton className="h-7 w-28 rounded-full" />
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      ))}
    </div>
  );
}
