import * as React from 'react';
import { Link } from '@tanstack/react-router';
import {
  BellIcon,
  GiftIcon,
  MegaphoneIcon,
  SendIcon,
  StampIcon,
  WifiOffIcon,
  type LucideIcon,
} from 'lucide-react';
import {
  NEWS_WEEK_LIMIT,
  errorWords,
  formatManila,
  formatPeso,
  membersWords,
  newsWords,
  words,
  type NewsOverview,
  type OwnerNews,
} from '@smartapp/core';
import { errorCodeOf, useNewsOverview, useSavePushSettings, useStampCard } from '@smartapp/data';
import { Button } from '@smartapp/ui/components/button';
import { Progress } from '@smartapp/ui/components/progress';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { Switch } from '@smartapp/ui/components/switch';
import { ToggleGroup, ToggleGroupItem } from '@smartapp/ui/components/toggle-group';
import { notify } from '@smartapp/ui/compositions/notify';
import { PageHeader } from '@smartapp/ui/compositions/page-header';
import { env } from '@/app/env';
import { Notice } from '@/app/notice';
import { PageEmpty, PageError } from '@/app/page-state';
import { useShop } from '@/app/shop';
import { useOnlineStatus } from '@/app/use-online-status';
import { NewsRow } from '../news-bits.js';
import { useMembersTabs } from '../tabs.js';

const W = newsWords;
const FILTERS = ['all', 'scheduled', 'sent', 'draft'] as const;
type Filter = (typeof FILTERS)[number];
const CHIP =
  'h-10 gap-1.5 rounded-full border border-border bg-card px-3 text-sm font-semibold text-muted-foreground aria-pressed:border-primary aria-pressed:bg-accent aria-pressed:text-foreground md:h-8';

function inFilter(news: OwnerNews, filter: Filter): boolean {
  if (filter === 'all') return true;
  if (filter === 'scheduled')
    return news.status === 'scheduled' || news.status === 'waiting' || news.status === 'sending';
  if (filter === 'draft') return news.status === 'draft' || news.status === 'canceled';
  return news.status === 'sent';
}

/**
 * Members › News (decision T106): phones that get news, this week's limit, the two automatic pushes and
 * every news with its status and results. Write news opens the full-page composer.
 */
export function NewsScreen() {
  const tabs = useMembersTabs();
  const online = useOnlineStatus();
  const overview = useNewsOverview();
  const data = overview.data;

  let body: React.ReactNode;
  if (overview.isPending) body = <NewsSkeleton />;
  else if (overview.isError || !data)
    body = (
      <PageError
        title={W.empty.errorTitle}
        message={errorWords(errorCodeOf(overview.error))}
        retryLabel={membersWords.states.tryAgain}
        onRetry={() => void overview.refetch()}
      />
    );
  else body = <NewsBody data={data} online={online} />;

  return (
    <div className="flex min-h-full flex-col pb-24 md:pb-8">
      <PageHeader title={words.screens.members.title} tabs={tabs} />
      <main className="flex-1 px-4 pt-3 md:px-6 md:pt-4">
        {!online ? (
          <Notice tone="warning" icon={<WifiOffIcon className="size-4" />} className="mb-3">
            {membersWords.states.offline}
          </Notice>
        ) : null}
        {body}
      </main>
    </div>
  );
}

