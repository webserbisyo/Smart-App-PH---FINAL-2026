import * as React from 'react';
import { ArrowRightIcon } from 'lucide-react';
import type { BoardOrder, ShopKind } from '@smartapp/core';
import { nextActions, ordersWords } from '@smartapp/core';
import { AsyncButton } from '@smartapp/ui/compositions/async-button';
import { Button } from '@smartapp/ui/components/button';
import {
  KanbanColumn,
  KanbanColumnContent,
  KanbanItem,
  KanbanItemHandle,
} from '@smartapp/ui/components/reui/kanban';
import { cn } from 'cn';
import { OrderTicket } from '@/app/orders/order-ticket';

export interface BoardColumnProps {
  columnId: string;
  title: string;
  count: number;
  orders: BoardOrder[];
  now: Date;
  kind?: ShopKind;
  onAdvance: (order: BoardOrder) => Promise<void>;
  onSelectOrder: (order: BoardOrder) => void;
  onShowAllHistory?: () => void;
  isKanban?: boolean;
  className?: string;
}

function getButtonLabels(order: BoardOrder, kind: ShopKind) {
  const next = nextActions(order)[0];
  if (!next) return null;

  switch (order.status) {
    case 'placed':
      return {
        idle: ordersWords.buttons.start(kind),
        pending: ordersWords.buttons.starting,
        done: ordersWords.buttons.started,
      };
    case 'preparing':
      return {
        idle: ordersWords.buttons.markReady,
        pending: ordersWords.buttons.markingReady,
        done: ordersWords.buttons.ready,
      };
    case 'ready':
      return {
        idle:
          order.type === 'delivery'
            ? ordersWords.buttons.sendOut
            : ordersWords.buttons.complete,
        pending: ordersWords.buttons.completing,
        done: ordersWords.buttons.completed,
      };
    case 'out_for_delivery':
      return {
        idle: ordersWords.buttons.complete,
        pending: ordersWords.buttons.completing,
        done: ordersWords.buttons.completed,
      };
    default:
      return null;
  }
}

export function BoardColumnView({
  columnId,
  title,
  count,
  orders,
  now,
  kind = 'food',
  onAdvance,
  onSelectOrder,
  onShowAllHistory,
  isKanban = false,
  className,
}: BoardColumnProps) {
  const isDoneColumn = columnId === 'done';
  const displayOrders = isDoneColumn ? orders.slice(0, 10) : orders;
  const useContentVisibility = orders.length > 30;

  const renderCard = (order: BoardOrder) => {
    const btn = getButtonLabels(order, kind);
    const actionSlot = btn ? (
      <AsyncButton
        variant="secondary"
        size="sm"
        onClick={async () => {
          await onAdvance(order);
        }}
        idleLabel={btn.idle}
        pendingLabel={btn.pending}
        doneLabel={btn.done}
        className="h-8.5 w-full text-xs font-semibold"
      />
    ) : undefined;

    return (
      <OrderTicket
        key={order.id}
        order={order}
        size="card"
        now={now}
        onClick={() => onSelectOrder(order)}
        actionSlot={actionSlot}
        className={cn(useContentVisibility && 'content-visibility-auto')}
      />
    );
  };

  const columnHeader = (
    <div className="flex items-center justify-between px-2 py-2 mb-1 border-b border-border/40">
      <div className="flex items-center gap-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {title}
        </h3>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-bold tabular-nums text-foreground">
          {count}
        </span>
      </div>
    </div>
  );

  const doneFooter = isDoneColumn && onShowAllHistory ? (
    <Button
      variant="ghost"
      size="sm"
      onClick={onShowAllHistory}
      className="mt-2 w-full justify-center gap-1.5 text-xs font-semibold text-primary hover:bg-primary/5"
    >
      <span>{ordersWords.doneToday.showAllInHistory}</span>
      <ArrowRightIcon className="size-3.5" />
    </Button>
  ) : null;

  if (isKanban) {
    return (
      <KanbanColumn
        value={columnId}
        className={cn(
          'flex flex-col w-72 shrink-0 rounded-2xl border border-border/60 bg-muted/30 p-2 select-none',
          className,
        )}
      >
        {columnHeader}
        <KanbanColumnContent
          value={columnId}
          className="flex-1 space-y-2.5 overflow-y-auto px-0.5 py-1 min-h-[150px]"
        >
          {displayOrders.map((order) => (
            <KanbanItem key={order.id} value={order.id}>
              <KanbanItemHandle cursor={false}>
                {renderCard(order)}
              </KanbanItemHandle>
            </KanbanItem>
          ))}
        </KanbanColumnContent>
        {doneFooter}
      </KanbanColumn>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-col rounded-2xl border border-border/60 bg-muted/30 p-2.5',
        className,
      )}
    >
      {columnHeader}
      <div className="flex-1 space-y-2.5 overflow-y-auto px-0.5 py-1">
        {displayOrders.map(renderCard)}
      </div>
      {doneFooter}
    </div>
  );
}
