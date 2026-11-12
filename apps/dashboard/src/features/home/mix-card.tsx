import * as React from 'react';
import {
  ORDER_TYPES,
  homeWords,
  sharePercent,
  type HomeBuyer,
  type HomePeriodData,
} from '@smartapp/core';
import { cn } from 'cn';
import { placeTone, type PlaceTone } from '@/app/pay-place';
import { HomeCard, Segmented } from './home-card.js';
import { PesoTicker, ShareRings } from './money-card.js';

const W = homeWords.donut;
const M = homeWords.mix;

type Split = 'types' | 'buyers';
const SPLITS: readonly Split[] = ['types', 'buyers'];

// Fixed colours by what they are, never by size (T84): order types take the first three chart colours in
// their usual order; members take aqua (the loyalty colour) and everyone else grey.
const BUYER_SLOT: Readonly<Record<HomeBuyer, number>> = { member: 2, guest: 5 };
const BUYER_LABEL: Readonly<Record<HomeBuyer, string>> = W.buyer;

interface Row {
  key: string;
  label: string;
  orders: number;
  sales: number;
  tone: PlaceTone;
}

function rowsOf(split: Split, mix: HomePeriodData['mix']): Row[] {
  if (split === 'types')
    return ORDER_TYPES.flatMap((type, i) => {
      const t = mix.types.find((x) => x.type === type);
      return t && t.orders > 0
        ? [{ key: type, label: M.type[type], orders: t.orders, sales: t.sales, tone: placeTone(i) }]
        : [];
    });
  return mix.buyers
    .filter((b) => b.orders > 0)
    .map((b) => ({
      key: b.buyer,
      label: BUYER_LABEL[b.buyer],
      orders: b.orders,
      sales: b.sales,
      tone: placeTone(BUYER_SLOT[b.buyer]),
    }));
}

/**
 * Where the money came from (T83, T84): how they ordered, and members against everyone else, for the
 * picked period. The same rings and rows as the Sales card, each in its own fixed colour.
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
  return (
    <HomeCard id="mix" title={W.title} hint={periodText} className={className}>
      {splits.length > 1 ? (
        <div className="flex">
          <Segmented
            label={W.tabsLabel}
            value={shown}
            onChange={setSplit}
            options={splits.map((s) => ({ value: s, label: W.tabs[s] }))}
          />
        </div>
      ) : null}
      {rows.length === 0 ? (
        <p className="flex min-h-40 flex-1 items-center justify-center text-center text-sm text-muted-foreground">
          {W.empty}
        </p>
      ) : (
        <div className="flex flex-1 flex-col gap-3">
          <ShareRings
            label={W.aria(
              rows.map((r) => W.ariaRow(r.label, sharePercent(r.sales, total))).join(', '),
            )}
            rings={rows.map((r) => ({
              key: r.key,
              label: r.label,
              percent: sharePercent(r.sales, total),
              tone: r.tone,
            }))}
          />
          <ul className="flex w-full min-w-0 flex-col gap-2 text-sm">
            {rows.map((r) => (
              <li key={r.key} className="flex min-w-0 items-center gap-2">
                <span
                  aria-hidden="true"
                  className={cn('size-2.5 shrink-0 rounded-full', r.tone.bg)}
                />
                <span className="truncate text-muted-foreground">{W.row(r.label, r.orders)}</span>
                <PesoTicker centavos={r.sales} className="ml-auto font-semibold" />
              </li>
            ))}
          </ul>
        </div>
      )}
    </HomeCard>
  );
}
