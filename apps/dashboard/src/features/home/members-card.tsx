import { ChevronRightIcon, GiftIcon, StampIcon } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { homeWords, type HomeMembers } from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import { cn } from 'cn';
import { HomeCard } from './home-card.js';

const W = homeWords.members;

function MemberStat({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex min-w-0 flex-col rounded-lg bg-member-soft px-3 py-2">
      <span className="text-xl font-extrabold text-member-text tabular-nums">{value}</span>
      <span className="text-xs leading-tight text-member-soft-foreground">{label}</span>
    </div>
  );
}

/** Members today (H11): the same numbers as the Members page, in the loyalty mint. */
export function MembersCard({
  members,
  className,
}: {
  members: HomeMembers;
  className?: string | undefined;
}) {
  if (!members.cardOn) {
    return (
      <HomeCard id="members" title={W.title} className={className}>
        <p className="text-sm text-muted-foreground">{W.off}</p>
        <Button
          variant="outline"
          className="h-11 gap-1.5 self-start md:h-9"
          nativeButton={false}
          render={<Link to="/members/stamp-card" />}
        >
          <StampIcon aria-hidden="true" />
          {W.turnOn}
        </Button>
      </HomeCard>
    );
  }
  return (
    <HomeCard
      id="members"
      title={W.title}
      hint={members.memberShare > 0 ? W.share(members.memberShare) : W.plain}
      className={className}
      action={
        <Button
          variant="link"
          className="h-auto px-0 font-semibold"
          nativeButton={false}
          render={<Link to="/members" />}
        >
          {W.open}
        </Button>
      }
    >
      <div className="grid grid-cols-3 gap-2">
        <MemberStat value={members.stamps} label={W.stamps(members.stamps)} />
        <MemberStat value={members.joined} label={W.joined} />
        <MemberStat value={members.rewardsUsed} label={W.rewardsUsed(members.rewardsUsed)} />
      </div>
      {members.ready > 0 ? (
        <Link
          to="/members"
          search={{ filter: 'ready' }}
          className={cn(
            'flex min-h-11 items-center gap-2 rounded-lg border border-member/30 px-3 py-2 text-sm',
            'transition-colors hover:bg-member-soft focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
          )}
        >
          <GiftIcon aria-hidden="true" className="size-4 shrink-0 text-member-text" />
          <span className="min-w-0 flex-1">{W.ready(members.ready)}</span>
          <ChevronRightIcon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
        </Link>
      ) : null}
    </HomeCard>
  );
}
