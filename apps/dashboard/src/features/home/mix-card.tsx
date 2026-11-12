import * as React from 'react';
import {
  formatPeso,
  homeWords,
  sharePercent,
  type HomeBuyer,
  type HomePeriodData,
} from '@smartapp/core';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { cssVars } from '@smartapp/ui/lib/css-vars';
import { HomeCard, Segmented } from './home-card.js';
import type { DonutSlice } from './mix-donut.js';

const W = homeWords.donut;
const M = homeWords.mix;
// Recharts loads only when Home shows (T57).
const MixDonut = React.lazy(() => import('./mix-donut.js'));

type Split = 'types' | 'methods' | 'buyers';
const SPLITS: readonly Split[] = ['types', 'methods', 'buyers'];

// One colour per place, biggest first; the sixth payment kind (rare) shares the last one.
const COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
] as const;
const BUYER_LABEL: Readonly<Record<HomeBuyer, string>> = W.buyer;

interface Row {
  key: string;
  label: string;
  orders: number;
  sales: number;
}

function rowsOf(split: Split, mix: HomePeriodData['mix']): Row[] {
  const rows: Row[] =
    split === 'types'
      ? mix.types.map((t) => ({
          key: t.type,
          label: M.type[t.type],
          orders: t.orders,
          sales: t.sales,
        }))
      : split === 'methods'
        ? mix.methods.map((m) => ({
            key: m.method,
            label: M.method[m.method],
            orders: m.orders,
            sales: m.sales,
          }))
        : mix.buyers.map((b) => ({
            key: b.buyer,
            label: BUYER_LABEL[b.buyer],
            orders: b.orders,
            sales: b.sales,
          }));
  return rows.filter((r) => r.sales > 0).sort((a, b) => b.sales - a.sales);
}

/**
 * Where the money came from (T83): one donut with three tabs, how they ordered, how they paid and members
 * against everyone else, for the picked period. Replaces the two share bars.
 */
export function MixCard({
  data,
  periodText,
  cardOn,
  className,
}: {
  data: HomePeriodData;
  periodText: string;
  // With the stamp card off there are no members to split by.
  cardOn: boolean;
  className?: string | undefined;
}) {
  const [split, setSplit] = React.useState<Split>('types');
  const splits = cardOn ? SPLITS : SPLITS.filter((s) => s !== 'buyers');
  const shown = splits.includes(split) ? split : 'types';
  const rows = rowsOf(shown, data.mix);
  const total = data.money.sales;
  const slices: DonutSlice[] = rows.map((r, i) => ({
    key: r.key,
    label: r.label,
    sales: r.sales,
    color: COLORS[Math.min(i, COLORS.length - 1)] ?? 'var(--chart-5)',
  }));
  return (
    <HomeCard id="mix" title={W.title} hint={periodText} className={className}>
      <div className="flex">
        <Segmented
          label={W.tabsLabel}
          value={shown}
          onChange={setSplit}
          options={splits.map((s) => ({ value: s, label: W.tabs[s] }))}
        />
      </div>
      {rows.length === 0 ? (
        <p className="flex min-h-40 flex-1 items-center justify-center text-center text-sm text-muted-foreground">
          {W.empty}
        </p>
      ) : (
        <div className="flex flex-1 flex-col items-center gap-4">
          <div
            role="img"
            aria-label={W.aria(
              rows.map((r) => W.ariaRow(r.label, sharePercent(r.sales, total))).join(', '),
            )}
            className="relative size-40 shrink-0"
          >
            <React.Suspense fallback={<Skeleton className="size-full rounded-full" />}>
              <MixDonut slices={slices} />
            </React.Suspense>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center"
            >
              <span className="text-base font-extrabold tracking-tight tabular-nums">
                {formatPeso(total)}
              </span>
              <span className="text-xs text-muted-foreground">{W.total}</span>
            </div>
          </div>
          <ul aria-hidden="true" className="flex w-full min-w-0 flex-col gap-2 text-sm">
            {slices.map((s, i) => (
              <li key={s.key} className="flex min-w-0 items-center gap-2">
                <span
                  style={cssVars({ '--dot': s.color })}
                  className="size-2.5 shrink-0 rounded-full bg-(--dot)"
                />
                <span className="truncate text-muted-foreground">
                  {W.row(s.label, rows[i]?.orders ?? 0)}
                </span>
                <span className="ml-auto font-semibold tabular-nums">
                  {W.percent(sharePercent(s.sales, total))}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </HomeCard>
  );
}
