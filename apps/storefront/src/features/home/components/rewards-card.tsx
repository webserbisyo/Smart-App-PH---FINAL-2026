'use client';

import Link from 'next/link';
import { words, type PublicStampCard } from '@smartapp/core';
import { useMyAccount } from '@smartapp/data';
import { Card, CardContent } from '@smartapp/ui/components/card';
import { CircularProgressCombined } from '@smartapp/ui/components/circular-progress';
import { ClientOnly } from '@smartapp/ui/components/client-only';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { AwardIcon, ChevronRightIcon, SparklesIcon } from 'lucide-react';

export interface RewardsCardProps {
  slug: string;
  stampCard: PublicStampCard;
}

function RewardsCardContent({ slug, stampCard }: RewardsCardProps) {
  const { status, rule, reward } = stampCard;
  const account = useMyAccount(slug).data;

  if (status === 'off') return null;

  const isPaused = status === 'paused';
  const isMember = Boolean(account);
  const isRewardReady = Boolean(account?.rewardReady);
  const currentStamps = account?.balance ?? 0;
  const stampsNeeded = rule.stampsNeeded;
  const remaining = Math.max(0, stampsNeeded - currentStamps);

  let title: string;
  let description: string;
  let linkText: string = words.storefrontShell.home.rewards.viewRewards;

  if (isPaused) {
    title = words.storefrontShell.home.rewards.paused;
    description = reward.title;
  } else if (isRewardReady) {
    title = words.storefrontShell.home.rewards.ready;
    description = reward.title;
    linkText = 'Claim reward';
  } else if (isMember) {
    title = words.storefrontShell.home.rewards.progress(
      currentStamps,
      stampsNeeded,
      words.storefrontShell.home.rewards.toGo(remaining, reward.title),
    );
    description = reward.description ?? reward.title;
  } else {
    // Guest
    title =
      rule.welcomeStamps > 0
        ? words.storefrontShell.home.rewards.joinPrompt
        : `Collect ${stampsNeeded} stamps for ${reward.title}`;
    description = reward.title;
    linkText = words.storefrontShell.join;
  }

  return (
    <Card className="w-full border-border bg-card">
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between">
          {isMember && !isPaused ? (
            <div className="relative">
              <CircularProgressCombined
                value={isRewardReady ? stampsNeeded : currentStamps}
                max={stampsNeeded}
                size={44}
                thickness={4}
                className="size-11 text-primary"
              />
            </div>
          ) : (
            <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {isPaused ? (
                <AwardIcon aria-hidden="true" className="size-6" />
              ) : (
                <SparklesIcon aria-hidden="true" className="size-6" />
              )}
            </div>
          )}
          {isRewardReady ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-highlight/15 px-2.5 py-0.5 text-xs font-semibold text-highlight">
              <SparklesIcon className="size-3" aria-hidden="true" />
              Ready
            </span>
          ) : null}
        </div>

        <div>
          <Link
            href={`/${slug}/rewards`}
            className={`block text-base leading-snug font-semibold text-foreground hover:text-primary ${
              isRewardReady ? 'text-highlight' : ''
            }`}
          >
            {title}
          </Link>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>

        <Link
          href={`/${slug}/rewards`}
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          <span>{linkText}</span>
          <ChevronRightIcon aria-hidden="true" className="size-3 shrink-0" />
        </Link>
      </CardContent>
    </Card>
  );
}

function RewardsCardSkeleton() {
  return (
    <Card className="w-full border-border bg-card">
      <CardContent className="flex flex-col gap-3 p-4">
        <Skeleton className="size-11 rounded-lg" />
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-20" />
      </CardContent>
    </Card>
  );
}

export function RewardsCard(props: RewardsCardProps) {
  return (
    <ClientOnly fallback={<RewardsCardSkeleton />}>
      <RewardsCardContent {...props} />
    </ClientOnly>
  );
}
