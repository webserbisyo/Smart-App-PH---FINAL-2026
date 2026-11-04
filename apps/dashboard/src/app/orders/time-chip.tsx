import { AlarmClockIcon, ClockIcon, HourglassIcon, TimerIcon } from 'lucide-react';
import type { OrderStatus } from '@smartapp/core';
import { formatClock, formatManila, manilaDate, ordersWords, ticketTime } from '@smartapp/core';
import { Badge } from '@smartapp/ui/components/reui/badge';
import { cn } from 'cn';

export interface TimeChipProps {
  order: { status: OrderStatus; dueAt: string; lastStepAt: string; scheduledAt: string | null };
  now: Date;
  className?: string | undefined;
}

/**
 * The ticket's time (D10): "Due 2:33", amber "4 min left", red "Late 4 min" for New and Preparing; calm
 * "Waiting 12 min" for Ready and "Out 18 min" for Out. Icon + word + colour.
 */
export function TimeChip({ order, now, className }: TimeChipProps) {
  const t = ticketTime(order, now);
  if (t.kind === 'none') return null;
  const base = 'gap-1 font-semibold tabular-nums';
  if (t.kind === 'late') {
    return (
      <Badge variant="destructive-light" size="lg" radius="full" className={cn(base, className)}>
        <AlarmClockIcon aria-hidden="true" />
        {ordersWords.time.late(t.minutes)}
      </Badge>
    );
  }
  if (t.kind === 'soon') {
    return (
      <Badge variant="warning-light" size="lg" radius="full" className={cn(base, className)}>
        <TimerIcon aria-hidden="true" />
        {ordersWords.time.soon(t.minutes)}
      </Badge>
    );
  }
  if (t.kind === 'waiting' || t.kind === 'out') {
    return (
      <Badge
        variant="outline"
        size="lg"
        radius="full"
        className={cn(base, 'text-muted-foreground', className)}
      >
        <HourglassIcon aria-hidden="true" />
        {t.kind === 'waiting'
          ? ordersWords.time.waiting(t.minutes)
          : ordersWords.time.out(t.minutes)}
      </Badge>
    );
  }
  const otherDay = manilaDate(order.dueAt) !== manilaDate(now);
  return (
    <Badge
      variant="outline"
      size="lg"
      radius="full"
      className={cn(base, 'text-foreground', className)}
    >
      <ClockIcon aria-hidden="true" />
      {otherDay
        ? ordersWords.time.dueOn(formatManila(order.dueAt, 'date'), formatClock(order.dueAt))
        : ordersWords.time.due(formatClock(order.dueAt))}
    </Badge>
  );
}
