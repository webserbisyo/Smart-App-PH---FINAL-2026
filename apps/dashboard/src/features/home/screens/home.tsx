import * as React from 'react';
import { QrCodeIcon, SparklesIcon, WifiOffIcon } from 'lucide-react';
import { errorWords, formatClock, homeWords, words } from '@smartapp/core';
import { errorCodeOf, useStorefront } from '@smartapp/data';
import { Button } from '@smartapp/ui/components/button';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { PageHeader } from '@smartapp/ui/compositions/page-header';
import { useFormFactor } from '@smartapp/ui/hooks/use-form-factor';
import { cn } from 'cn';
import { Notice } from '@/app/notice';
import { PageEmpty, PageError } from '@/app/page-state';
import { ShareShopSheet } from '@/app/shell/share-shop-sheet';
import { useShop } from '@/app/shop';
import { storefrontUrl } from '@/app/use-nav-items';
import { useOnlineStatus } from '@/app/use-online-status';
import { useOwnerFirstName } from '@/app/use-owner-name';
import { BestCard } from '../best-card.js';
import { BoardCard, isOpenOnBoard } from '../board-card.js';
import { BusyCard } from '../busy-card.js';
import { ComingCard, hasBookings } from '../coming-card.js';
import { CARD } from '../home-card.js';
import { HomeHello, PauseNotice } from '../home-hello.js';
import { HourCard } from '../hour-card.js';
import { MembersCard } from '../members-card.js';
import { MixCard } from '../mix-card.js';
import { NeedsCard } from '../needs-card.js';
import { SetupCard } from '../setup-card.js';
import { TodayCard } from '../today-card.js';
import { TrendsCard } from '../trends-card.js';
import { useHomeView } from '../use-home-view.js';

const W = homeWords;

/**
 * Home (decisions T69 to T71): the owner's day at a glance. Today against a usual weekday, what needs
 * them, the board, and how the day went hour by hour. Numbers come from getHome; the board from the
 * same open orders as Orders, so the two never disagree.
 */
export function HomeScreen() {
  const shop = useShop();
  const online = useOnlineStatus();
  const ownerName = useOwnerFirstName();
  const isPhone = useFormFactor() === 'phone';
  const view = useHomeView();
  const storefront = useStorefront(shop.slug);
  const { summary, home, now, needs, live } = view;

  const delivers = storefront.data?.storefront.orderTypes.includes('delivery') ?? true;
  const activeItems =
    storefront.data?.catalog.items.filter((i) => i.status === 'active').length ?? 0;
  const openNow = live.filter((o) => isOpenOnBoard(o, now)).length;
  const updated = home.dataUpdatedAt > 0 ? formatClock(new Date(home.dataUpdatedAt)) : null;

  let body: React.ReactNode;
  if (home.isPending) {
    body = <HomeSkeleton />;
  } else if (home.isError && !summary) {
    body = (
      <PageError
        title={W.states.errorTitle}
        message={errorWords(errorCodeOf(home.error))}
        retryLabel={W.states.tryAgain}
        onRetry={() => void home.refetch()}
      />
    );
  } else if (summary) {
    const fresh = summary.daysWithOrders === 0;
    const hasNeeds = needs.length > 0;
    const booked = hasBookings(summary.comingUp);
    body = (
      <div className="flex flex-col gap-3 md:gap-4">
        {summary.setup ? <SetupCard steps={summary.setup} activeItems={activeItems} /> : null}
        {fresh ? (
          <FirstDay slug={shop.slug} />
        ) : (
          <div className="grid items-start gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-3">
            {hasNeeds ? (
              <NeedsCard
                needs={needs}
                live={live}
                soldOut={summary.soldOut}
                storagePercent={view.storagePercent}
                now={now}
                shown={isPhone ? 3 : 4}
                className="md:col-span-2 lg:col-span-1 lg:col-start-3 lg:row-start-1"
              />
            ) : null}
            <TodayCard
              summary={summary}
              openNow={openNow}
              className={cn(
                'md:col-span-2 lg:row-start-1',
                hasNeeds ? 'lg:col-span-2 lg:col-start-1' : 'lg:col-span-3',
              )}
            />
            <HourCard summary={summary} className="md:col-span-2" />
            {/* The board is tall, so on wide screens it spans the rows of Hour by hour and the trend. */}
            <BoardCard
              live={live}
              todays={view.todays}
              kind={shop.kind}
              delivers={delivers}
              now={now}
              className="md:col-span-2 lg:col-span-1 lg:row-span-2"
            />
            <TrendsCard className="md:col-span-2" />
            <BestCard summary={summary} className="md:col-span-2 lg:col-span-1" />
            <MixCard summary={summary} />
            <MembersCard members={summary.members} />
            {booked ? (
              <ComingCard days={summary.comingUp} className="md:col-span-2 lg:col-span-1" />
            ) : null}
            <BusyCard className={cn('md:col-span-2', booked ? 'lg:col-span-2' : 'lg:col-span-3')} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col pb-24 md:pb-8">
      <PageHeader title={words.screens.home.title} />
      <div className="flex flex-col gap-3 px-4 pt-3 md:gap-4 md:px-6 md:pt-4">
        <HomeHello
          name={ownerName}
          now={now}
          summary={summary}
          needs={needs}
          open={view.open}
          slug={shop.slug}
          failed={home.isError}
        />
        <PauseNotice slug={shop.slug} open={view.open} online={online} />
        {!online ? (
          <Notice tone="warning" icon={<WifiOffIcon className="size-4" />}>
            {W.offline(updated)}
          </Notice>
        ) : null}
        {body}
      </div>
    </div>
  );
}

/** A new shop's first day: one calm card instead of empty charts. */
function FirstDay({ slug }: { slug: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <PageEmpty
        variant="box"
        icon={<SparklesIcon className="size-8 text-muted-foreground" />}
        title={W.empty.title}
        description={W.empty.body}
        action={
          <Button className="h-11 gap-1.5 md:h-9" onClick={() => setOpen(true)}>
            <QrCodeIcon aria-hidden="true" />
            {W.hello.shareShop}
          </Button>
        }
      />
      <ShareShopSheet url={storefrontUrl(slug)} open={open} onOpenChange={setOpen} />
    </>
  );
}

function HomeSkeleton() {
  return (
    <div
      className="grid items-start gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-3"
      aria-busy="true"
      aria-hidden="true"
    >
      <div className={cn(CARD, 'md:col-span-2 lg:row-start-1')}>
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-12 w-48" />
        <Skeleton className="h-3 w-full rounded-full" />
        <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </div>
      <div className={cn(CARD, 'md:col-span-2 lg:col-span-1 lg:col-start-3 lg:row-start-1')}>
        <Skeleton className="h-4 w-24" />
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-14 rounded-lg" />
        ))}
      </div>
      <div className={cn(CARD, 'md:col-span-2')}>
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-52 w-full rounded-lg md:h-60" />
      </div>
      <div className={cn(CARD, 'md:col-span-2 lg:col-span-1')}>
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-16 w-full rounded-lg" />
        <Skeleton className="h-40 w-full rounded-lg" />
      </div>
    </div>
  );
}
