import * as React from 'react';
import { Link, useNavigate, useRouteContext } from '@tanstack/react-router';
import {
  BellIcon,
  CircleAlertIcon,
  ClockIcon,
  GiftIcon,
  HardDriveIcon,
  PartyPopperIcon,
  RadioTowerIcon,
  RocketIcon,
  StoreIcon,
  TrendingUpIcon,
  WalletIcon,
  WifiOffIcon,
  WrenchIcon,
} from 'lucide-react';
import {
  adminWords,
  errorWords,
  formatPeso,
  manilaParts,
  monthName,
  type AdminFunnel,
  type AdminNeed,
  type AdminNeedKind,
  type AdminToday,
} from '@smartapp/core';
import { errorCodeOf, useAdminToday, useApproveGoLive, useSendPlanReminder } from '@smartapp/data';
import { Button } from '@smartapp/ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@smartapp/ui/components/card';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from '@smartapp/ui/components/item';
import { Progress } from '@smartapp/ui/components/progress';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import {
  Stat,
  StatDescription,
  StatIndicator,
  StatLabel,
  StatValue,
} from '@smartapp/ui/components/stat';
import { AsyncButton, useAsyncAction } from '@smartapp/ui/compositions/async-button';
import { CountUp } from '@smartapp/ui/compositions/count-up';
import { notify } from '@smartapp/ui/compositions/notify';
import { PageHeader } from '@smartapp/ui/compositions/page-header';
import { cn } from 'cn';
import { dayText } from '@/app/billing-thread';
import { Notice } from '@/app/notice';
import { useNow } from '@/app/orders/use-now';
import { PageEmpty, PageError } from '@/app/page-state';
import { useOnlineStatus } from '@/app/use-online-status';

const A = adminWords;
const T = A.today;

const NEED_LOOK: Record<AdminNeedKind, { icon: React.ReactNode; tone: string }> = {
  payment: { icon: <WalletIcon />, tone: 'bg-warning-soft text-warning-text' },
  go_live: { icon: <RocketIcon />, tone: 'bg-primary/10 text-primary' },
  tracking_failed: { icon: <RadioTowerIcon />, tone: 'bg-destructive/10 text-destructive-text' },
  overdue: { icon: <CircleAlertIcon />, tone: 'bg-destructive/10 text-destructive-text' },
  trial_ending: { icon: <GiftIcon />, tone: 'bg-info-soft text-info-text' },
  due: { icon: <ClockIcon />, tone: 'bg-warning-soft text-warning-text' },
  storage: { icon: <HardDriveIcon />, tone: 'bg-muted text-muted-foreground' },
  stuck: { icon: <WrenchIcon />, tone: 'bg-muted text-muted-foreground' },
};

const failed = (err: unknown) => notify({ title: errorWords(errorCodeOf(err)), tone: 'error' });

function partOfDay(now: Date): string {
  const { hour } = manilaParts(now);
  if (hour < 12) return T.parts.morning;
  if (hour < 18) return T.parts.afternoon;
  return T.parts.evening;
}

/**
 * Super Admin Today (decision T88): what needs the founder first, then the 4 numbers and the 30-day
 * funnel from the sign-up page to a paying shop. Each row has its one next step.
 */
export function AdminTodayScreen() {
  const today = useAdminToday();
  const online = useOnlineStatus();
  const now = useNow(60_000);
  const name = useRouteContext({ from: '/admin' }).claims.fullName?.trim().split(/\s+/)[0] ?? null;

  let body: React.ReactNode;
  if (today.isPending) {
    body = <TodaySkeleton />;
  } else if (today.isError && !today.data) {
    body = (
      <PageError
        title={A.loadError}
        message={errorWords(errorCodeOf(today.error))}
        retryLabel={A.tryAgain}
        onRetry={() => void today.refetch()}
      />
    );
  } else {
    const data = today.data;
    body = (
      <div className="grid gap-3 md:gap-4 lg:grid-cols-5">
        <NeedsCard needs={data.needs} className="min-w-0 lg:col-span-3" />
        <div className="flex min-w-0 flex-col gap-3 md:gap-4 lg:col-span-2">
          <StatsGrid data={data} now={now} />
          <FunnelCard funnel={data.funnel} />
        </div>
      </div>
    );
  }

  const counts = today.data ? countNeeds(today.data.needs) : null;
  return (
    <div className="flex min-h-full flex-col pb-24 md:pb-8">
      <PageHeader title={A.nav.today} />
      <div className="flex flex-col gap-3 px-4 pt-3 md:gap-4 md:px-6 md:pt-4">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="text-lg font-bold tracking-tight text-balance md:text-xl">
            {name ? `${T.hello(partOfDay(now))}, ${name}` : T.hello(partOfDay(now))}
          </h2>
          {counts ? (
            <p className="text-sm text-muted-foreground">
              {T.summary(counts.payments, counts.goLive, counts.other)}
            </p>
          ) : (
            <Skeleton className="h-4 w-56" />
          )}
        </div>
        {!online ? (
          <Notice tone="warning" icon={<WifiOffIcon className="size-4" />}>
            {A.loadError}
          </Notice>
        ) : null}
        {body}
      </div>
    </div>
  );
}

