import { GiftIcon, StarIcon, UsersIcon, WalletIcon } from 'lucide-react';
import {
  formatPeso,
  manilaParts,
  membersWords,
  percentChange,
  sharePercent,
  type CustomerFilter,
  type MembersOverview,
} from '@smartapp/core';
import { Badge } from '@smartapp/ui/components/reui/badge';
import { Scroller } from '@smartapp/ui/components/scroller';
import {
  Stat,
  StatDescription,
  StatIndicator,
  StatLabel,
  StatValue,
} from '@smartapp/ui/components/stat';
import { CountUp } from '@smartapp/ui/compositions/count-up';
import { cn } from 'cn';

const W = membersWords;

export type StatPick = CustomerFilter | 'sales';

/** The greeting and one story line above the number cards (T61). */
export function MembersHello({
  view,
  name,
  now,
  smallCard,
  compact = false,
}: {
  view: MembersOverview;
  name: string | null;
  now: Date;
  smallCard: boolean;
  // Phone: only the first sentence, so the list starts higher up.
  compact?: boolean;
}) {
  const { sales, salesBefore } = view.pulse;
  const near = view.counts.almost ?? 0;
  const ready = view.counts.ready ?? 0;
  const lines =
    view.members === 0
      ? [W.hello.quietStart]
      : [
          ready > 0 ? W.hello.ready(ready) : W.hello.near(near, smallCard),
          sales.members > 0
            ? W.hello.sales(
                formatPeso(sales.members),
                percentChange(sales.members, salesBefore.members),
              )
            : '',
        ].filter(Boolean);
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <h2 className="text-lg font-bold tracking-tight md:text-xl">
        {W.hello.greeting(manilaParts(now).hour, name)}
      </h2>
      <p className="text-sm text-muted-foreground">{compact ? lines[0] : lines.join(' ')}</p>
    </div>
  );
}

interface CardProps {
  label: string;
  icon: React.ReactNode;
  tone: string;
  value: React.ReactNode;
  note: React.ReactNode;
  pressed?: boolean | undefined;
  onClick: () => void;
  aria: string;
}

function StatCard({ label, icon, tone, value, note, pressed, onClick, aria }: CardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      aria-label={aria}
      className="group min-w-0 rounded-xl text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <Stat
        className={cn(
          'h-full gap-y-0.5 rounded-xl p-3 shadow-xs transition duration-base group-hover:-translate-y-0.5 group-hover:shadow-md motion-reduce:transition-none motion-reduce:group-hover:translate-y-0 md:p-4',
          pressed && 'border-primary ring-1 ring-primary',
        )}
      >
        <StatLabel className="truncate text-xs md:text-sm">{label}</StatLabel>
        <StatIndicator
          variant="icon"
          aria-hidden="true"
          className={cn('size-8 rounded-lg border-0 md:size-9', tone)}
        >
          {icon}
        </StatIndicator>
        <StatValue className="text-2xl font-extrabold tabular-nums md:text-3xl">{value}</StatValue>
        <StatDescription className="flex min-w-0 flex-wrap items-center gap-1.5">
          {note}
        </StatDescription>
      </Stat>
    </button>
  );
}

function Change({ value }: { value: number | null }) {
  if (value === null || value === 0) return null;
  return (
    <Badge
      variant={value > 0 ? 'success-light' : 'secondary'}
      radius="full"
      aria-label={W.stats.changeAria(value)}
      className="tabular-nums"
    >
      {W.stats.change(value)}
    </Badge>
  );
}

/**
 * Members at a glance (T61): four number cards that count up. Tapping Ready or Almost opens that group,
 * Members shows everyone, and Member sales scrolls to the sales card.
 */
export function MembersStats({
  view,
  filter,
  smallCard,
  onPick,
  row = false,
}: {
  view: MembersOverview;
  filter: CustomerFilter;
  smallCard: boolean;
  onPick: (pick: StatPick) => void;
  // Phone: one swipeable row instead of a 2 × 2 grid, so the list starts higher up.
  row?: boolean;
}) {
  const { pulse } = view;
  const ready = view.counts.ready ?? 0;
  const almost = view.counts.almost ?? 0;
  const total = pulse.sales.members + pulse.sales.guests;
  const pesos = Math.round(pulse.sales.members / 100);
  return (
    <Wrap row={row}>
      <StatCard
        label={W.stats.members}
        aria={W.stats.open(W.stats.members)}
        icon={<UsersIcon />}
        tone="bg-accent text-primary"
        value={<CountUp value={view.members} />}
        note={
          <>
            <Change value={percentChange(pulse.joined, pulse.joinedBefore)} />
            <span className="truncate">{W.stats.joined(pulse.joined)}</span>
          </>
        }
        onClick={() => onPick('all')}
      />
      <StatCard
        label={W.stats.ready}
        aria={W.stats.open(W.stats.ready)}
        icon={<GiftIcon />}
        tone="bg-member-soft text-member-text"
        value={<CountUp value={ready} />}
        note={<span className="truncate">{W.stats.readyNote(ready)}</span>}
        pressed={filter === 'ready'}
        onClick={() => onPick(filter === 'ready' ? 'all' : 'ready')}
      />
      <StatCard
        label={W.stats.almost}
        aria={W.stats.open(W.stats.almost)}
        icon={<StarIcon />}
        tone="bg-warning-soft text-warning-text"
        value={<CountUp value={almost} />}
        note={<span className="truncate">{W.stats.almostNote(smallCard)}</span>}
        pressed={filter === 'almost'}
        onClick={() => onPick(filter === 'almost' ? 'all' : 'almost')}
      />
      <StatCard
        label={W.stats.sales}
        aria={W.stats.openSales}
        icon={<WalletIcon />}
        tone="bg-info-soft text-info-text"
        value={
          <span>
            {W.stats.pesoSign}
            <CountUp value={pesos} />
          </span>
        }
        note={
          <>
            <Change value={percentChange(pulse.sales.members, pulse.salesBefore.members)} />
            <span className="truncate">
              {W.stats.salesNote(sharePercent(pulse.sales.members, total))}
            </span>
          </>
        }
        onClick={() => onPick('sales')}
      />
    </Wrap>
  );
}

function Wrap({ row, children }: { row: boolean; children: React.ReactNode }) {
  if (!row) {
    return (
      <section
        aria-label={W.stats.label}
        className="grid grid-cols-2 gap-2 md:gap-3 lg:grid-cols-4"
      >
        {children}
      </section>
    );
  }
  return (
    <section aria-label={W.stats.label}>
      <Scroller orientation="horizontal" hideScrollbar className="-mx-4 px-4">
        <div className="flex w-max gap-2 pb-1 *:w-44">{children}</div>
      </Scroller>
    </section>
  );
}
