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
          order.type === 'delivery' ? ordersWords.buttons.sendOut : ordersWords.buttons.complete,
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

export interface BoardTicketProps {
  order: BoardOrder;
  now: Date;
  kind?: ShopKind;
  onAdvance: (order: BoardOrder) => Promise<void>;
  onSelectOrder: (order: BoardOrder) => void;
  className?: string | undefined;
}

/** One board card: the ticket plus its one next-step button (from nextActions, so unpaid transfers get none). */
export function BoardTicket({
  order,
  now,
  kind = 'food',
  onAdvance,
  onSelectOrder,
  className,
}: BoardTicketProps) {
  const [advancing, setAdvancing] = React.useState(false);
  const btn = getButtonLabels(order, kind);
  const actionSlot = btn ? (
    <AsyncButton
      variant="secondary"
      size="sm"
      status={advancing ? 'loading' : 'idle'}
      busyLabel={btn.pending}
      doneLabel={btn.done}
      onClick={async () => {
        try {
          setAdvancing(true);
          await onAdvance(order);
        } finally {
          setAdvancing(false);
        }
      }}
      className="w-full text-xs font-semibold"
    >
      {btn.idle}
    </AsyncButton>
  ) : undefined;

  return (
    <OrderTicket
      order={order}
      size="card"
      now={now}
      onClick={() => onSelectOrder(order)}
      actionSlot={actionSlot}
      {...(className ? { className } : {})}
    />
  );
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

  const renderCard = (order: BoardOrder) => (
    <BoardTicket
      key={order.id}
      order={order}
      now={now}
      kind={kind}
      onAdvance={onAdvance}
      onSelectOrder={onSelectOrder}
      className={cn(useContentVisibility && 'content-visibility-auto')}
    />
  );

  const columnHeader = (
    <div className="mb-1 flex items-center justify-between border-b border-border/40 px-2 py-2">
      <div className="flex items-center gap-2">
        <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
          {title}
        </h3>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-bold text-foreground tabular-nums">
          {count}
        </span>
      </div>
    </div>
  );

  const doneFooter =
    isDoneColumn && onShowAllHistory ? (
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
          'flex w-72 shrink-0 flex-col rounded-2xl border border-border/60 bg-muted/30 p-2 select-none',
          className,
        )}
      >
        {columnHeader}
        <KanbanColumnContent
          value={columnId}
          className="min-h-36 flex-1 space-y-2.5 overflow-y-auto px-0.5 py-1"
        >
          {displayOrders.map((order) => (
            <KanbanItem key={order.id} value={order.id}>
              <KanbanItemHandle cursor={false}>{renderCard(order)}</KanbanItemHandle>
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
