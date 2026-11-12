import { MoonStarIcon } from 'lucide-react';
import { formatPeso, homeWords, type HomeBestSeller } from '@smartapp/core';
import { Avatar, AvatarFallback, AvatarImage } from '@smartapp/ui/components/avatar';
import { Badge } from '@smartapp/ui/components/reui/badge';
import { initials } from '@smartapp/ui/compositions/shop-image';
import { cssVars } from '@smartapp/ui/lib/css-vars';
import { orderPhotoSrc } from '@/app/orders/order-photo';
import { HomeCard } from './home-card.js';

const W = homeWords.best;

function BestRow({ item, rank, top }: { item: HomeBestSeller; rank: number; top: number }) {
  const src = orderPhotoSrc(item.photo, 96);
  const share = Math.max(4, Math.round((item.qty / top) * 100));
  return (
    <li
      aria-label={W.rowAria(rank, item.name, item.qty, formatPeso(item.sales))}
      className="flex min-w-0 items-center gap-3"
    >
      <span
        aria-hidden="true"
        className="w-4 shrink-0 text-center text-sm font-bold text-muted-foreground tabular-nums"
      >
        {rank}
      </span>
      <Avatar aria-hidden="true" className="size-10 shrink-0 rounded-lg">
        {src ? <AvatarImage src={src} alt="" className="rounded-lg object-cover" /> : null}
        <AvatarFallback className="rounded-lg font-semibold">{initials(item.name)}</AvatarFallback>
      </Avatar>
      <div aria-hidden="true" className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-sm font-semibold">{item.name}</span>
          {item.soldOut ? (
            <Badge variant="destructive-light" size="sm" radius="full" className="shrink-0">
              {W.soldOut}
            </Badge>
          ) : null}
        </span>
        <span className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <span
            style={cssVars({ '--share': `${share}%` })}
            className="block h-full w-(--share) rounded-full bg-chart-1"
          />
        </span>
      </div>
      <span aria-hidden="true" className="flex shrink-0 flex-col items-end">
        <span className="text-sm font-bold tabular-nums">{item.qty}</span>
        <span className="text-xs text-muted-foreground tabular-nums">{formatPeso(item.sales)}</span>
      </span>
    </li>
  );
}

/** Best sellers (H9) for the picked period (T83), by how many were sold, and items that stopped selling. */
export function BestCard({
  best,
  idleItems,
  periodText,
  live,
  className,
}: {
  best: readonly HomeBestSeller[];
  idleItems: number;
  periodText: string;
  live: boolean;
  className?: string | undefined;
}) {
  const top = Math.max(1, ...best.map((i) => i.qty));
  return (
    <HomeCard id="best" title={W.title} hint={`${periodText} · ${W.hint}`} className={className}>
      {best.length > 0 ? (
        <ol className="flex flex-col gap-3">
          {best.map((item, i) => (
            <BestRow key={item.itemId} item={item} rank={i + 1} top={top} />
          ))}
        </ol>
      ) : (
        <p className="flex min-h-40 flex-1 items-center justify-center text-center text-sm text-muted-foreground">
          {live ? W.emptyToday : W.emptyPeriod}
        </p>
      )}
      {idleItems > 0 ? (
        <p className="mt-auto flex items-center gap-2 border-t pt-3 text-xs text-muted-foreground">
          <MoonStarIcon aria-hidden="true" className="size-4 shrink-0" />
          {W.idle(idleItems)}
        </p>
      ) : null}
    </HomeCard>
  );
}
