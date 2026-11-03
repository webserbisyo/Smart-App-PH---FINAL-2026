import {
  CheckIcon,
  ClockIcon,
  AlertTriangleIcon,
  MessageSquareTextIcon,
  PrinterIcon,
} from 'lucide-react';
import type { BoardOrder, OwnerOrder, TicketLine } from '@smartapp/core';
import { formatClock, ordersWords, orderTiming } from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import { Card } from '@smartapp/ui/components/card';
import { IconTile } from '@smartapp/ui/components/reui/icon-tile';
import { cn } from 'cn';
import { orderNoLabel } from './order-ticket-label.js';
import { ORDER_TYPE_ICON } from './order-type-icons.js';

export interface KitchenTicketExtras {
  /** Every line of the order (a board card carries up to 8; the screen loads the rest). */
  lines: readonly TicketLine[];
  /** Indexes of the lines the cook ticked on this device. */
  checked: readonly number[];
  onToggleLine: (index: number) => void;
  onPrint: () => void;
  /** The one big step button (Start, then Ready). */
  action: React.ReactNode;
  /** Shown under the lines while the rest of a long order loads. */
  linesNote?: string | undefined;
  /** A new order: its border flashes once. */
  isNew?: boolean | undefined;
}

interface KitchenTicketProps extends KitchenTicketExtras {
  order: BoardOrder | OwnerOrder;
  now: Date;
  className?: string | undefined;
}

/**
 * The Kitchen / Packing view ticket (O5): read from a metre away, no money, no payment, no phone or
 * address (customers can see the screen). Tapping a line ticks it; the big button moves the order.
 */
export function KitchenTicket({
  order,
  now,
  className,
  lines,
  checked,
  onToggleLine,
  onPrint,
  action,
  linesNote,
  isNew,
}: KitchenTicketProps) {
  const TypeIcon = ORDER_TYPE_ICON[order.type];
  const timing = orderTiming(order, now);
  const ageMinutes = Math.max(
    0,
    Math.floor((now.getTime() - new Date(order.startBy).getTime()) / 60_000),
  );
  const label = orderNoLabel(order.orderNo);

  return (
    <Card
      data-order-id={order.id}
      data-slot="kitchen-ticket"
      className={cn(
        'flex flex-col gap-0 overflow-hidden rounded-xl border-2 border-border bg-card py-0 text-card-foreground',
        timing.lateMinutes > 0 && 'border-destructive',
        isNew && 'ticket-pulse',
        className,
      )}
    >
      {/* Header: type, number, due time and age */}
      <div className="flex min-h-16 items-center gap-2 border-b border-border px-3 py-2">
        <IconTile variant="outline" size="default" aria-hidden="true" className="shrink-0">
          <TypeIcon className="size-5 text-foreground" />
        </IconTile>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground tabular-nums">{label}</span>
            <span className="truncate text-base font-semibold text-muted-foreground">
              {ordersWords.types[order.type]}
            </span>
          </div>
          <div className="flex min-w-0 gap-1.5 text-base text-muted-foreground">
            <span className="min-w-0 truncate">{order.customerName}</span>
            <span className="shrink-0 font-semibold text-foreground tabular-nums">
              {ordersWords.timing.dueTime(formatClock(order.dueAt))}
            </span>
          </div>
        </div>
        {timing.lateMinutes > 0 ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-1 text-sm font-bold text-destructive">
            <AlertTriangleIcon className="size-4" aria-hidden="true" />
            {ordersWords.timing.late(timing.lateMinutes)}
          </span>
        ) : (
          <span
            className={cn(
              'inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-sm font-semibold',
              timing.ageTone === 'amber'
                ? 'bg-warning-soft text-warning-text'
                : 'bg-muted text-muted-foreground',
            )}
          >
            <ClockIcon className="size-4" aria-hidden="true" />
            {ordersWords.timing.age(ageMinutes)}
          </span>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onPrint}
          aria-label={ordersWords.kitchen.printAria(label)}
          className="size-14 shrink-0"
        >
          <PrinterIcon className="size-6" aria-hidden="true" />
        </Button>
      </div>

      {/* Lines: tap one to tick it (this device only) */}
      <ul className="flex-1 divide-y divide-border/60">
        {lines.map((line, idx) => {
          const done = checked.includes(idx);
          const extras = [line.variantLabel, ...line.optionLabels].filter(Boolean).join(', ');
          return (
            <li key={idx}>
              <button
                type="button"
                aria-pressed={done}
                aria-label={ordersWords.kitchen.lineCheckAria(`${line.qty} ${line.name}`, done)}
                onClick={() => onToggleLine(idx)}
                className="flex min-h-14 w-full items-start gap-3 px-3 py-2.5 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset"
              >
                <span
                  className={cn(
                    'w-12 shrink-0 text-2xl font-bold tabular-nums',
                    done ? 'text-muted-foreground' : 'text-foreground',
                  )}
                >
                  {line.qty}×
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      'block text-2xl leading-tight font-semibold break-words',
                      done ? 'text-muted-foreground line-through' : 'text-foreground',
                    )}
                  >
                    {line.name}
                  </span>
                  {extras && (
                    <span
                      className={cn(
                        'block text-lg leading-snug text-muted-foreground',
                        done && 'line-through',
                      )}
                    >
                      {extras}
                    </span>
                  )}
                  {line.note && (
                    <span className="mt-1.5 flex items-start gap-1.5 rounded-md bg-warning-soft px-2 py-1 text-lg leading-snug text-warning-text">
                      <MessageSquareTextIcon className="mt-1 size-5 shrink-0" aria-hidden="true" />
                      <span className="break-words">{line.note}</span>
                    </span>
                  )}
                </span>
                {done && (
                  <CheckIcon className="mt-1 size-7 shrink-0 text-success" aria-hidden="true" />
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {linesNote && <p className="px-3 pb-2 text-base text-muted-foreground">{linesNote}</p>}

      {order.note && (
        <div className="mx-3 mb-3 flex items-start gap-2 rounded-md bg-warning-soft px-3 py-2 text-lg leading-snug text-warning-text">
          <MessageSquareTextIcon className="mt-1 size-5 shrink-0" aria-hidden="true" />
          <span className="break-words">
            <strong>{ordersWords.ticket.orderNote}:</strong> {order.note}
          </span>
        </div>
      )}

      <div className="mt-auto border-t border-border p-3">{action}</div>
    </Card>
  );
}
