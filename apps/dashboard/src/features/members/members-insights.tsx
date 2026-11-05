import * as React from 'react';
import { GiftIcon, HandHeartIcon, StampIcon, TrophyIcon, UserPlusIcon } from 'lucide-react';
import {
  formatManila,
  membersWords,
  type MemberActivity,
  type MembersPulse,
  type TopSuki,
} from '@smartapp/core';
import { AnimatedList } from '@smartapp/ui/components/animated-list';
import {
  CircularProgress,
  CircularProgressIndicator,
  CircularProgressRange,
  CircularProgressTrack,
  CircularProgressValueText,
} from '@smartapp/ui/components/circular-progress';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { useReducedMotion } from '@smartapp/ui/hooks/use-reduced-motion';
import { cn } from 'cn';
import { MemberAvatar } from './member-rows.js';
import { daysSince, lastInLabel } from './when.js';

const W = membersWords;
// Recharts loads only when the sales card shows, in the same chunk as Card progress (T57).
const SalesDonut = React.lazy(() => import('./sales-donut.js'));

const CARD = 'flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-xs';

function CardTitle({ id, title, hint }: { id: string; title: string; hint?: string }) {
  return (
    <div>
      <h2 id={id} className="text-sm font-bold">
        {title}
      </h2>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/** Member sales (T63): members against guests over 30 days, as a donut with the share in the middle. */
export function MemberSalesCard({ pulse }: { pulse: MembersPulse }) {
  return (
    <section id="member-sales" aria-labelledby="sales-title" className={cn(CARD, 'scroll-mt-24')}>
      <CardTitle id="sales-title" title={W.sales.title} hint={W.sales.hint} />
      <React.Suspense fallback={<Skeleton className="h-40 w-full rounded-lg" />}>
        <SalesDonut sales={pulse.sales} />
      </React.Suspense>
    </section>
  );
}

/** Stamps this week against last week (T63): last week is the goal, so there is nothing to set up. */
export function WeekRing({ pulse }: { pulse: MembersPulse }) {
  const target = Math.max(pulse.stampsBefore, 1);
  const left = Math.max(0, pulse.stampsBefore - pulse.stamps + 1);
  const beat = pulse.stampsBefore > 0 && pulse.stamps > pulse.stampsBefore;
  return (
    <section aria-labelledby="week-title" className={cn(CARD, 'flex-row items-center gap-4')}>
      <CircularProgress
        value={Math.min(pulse.stamps, target)}
        max={target}
        size={88}
        thickness={8}
        getValueText={() => W.week.aria(pulse.stamps, pulse.stampsBefore)}
        aria-label={W.week.title}
        className="shrink-0"
      >
        <CircularProgressIndicator>
          <CircularProgressTrack className="text-member-soft" />
          <CircularProgressRange className="text-member duration-slow" />
        </CircularProgressIndicator>
        <CircularProgressValueText
          aria-hidden="true"
          className="text-xl font-extrabold text-foreground tabular-nums"
        >
          {pulse.stamps}
        </CircularProgressValueText>
      </CircularProgress>
      <div className="flex min-w-0 flex-col gap-0.5">
        <h2 id="week-title" className="text-sm font-bold">
          {W.week.title}
        </h2>
        <p className="text-sm text-muted-foreground tabular-nums">
          {pulse.stampsBefore > 0 ? W.week.of(pulse.stampsBefore) : W.week.firstWeek}
        </p>
        {pulse.stampsBefore > 0 ? (
          <p
            className={cn('text-sm font-semibold', beat ? 'text-success-text' : 'text-foreground')}
          >
            {W.week.hint(beat ? 0 : left)}
          </p>
        ) : null}
      </div>
    </section>
  );
}

/** Top suki (T63): the five members who came most in the last 30 days. */
export function TopSukiCard({
  top,
  onOpen,
}: {
  top: readonly TopSuki[];
  onOpen: (id: string) => void;
}) {
  return (
    <section aria-labelledby="top-title" className={CARD}>
      <CardTitle id="top-title" title={W.top.title} hint={W.top.hint} />
      {top.length === 0 ? (
        <p className="text-sm text-muted-foreground">{W.top.empty}</p>
      ) : (
        <ol className="flex flex-col">
          {top.map((t, index) => (
            <li key={t.row.id}>
              <button
                type="button"
                onClick={() => onOpen(t.row.id)}
                aria-label={W.openMember(t.row.name)}
                className="flex min-h-11 w-full items-center gap-3 rounded-lg px-1 text-left hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums',
                    index === 0 ? 'bg-warning-soft text-warning-text' : 'text-muted-foreground',
                  )}
                >
                  {index === 0 ? <TrophyIcon className="size-3.5" /> : index + 1}
                </span>
                <MemberAvatar name={t.row.name} member />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">{t.row.name}</span>
                <span className="shrink-0 text-sm text-muted-foreground tabular-nums">
                  {W.top.visits(t.visits)}
                </span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

const ACTIVITY: Record<MemberActivity['kind'], { icon: React.ReactNode; tone: string }> = {
  joined: { icon: <UserPlusIcon />, tone: 'bg-accent text-primary' },
  stamp: { icon: <StampIcon />, tone: 'bg-success-soft text-success-text' },
  reward: { icon: <GiftIcon />, tone: 'bg-member-soft text-member-text' },
  prize: { icon: <HandHeartIcon />, tone: 'bg-member-soft text-member-text' },
};

function activityText(a: MemberActivity): string {
  switch (a.kind) {
    case 'joined':
      return W.activity.joined(a.name);
    case 'stamp':
      return W.activity.stamp(a.name, a.stamps);
    case 'reward':
      return W.activity.reward(a.name);
    case 'prize':
      return W.activity.prize(a.name);
  }
}

function ActivityRow({
  a,
  now,
  onOpen,
}: {
  a: MemberActivity;
  now: Date;
  onOpen: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(a.customerId)}
      aria-label={W.openMember(a.name)}
      className="flex min-h-11 w-full items-center gap-3 rounded-lg bg-muted/60 px-2.5 py-2 text-left hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <span
        aria-hidden="true"
        className={cn(
          'flex size-7 shrink-0 items-center justify-center rounded-full [&_svg]:size-3.5',
          ACTIVITY[a.kind].tone,
        )}
      >
        {ACTIVITY[a.kind].icon}
      </span>
      <span className="line-clamp-2 min-w-0 flex-1 text-sm">{activityText(a)}</span>
      <time dateTime={a.at} className="shrink-0 text-xs text-muted-foreground tabular-nums">
        {daysSince(a.at, now) <= 0 ? formatManila(a.at, 'time') : lastInLabel(a.at, now)}
      </time>
    </button>
  );
}

/**
 * Latest at the counter (T63): joins, stamps and rewards, newest on top. New lines slide in with
 * Magic UI Animated List; under reduced motion the list just shows.
 */
export function ActivityFeed({
  activity,
  now,
  onOpen,
}: {
  activity: readonly MemberActivity[];
  now: Date;
  onOpen: (id: string) => void;
}) {
  const reducedMotion = useReducedMotion();
  // Animated List shows its children one by one and puts the last one on top: oldest first here.
  const oldestFirst = [...activity].reverse();
  return (
    <section aria-labelledby="activity-title" className={CARD}>
      <CardTitle id="activity-title" title={W.activity.title} />
      {activity.length === 0 ? (
        <p className="text-sm text-muted-foreground">{W.activity.empty}</p>
      ) : reducedMotion ? (
        <ul className="flex flex-col gap-1.5">
          {activity.map((a) => (
            <li key={a.id}>
              <ActivityRow a={a} now={now} onOpen={onOpen} />
            </li>
          ))}
        </ul>
      ) : (
        <AnimatedList delay={90} className="items-stretch gap-1.5">
          {oldestFirst.map((a) => (
            <ActivityRow key={a.id} a={a} now={now} onOpen={onOpen} />
          ))}
        </AnimatedList>
      )}
    </section>
  );
}
