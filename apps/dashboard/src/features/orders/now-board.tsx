import * as React from 'react';
import { useNavigate } from '@tanstack/react-router';
import type { BoardOrder, ShopKind } from '@smartapp/core';
import { boardColumn, nextStatus, ordersWords } from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import {
  Kanban,
  KanbanBoard,
  KanbanOverlay,
  type KanbanMoveEvent,
} from '@smartapp/ui/components/reui/kanban';
import { notify } from '@smartapp/ui/compositions/notify';
import { cn } from 'cn';
import { OrderTicket } from '@/app/orders/order-ticket';
import { useMediaQuery } from '@/app/use-media-query';
import { useStepChange } from '@/app/orders/use-step-change';

import { BoardColumnView, BoardTicket } from './board-column.js';
import { StartingSoonStrip } from './starting-soon-strip.js';
import { StatusStrip } from './status-strip.js';
import { TypeFilter } from './type-filter.js';
import { useOrdersSearch, withSearch } from './tabs.js';

export interface NowBoardProps {
  orders: BoardOrder[];
  now: Date;
  slug: string;
  kind?: ShopKind;
  delivers?: boolean;
  selectedOrderId?: string | null;
  onSelectOrder: (order: BoardOrder) => void;
  className?: string;
}

const TWO_HOURS_MS = 2 * 60 * 60_000;

// onMove mode: the board never applies a drag preview; the order's step change moves the card.
function ignoreKanbanPreview(): void {}

const BOARD_KEYS = ['new', 'preparing', 'ready', 'out', 'done'] as const;
type BoardKey = (typeof BOARD_KEYS)[number];
type BoardColumns = Record<BoardKey, BoardOrder[]>;

function isBoardKey(value: string): value is BoardKey {
  return BOARD_KEYS.some((key) => key === value);
}

