import * as React from 'react';
import { QrCodeIcon, SparklesIcon, WifiOffIcon } from 'lucide-react';
import { errorWords, formatClock, homeWords, words } from '@smartapp/core';
import {
  errorCodeOf,
  useHomePeriod as useHomePeriodData,
  useOnboarding,
  useStorefront,
} from '@smartapp/data';
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
import { BoardCard } from '../board-card.js';
import { ComingCard, hasBookings } from '../coming-card.js';
import { CARD, HomeCard } from '../home-card.js';
import { HomeHello, PauseNotice } from '../home-hello.js';
import { HOME_GRID, HOME_MAIN, HOME_PAIR, HOME_SIDE, HOME_SLOTS as slots } from '../home-layout.js';
import { MembersCard } from '../members-card.js';
import { MixCard } from '../mix-card.js';
import { MoneyCard, MoneyCardSkeleton } from '../money-card.js';
import { NeedsCard } from '../needs-card.js';
import { PeriodPicker, periodLabel } from '../period-picker.js';
import { SalesCard } from '../sales-card.js';
import { useHomePeriodSearch, useSetHomePeriod } from '../search.js';
import { GoLiveCard } from '../go-live-card.js';
import { SetupCard } from '../setup-card.js';
import { useHomeView } from '../use-home-view.js';

const W = homeWords;

/**
 * Home (decisions T69 to T71, T83): the owner's day at a glance. What needs them, then sales for the picked
 * period with the cash check, the board, where the money came from, best sellers and members today. Plain
 * facts only: comparisons with other days live in Insights. The board comes from the same open orders as
 * Orders, so the two never disagree.
 */
