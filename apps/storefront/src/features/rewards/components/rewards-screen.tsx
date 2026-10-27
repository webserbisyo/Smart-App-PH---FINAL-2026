'use client';

import { lazy, Suspense, useEffect, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CalendarCheckIcon, PauseCircleIcon, RotateCwIcon, WifiOffIcon } from 'lucide-react';
import {
  imageSources,
  rewardState,
  stampProgress,
  variantAvailability,
  words,
} from '@smartapp/core';
import {
  useCelebratedReward,
  useMyAccount,
  useNow,
  useOnline,
  useSeenStamps,
} from '@smartapp/data';
import { Button } from '@smartapp/ui/components/button';
import {
  CircularProgress,
  CircularProgressIndicator,
  CircularProgressRange,
  CircularProgressTrack,
} from '@smartapp/ui/components/circular-progress';
import { Alert, AlertDescription, AlertTitle } from '@smartapp/ui/components/reui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@smartapp/ui/components/tabs';
import { rewardReady } from '@smartapp/ui/compositions/celebrate';
import { StampCard } from '@smartapp/ui/compositions/stamp-card';
import { useShop } from '../../shell/components/shop-context';
import { capReached, rewardRound, ruleLine } from '../rewards-rules';
import { RewardCard } from './reward-card';
import { MemberQr, StampHistory } from './rewards-parts';
import { RewardsSkeleton } from './rewards-skeleton';
import { SukiInvite } from './suki-invite';

// Magic UI Number Ticker pulls in motion, so it loads after the page (decision R38: motion only where
// loaded lazily). Until then the count shows where it starts.
const NumberTicker = lazy(() =>
  import('@smartapp/ui/components/number-ticker').then((m) => ({ default: m.NumberTicker })),
);

const W = words.rewards;
const S = words.shop.stamps;
const TABS = ['card', 'history', 'qr'] as const;
type RewardsTab = (typeof TABS)[number];

function isTab(value: unknown): value is RewardsTab {
  return TABS.some((tab) => tab === value);
}

function subscribeMotion(listener: () => void): () => void {
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  media.addEventListener('change', listener);
  return () => media.removeEventListener('change', listener);
}

function reducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Rewards (T12): the stamp card in the member colour, the reward, stamp history and the member QR. Guests
 * see the card, the rule and Join; before a shop has a card, an honest invite to join (decision R25).
 */
