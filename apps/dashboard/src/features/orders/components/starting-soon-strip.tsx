import * as React from 'react';
import { ChevronDownIcon, ClockIcon } from 'lucide-react';
import type { BoardOrder } from '@smartapp/core';
import { formatClock, ordersWords } from '@smartapp/core';
import { AsyncButton } from '@smartapp/ui/compositions/async-button';
import { cn } from 'cn';

export interface StartingSoonStripProps {
  orders: BoardOrder[];
  onStartNow: (order: BoardOrder) => Promise<void>;
  className?: string;
}

export function StartingSoonStrip({ orders, onStartNow, className }: StartingSoonStripProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  if (orders.length === 0) return null;

  const nextTime = formatClock(orders[0]?.startBy ?? orders[0]?.dueAt ?? new Date());

  return (
    <div
      className={cn(
        'rounded-xl border border-warning/30 bg-warning-soft/60 text-warning-text transition-all',
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className="flex w-full items-center justify-between px-3.5 py-2.5 text-xs font-semibold hover:bg-warning/10 transition-colors rounded-xl"
        aria-expanded={isExpanded}
      >
        <span className="flex items-center gap-2">
          <ClockIcon className="size-3.5 shrink-0 text-warning-text" />
          <span>{ordersWords.startingSoon.summary(orders.length, nextTime)}</span>
        </span>
        <ChevronDownIcon
          className={cn(
            'size-4 text-warning-text transition-transform duration-200',
            isExpanded && 'rotate-180',
          )}
        />
      </button>

      {isExpanded && (
        <div className="border-t border-warning/20 p-2.5 space-y-2">
          {orders.map((order) => (
            <div
              key={order.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/90 p-2 text-foreground shadow-2xs"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-xs font-bold">
                  <span>#{String(order.orderNo).padStart(3, '0')}</span>
                  <span className="truncate text-muted-foreground font-normal">
                    {order.customerName}
                  </span>
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {order.itemsSummary}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-semibold tabular-nums text-foreground">
                  {formatClock(order.dueAt)}
                </span>
                <AsyncButton
                  variant="secondary"
                  size="sm"
                  onClick={() => onStartNow(order)}
                  idleLabel={ordersWords.startingSoon.startNow}
                  pendingLabel={ordersWords.startingSoon.starting}
                  doneLabel={ordersWords.startingSoon.started}
                  className="h-7 text-xs font-semibold"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