export function HomeScreen() {
  const shop = useShop();
  const online = useOnlineStatus();
  const ownerName = useOwnerFirstName();
  const isPhone = useFormFactor() === 'phone';
  const view = useHomeView();
  const storefront = useStorefront(shop.slug);
  // Going live (T89): until the founder approves, the go-live card leads the page.
  const onboarding = useOnboarding();
  const { summary, home, now, needs, live, today } = view;
  const { period, dates } = useHomePeriodSearch(today);
  const setPeriod = useSetHomePeriod();
  const periodData = useHomePeriodData(dates, today);
  const periodText = periodLabel(period, dates);
  const liveDates = dates.to === today;
  // One day: the money rows open that day's orders (T84).
  const oneDay = dates.from === dates.to ? (liveDates ? 'today' : dates.to) : null;

  const delivers = storefront.data?.storefront.orderTypes.includes('delivery') ?? true;
  const activeItems =
    storefront.data?.catalog.items.filter((i) => i.status === 'active').length ?? 0;
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
    // Members closes whichever column is shorter: under the sales cards when Needs you fills the right.
    const members = <MembersCard members={summary.members} className={slots.members} />;
    const picker = (
      <PeriodPicker period={period} dates={dates} today={today} onChange={setPeriod} />
    );
    const data = periodData.data;
    body = (
      <div className="flex flex-col gap-3 md:gap-4">
        {onboarding.data && onboarding.data.stage !== 'live' ? (
          <GoLiveCard onboarding={onboarding.data} />
        ) : summary.setup ? (
          <SetupCard steps={summary.setup} activeItems={activeItems} />
        ) : null}
        {fresh ? (
          <FirstDay slug={shop.slug} />
        ) : (
          <div className={HOME_GRID}>
            <div className={HOME_MAIN}>
              {data ? (
                <MoneyCard
                  money={data.money}
                  periodText={periodText}
                  live={oneDay === 'today'}
                  day={oneDay}
                  action={picker}
                  className={slots.money}
                />
              ) : periodData.isError ? (
                <PeriodError
                  id="sales-total"
                  title={homeWords.money.title}
                  action={picker}
                  onRetry={() => void periodData.refetch()}
                  className={slots.money}
                />
              ) : (
                <MoneySkeleton action={picker} className={slots.money} />
              )}
              {data ? (
                <SalesCard
                  data={data}
                  periodText={periodText}
                  live={liveDates}
                  asOf={now}
                  className={slots.sales}
                />
              ) : (
                <ChartSkeleton className={slots.sales} />
              )}
              <div className={HOME_PAIR}>
                {data ? (
                  <MixCard
                    data={data}
                    periodText={periodText}
                    cardOn={summary.members.cardOn}
                    className={slots.mix}
                  />
                ) : (
                  <ListSkeleton className={slots.mix} />
                )}
                {data ? (
                  <BestCard
                    best={data.best}
                    idleItems={summary.idleItems}
                    periodText={periodText}
                    live={liveDates}
                    className={slots.best}
                  />
                ) : (
                  <ListSkeleton className={slots.best} />
                )}
              </div>
              {hasNeeds ? members : null}
            </div>
            <div className={HOME_SIDE}>
              {hasNeeds ? (
                <NeedsCard
                  needs={needs}
                  live={live}
                  soldOut={summary.soldOut}
                  storagePercent={view.storagePercent}
                  now={now}
                  shown={isPhone ? 3 : 4}
                  className={slots.needs}
                />
              ) : null}
              <BoardCard
                live={live}
                todays={view.todays}
                kind={shop.kind}
                delivers={delivers}
                now={now}
                className={cn(slots.board, hasNeeds && 'lg:flex-1')}
              />
              {hasNeeds ? null : members}
            </div>
            {booked ? <ComingCard days={summary.comingUp} className={slots.coming} /> : null}
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

/** A period card that couldn't load: the picker stays, with Try again. */
function PeriodError({
  id,
  title,
  action,
  onRetry,
  className,
}: {
  id: string;
  title: string;
  action: React.ReactNode;
  onRetry: () => void;
  className: string;
}) {
  return (
    <HomeCard id={id} title={title} action={action} className={className}>
      <div className="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-center">
        <p className="text-sm text-muted-foreground">{W.states.errorCard}</p>
        <Button variant="outline" className="h-11 md:h-9" onClick={onRetry}>
          {W.states.tryAgain}
        </Button>
      </div>
    </HomeCard>
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

// The skeleton is built from the same slots and the same fixed heights as the cards (T83), so nothing
// moves when the numbers arrive.
function MoneySkeleton({
  action,
  className,
}: {
  action?: React.ReactNode | undefined;
  className: string;
}) {
  return (
    <div className={cn(CARD, className)} aria-busy="true">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1.5 pt-1">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-3 w-24" />
        </div>
        {action ?? <Skeleton className="h-11 w-36 rounded-lg md:h-9" />}
      </div>
      <MoneyCardSkeleton />
    </div>
  );
}

function ChartSkeleton({ className }: { className: string }) {
  return (
    <div className={cn(CARD, className)} aria-busy="true" aria-hidden="true">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-52 w-full flex-1 rounded-lg md:h-60" />
      <Skeleton className="h-3 w-40" />
    </div>
  );
}

function ListSkeleton({ className }: { className: string }) {
  return (
    <div className={cn(CARD, className)} aria-busy="true" aria-hidden="true">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-3 w-20" />
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} className="h-10 rounded-lg" />
      ))}
    </div>
  );
}

function HomeSkeleton() {
  return (
    <div className={HOME_GRID} aria-busy="true" aria-hidden="true">
      <div className={HOME_MAIN}>
        <MoneySkeleton className={slots.money} />
        <ChartSkeleton className={slots.sales} />
        <div className={HOME_PAIR}>
          <ListSkeleton className={slots.mix} />
          <ListSkeleton className={slots.best} />
        </div>
      </div>
      <div className={HOME_SIDE}>
        <ListSkeleton className={slots.needs} />
        <ListSkeleton className={slots.board} />
        <ListSkeleton className={slots.members} />
      </div>
    </div>
  );
}
