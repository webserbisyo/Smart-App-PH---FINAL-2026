import * as React from 'react';
import {
  homeNeeds,
  manilaDate,
  openState,
  payWindowOver,
  storageLevel,
  storagePercent,
  type BoardOrder,
  type HomeNeed,
  type HomeSummary,
  type OpenState,
} from '@smartapp/core';
import {
  useHome,
  useOpenOrders,
  useOrdersByDate,
  usePlan,
  useStorage,
  useStorefront,
} from '@smartapp/data';
import { useNow } from '@/app/orders/use-now';
import { useShop } from '@/app/shop';

const PLAN_NEEDS = new Set(['due', 'overdue', 'paused']);
const STORAGE_NEEDS = new Set(['almost', 'full']);

export interface HomeView {
  now: Date;
  today: string;
  summary: HomeSummary | undefined;
  // The live board, the same orders the Orders page shows (pay windows that ran out left out).
  live: BoardOrder[];
  // Today's orders, for Done today.
  todays: BoardOrder[];
  needs: HomeNeed[];
  open: OpenState | null;
  storagePercent: number;
  home: ReturnType<typeof useHome>;
  board: ReturnType<typeof useOpenOrders>;
}

/** Everything Home reads (T69): the summary, the open orders and the plan and storage for Needs you. */
export function useHomeView(): HomeView {
  const shop = useShop();
  const now = useNow(30_000);
  const today = manilaDate(now);
  const home = useHome();
  const board = useOpenOrders(shop.slug);
  const todaysQuery = useOrdersByDate(shop.slug, today);
  const storefront = useStorefront(shop.slug);
  const plan = usePlan();
  const storage = useStorage();
  const summary = home.data;

  const live = React.useMemo(
    () => (board.data ?? []).filter((o) => !payWindowOver(o, now)),
    [board.data, now],
  );
  const sf = storefront.data?.storefront;
  const open = React.useMemo(() => (sf ? openState(sf, now) : null), [sf, now]);
  const used = storage.data ? storagePercent(storage.data.usedBytes, storage.data.limitBytes) : 0;
  const needs = React.useMemo(
    () =>
      homeNeeds({
        orders: live,
        now,
        prizesToGive: summary?.members.prizesToGive ?? 0,
        soldOut: summary?.soldOut.length ?? 0,
        noticeTomorrow: summary?.noticeTomorrow ?? 0,
        plan: plan.data ? PLAN_NEEDS.has(plan.data.status) : false,
        storage: storage.data
          ? STORAGE_NEEDS.has(storageLevel(storage.data.usedBytes, storage.data.limitBytes))
          : false,
      }),
    [live, now, summary, plan.data, storage.data],
  );

  return {
    now,
    today,
    summary,
    live,
    todays: todaysQuery.data ?? [],
    needs,
    open,
    storagePercent: used,
    home,
    board,
  };
}
