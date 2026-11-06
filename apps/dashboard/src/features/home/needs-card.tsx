import * as React from 'react';
import {
  AlarmClockIcon,
  BellRingIcon,
  CakeSliceIcon,
  ChevronRightIcon,
  CreditCardIcon,
  FileCheckIcon,
  GiftIcon,
  HardDriveIcon,
  HourglassIcon,
  PackageXIcon,
  type LucideIcon,
} from 'lucide-react';
import { Link } from '@tanstack/react-router';
import {
  formatClock,
  formatPeso,
  homeWords,
  ticketTime,
  words,
  type BoardOrder,
  type HomeNeed,
  type HomeNeedKind,
  type HomeSoldOut,
} from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import { IconTile } from '@smartapp/ui/components/reui/icon-tile';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@smartapp/ui/components/item';
import { cn } from 'cn';
import { HomeCard } from './home-card.js';

const W = homeWords.needs;

const LOOK: Readonly<Record<HomeNeedKind, { icon: LucideIcon; tone: string }>> = {
  to_check: { icon: FileCheckIcon, tone: 'text-warning' },
  late: { icon: AlarmClockIcon, tone: 'text-destructive' },
  unseen: { icon: BellRingIcon, tone: 'text-stage-new' },
  waiting: { icon: HourglassIcon, tone: 'text-stage-ready' },
  prizes: { icon: GiftIcon, tone: 'text-member' },
  sold_out: { icon: PackageXIcon, tone: 'text-muted-foreground' },
  bookings: { icon: CakeSliceIcon, tone: 'text-stage-preparing' },
  plan: { icon: CreditCardIcon, tone: 'text-warning' },
  storage: { icon: HardDriveIcon, tone: 'text-warning' },
};

function NeedLink({
  need,
  ...props
}: { need: HomeNeed } & Pick<React.ComponentProps<'a'>, 'className' | 'children'>) {
  if (need.orderId) return <Link {...props} to="/orders" search={{ order: need.orderId }} />;
  switch (need.kind) {
    case 'to_check':
      return <Link {...props} to="/orders" search={{ filter: 'to_check' }} />;
    case 'late':
      return <Link {...props} to="/orders" />;
    case 'unseen':
      return <Link {...props} to="/orders" search={{ stage: 'new' }} />;
    case 'waiting':
      return <Link {...props} to="/orders" search={{ stage: 'ready' }} />;
    case 'prizes':
      return <Link {...props} to="/members/claims" />;
    case 'sold_out':
      return <Link {...props} to="/catalog" search={{ filter: 'sold_out' }} />;
    case 'bookings':
      return <Link {...props} to="/orders" search={{ view: 'list', day: 'upcoming' }} />;
    case 'plan':
      return <Link {...props} to="/settings/plan" />;
    case 'storage':
      return <Link {...props} to="/settings/storage" />;
  }
}

const NAMES_SHOWN = 2;

function names(list: readonly string[]): string {
  return W.more(list.slice(0, NAMES_SHOWN).join(', '), Math.max(0, list.length - NAMES_SHOWN));
}

function detail(
  need: HomeNeed,
  orders: ReadonlyMap<string, BoardOrder>,
  soldOut: readonly HomeSoldOut[],
  storagePercent: number,
  now: Date,
): string {
  const list = need.orderIds.flatMap((id) => {
    const o = orders.get(id);
    return o ? [o] : [];
  });
  const one = list.length === 1 ? list[0] : undefined;
  switch (need.kind) {
    case 'to_check':
      return one
        ? W.checkOne(
            one.customerName,
            words.shop.paymentMethod[one.paymentMethod],
            formatPeso(one.total),
          )
        : names(list.map((o) => o.customerName));
    case 'late':
      return one
        ? W.wasDue(one.customerName, formatClock(one.dueAt))
        : names(list.map((o) => o.customerName));
    case 'unseen':
      return names(list.map((o) => o.customerName));
    case 'waiting':
      return one
        ? W.readyFor(one.customerName, ticketTime(one, now).minutes)
        : names(list.map((o) => o.customerName));
    case 'prizes':
      return W.prizes;
    case 'sold_out':
      return names(soldOut.map((s) => s.name));
    case 'bookings':
      return W.bookings;
    case 'plan':
      return W.plan;
    case 'storage':
      return W.storage(storagePercent);
  }
}

/** Needs you (H8): worst first, up to 4 rows, then "Show N more". The card is left out at 0. */
export function NeedsCard({
  needs,
  live,
  soldOut,
  storagePercent,
  now,
  shown = 4,
  className,
}: {
  needs: readonly HomeNeed[];
  live: readonly BoardOrder[];
  soldOut: readonly HomeSoldOut[];
  storagePercent: number;
  now: Date;
  shown?: number;
  className?: string | undefined;
}) {
  const [all, setAll] = React.useState(false);
  const orders = React.useMemo(() => new Map(live.map((o) => [o.id, o])), [live]);
  const rows = all ? needs : needs.slice(0, shown);
  const hidden = needs.length - rows.length;
  return (
    <HomeCard id="needs" title={W.title} hint={W.hint} className={className}>
      <ul className="flex flex-col gap-2">
        {rows.map((need) => {
          const look = LOOK[need.kind];
          const Icon = look.icon;
          return (
            <li key={need.kind}>
              <Item variant="outline" className="min-h-14" render={<NeedLink need={need} />}>
                <ItemMedia>
                  <IconTile variant="soft" size="sm" className={look.tone}>
                    <Icon aria-hidden="true" />
                  </IconTile>
                </ItemMedia>
                <ItemContent className="min-w-0">
                  <ItemTitle className="font-semibold">{W.rows[need.kind](need.count)}</ItemTitle>
                  <ItemDescription className="truncate">
                    {detail(need, orders, soldOut, storagePercent, now)}
                  </ItemDescription>
                </ItemContent>
                <ItemActions>
                  <ChevronRightIcon className="size-4 text-muted-foreground" aria-hidden="true" />
                </ItemActions>
              </Item>
            </li>
          );
        })}
      </ul>
      {needs.length > shown ? (
        <Button
          variant="ghost"
          className={cn('h-11 self-center text-primary md:h-9')}
          onClick={() => setAll((v) => !v)}
        >
          {all ? W.showLess : W.showMore(hidden)}
        </Button>
      ) : null}
    </HomeCard>
  );
}
