import * as React from 'react';
import {
  CirclePauseIcon,
  CircleCheckIcon,
  CircleOffIcon,
  ChevronDownIcon,
  FilterXIcon,
  PauseCircleIcon,
  StampIcon,
  WifiOffIcon,
  XIcon,
} from 'lucide-react';
import {
  CUSTOMER_FILTERS,
  errorWords,
  membersWords,
  MEMBER_SORTS,
  words,
  type CustomerFilter,
  type CustomerRow,
  type MemberSort,
} from '@smartapp/core';
import {
  errorCodeOf,
  useCustomerPages,
  useMembersOverview,
  useSetStampCardStatus,
  useStampCard,
  useStorefront,
} from '@smartapp/data';
import { Button } from '@smartapp/ui/components/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@smartapp/ui/components/collapsible';
import { Badge } from '@smartapp/ui/components/reui/badge';
import { Scroller } from '@smartapp/ui/components/scroller';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@smartapp/ui/components/select';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@smartapp/ui/components/toggle-group';
import { notify } from '@smartapp/ui/compositions/notify';
import { PageHeader } from '@smartapp/ui/compositions/page-header';
import { useFormFactor } from '@smartapp/ui/hooks/use-form-factor';
import { useReducedMotion } from '@smartapp/ui/hooks/use-reduced-motion';
import { cn } from 'cn';
import { Notice } from '@/app/notice';
import { useNow } from '@/app/orders/use-now';
import { PageEmpty, PageError } from '@/app/page-state';
import { SearchField } from '@/app/search-field';
import { useShop } from '@/app/shop';
import { storefrontUrl } from '@/app/use-nav-items';
import { useOnlineStatus } from '@/app/use-online-status';
import { MemberPanel } from '../member-panel.js';
import { MembersGrid, PhoneRows } from '../member-rows.js';
import { ActivityFeed, MemberSalesCard, TopSukiCard, WeekRing } from '../members-insights.js';
import { MembersStart, MilestoneNotice } from '../members-start.js';
import { MembersHello, MembersStats, type StatPick } from '../members-stats.js';
import { NearList } from '../near-list.js';
import { RecentStampDialog } from '../recent-stamp-dialog.js';
import { useMembersSearch, useSetMembersSearch } from '../search.js';
import { useMembersTabs } from '../tabs.js';
import { useCounterActions } from '../use-counter-actions.js';

const W = membersWords;
// Recharts loads only when the chart shows (T57).
const ProgressChart = React.lazy(() => import('../progress-chart.js'));
const PAGE = 30;
const CHIP =
  'h-10 gap-1.5 rounded-full border border-border bg-card px-3 text-sm font-semibold text-muted-foreground aria-pressed:border-primary aria-pressed:bg-accent aria-pressed:text-foreground md:h-10';

/**
 * Members (decision T57): one list with group chips, the "1 or 2 stamps away" list, and the member panel
 * with the one-tap stamp. Group, search, sort and the open member live in the address.
 */