function countNeeds(needs: AdminNeed[]) {
  const payments = needs.filter((n) => n.kind === 'payment').length;
  const goLive = needs.filter((n) => n.kind === 'go_live').length;
  return { payments, goLive, other: needs.length - payments - goLive };
}

// ---------------------------------------------------------------- needs you

function NeedsCard({ needs, className }: { needs: AdminNeed[]; className?: string }) {
  return (
    <Card className={cn('gap-3', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {T.needsYou}
          {needs.length > 0 ? (
            <span className="rounded-full bg-warning-soft px-2 text-xs font-bold text-warning-text tabular-nums">
              {needs.length}
            </span>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {needs.length === 0 ? (
          <PageEmpty
            icon={<PartyPopperIcon className="size-8 text-muted-foreground" />}
            title={T.allClear}
            description={T.allClearLine}
            className="py-8 md:py-10"
          />
        ) : (
          <ItemGroup className="gap-2">
            {needs.map((need) => (
              <NeedRow key={`${need.kind}-${need.shopId ?? 'all'}`} need={need} />
            ))}
          </ItemGroup>
        )}
      </CardContent>
    </Card>
  );
}

function needText(need: AdminNeed): { title: string; line: string } {
  const N = T.need;
  const shop = need.shopName ?? '';
  const until = need.until ? dayText(need.until) : '';
  switch (need.kind) {
    case 'payment':
      return {
        title: N.payment(shop, formatPeso(need.amount ?? 0)),
        line: N.paymentLine(need.months ?? 1),
      };
    case 'go_live':
      return { title: N.go_live(shop), line: N.go_liveLine(need.campaign) };
    case 'trial_ending':
      return { title: N.trial_ending(shop), line: N.trial_endingLine(need.count ?? 0) };
    case 'due':
      return { title: N.due(shop), line: N.dueLine(until) };
    case 'overdue':
      return { title: N.overdue(shop), line: N.overdueLine(need.count ?? 0, until) };
    case 'storage':
      return { title: N.storage(shop), line: N.storageLine(need.count ?? 0) };
    case 'stuck':
      return { title: N.stuck(shop), line: N.stuckLine(need.count ?? 0) };
    case 'tracking_failed':
      return { title: N.tracking_failed, line: N.tracking_failedLine(need.count ?? 0) };
  }
}

function NeedRow({ need }: { need: AdminNeed }) {
  const navigate = useNavigate();
  const approve = useApproveGoLive();
  const remind = useSendPlanReminder();
  const action = useAsyncAction();
  const look = NEED_LOOK[need.kind];
  const text = needText(need);
  const shopId = need.shopId;

  const open = () => {
    if (need.kind === 'tracking_failed') {
      void navigate({ to: '/admin/tracking' });
      return;
    }
    if (!shopId) return;
    void navigate({
      to: '/admin/shops',
      search: { shop: shopId, tab: need.kind === 'payment' ? 'billing' : 'overview' },
    });
  };

  const direct =
    shopId && (need.kind === 'go_live' || need.kind === 'trial_ending' || need.kind === 'due')
      ? async () => {
          try {
            if (need.kind === 'go_live') {
              await action.run(() => approve.mutateAsync({ shopId }));
              notify({ title: A.panel.approved(need.shopName ?? ''), tone: 'success' });
            } else {
              await action.run(() => remind.mutateAsync({ shopId }));
              notify({ title: A.panel.reminded, tone: 'success' });
            }
          } catch (err: unknown) {
            failed(err);
          }
        }
      : null;

  return (
    <Item
      variant="outline"
      className="relative flex-nowrap items-center gap-3 rounded-xl bg-card px-3 py-2.5 focus-within:ring-2 focus-within:ring-ring"
    >
      <ItemMedia
        variant="icon"
        className={cn('size-10 shrink-0 rounded-lg border-0 [&_svg]:size-5', look.tone)}
        aria-hidden="true"
      >
        {look.icon}
      </ItemMedia>
      <ItemContent className="min-w-0">
        <ItemTitle className="w-full">
          <button
            type="button"
            onClick={open}
            className="line-clamp-2 min-w-0 text-left font-semibold after:absolute after:inset-0 focus-visible:outline-none"
          >
            {text.title}
          </button>
        </ItemTitle>
        <ItemDescription className="line-clamp-2">{text.line}</ItemDescription>
      </ItemContent>
      <ItemActions className="relative z-10 shrink-0">
        {direct ? (
          <AsyncButton
            status={action.status}
            busyLabel={need.kind === 'go_live' ? A.panel.approving : A.today.action[need.kind]}
            doneLabel={need.kind === 'go_live' ? A.shops.stage.live : A.panel.remind}
            variant={need.kind === 'go_live' ? 'default' : 'outline'}
            className="h-11 gap-1.5 md:h-9"
            onClick={() => void direct()}
          >
            {need.kind === 'go_live' ? (
              <RocketIcon aria-hidden="true" />
            ) : (
              <BellIcon aria-hidden="true" />
            )}
            {A.today.action[need.kind]}
          </AsyncButton>
        ) : (
          <Button
            variant={need.kind === 'payment' ? 'default' : 'outline'}
            className="h-11 md:h-9"
            onClick={open}
          >
            {A.today.action[need.kind]}
          </Button>
        )}
      </ItemActions>
    </Item>
  );
}

// ---------------------------------------------------------------- numbers

function StatsGrid({ data, now }: { data: AdminToday; now: Date }) {
  const cards = [
    {
      label: T.stats.live,
      icon: <StoreIcon />,
      tone: 'bg-primary/10 text-primary',
      value: <CountUp value={data.liveShops} />,
      note: null,
      to: '/admin/shops' as const,
    },
    {
      label: T.stats.paying,
      icon: <WalletIcon />,
      tone: 'bg-success-soft text-success-text',
      value: <CountUp value={data.payingShops} />,
      note: null,
      to: '/admin/shops' as const,
    },
    {
      label: T.stats.collected(monthName(now)),
      icon: <PartyPopperIcon />,
      tone: 'bg-member-soft text-member-text',
      value: formatPeso(data.collectedThisMonth),
      note: null,
      to: '/admin/payments' as const,
    },
    {
      label: T.stats.runRate,
      icon: <TrendingUpIcon />,
      tone: 'bg-info-soft text-info-text',
      value: formatPeso(data.monthlyRunRate),
      note: T.stats.runRateHint,
      to: '/admin/payments' as const,
    },
  ];
  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map((card) => (
        <Link
          key={card.label}
          to={card.to}
          className="group min-w-0 rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <Stat className="h-full gap-y-0.5 rounded-xl p-3 shadow-xs transition duration-base group-hover:-translate-y-0.5 group-hover:shadow-md motion-reduce:transition-none motion-reduce:group-hover:translate-y-0 md:p-4">
            <StatLabel className="text-xs leading-snug text-balance md:text-sm">
              {card.label}
            </StatLabel>
            <StatIndicator
              variant="icon"
              aria-hidden="true"
              className={cn('size-8 rounded-lg border-0 md:size-9', card.tone)}
            >
              {card.icon}
            </StatIndicator>
            <StatValue className="truncate text-xl font-extrabold tabular-nums md:text-2xl">
              {card.value}
            </StatValue>
            {card.note ? <StatDescription className="text-xs">{card.note}</StatDescription> : null}
          </Stat>
        </Link>
      ))}
    </div>
  );
}

const FUNNEL_STEPS = ['visits', 'leads', 'signedUp', 'live', 'paying'] as const;

function FunnelCard({ funnel }: { funnel: AdminFunnel }) {
  const top = Math.max(1, funnel.visits);
  return (
    <Card className="gap-3">
      <CardHeader>
        <CardTitle>{T.funnel}</CardTitle>
        <CardDescription>{T.funnelHint}</CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="flex flex-col gap-2.5">
          {FUNNEL_STEPS.map((step, i) => {
            const value = funnel[step];
            const before = i > 0 ? funnel[FUNNEL_STEPS[i - 1] ?? 'visits'] : 0;
            const pct = i > 0 && before > 0 ? Math.round((value / before) * 100) : null;
            return (
              <li key={step} className="flex flex-col gap-1">
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="font-medium">{T.funnelSteps[step]}</span>
                  <span className="flex items-baseline gap-2 tabular-nums">
                    {pct !== null ? (
                      <span className="text-xs text-muted-foreground">{pct}%</span>
                    ) : null}
                    <span className="font-bold">{value.toLocaleString('en-PH')}</span>
                  </span>
                </div>
                <Progress
                  value={Math.round((value / top) * 100)}
                  aria-label={`${T.funnelSteps[step]} ${value}`}
                  className="h-2"
                />
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}

function TodaySkeleton() {
  return (
    <div className="grid gap-3 md:gap-4 lg:grid-cols-5" aria-busy="true" aria-hidden="true">
      <div className="flex flex-col gap-2 rounded-xl border bg-card p-4 lg:col-span-3">
        <Skeleton className="h-5 w-28" />
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
      <div className="flex flex-col gap-3 lg:col-span-2">
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  );
}