export function RewardsScreen() {
  const { slug, shop } = useShop();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const online = useOnline();
  const now = useNow();
  const account = useMyAccount(slug);
  const member = account.data ?? null;
  const card = shop.storefront.stampCard;
  const kind = shop.storefront.info.kind;
  const { celebrated, remember } = useCelebratedReward(slug);
  const { seen, remember: rememberSeen } = useSeenStamps(slug);
  const calm = useSyncExternalStore(subscribeMotion, reducedMotion, () => true);

  const needed = card.rule.stampsNeeded;
  const balance = member?.balance ?? 0;
  const progress = stampProgress(balance, needed);
  const freeItem = shop.catalog.items
    .find((i) => i.id === card.reward.itemId)
    ?.variants.find((v) => v.id === card.reward.variantId);
  const state = rewardState({
    card,
    member,
    freeItemAvailable: freeItem && now ? variantAvailability(freeItem, now) === 'available' : true,
  });
  const round = member ? rewardRound(member.history) : 0;
  const shouldCelebrate = state === 'ready' && member !== null && !celebrated(round);

  // Confetti once per reward (never under reduced motion: celebrate turns itself off).
  useEffect(() => {
    if (!shouldCelebrate) return;
    remember(round);
    void rewardReady();
  }, [shouldCelebrate, remember, round]);

  // The count only ticks up when it changed since the last visit.
  useEffect(() => {
    if (member && seen !== balance) rememberSeen(balance);
  }, [member, seen, balance, rememberSeen]);

  if (card.status === 'off') {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 pt-2 pb-6">
        <h1 id="rewards-title" className="text-2xl font-bold tracking-tight">
          {W.title}
        </h1>
        <SukiInvite
          slug={slug}
          shopName={shop.storefront.info.name}
          member={account.isPending && online ? undefined : member}
        />
      </div>
    );
  }

  if (account.isPending && online) return <RewardsSkeleton />;

  const rawTab = params.get('tab');
  const tab: RewardsTab = isTab(rawTab) ? rawTab : 'card';
  function setTab(next: RewardsTab) {
    const search = new URLSearchParams(params);
    search.set('tab', next);
    router.replace(`${pathname}?${search.toString()}`, { scroll: false });
  }

  const prize = {
    title: card.reward.title,
    photo: imageSources(card.reward.image),
    label: words.storefrontShell.home.stampCard.prize,
  };
  const ready = state === 'ready';
  const stampCard = (
    <StampCard
      needed={needed}
      stamped={progress.filled}
      pending={member?.pendingStamps ?? 0}
      title={
        member
          ? ready
            ? words.storefrontShell.home.stampCard.readyTitle(card.reward.title)
            : W.toGo(progress.left, card.reward.title)
          : words.storefrontShell.home.stampCard.guestTitle(needed, card.reward.title)
      }
      body={
        member
          ? member.pendingStamps > 0
            ? W.pendingLine(member.pendingStamps)
            : ruleLine(card.rule)
          : words.storefrontShell.home.stampCard.guestBody(card.rule.welcomeStamps)
      }
      progressLabel={words.storefrontShell.home.stampCard.progress(progress.filled, needed)}
      prize={prize}
      ready={ready}
      readyLine={S.ready}
      action={
        member ? undefined : (
          <Button
            id="rewards-join"
            nativeButton={false}
            render={<Link href={`/${slug}/join`} />}
            className="h-12 rounded-full bg-member text-base font-semibold text-member-foreground hover:bg-member-hover"
          >
            {W.join}
          </Button>
        )
      }
    />
  );

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 pt-2 pb-6">
      <h1 id="rewards-title" className="text-2xl font-bold tracking-tight">
        {W.title}
      </h1>

      {!online ? (
        <Alert variant="info">
          <WifiOffIcon aria-hidden="true" />
          <AlertDescription>{W.offline}</AlertDescription>
        </Alert>
      ) : account.isError ? (
        <Alert variant="warning">
          <RotateCwIcon aria-hidden="true" />
          <AlertTitle>{W.errorTitle}</AlertTitle>
          <AlertDescription>
            <Button
              variant="outline"
              onClick={() => void account.refetch()}
              className="h-11 rounded-full px-4"
            >
              {W.tryAgain}
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {card.status === 'paused' ? (
        <Alert variant="warning">
          <PauseCircleIcon aria-hidden="true" />
          <AlertDescription>{S.paused}</AlertDescription>
        </Alert>
      ) : null}

      {!member ? (
        <>
          {stampCard}
          <p className="px-1 text-sm text-muted-foreground">{ruleLine(card.rule)}</p>
          <RewardCard slug={slug} kind={kind} card={card} state="not_ready" account={null} />
        </>
      ) : (
        <Tabs
          value={tab}
          onValueChange={(value) => {
            if (isTab(value)) setTab(value);
          }}
          className="gap-4"
        >
          <TabsList
            aria-label={W.sections}
            className="grid w-full grid-cols-3 rounded-full p-1 group-data-horizontal/tabs:h-auto"
          >
            <TabsTrigger value="card" className="h-11 rounded-full text-base">
              {W.card}
            </TabsTrigger>
            <TabsTrigger value="history" className="h-11 rounded-full text-base">
              {W.history}
            </TabsTrigger>
            <TabsTrigger value="qr" className="h-11 rounded-full text-base">
              {W.memberQr}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="card" className="flex flex-col gap-4">
            {stampCard}
            <div className="flex items-center gap-4 rounded-3xl bg-member-soft p-4 text-member-soft-foreground">
              <CircularProgress value={progress.filled} max={needed} size={64} thickness={6}>
                <CircularProgressIndicator>
                  <CircularProgressTrack className="text-member-soft-foreground/15" />
                  <CircularProgressRange className="text-member" />
                </CircularProgressIndicator>
              </CircularProgress>
              <div className="flex min-w-0 flex-col">
                <span className="text-2xl font-extrabold tabular">
                  {calm ? (
                    progress.filled
                  ) : (
                    <Suspense fallback={Math.min(seen ?? progress.filled, progress.filled)}>
                      <NumberTicker
                        value={progress.filled}
                        startValue={Math.min(seen ?? progress.filled, progress.filled)}
                        className="tracking-normal text-member-soft-foreground"
                      />
                    </Suspense>
                  )}
                  <span className="text-base font-semibold"> / {needed}</span>
                </span>
                <span className="text-sm">
                  {ready ? S.ready : W.toGo(progress.left, card.reward.title)}
                </span>
              </div>
            </div>
            {capReached(card.rule, member.history, now) ? (
              <p className="flex items-center gap-2 px-1 text-sm text-muted-foreground">
                <CalendarCheckIcon aria-hidden="true" className="size-4" />
                {S.alreadyEarnedToday}
              </p>
            ) : null}
            <RewardCard slug={slug} kind={kind} card={card} state={state} account={member} />
          </TabsContent>

          <TabsContent value="history">
            <StampHistory history={member.history} />
          </TabsContent>

          <TabsContent value="qr">
            <MemberQr account={member} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
