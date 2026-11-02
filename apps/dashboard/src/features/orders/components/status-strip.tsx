import { useNavigate, useSearch } from '@tanstack/react-router';
import type { ShopKind } from '@smartapp/core';
import { ordersWords } from '@smartapp/core';
import { Scroller } from '@smartapp/ui/components/scroller';
import { cn } from 'cn';
import type { OrderStepFilter, OrdersSearch } from '../tabs.js';

export interface StepCounts {
  new: number;
  preparing: number;
  ready: number;
  out: number;
  done: number;
}

export interface StatusStripProps {
  counts: StepCounts;
  kind?: ShopKind;
  showOut?: boolean;
  className?: string;
}

export function StatusStrip({
  counts,
  kind = 'food',
  showOut = true,
  className,
}: StatusStripProps) {
  const search = useSearch({ strict: false }) as OrdersSearch;
  const currentStep = search.step ?? 'new';
  const navigate = useNavigate();

  const steps: { id: OrderStepFilter; label: string; count: number }[] = [
    { id: 'new', label: ordersWords.columns.new, count: counts.new },
    { id: 'preparing', label: ordersWords.columns.preparing(kind), count: counts.preparing },
    { id: 'ready', label: ordersWords.columns.ready, count: counts.ready },
    ...(showOut ? [{ id: 'out' as const, label: ordersWords.columns.out, count: counts.out }] : []),
    { id: 'done', label: ordersWords.columns.completed, count: counts.done },
  ];

  const handleSelect = (step: OrderStepFilter) => {
    void navigate({
      search: (prev: Record<string, unknown>) => ({
        ...prev,
        step,
      }),
    });
  };

  return (
    <div
      className={cn(
        'sticky top-0 z-20 border-b border-border/80 bg-background/95 px-2 py-2 backdrop-blur-md',
        className,
      )}
    >
      <Scroller orientation="horizontal" hideScrollbar className="w-full">
        <div className="flex min-w-max items-center gap-1.5 pb-0.5">
          {steps.map((step) => {
            const isActive = currentStep === step.id;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => handleSelect(step.id)}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <span>{step.label}</span>
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.25 text-[0.6875rem] font-bold tabular-nums',
                    isActive
                      ? 'bg-primary-foreground/20 text-primary-foreground'
                      : 'bg-background/80 text-foreground',
                  )}
                >
                  {step.count}
                </span>
              </button>
            );
          })}
        </div>
      </Scroller>
    </div>
  );
}