export function MembersScreen() {
  const shop = useShop();
  const search = useMembersSearch();
  const setSearch = useSetMembersSearch();
  const isPhone = useFormFactor() === 'phone';
  const online = useOnlineStatus();
  const now = useNow(30_000);
  const tabs = useMembersTabs();
  const reducedMotion = useReducedMotion();
  // Phone: Card progress and the sales cards fold away so the list starts near the top (T61).
  const [insightsOpen, setInsightsOpen] = React.useState(false);

  const filter: CustomerFilter = search.filter ?? 'all';
  const sort: MemberSort = search.sort ?? 'last_order';
  const q = search.q ?? '';
  const stamps = search.stamps ?? null;

  const overview = useMembersOverview();
  const cardQuery = useStampCard();
  const storefront = useStorefront(shop.slug);
  const pages = useCustomerPages({ filter, q, stamps, sort, limit: PAGE });
  const setStatus = useSetStampCardStatus();
  const counter = useCounterActions();

  const card = cardQuery.data;
  const view = overview.data;
  const status = view?.cardStatus ?? card?.status ?? 'on';
  const goal = view?.goal ?? card?.rule.stampsNeeded ?? 10;
  const smallCard = goal <= 5;
  const rows = React.useMemo(() => pages.data?.pages.flatMap((p) => p.rows) ?? [], [pages.data]);
  const total = pages.data?.pages[0]?.total ?? 0;

  // The panel opens at once from the row the owner tapped; the full member fills in behind it.
  const [clicked, setClicked] = React.useState<CustomerRow | undefined>(undefined);
  const seed =
    rows.find((r) => r.id === search.member) ??
    view?.near.find((r) => r.id === search.member) ??
    (clicked && clicked.id === search.member ? clicked : undefined);
  const openRow = React.useCallback(
    (row: CustomerRow) => {
      setClicked(row);
      setSearch({ member: row.id });
    },
    [setSearch],
  );

  const turnOn = () => {
    setStatus
      .mutateAsync({ status: 'on' })
      .then(() => notify({ title: W.cardState.on, tone: 'success' }))
      .catch((err: unknown) => notify({ title: errorWords(errorCodeOf(err)), tone: 'error' }));
  };

  const scrollTo = (id: string) =>
    window.requestAnimationFrame(() =>
      document
        .getElementById(id)
        ?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' }),
    );
  const pickStat = (pick: StatPick) => {
    if (pick === 'sales') {
      setInsightsOpen(true);
      scrollTo('member-sales');
      return;
    }
    setSearch(
      { filter: pick === 'all' ? undefined : pick, stamps: undefined, q: undefined },
      { replace: true },
    );
    if (isPhone) scrollTo('members-list');
  };
  const openId = (id: string) => setSearch({ member: id });

  const clearFilters = () =>
    setSearch({ filter: undefined, q: undefined, stamps: undefined }, { replace: true });

  const statusChip =
    status === 'on' ? (
      <Badge variant="success-light" radius="full" className="gap-1">
        <CircleCheckIcon aria-hidden="true" />
        {W.cardState.on}
      </Badge>
    ) : status === 'paused' ? (
      <Badge variant="warning-light" radius="full" className="gap-1">
        <CirclePauseIcon aria-hidden="true" />
        {W.cardState.paused}
      </Badge>
    ) : (
      <Badge variant="secondary" radius="full" className="gap-1">
        <CircleOffIcon aria-hidden="true" />
        {W.cardState.off}
      </Badge>
    );

  let body: React.ReactNode;
  if (overview.isPending || pages.isPending) {
    body = <ListSkeleton isPhone={isPhone} />;
  } else if (overview.isError || pages.isError) {
    body = (
      <PageError
        title={W.states.errorTitle}
        message={errorWords(errorCodeOf(overview.error ?? pages.error))}
        retryLabel={W.states.tryAgain}
        onRetry={() => {
          void overview.refetch();
          void pages.refetch();
        }}
      />
    );
  } else if (view && view.members === 0 && view.guests === 0 && status === 'off') {
    body = (
      <PageEmpty
        variant="box"
        icon={<StampIcon className="size-8 text-muted-foreground" />}
        title={W.states.offTitle}
        description={W.states.offBody}
        action={
          <Button
            className="h-11 md:h-9"
            disabled={!online || setStatus.isPending}
            onClick={turnOn}
          >
            {W.states.turnOn}
          </Button>
        }
      />
    );
  } else if (view && view.members === 0 && filter !== 'guests' && !q) {
    body = (
      <MembersStart
        cardOn={status === 'on'}
        welcome={(card?.rule.welcomeStamps ?? 1) > 0}
        url={storefrontUrl(shop.slug)}
        slug={shop.slug}
        online={online}
        turningOn={setStatus.isPending}
        onTurnOn={turnOn}
      />
    );
  } else if (rows.length === 0) {
    body = (
      <PageEmpty
        icon={<FilterXIcon className="size-8 text-muted-foreground" />}
        title={q ? W.states.noMatch(q) : W.states.groupEmpty}
        description={q ? W.states.noMatchBody : W.states.groupEmptyBody}
        action={
          <Button variant="outline" className="h-11 md:h-9" onClick={clearFilters}>
            {W.states.showEveryone}
          </Button>
        }
      />
    );
  } else {
    body = (
      <div className="flex flex-col gap-2">
        {isPhone ? (
          <PhoneRows rows={rows} now={now} onOpen={openRow} />
        ) : (
          <MembersGrid rows={rows} now={now} onOpen={openRow} />
        )}
        <div className="flex flex-col items-center gap-2 py-2">
          {pages.hasNextPage ? (
            <Button
              variant="outline"
              className="h-11 md:h-9"
              disabled={pages.isFetchingNextPage}
              onClick={() => void pages.fetchNextPage()}
            >
              {W.showMore}
            </Button>
          ) : null}
          <p className="text-sm text-muted-foreground tabular-nums">{W.people(total)}</p>
        </div>
      </div>
    );
  }

  const showNear = filter === 'all' && !q && stamps === null && status !== 'off';
  const showChart = filter === 'all' && !q && status !== 'off' && (view?.members ?? 0) > 0;
  const showInsights = filter === 'all' && !q && stamps === null && (view?.members ?? 0) > 0;
  const chart = view ? (
    <section
      className="flex flex-col gap-2 rounded-xl border bg-card p-4 shadow-xs"
      aria-labelledby="progress-title"
    >
      <div>
        <h2 id="progress-title" className="text-sm font-bold">
          {W.chart.title}
        </h2>
        <p className="text-xs text-muted-foreground">{W.chart.hint}</p>
      </div>
      <React.Suspense fallback={<Skeleton className="h-40 w-full rounded-lg md:h-44" />}>
        <ProgressChart
          progress={view.progress}
          goal={goal}
          selected={stamps}
          onPick={(next) => setSearch({ stamps: next ?? undefined }, { replace: true })}
        />
      </React.Suspense>
    </section>
  ) : null;

  return (
    <div className="flex min-h-full flex-col pb-24 md:pb-8">
      <PageHeader title={words.screens.members.title} tabs={tabs} />

      <div className="flex flex-col gap-3 px-4 pt-3 md:px-6 md:pt-4">
        <div className="flex items-start justify-between gap-3">
          {view ? (
            <MembersHello view={view} smallCard={smallCard} compact={isPhone} />
          ) : (
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-72 max-w-full" />
            </div>
          )}
          <span className="shrink-0 pt-1">{statusChip}</span>
        </div>
        {view && view.members > 0 ? (
          <MilestoneNotice slug={shop.slug} members={view.members} joined={view.pulse.joined} />
        ) : null}

        {!online ? (
          <Notice tone="warning" icon={<WifiOffIcon className="size-4" />}>
            {W.states.offline}
          </Notice>
        ) : null}
        {status === 'paused' ? (
          <Notice
            tone="warning"
            icon={<PauseCircleIcon className="size-4" />}
            action={
              <Button
                variant="outline"
                className="h-11 w-full sm:w-auto md:h-8"
                disabled={!online}
                onClick={turnOn}
              >
                {W.states.turnOn}
              </Button>
            }
          >
            {W.states.paused}
          </Notice>
        ) : status === 'off' && view && view.members > 0 ? (
          <Notice
            tone="info"
            icon={<CircleOffIcon className="size-4" />}
            action={
              <Button
                variant="outline"
                className="h-11 w-full sm:w-auto md:h-8"
                disabled={!online}
                onClick={turnOn}
              >
                {W.states.turnOn}
              </Button>
            }
          >
            {W.states.off}
          </Notice>
        ) : null}

        {view && view.members > 0 ? (
          <MembersStats
            view={view}
            filter={filter}
            smallCard={smallCard}
            onPick={pickStat}
            row={isPhone}
          />
        ) : overview.isPending ? (
          <div className="grid grid-cols-2 gap-2 md:gap-3 lg:grid-cols-4" aria-hidden="true">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl md:h-28" />
            ))}
          </div>
        ) : null}

        {showNear && view && isPhone ? (
          <NearList
            layout="strip"
            rows={view.near}
            smallCard={smallCard}
            now={now}
            shown={8}
            canStamp={online && status === 'on'}
            busyId={counter.busyId}
            onStamp={(row, origin) => void counter.stamp(row, false, origin)}
            onOpen={openRow}
            onSeeAll={() => pickStat('almost')}
          />
        ) : null}

        {(showNear || showChart) && view && !isPhone ? (
          <div className="grid gap-3 lg:grid-cols-2 lg:items-start">
            {showNear ? (
              <NearList
                rows={view.near}
                smallCard={smallCard}
                now={now}
                shown={4}
                canStamp={online && status === 'on'}
                busyId={counter.busyId}
                onStamp={(row, origin) => void counter.stamp(row, false, origin)}
                onOpen={openRow}
                onSeeAll={() => setSearch({ filter: 'almost' }, { replace: true })}
              />
            ) : null}
            {showChart ? chart : null}
          </div>
        ) : null}

        {showInsights && view ? (
          isPhone ? (
            <Collapsible open={insightsOpen} onOpenChange={setInsightsOpen}>
              <CollapsibleTrigger
                render={
                  <Button
                    variant="outline"
                    className="h-11 w-full justify-between bg-card text-base"
                  />
                }
              >
                {insightsOpen ? W.insights.hide : W.insights.show}
                <ChevronDownIcon
                  aria-hidden="true"
                  className={cn(
                    'transition-transform duration-base motion-reduce:transition-none',
                    insightsOpen && 'rotate-180',
                  )}
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="flex flex-col gap-3 pt-3">
                {showChart ? chart : null}
                <MemberSalesCard pulse={view.pulse} />
                <WeekRing pulse={view.pulse} />
                <TopSukiCard top={view.pulse.top} onOpen={openId} />
                <ActivityFeed activity={view.pulse.activity} now={now} onOpen={openId} />
              </CollapsibleContent>
            </Collapsible>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 lg:items-start">
              <MemberSalesCard pulse={view.pulse} />
              <div className="flex flex-col gap-3">
                <WeekRing pulse={view.pulse} />
                <TopSukiCard top={view.pulse.top} onOpen={openId} />
              </div>
              <ActivityFeed activity={view.pulse.activity} now={now} onOpen={openId} />
            </div>
          )
        ) : null}

        <div id="members-list" className="flex scroll-mt-20 gap-2">
          <SearchField
            value={q}
            onChange={(next) => setSearch({ q: next || undefined }, { replace: true })}
            placeholder={W.search.placeholder}
            clearLabel={W.search.clear}
            ariaLabel={W.search.label}
            className="flex-1"
          />
          <Select
            value={sort}
            onValueChange={(value) => {
              const next = MEMBER_SORTS.find((s) => s === value);
              setSearch({ sort: next === 'last_order' ? undefined : next }, { replace: true });
            }}
          >
            <SelectTrigger
              aria-label={W.sort.label}
              className="w-32 shrink-0 bg-card text-base md:w-40 md:text-sm data-size-default:h-11 md:data-size-default:h-9"
            >
              <SelectValue>
                {(value: unknown) => W.sort[MEMBER_SORTS.find((s) => s === value) ?? 'last_order']}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {MEMBER_SORTS.map((s) => (
                <SelectItem key={s} value={s} className="min-h-11 md:min-h-8">
                  {W.sort[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Scroller orientation="horizontal" hideScrollbar className="-mx-4 px-4 md:mx-0 md:px-0">
            <ToggleGroup
              value={[filter]}
              onValueChange={(next) => {
                const picked = CUSTOMER_FILTERS.find((f) => f === next[0]);
                setSearch(
                  { filter: picked === 'all' || !picked ? undefined : picked, stamps: undefined },
                  { replace: true },
                );
              }}
              aria-label={W.filtersLabel}
              spacing={1.5}
              className="w-max"
            >
              {CUSTOMER_FILTERS.map((f) => (
                <ToggleGroupItem key={f} value={f} className={CHIP}>
                  {W.filters[f]}
                  {view ? <span className="tabular-nums">{view.counts[f] ?? 0}</span> : null}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </Scroller>
          <p
            className={cn(
              'flex flex-wrap items-center gap-2 text-xs text-muted-foreground',
              // "Everyone who joined" says nothing new on a phone; the other groups keep their rule.
              filter === 'all' && stamps === null && 'hidden md:flex',
            )}
          >
            {filter === 'almost' ? W.rules.almost(smallCard) : W.rules[filter]}
            {stamps !== null ? (
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1 rounded-full"
                onClick={() => setSearch({ stamps: undefined }, { replace: true })}
              >
                {W.stampsLabel(stamps, goal)}
                <XIcon aria-hidden="true" />
              </Button>
            ) : null}
          </p>
        </div>
      </div>

      <main className="flex-1 px-4 pt-3 md:px-6">{body}</main>

      <MemberPanel
        customerId={search.member}
        seed={seed}
        card={card}
        look={storefront.data?.storefront.look}
        shopSlug={shop.slug}
        now={now}
        online={online}
        busy={counter.busyId !== null && counter.busyId === search.member}
        onStamp={(m, origin) => void counter.stamp(m, false, origin)}
        onRedeem={(m, prize) => void counter.redeem(m, prize)}
        onClose={() => setSearch({ member: undefined }, { replace: true })}
      />
      <RecentStampDialog
        ask={counter.recent}
        now={now}
        busy={counter.busyId !== null}
        onConfirm={(ask) => void counter.stamp({ id: ask.customerId, name: ask.name }, true)}
        onClose={counter.closeRecent}
      />
    </div>
  );
}

function ListSkeleton({ isPhone }: { isPhone: boolean }) {
  return (
    <div className="flex flex-col gap-2" aria-hidden="true">
      {Array.from({ length: isPhone ? 5 : 8 }, (_, i) => (
        <Skeleton
          key={i}
          className={isPhone ? 'h-20 w-full rounded-xl' : 'h-14 w-full rounded-xl'}
        />
      ))}
    </div>
  );
}