function NewsBody({ data, online }: { data: NewsOverview; online: boolean }) {
  const shop = useShop();
  const [filter, setFilter] = React.useState<Filter>('all');
  const shown = data.news.filter((n) => inFilter(n, filter));
  const left = Math.max(0, NEWS_WEEK_LIMIT - data.weekUsed);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="text-lg font-bold text-balance md:text-xl">{W.title}</h2>
          <p className="text-sm text-muted-foreground">{W.line(data.phones, data.memberPhones)}</p>
        </div>
        <Button
          className="h-11 gap-1.5 md:h-9"
          nativeButton={false}
          render={<Link to="/members/news/new" />}
        >
          <SendIcon aria-hidden="true" />
          {W.write}
        </Button>
      </div>

      {data.phones === 0 ? (
        <PageEmpty
          variant="box"
          icon={<BellIcon className="size-8 text-muted-foreground" />}
          title={W.empty.noPhonesTitle}
          description={W.empty.noPhonesBody}
          action={
            <Button
              variant="outline"
              className="h-11 md:h-9"
              nativeButton={false}
              render={
                <a
                  href={`${env.VITE_STOREFRONT_URL}/${shop.slug}`}
                  target="_blank"
                  rel="noreferrer"
                />
              }
            >
              {W.empty.noPhonesAction}
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <StatCard label={W.stats.phones} value={data.phones.toLocaleString('en-PH')}>
            {W.stats.phonesLine(data.memberPhones, data.guestPhones, data.newThisWeek)}
          </StatCard>
          <StatCard label={W.stats.week} value={W.stats.weekLeft(left, NEWS_WEEK_LIMIT)}>
            <Progress
              value={(100 * data.weekUsed) / NEWS_WEEK_LIMIT}
              aria-label={W.stats.weekLeft(left, NEWS_WEEK_LIMIT)}
              className="mt-1"
            />
            <span className="mt-1.5 block">
              {data.nextFreeAt ? W.stats.weekFree(formatManila(data.nextFreeAt)) : W.stats.weekOk}
            </span>
          </StatCard>
          <StatCard
            label={W.stats.last30}
            value={W.stats.last30Value(data.last30.ordered, formatPeso(data.last30.sales))}
            className="col-span-2 lg:col-span-1"
          >
            {W.stats.last30Line(data.last30.news)}
          </StatCard>
        </div>
      )}

      <AutomaticRows data={data} online={online} />

      <section className="flex flex-col gap-2" aria-labelledby="news-list-heading">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 id="news-list-heading" className="text-sm font-semibold text-muted-foreground">
            {W.list.heading}
          </h3>
          {data.news.length > 0 ? (
            <ToggleGroup
              value={[filter]}
              onValueChange={(next) => {
                const picked = FILTERS.find((f) => f === next[0]);
                if (picked) setFilter(picked);
              }}
              aria-label={W.list.filtersLabel}
              spacing={1.5}
              className="flex-wrap"
            >
              {FILTERS.map((f) => (
                <ToggleGroupItem key={f} value={f} className={CHIP}>
                  {W.list.filters[f]}
                  <span className="tabular-nums">
                    {data.news.filter((n) => inFilter(n, f)).length}
                  </span>
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          ) : null}
        </div>
        {data.news.length === 0 ? (
          <PageEmpty
            variant="box"
            icon={<MegaphoneIcon className="size-8 text-muted-foreground" />}
            title={W.empty.noNewsTitle}
            description={W.empty.noNewsBody}
            action={
              <Button
                className="h-11 gap-1.5 md:h-9"
                nativeButton={false}
                render={<Link to="/members/news/new" />}
              >
                <SendIcon aria-hidden="true" />
                {W.write}
              </Button>
            }
          />
        ) : shown.length === 0 ? (
          <p className="rounded-xl border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
            {W.list.empty}
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-xl border bg-card">
            {shown.map((n) => (
              <NewsRow key={n.id} news={n} />
            ))}
          </ul>
        )}
      </section>
      <p className="text-xs text-muted-foreground">{W.limits}</p>
    </div>
  );
}

function StatCard({
  label,
  value,
  children,
  className,
}: {
  label: string;
  value: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`flex min-w-0 flex-col gap-0.5 rounded-xl border bg-card p-4 ${className ?? ''}`}
    >
      <h3 className="text-xs font-semibold text-muted-foreground">{label}</h3>
      <p className="text-xl font-bold tabular-nums">{value}</p>
      <div className="text-xs text-muted-foreground">{children}</div>
    </section>
  );
}

function AutomaticRows({ data, online }: { data: NewsOverview; online: boolean }) {
  const card = useStampCard().data;
  const save = useSavePushSettings();
  const goal = card?.rule.stampsNeeded ?? 8;
  const reward = card?.reward.title ?? membersWords.tabs.prizes;

  const toggle = (key: 'stampAdded' | 'rewardReady', on: boolean) => {
    save.mutate(
      { ...data.auto, [key]: on },
      {
        onSuccess: () => notify({ title: on ? W.auto.on : W.auto.off, tone: 'success' }),
        onError: (err) => notify({ title: errorWords(errorCodeOf(err)), tone: 'error' }),
      },
    );
  };

  const rows: {
    key: 'stampAdded' | 'rewardReady';
    icon: LucideIcon;
    title: string;
    line: string;
  }[] = [
    {
      key: 'stampAdded',
      icon: StampIcon,
      title: W.auto.stampAdded,
      line: W.auto.stampAddedSample(Math.max(1, goal - 1), goal),
    },
    {
      key: 'rewardReady',
      icon: GiftIcon,
      title: W.auto.rewardReady,
      line: W.auto.rewardReadySample(reward),
    },
  ];

  return (
    <section className="flex flex-col gap-2" aria-labelledby="news-auto-heading">
      <div className="flex flex-col gap-0.5">
        <h3 id="news-auto-heading" className="text-sm font-semibold text-muted-foreground">
          {W.auto.heading}
        </h3>
        <p className="text-xs text-muted-foreground">{W.auto.line}</p>
      </div>
      <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-xl border bg-card">
        {rows.map((row) => {
          const Icon = row.icon;
          const id = `news-auto-${row.key}`;
          return (
            <li key={row.key} className="flex min-h-16 items-center gap-3 px-4 py-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-member-soft text-member-soft-foreground">
                <Icon aria-hidden="true" className="size-4.5" />
              </span>
              <label htmlFor={id} className="flex min-w-0 flex-1 flex-col">
                <span className="font-semibold">{row.title}</span>
                <span className="text-sm text-muted-foreground">{row.line}</span>
              </label>
              <Switch
                id={id}
                checked={data.auto[row.key]}
                disabled={!online || save.isPending}
                onCheckedChange={(on) => toggle(row.key, on)}
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function NewsSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-hidden="true">
      <Skeleton className="h-12 w-2/3 rounded-xl" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="col-span-2 h-24 rounded-xl lg:col-span-1" />
      </div>
      <Skeleton className="h-36 rounded-xl" />
      <Skeleton className="h-56 rounded-xl" />
    </div>
  );
}
