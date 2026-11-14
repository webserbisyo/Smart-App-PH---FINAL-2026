import * as React from 'react';
import {
  CheckIcon,
  ChevronRightIcon,
  FilterXIcon,
  PlusIcon,
  StoreIcon,
  UserRoundSearchIcon,
  WifiOffIcon,
} from 'lucide-react';
import {
  ADMIN_SHOP_FILTERS,
  adminWords,
  errorWords,
  formatManila,
  formatPeso,
  formatPhPhone,
  type AdminLead,
  type AdminShopFilter,
  type AdminShopRow,
} from '@smartapp/core';
import { errorCodeOf, useAdminLeads, useAdminShops, useMarkLeadContacted } from '@smartapp/data';
import { Button } from '@smartapp/ui/components/button';
import { Scroller } from '@smartapp/ui/components/scroller';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@smartapp/ui/components/toggle-group';
import { AsyncButton, useAsyncAction } from '@smartapp/ui/compositions/async-button';
import { CopyButton } from '@smartapp/ui/compositions/copy-button';
import { notify } from '@smartapp/ui/compositions/notify';
import { PageHeader } from '@smartapp/ui/compositions/page-header';
import { cn } from 'cn';
import { dayText } from '@/app/billing-thread';
import { Notice } from '@/app/notice';
import { useNow } from '@/app/orders/use-now';
import { PageEmpty, PageError } from '@/app/page-state';
import { SearchField } from '@/app/search-field';
import { useOnlineStatus } from '@/app/use-online-status';
import { CreateClientDialog } from '../dialogs.js';
import { agoText, FlagBadge, initialsOf, ShopStateBadge, sourceText } from '../look.js';
import { useAdminShopsSearch, useSetAdminShopsSearch } from '../search.js';
import { ShopPanel } from '../shop-panel.js';

const A = adminWords;
const S = A.shops;
const L = A.leads;

const CHIP =
  'h-10 gap-1.5 rounded-full border border-border bg-card px-3 text-sm font-semibold text-muted-foreground aria-pressed:border-primary aria-pressed:bg-accent aria-pressed:text-foreground md:h-10';

/**
 * Shops (decision T88): every shop with chips for each state, one search, and a side panel with the
 * shop's Overview, Billing chat and Activity. Leads are people who started signing up but did not finish.
 */
