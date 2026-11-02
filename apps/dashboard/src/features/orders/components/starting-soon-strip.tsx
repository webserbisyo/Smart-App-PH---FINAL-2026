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
  const [startingId, setStartingId] = React.useState<string | null>(null);

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
        className="flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-colors hover:bg-warning/10"
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
        <div className="space-y-2 border-t border-warning/20 p-2.5">
          {orders.map((order) => (
            <div
              key={order.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/90 p-2 text-foreground shadow-2xs"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-xs font-bold">
                  <span>#{String(order.orderNo).padStart(3, '0')}</span>
                  <span className="truncate font-normal text-muted-foreground">
                    {order.customerName}
                  </span>
                </div>
                <div className="truncate text-xs text-muted-foreground">{order.itemsSummary}</div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-xs font-semibold text-foreground tabular-nums">
                  {formatClock(order.dueAt)}
                </span>
                <AsyncButton
                  variant="secondary"
                  size="sm"
                  status={startingId === order.id ? 'loading' : 'idle'}
                  busyLabel={ordersWords.startingSoon.starting}
                  doneLabel={ordersWords.startingSoon.started}
                  onClick={async () => {
                    try {
                      setStartingId(order.id);
                      await onStartNow(order);
                    } finally {
                      setStartingId(null);
                    }
                  }}
                  className="h-7 text-xs font-semibold"
                >
                  {ordersWords.startingSoon.startNow}
                </AsyncButton>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
