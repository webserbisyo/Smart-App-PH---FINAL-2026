import * as React from 'react';
import { CoffeeIcon, ExternalLinkIcon, PauseCircleIcon, QrCodeIcon } from 'lucide-react';
import {
  errorWords,
  formatClock,
  formatPeso,
  homeWords,
  manilaParts,
  openingWhen,
  type HomeNeed,
  type HomeSummary,
  type OpenState,
} from '@smartapp/core';
import { errorCodeOf, useSetPause } from '@smartapp/data';
import { Button } from '@smartapp/ui/components/button';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { notify } from '@smartapp/ui/compositions/notify';
import { Notice } from '@/app/notice';
import { ShareShopSheet } from '@/app/shell/share-shop-sheet';
import { storefrontUrl } from '@/app/use-nav-items';

const W = homeWords;

/**
 * The story line under the greeting: today in one plain sentence, then the worst thing that needs the owner.
 * No comparison with other days (T83: those live in Insights).
 */
export function storyLine(
  summary: HomeSummary,
  needs: readonly HomeNeed[],
  open: OpenState | null,
  now: Date,
): string {
  if (summary.setup && summary.daysWithOrders === 0) return W.hello.welcome;
  const { today } = summary;
  const closed = summary.openToday
    ? ''
    : `${W.hello.closed(open?.nextOpening ? openingWhen(open.nextOpening, now) : null)} `;
  if (!summary.openToday && today.orders === 0) return closed.trim();
  if (today.orders === 0) return `${closed}${W.hello.quiet}`;
  const first = needs[0];
  const tail =
    first?.kind === 'to_check'
      ? ` ${W.hello.toCheck(first.count)}`
      : first?.kind === 'late'
        ? ` ${W.hello.late(first.count)}`
        : '';
  return `${closed}${W.hello.sales(formatPeso(today.sales), today.orders)}${tail}`;
}

export function HomeHello({
  name,
  now,
  summary,
  needs,
  open,
  slug,
  failed = false,
}: {
  failed?: boolean;
  name: string | null;
  now: Date;
  summary: HomeSummary | undefined;
  needs: readonly HomeNeed[];
  open: OpenState | null;
  slug: string;
}) {
  const [shareOpen, setShareOpen] = React.useState(false);
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
      <div className="flex min-w-0 flex-col gap-0.5">
        <h2 className="text-xl font-bold tracking-tight md:text-2xl">
          {W.hello.greeting(manilaParts(now).hour, name)}
        </h2>
        {summary ? (
          <p className="text-sm text-muted-foreground">{storyLine(summary, needs, open, now)}</p>
        ) : failed ? null : (
          <Skeleton className="mt-1 h-4 w-72 max-w-full" />
        )}
      </div>
      <div className="flex shrink-0 gap-2">
        <Button
          variant="outline"
          className="h-11 flex-1 gap-1.5 bg-card md:h-9 md:flex-none"
          onClick={() => setShareOpen(true)}
        >
          <QrCodeIcon aria-hidden="true" />
          {W.hello.shareShop}
        </Button>
        <Button
          variant="outline"
          className="h-11 flex-1 gap-1.5 bg-card md:h-9 md:flex-none"
          nativeButton={false}
          render={<a href={storefrontUrl(slug)} target="_blank" rel="noopener noreferrer" />}
        >
          <ExternalLinkIcon aria-hidden="true" />
          {W.hello.viewShop}
        </Button>
      </div>
      <ShareShopSheet url={storefrontUrl(slug)} open={shareOpen} onOpenChange={setShareOpen} />
    </div>
  );
}

/** Busy or paused: one line with the way back to normal (the same switch as Orders). */
export function PauseNotice({
  slug,
  open,
  online,
}: {
  slug: string;
  open: OpenState | null;
  online: boolean;
}) {
  const setPause = useSetPause(slug);
  const busyUntil = open?.busyUntil ?? null;
  if (!open || (!open.paused && !busyUntil)) return null;
  const resume = () =>
    setPause
      .mutateAsync({ mode: 'resume' })
      .then(() => notify({ title: W.pause.resumed, tone: 'success' }))
      .catch((err: unknown) => notify({ title: errorWords(errorCodeOf(err)), tone: 'error' }));
  return (
    <Notice
      tone="warning"
      icon={
        open.paused ? <PauseCircleIcon className="size-4" /> : <CoffeeIcon className="size-4" />
      }
      action={
        <Button
          variant="outline"
          className="h-11 w-full sm:w-auto md:h-8"
          disabled={!online || setPause.isPending}
          onClick={resume}
        >
          {W.pause.resume}
        </Button>
      }
    >
      {open.paused || !busyUntil ? W.pause.paused : W.pause.busy(formatClock(busyUntil))}
    </Notice>
  );
}