export function AdminShopsScreen() {
  const search = useAdminShopsSearch();
  const setSearch = useSetAdminShopsSearch();
  const online = useOnlineStatus();
  const filter: AdminShopFilter = search.filter ?? 'all';
  const [q, setQ] = React.useState(search.q ?? '');
  const deferredQ = React.useDeferredValue(q.trim());
  const list = useAdminShops(filter === 'leads' ? 'all' : filter, deferredQ);
  const [creating, setCreating] = React.useState(false);

  // The search box writes to the address after a pause, so Back keeps working.
  React.useEffect(() => {
    const id = setTimeout(() => {
      if ((search.q ?? '') !== deferredQ)
        setSearch({ q: deferredQ || undefined }, { replace: true });
    }, 300);
    return () => clearTimeout(id);
  }, [deferredQ, search.q, setSearch]);

  const seed = list.data?.rows.find((r) => r.id === search.shop);

  return (
    <div className="flex min-h-full flex-col pb-24 md:pb-8">
      <PageHeader
        title={S.title}
        actions={
          <Button className="h-11 gap-1.5 md:h-9" onClick={() => setCreating(true)}>
            <PlusIcon aria-hidden="true" />
            <span className="hidden sm:inline">{S.create}</span>
            <span className="sr-only sm:hidden">{S.create}</span>
          </Button>
        }
      />
      <div className="flex flex-col gap-3 px-4 pt-3 md:gap-4 md:px-6 md:pt-4">
        {!online ? (
          <Notice tone="warning" icon={<WifiOffIcon className="size-4" />}>
            {A.loadError}
          </Notice>
        ) : null}
        {filter !== 'leads' ? (
          <SearchField
            value={q}
            onChange={setQ}
            placeholder={S.search}
            clearLabel={S.clearSearch}
            ariaLabel={S.search}
            className="md:max-w-md"
          />
        ) : null}
        <Scroller orientation="horizontal" hideScrollbar className="-mx-4 px-4 md:mx-0 md:px-0">
          <ToggleGroup
            value={[filter]}
            onValueChange={(next) => {
              const picked = ADMIN_SHOP_FILTERS.find((f) => f === next[0]);
              if (!picked) return;
              setSearch({ filter: picked === 'all' ? undefined : picked }, { replace: true });
            }}
            aria-label={S.title}
            spacing={1.5}
            className="w-max"
          >
            {ADMIN_SHOP_FILTERS.map((f) => (
              <ToggleGroupItem key={f} value={f} className={CHIP}>
                {S.filters[f]}
                {list.data ? (
                  <span
                    className={cn(
                      'tabular-nums',
                      f === 'needs_you' && (list.data.counts[f] ?? 0) > 0 && 'text-warning-text',
                    )}
                  >
                    {list.data.counts[f] ?? 0}
                  </span>
                ) : null}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Scroller>

        {filter === 'leads' ? (
          <LeadsList />
        ) : list.isPending ? (
          <RowsSkeleton />
        ) : list.isError && !list.data ? (
          <PageError
            title={A.loadError}
            message={errorWords(errorCodeOf(list.error))}
            retryLabel={A.tryAgain}
            onRetry={() => void list.refetch()}
          />
        ) : list.data.rows.length === 0 ? (
          deferredQ || filter !== 'all' ? (
            <PageEmpty
              variant="box"
              icon={<FilterXIcon className="size-8 text-muted-foreground" />}
              title={S.empty}
              description={S.emptyLine}
              action={
                <Button
                  variant="outline"
                  className="h-11 md:h-9"
                  onClick={() => {
                    setQ('');
                    setSearch({ q: undefined, filter: undefined }, { replace: true });
                  }}
                >
                  {S.clearSearch}
                </Button>
              }
            />
          ) : (
            <PageEmpty
              variant="box"
              icon={<StoreIcon className="size-8 text-muted-foreground" />}
              title={S.emptyAll}
              description={S.emptyAllLine}
              action={
                <Button className="h-11 gap-1.5 md:h-9" onClick={() => setCreating(true)}>
                  <PlusIcon aria-hidden="true" />
                  {S.create}
                </Button>
              }
            />
          )
        ) : (
          <>
            <p className="text-xs text-muted-foreground" aria-live="polite">
              {S.count(list.data.rows.length)}
            </p>
            <ul className="flex flex-col gap-2">
              {list.data.rows.map((row) => (
                <li key={row.id}>
                  <ShopRow
                    row={row}
                    active={row.id === search.shop}
                    onOpen={() =>
                      setSearch({ shop: row.id, tab: row.pending ? 'billing' : undefined })
                    }
                  />
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <ShopPanel
        shopId={search.shop}
        seed={seed}
        tab={search.tab ?? 'overview'}
        onTab={(tab) => setSearch({ tab: tab === 'overview' ? undefined : tab }, { replace: true })}
        onClose={() => setSearch({ shop: undefined, tab: undefined })}
      />
      <CreateClientDialog
        open={creating}
        onOpenChange={setCreating}
        onCreated={(shopId) => setSearch({ shop: shopId, tab: undefined, filter: undefined })}
      />
    </div>
  );
}

/** The one line under a shop's name: where it stands and the date that matters. */
export function shopLine(row: AdminShopRow, now: number): string {
  if (row.pending) return S.line.pending(formatPeso(row.pending.amount));
  switch (row.stage) {
    case 'setting_up':
      return S.line.setting_up(row.setupDone, agoText(row.createdAt, now));
    case 'asked':
      return S.line.asked(agoText(row.askedAt ?? row.createdAt, now));
    case 'closed':
      return S.line.closed(row.closedAt ? formatManila(row.closedAt, 'date') : '');
    case 'live':
      break;
  }
  if (row.closesOn) return S.line.closes(dayText(row.closesOn));
  switch (row.planStatus) {
    case 'trial':
      return S.line.trial(row.trialEndsAt ? formatManila(row.trialEndsAt, 'date') : '');
    case 'overdue':
      return S.line.overdue(row.graceUntil ? dayText(row.graceUntil) : '');
    case 'paused':
      return S.line.paused;
    case 'active':
    case 'due':
    case null:
      return S.line.paid(row.paidUntil ? dayText(row.paidUntil) : '');
  }
}

function ShopRow({
  row,
  active,
  onOpen,
}: {
  row: AdminShopRow;
  active: boolean;
  onOpen: () => void;
}) {
  const now = useNow(60_000).getTime();
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-current={active ? 'true' : undefined}
      className={cn(
        'flex w-full min-w-0 items-center gap-3 rounded-xl border bg-card px-3 py-3 text-left shadow-xs transition-colors duration-base hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:transition-none md:px-4',
        active && 'border-primary ring-1 ring-primary',
      )}
    >
      <span
        aria-hidden="true"
        className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary"
      >
        {initialsOf(row.name)}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <span className="truncate font-semibold">{row.name}</span>
          <ShopStateBadge row={row} />
          {row.flags.map((f) => (
            <FlagBadge key={f} flag={f} />
          ))}
        </span>
        <span className="truncate text-sm text-muted-foreground">
          {row.ownerName} · {shopLine(row, now)}
        </span>
      </span>
      <span className="hidden shrink-0 flex-col items-end gap-0.5 text-xs text-muted-foreground lg:flex">
        <span>
          {S.columns.orders}:{' '}
          <span className="font-semibold text-foreground tabular-nums">{row.orders7d}</span>
        </span>
        <span>
          {S.columns.lastActive}: {agoText(row.lastActiveAt, now)}
        </span>
      </span>
      <span className="hidden max-w-40 shrink-0 truncate text-xs text-muted-foreground xl:block">
        {sourceText(row.source)}
      </span>
      <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    </button>
  );
}

// ---------------------------------------------------------------- leads

function LeadsList() {
  const leads = useAdminLeads();
  if (leads.isPending) return <RowsSkeleton />;
  if (leads.isError && !leads.data) {
    return (
      <PageError
        title={A.loadError}
        message={errorWords(errorCodeOf(leads.error))}
        retryLabel={A.tryAgain}
        onRetry={() => void leads.refetch()}
      />
    );
  }
  return (
    <section className="flex flex-col gap-2" aria-labelledby="leads-title">
      <div>
        <h2 id="leads-title" className="font-semibold">
          {L.title}
        </h2>
        <p className="text-sm text-muted-foreground">{L.line}</p>
      </div>
      {leads.data.length === 0 ? (
        <PageEmpty
          variant="box"
          icon={<UserRoundSearchIcon className="size-8 text-muted-foreground" />}
          title={L.empty}
          description={L.emptyLine}
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {leads.data.map((lead) => (
            <li key={lead.id}>
              <LeadRow lead={lead} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function LeadRow({ lead }: { lead: AdminLead }) {
  const now = useNow(60_000).getTime();
  const mark = useMarkLeadContacted();
  const action = useAsyncAction();
  const first = lead.fullName.trim().split(/\s+/)[0] ?? lead.fullName;
  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-3 shadow-xs md:flex-row md:items-center md:px-4">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold text-muted-foreground"
        >
          {initialsOf(lead.fullName)}
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate font-semibold">{lead.fullName}</span>
          <span className="truncate text-sm text-muted-foreground">
            {formatPhPhone(lead.phone)} · {lead.email}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {sourceText(lead.source)} · {agoText(lead.createdAt, now)}
            {lead.contactedAt ? (
              <>
                {' · '}
                <span className="font-medium text-success-text">
                  {L.contactedOn(formatManila(lead.contactedAt, 'date'))}
                </span>
              </>
            ) : null}
          </span>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <CopyButton value={L.message(first)} label={L.copyMessage} className="h-11 md:h-9" />
        <CopyButton value={lead.phone} label={L.copyPhone} className="h-11 md:h-9" />
        {lead.contactedAt ? null : (
          <AsyncButton
            status={action.status}
            busyLabel={L.contacted}
            doneLabel={L.contacted}
            variant="ghost"
            className="h-11 gap-1.5 md:h-9"
            onClick={() => {
              void action
                .run(() => mark.mutateAsync({ leadId: lead.id }))
                .catch((err: unknown) =>
                  notify({ title: errorWords(errorCodeOf(err)), tone: 'error' }),
                );
            }}
          >
            <CheckIcon aria-hidden="true" />
            {L.contacted}
          </AsyncButton>
        )}
      </div>
    </div>
  );
}

function RowsSkeleton() {
  return (
    <div className="flex flex-col gap-2" aria-busy="true" aria-hidden="true">
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} className="h-16 rounded-xl" />
      ))}
    </div>
  );
}
