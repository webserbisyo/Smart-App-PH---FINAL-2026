import { useNavigate } from '@tanstack/react-router';
import { ordersWords } from '@smartapp/core';
import { ToggleGroup, ToggleGroupItem } from '@smartapp/ui/components/toggle-group';
import { cn } from 'cn';
import { ORDER_TYPES, useOrdersSearch, withSearch, type OrderTypeFilter } from './tabs.js';

export interface TypeFilterCounts {
  all: number;
  walk_in: number;
  pickup: number;
  delivery: number;
}

export interface TypeFilterProps {
  counts: TypeFilterCounts;
  className?: string;
  /** The page the chips filter (the board, or Kitchen view with 56 px chips). */
  to?: '/orders' | '/orders/kitchen';
}

export function TypeFilter({ counts, className, to = '/orders' }: TypeFilterProps) {
  const isKitchen = to === '/orders/kitchen';
  const search = useOrdersSearch();
  const currentType = search.type ?? 'all';
  const navigate = useNavigate();

  const handleSelect = (val: string[]) => {
    const next = ORDER_TYPES.find((t) => t === val[0]) ?? 'all';
    void navigate({
      to,
      search: withSearch(search, { type: next === 'all' ? undefined : next }),
      replace: true,
    });
  };

  const labels: Record<OrderTypeFilter, string> = {
    all: ordersWords.filters.all,
    walk_in: ordersWords.types.walk_in,
    pickup: ordersWords.types.pickup,
    delivery: ordersWords.types.delivery,
  };

  return (
    <div className={cn('flex items-center', className)}>
      <ToggleGroup
        value={[currentType]}
        onValueChange={handleSelect}
        aria-label="Filter orders by type"
        spacing={1}
        className="max-w-full flex-wrap rounded-xl border border-border/60 bg-muted/60 p-1"
      >
        {ORDER_TYPES.map((type) => (
          <ToggleGroupItem
            key={type}
            value={type}
            className={cn(
              'h-9 gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-transparent hover:text-foreground aria-pressed:bg-card aria-pressed:text-foreground aria-pressed:shadow-xs sm:px-3 md:h-8',
              isKitchen && 'h-14 px-2.5 text-sm md:h-14 md:px-4 md:text-base',
              counts[type] === 0 && currentType !== type && 'opacity-50',
            )}
          >
            <span>{labels[type]}</span>
            <span
              className={cn(
                'text-xs font-medium text-muted-foreground tabular-nums',
                isKitchen && 'text-sm md:text-base',
              )}
            >
              {counts[type]}
            </span>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}
