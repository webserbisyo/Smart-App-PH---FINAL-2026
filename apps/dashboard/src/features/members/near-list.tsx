import { StampIcon } from 'lucide-react';
import { membersWords, type CustomerRow } from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import { Scroller } from '@smartapp/ui/components/scroller';
import { Spinner } from '@smartapp/ui/components/spinner';
import type { Point } from '@smartapp/ui/compositions/celebrate';
import { MemberAvatar } from './member-rows.js';
import { StampDots } from './stamp-dots.js';
import { originOf } from './use-counter-actions.js';
import { lastInLabel } from './when.js';

const W = membersWords;

export interface NearListProps {
  rows: readonly CustomerRow[];
  smallCard: boolean;
  now: Date;
  // Folded to the first few; See all opens the Almost group.
  shown: number;
  canStamp: boolean;
  busyId: string | null;
  onStamp: (row: CustomerRow, origin: Point) => void;
  onOpen: (row: CustomerRow) => void;
  onSeeAll: () => void;
  // Phone: one swipeable row of cards so the list starts higher up the screen.
  layout?: 'list' | 'strip' | undefined;
}

/** "1 or 2 stamps away": the members worth a word at the counter, each with its own Stamp button. */
export function NearList({
  rows,
  smallCard,
  now,
  shown,
  canStamp,
  busyId,
  onStamp,
  onOpen,
  onSeeAll,
  layout = 'list',
}: NearListProps) {
  if (rows.length === 0) return null;
  if (layout === 'strip') {
    return (
      <section aria-labelledby="near-title" className="flex flex-col gap-2">
        <header className="flex items-center justify-between gap-2">
          <h2 id="near-title" className="text-sm font-semibold">
            {W.near.title(smallCard)}
          </h2>
          <Button variant="link" className="h-11 px-0" onClick={onSeeAll}>
            {W.near.seeAll(rows.length)}
          </Button>
        </header>
        <Scroller orientation="horizontal" hideScrollbar className="-mx-4 px-4">
          <ul className="flex w-max gap-2 pb-1">
            {rows.slice(0, shown).map((row) => (
              <li
                key={row.id}
                className="flex w-64 items-center gap-2 rounded-xl border border-border bg-card p-2.5 shadow-xs"
              >
                <button
                  type="button"
                  onClick={() => onOpen(row)}
                  aria-label={W.openMember(row.name)}
                  className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <MemberAvatar name={row.name} member />
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="truncate text-sm font-semibold">{row.name}</span>
                    <StampDots balance={row.balance} goal={row.goal} />
                  </span>
                </button>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-11 shrink-0"
                  disabled={!canStamp || busyId === row.id}
                  aria-label={W.near.stampFor(row.name)}
                  onClick={(event) => onStamp(row, originOf(event.currentTarget))}
                >
                  {busyId === row.id ? <Spinner /> : <StampIcon aria-hidden="true" />}
                </Button>
              </li>
            ))}
          </ul>
        </Scroller>
      </section>
    );
  }
  return (
    <section
      aria-labelledby="near-title"
      className="flex flex-col rounded-xl border border-border bg-card p-3 shadow-xs md:p-4"
    >
      <header className="mb-1 flex items-baseline gap-2">
        <h2 id="near-title" className="text-sm font-semibold">
          {W.near.title(smallCard)}
        </h2>
        <span className="hidden text-xs text-muted-foreground sm:inline">{W.near.hint}</span>
      </header>
      <ul className="flex flex-col divide-y divide-border">
        {rows.slice(0, shown).map((row) => (
          <li key={row.id} className="flex items-center gap-3 py-2">
            <button
              type="button"
              onClick={() => onOpen(row)}
              aria-label={W.openMember(row.name)}
              className="flex min-w-0 flex-1 items-center gap-3 rounded-lg text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <MemberAvatar name={row.name} member />
              <span className="flex min-w-0 flex-col gap-1">
                <span className="truncate text-sm font-semibold">
                  {row.name}
                  <span className="font-normal text-muted-foreground">
                    {' · '}
                    {lastInLabel(row.lastOrderAt, now)}
                  </span>
                </span>
                <StampDots balance={row.balance} goal={row.goal} />
              </span>
            </button>
            <Button
              variant="outline"
              className="h-11 shrink-0 gap-1.5 md:h-10"
              disabled={!canStamp || busyId === row.id}
              aria-label={W.near.stampFor(row.name)}
              onClick={(event) => onStamp(row, originOf(event.currentTarget))}
            >
              {busyId === row.id ? <Spinner /> : <StampIcon aria-hidden="true" />}
              {W.near.stamp}
            </Button>
          </li>
        ))}
      </ul>
      {rows.length > shown ? (
        <Button variant="link" className="h-11 self-start px-0 md:h-10" onClick={onSeeAll}>
          {W.near.seeAll(rows.length)}
        </Button>
      ) : null}
    </section>
  );
}