export function NowBoard({
  orders,
  now,
  slug,
  kind = 'food',
  delivers = true,
  onSelectOrder,
  className,
}: NowBoardProps) {
  const search = useOrdersSearch();
  const currentType = search.type ?? 'all';
  const step = search.step ?? 'new';
  const currentStep: BoardKey = isBoardKey(step) ? step : 'new';
  const navigate = useNavigate();

  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1023px)');

  const { advance } = useStepChange({ slug, kind });

  // 1. Filter by order type
  const typeFilteredOrders = React.useMemo(() => {
    if (currentType === 'all') return orders;
    return orders.filter((o) => o.type === currentType);
  }, [orders, currentType]);

  // 2. Count by type for filter chips
  const typeCounts = React.useMemo(() => {
    return {
      all: orders.length,
      walk_in: orders.filter((o) => o.type === 'walk_in').length,
      pickup: orders.filter((o) => o.type === 'pickup').length,
      delivery: orders.filter((o) => o.type === 'delivery').length,
    };
  }, [orders]);

  // 3. Group by board column
  const nowMs = now.getTime();

  // Starting soon: scheduled orders with startBy within 2 hours
  const startingSoonOrders = React.useMemo(() => {
    return typeFilteredOrders.filter((o) => {
      if (o.status !== 'placed') return false;
      const startByMs = new Date(o.startBy).getTime();
      return nowMs >= startByMs - TWO_HOURS_MS && nowMs < startByMs;
    });
  }, [typeFilteredOrders, nowMs]);

  // Main board columns
  const columnData = React.useMemo(() => {
    const cols: BoardColumns = {
      new: [],
      preparing: [],
      ready: [],
      out: [],
      done: [],
    };

    for (const order of typeFilteredOrders) {
      const col = boardColumn(order, now);
      if (col && isBoardKey(col)) cols[col].push(order);
    }

    return cols;
  }, [typeFilteredOrders, now]);

  const showOutColumn = delivers || columnData.out.length > 0;

  const stepCounts = React.useMemo(() => {
    return {
      new: columnData.new.length,
      preparing: columnData.preparing.length,
      ready: columnData.ready.length,
      out: columnData.out.length,
      done: columnData.done.length,
    };
  }, [columnData]);

  // In onMove mode the Kanban shows no live preview: a card only moves when the order's step changes.
  const kanbanColumns = columnData;

  // Dropping rules
  const handleKanbanMove = React.useCallback(
    (event: KanbanMoveEvent) => {
      const { activeContainer, overContainer, event: dndEvent } = event;
      if (!activeContainer || !overContainer || activeContainer === overContainer) return;

      const orderId = String(dndEvent.active.id);
      const order = orders.find((o) => o.id === orderId);
      if (!order) return;

      // Only the order's next step is a valid drop (steps move one at a time).
      const next = nextStatus(order);
      const target = next ? boardColumn({ status: next, startBy: order.startBy }, now) : null;
      if (next && target === overContainer) {
        void advance(order, next);
      } else {
        notify({ title: ordersWords.recall.stepJumpError, tone: 'error' });
      }
    },
    [orders, now, advance],
  );

  const handleShowAllHistory = () => {
    void navigate({
      to: '/orders',
      search: withSearch(search, { view: 'history' }),
    });
  };

  const handleClearTypeFilter = () => {
    void navigate({
      to: '/orders',
      search: withSearch(search, { type: undefined }),
    });
  };

  // If a type filter matches 0 orders
  if (typeFilteredOrders.length === 0 && orders.length > 0) {
    const typeLabel =
      currentType === 'walk_in'
        ? ordersWords.types.walk_in
        : currentType === 'pickup'
          ? ordersWords.types.pickup
          : ordersWords.types.delivery;

    return (
      <div className={cn('space-y-4', className)}>
        <TypeFilter counts={typeCounts} />
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/40 p-8 text-center sm:p-12">
          <p className="text-sm font-medium text-foreground">
            {ordersWords.filters.noMatches(typeLabel)}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearTypeFilter}
            className="mt-3 text-xs font-semibold"
          >
            {ordersWords.filters.showAll}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3.5', className)}>
      {/* Top filters and starting soon bar */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <TypeFilter counts={typeCounts} />
      </div>

      <StartingSoonStrip
        orders={startingSoonOrders}
        onStartNow={async (order) => {
          await advance(order, 'preparing');
        }}
      />

      {/* Responsive layout: Phone list vs Tablet snap vs Desktop Kanban */}
      {!isDesktop && !isTablet ? (
        /* Phone: Sticky StatusStrip + single active step list */
        <div className="space-y-3">
          <StatusStrip
            counts={stepCounts}
            kind={kind}
            showOut={showOutColumn}
            className="-mx-4 rounded-none sm:mx-0 sm:rounded-xl"
          />

          <div className="space-y-3">
            {columnData[currentStep].length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
                {ordersWords.states.emptyStep}
              </div>
            ) : (
              (currentStep === 'done' ? columnData.done.slice(0, 10) : columnData[currentStep]).map(
                (order) => (
                  <BoardTicket
                    key={order.id}
                    order={order}
                    now={now}
                    kind={kind}
                    onAdvance={advance}
                    onSelectOrder={onSelectOrder}
                  />
                ),
              )
            )}

            {currentStep === 'done' && columnData.done.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleShowAllHistory}
                className="w-full text-xs font-semibold text-primary"
              >
                {ordersWords.doneToday.showAllInHistory}
              </Button>
            )}
          </div>
        </div>
      ) : isTablet ? (
        /* Tablet: 3 columns with scroll-snap sideways (no drag) */
        <div className="scrollbar-none flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4">
          <BoardColumnView
            columnId="new"
            title={ordersWords.columns.new}
            count={columnData.new.length}
            orders={columnData.new}
            now={now}
            kind={kind}
            onAdvance={advance}
            onSelectOrder={onSelectOrder}
            className="w-80 shrink-0 snap-start"
          />
          <BoardColumnView
            columnId="preparing"
            title={ordersWords.columns.preparing(kind)}
            count={columnData.preparing.length}
            orders={columnData.preparing}
            now={now}
            kind={kind}
            onAdvance={advance}
            onSelectOrder={onSelectOrder}
            className="w-80 shrink-0 snap-start"
          />
          <BoardColumnView
            columnId="ready"
            title={ordersWords.columns.ready}
            count={columnData.ready.length}
            orders={columnData.ready}
            now={now}
            kind={kind}
            onAdvance={advance}
            onSelectOrder={onSelectOrder}
            className="w-80 shrink-0 snap-start"
          />
          {showOutColumn && (
            <BoardColumnView
              columnId="out"
              title={ordersWords.columns.out}
              count={columnData.out.length}
              orders={columnData.out}
              now={now}
              kind={kind}
              onAdvance={advance}
              onSelectOrder={onSelectOrder}
              className="w-80 shrink-0 snap-start"
            />
          )}
          <BoardColumnView
            columnId="done"
            title={ordersWords.columns.completed}
            count={columnData.done.length}
            orders={columnData.done}
            now={now}
            kind={kind}
            onAdvance={advance}
            onSelectOrder={onSelectOrder}
            onShowAllHistory={handleShowAllHistory}
            className="w-80 shrink-0 snap-start"
          />
        </div>
      ) : (
        /* Laptop & Desktop: ReUI Kanban drag and drop */
        <Kanban
          value={kanbanColumns}
          onValueChange={ignoreKanbanPreview}
          getItemValue={(item) => item.id}
          onMove={handleKanbanMove}
          restoreOnCancel={true}
          className="overflow-x-auto pb-4"
        >
          <KanbanBoard className="flex min-h-120 gap-4">
            <BoardColumnView
              columnId="new"
              title={ordersWords.columns.new}
              count={kanbanColumns.new.length}
              orders={kanbanColumns.new}
              now={now}
              kind={kind}
              onAdvance={advance}
              onSelectOrder={onSelectOrder}
              isKanban={true}
            />
            <BoardColumnView
              columnId="preparing"
              title={ordersWords.columns.preparing(kind)}
              count={kanbanColumns.preparing.length}
              orders={kanbanColumns.preparing}
              now={now}
              kind={kind}
              onAdvance={advance}
              onSelectOrder={onSelectOrder}
              isKanban={true}
            />
            <BoardColumnView
              columnId="ready"
              title={ordersWords.columns.ready}
              count={kanbanColumns.ready.length}
              orders={kanbanColumns.ready}
              now={now}
              kind={kind}
              onAdvance={advance}
              onSelectOrder={onSelectOrder}
              isKanban={true}
            />
            {showOutColumn && (
              <BoardColumnView
                columnId="out"
                title={ordersWords.columns.out}
                count={kanbanColumns.out.length}
                orders={kanbanColumns.out}
                now={now}
                kind={kind}
                onAdvance={advance}
                onSelectOrder={onSelectOrder}
                isKanban={true}
              />
            )}
            <BoardColumnView
              columnId="done"
              title={ordersWords.columns.completed}
              count={kanbanColumns.done.length}
              orders={kanbanColumns.done}
              now={now}
              kind={kind}
              onAdvance={advance}
              onSelectOrder={onSelectOrder}
              onShowAllHistory={handleShowAllHistory}
              isKanban={true}
            />
          </KanbanBoard>
          <KanbanOverlay>
            {({ value }) => {
              const draggedOrder = orders.find((o) => o.id === value);
              if (!draggedOrder) return null;
              return (
                <div className="w-72 rotate-1 cursor-grabbing opacity-90 shadow-xl">
                  <OrderTicket order={draggedOrder} size="card" now={now} />
                </div>
              );
            }}
          </KanbanOverlay>
        </Kanban>
      )}
    </div>
  );
}
