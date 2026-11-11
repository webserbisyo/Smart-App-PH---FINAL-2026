import { ShieldAlertIcon } from 'lucide-react';
import type { OrderType } from '@smartapp/core';
import { formatPeso, ordersWords } from '@smartapp/core';
import { IconTile } from '@smartapp/ui/components/reui/icon-tile';
import { ToggleGroup, ToggleGroupItem } from '@smartapp/ui/components/toggle-group';
import { Scroller } from '@smartapp/ui/components/scroller';
import { useScrollerRecheck } from '@smartapp/ui/hooks/use-scroller-recheck';
import { cn } from 'cn';
import { ORDER_TYPE_ICON } from '@/app/orders/order-type-icons';
import { ORDER_FILTERS, type OrderFilter } from './search.js';

export interface TypeTotals {
  count: number;
  total: number;
}

export interface TypeCardsProps {
  // The shop's order types, in its own order (Delivery hides for a shop that doesn't deliver).
  types: readonly OrderType[];
  totals: Readonly<Record<OrderType, TypeTotals>>;
  // Transfer payments waiting for the owner's check; the "To check" card shows only when > 0.
  toCheck: number;
  value: OrderFilter | undefined;
  onChange: (value: OrderFilter | undefined) => void;
}

/**
 * Type cards (D3): one card per order type with icon, word, count and total. No "All": tap a card to
 * filter, tap it again to clear. Built from the installed Toggle Group and ReUI Icon Tile.
 */
export function TypeCards({ types, totals, toCheck, value, onChange }: TypeCardsProps) {
  // The cards load after the row, so the edge fade re-checks when they grow (T77).
  const scrollerRef = useScrollerRecheck<HTMLDivElement>();
  const itemClass =
    'h-auto min-h-11 shrink-0 justify-start gap-2.5 rounded-xl border border-border bg-card px-2.5 py-2 text-left shadow-xs hover:bg-muted/60 aria-pressed:border-primary aria-pressed:bg-accent aria-pressed:ring-1 aria-pressed:ring-primary md:min-w-44 md:px-3';

  return (
    <Scroller
      ref={scrollerRef}
      orientation="horizontal"
      hideScrollbar
      className="-mx-4 px-4 md:mx-0 md:px-0"
    >
      <ToggleGroup
        value={value ? [value] : []}
        onValueChange={(next) => {
          const picked = ORDER_FILTERS.find((f) => f === next[0]);
          onChange(picked);
        }}
        aria-label={ordersWords.typeCards.label}
        spacing={2}
        className="w-max py-0.5"
      >
        {types.map((type) => {
          const Icon = ORDER_TYPE_ICON[type];
          const t = totals[type];
          return (
            <ToggleGroupItem key={type} value={type} className={itemClass}>
              <IconTile
                variant="soft"
                size="sm"
                aria-hidden="true"
                className="hidden sm:inline-flex"
              >
                <Icon />
              </IconTile>
              <Icon aria-hidden="true" className="sm:hidden" />
              <span className="flex min-w-0 flex-col">
                <span className="text-sm leading-tight font-semibold">
                  {ordersWords.types[type]}
                  <span className="ml-1.5 text-muted-foreground tabular-nums sm:hidden">
                    {t.count}
                  </span>
                </span>
                <span className="hidden text-xs text-muted-foreground tabular-nums sm:block">
                  {ordersWords.typeCards.openCount(t.count)} · {formatPeso(t.total)}
                </span>
              </span>
            </ToggleGroupItem>
          );
        })}
        {toCheck > 0 ? (
          <ToggleGroupItem
            value="to_check"
            className={cn(
              itemClass,
              'border-warning/40 bg-warning-soft text-warning-soft-foreground hover:bg-warning-soft aria-pressed:border-warning aria-pressed:bg-warning-soft aria-pressed:ring-warning',
            )}
          >
            <IconTile
              variant="soft"
              size="sm"
              aria-hidden="true"
              className="hidden bg-warning/20 sm:inline-flex"
            >
              <ShieldAlertIcon />
            </IconTile>
            <ShieldAlertIcon aria-hidden="true" className="sm:hidden" />
            <span className="flex min-w-0 flex-col">
              <span className="text-sm leading-tight font-semibold">
                <span className="tabular-nums">{ordersWords.typeCards.toCheck(toCheck)}</span>
              </span>
              <span className="hidden text-xs sm:block">{ordersWords.typeCards.toCheckHint}</span>
            </span>
          </ToggleGroupItem>
        ) : null}
      </ToggleGroup>
    </Scroller>
  );
}
