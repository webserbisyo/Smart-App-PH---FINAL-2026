import * as React from 'react';
import {
  ClockIcon,
  GiftIcon,
  HandHeartIcon,
  MinusIcon,
  PauseCircleIcon,
  PlusIcon,
  RotateCcwIcon,
  SparklesIcon,
  StampIcon,
  StickyNoteIcon,
  Undo2Icon,
  UserPlusIcon,
  XIcon,
} from 'lucide-react';
import {
  errorWords,
  formatManila,
  formatPeso,
  imageSources,
  membersWords,
  words,
  type CustomerRow,
  type MemberDetail,
  type OwnerLedgerEntry,
  type StampCardSettings,
  type ShopLook,
} from '@smartapp/core';
import { errorCodeOf, useGiveClaim, useMember, useSaveMemberNote } from '@smartapp/data';
import { Button } from '@smartapp/ui/components/button';
import { Field, FieldLabel } from '@smartapp/ui/components/field';
import { Badge } from '@smartapp/ui/components/reui/badge';
import {
  Timeline,
  TimelineContent,
  TimelineDate,
  TimelineHeader,
  TimelineIndicator,
  TimelineItem,
  TimelineSeparator,
} from '@smartapp/ui/components/reui/timeline';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { Spinner } from '@smartapp/ui/components/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@smartapp/ui/components/tabs';
import { Textarea } from '@smartapp/ui/components/textarea';
import { AsyncButton, useAsyncAction } from '@smartapp/ui/compositions/async-button';
import { CopyButton } from '@smartapp/ui/compositions/copy-button';
import { notify } from '@smartapp/ui/compositions/notify';
import { ResponsiveSheet } from '@smartapp/ui/compositions/responsive-sheet';
import type { Point } from '@smartapp/ui/compositions/celebrate';
import { StampCard } from '@smartapp/ui/compositions/stamp-card';
import { cn } from 'cn';
import { env } from '@/app/env';
import { Notice } from '@/app/notice';
import { orderNoLabel } from '@/app/orders/order-ticket-label';
import { storefrontUrl } from '@/app/use-nav-items';
import { ShopLookTheme } from '@/app/shop-look';
import { AdjustDialog } from './adjust-dialog.js';
import { MemberAvatar } from './member-rows.js';
import { daysSince, lastInLabel } from './when.js';
import { originOf } from './use-counter-actions.js';

const W = membersWords;

export interface MemberPanelProps {
  customerId: string | undefined;
  // The row the owner tapped: the header shows at once while the rest loads.
  seed: CustomerRow | undefined;
  card: StampCardSettings | undefined;
  look: ShopLook | undefined;
  shopSlug: string;
  now: Date;
  online: boolean;
  busy: boolean;
  onStamp: (member: { id: string; name: string }, origin: Point) => void;
  onRedeem: (member: { id: string }, prize: boolean) => void;
  onClose: () => void;
}

/** The member panel (T57): a side sheet from 768 px, a bottom drawer on phones, `?member=` in the address. */
export function MemberPanel(props: MemberPanelProps) {
  const { customerId, seed, onClose } = props;
  // Keep the last member while the panel slides away.
  const [lastId, setLastId] = React.useState(customerId);
  if (customerId && customerId !== lastId) setLastId(customerId);
  const id = customerId ?? lastId ?? null;
  const query = useMember(id);
  const detail = query.data && query.data.id === id ? query.data : undefined;
  const head: CustomerRow | undefined = detail ?? (seed && seed.id === id ? seed : undefined);

  return (
    <ResponsiveSheet
      open={customerId !== undefined}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={head?.name ?? W.panel.close}
      header={<PanelHeader row={head} detail={detail} onClose={onClose} />}
    >
      {detail ? (
        <PanelBody {...props} member={detail} />
      ) : query.isError ? (
        <div className="flex flex-col items-center gap-3 p-8 text-center">
          <p className="text-sm text-muted-foreground">
            {errorCodeOf(query.error) === 'not_found'
              ? W.panel.notFound
              : errorWords(errorCodeOf(query.error))}
          </p>
          <Button variant="outline" className="h-11 md:h-9" onClick={() => void query.refetch()}>
            {W.states.tryAgain}
          </Button>
        </div>
      ) : (
        <div className="space-y-4 p-4" aria-hidden="true">
          <Skeleton className="h-64 w-full rounded-2xl" />
          <div className="grid grid-cols-3 gap-2">
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
          </div>
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      )}
    </ResponsiveSheet>
  );
}

// ---------------------------------------------------------------- header

function PanelHeader({
  row,
  detail,
  onClose,
}: {
  row: CustomerRow | undefined;
  detail: MemberDetail | undefined;
  onClose: () => void;
}) {
  const since = row?.joinedAt ? formatManila(row.joinedAt, 'date') : null;
  const regular = row?.segments.includes('regulars') ?? false;
  return (
    <div className="flex items-start gap-3 border-b px-4 pt-3 pb-3">
      {row ? (
        <MemberAvatar name={row.name} member={row.isMember} />
      ) : (
        <Skeleton className="size-9 rounded-full" />
      )}
      <div className="min-w-0 flex-1">
        {row ? (
          <>
            <h2 className="truncate text-lg leading-tight font-bold">{row.name}</h2>
            {since ? (
              <p className="mt-0.5 text-sm text-muted-foreground">
                {regular ? W.panel.regularSince(since) : W.panel.since(since)}
              </p>
            ) : null}
            <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
              {row.memberCode ? (
                <span className="inline-flex items-center gap-0.5">
                  <span className="font-mono text-xs font-semibold tracking-wide text-foreground">
                    {row.memberCode}
                  </span>
                  <CopyButton value={row.memberCode} iconOnly variant="ghost" className="size-8" />
                </span>
              ) : null}
              <span className="tabular-nums">{row.phone}</span>
            </p>
            {detail?.email ? (
              <p className="truncate text-xs text-muted-foreground">{detail.email}</p>
            ) : null}
          </>
        ) : (
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-56" />
          </div>
        )}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onClose}
        aria-label={W.panel.close}
        className="size-11 shrink-0 md:size-9"
      >
        <XIcon />
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------- body

function PanelBody({
  member,
  card,
  look,
  shopSlug,
  now,
  online,
  busy,
  onStamp,
  onRedeem,
}: MemberPanelProps & { member: MemberDetail }) {
  const [adjustOpen, setAdjustOpen] = React.useState(false);
  const pressIndex = useJustStamped(member.balance, member.goal);

  if (!member.isMember) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <Notice tone="info" icon={<UserPlusIcon className="size-4" />}>
          <p className="font-semibold">{W.panel.guest}</p>
          <p className="text-sm">{W.panel.guestBody}</p>
        </Notice>
        <CopyButton
          value={`${storefrontUrl(shopSlug)}/join`}
          label={W.panel.copyJoin}
          className="h-11 self-start md:h-9"
        />
        <Numbers member={member} now={now} />
        <OrdersList member={member} />
      </div>
    );
  }

  const goal = member.goal;
  const status = card?.status ?? 'on';
  const custom = card?.reward.kind === 'custom';
  const ready = status !== 'off' && member.balance >= goal;
  const pendingClaim = member.claims.find((c) => c.status === 'pending');
  const canChange = online && member.changesLeftToday > 0;
  const left = Math.max(0, goal - member.balance);

  let action: React.ReactNode;
  if (ready) {
    action = (
      <Button
        className="h-12 gap-2 text-base"
        disabled={!online || busy}
        onClick={() => onRedeem(member, custom)}
      >
        {busy ? <Spinner /> : <GiftIcon aria-hidden="true" />}
        {custom ? W.panel.givePrize : W.panel.useReward}
      </Button>
    );
  } else {
    action = (
      <Button
        className="h-12 gap-2 text-base"
        disabled={status !== 'on' || !canChange || busy}
        onClick={(event) => onStamp(member, originOf(event.currentTarget))}
      >
        {busy ? <Spinner /> : <StampIcon aria-hidden="true" />}
        {W.panel.addStamp}
      </Button>
    );
  }

  const stampCard = (
    <StampCard
      needed={goal}
      stamped={member.balance}
      pending={member.pendingStamps}
      title={W.panel.cardTitle(Math.min(member.balance, goal), goal)}
      body={
        ready
          ? W.panel.readyFor(card?.reward.title ?? '')
          : W.panel.moreFor(left, card?.reward.title ?? '')
      }
      progressLabel={W.stampsLabel(member.balance, goal)}
      prize={{
        title: card?.reward.title ?? '',
        photo: imageSources(card?.reward.image, env.VITE_STOREFRONT_URL),
        label: W.panel.prizeLabel,
      }}
      ready={ready}
      readyLine={W.panel.readyLine}
      action={action}
      pressIndex={pressIndex}
      assetOrigin={env.VITE_STOREFRONT_URL}
    />
  );

  return (
    <div className="flex flex-col gap-4 p-4">
      {pendingClaim ? (
        <PrizeToGive
          claimId={pendingClaim.id}
          title={pendingClaim.title}
          createdAt={pendingClaim.createdAt}
          now={now}
          online={online}
        />
      ) : null}

      {/* The card in the shop's colours, as the customer sees it on their phone (T77 part 7). */}
      <p className="-mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {W.panel.customerSees}
      </p>
      <ShopLookTheme look={look}>{stampCard}</ShopLookTheme>

      <div className="-mt-1 flex flex-col items-center gap-1 text-center text-sm text-muted-foreground">
        {member.pendingStamps > 0 ? <p>{W.panel.pending(member.pendingStamps)}</p> : null}
        <p className="flex flex-wrap items-center justify-center gap-x-1.5">
          <span className="tabular-nums">
            {member.changesLeftToday === 0
              ? W.panel.capReached
              : W.panel.changesLeft(member.changesLeftToday)}
          </span>
          <span aria-hidden="true">·</span>
          <Button
            variant="link"
            className="h-11 px-0 md:h-auto"
            disabled={!canChange}
            onClick={() => setAdjustOpen(true)}
          >
            {W.panel.adjust}
          </Button>
        </p>
      </div>

      {status === 'paused' ? (
        <Notice tone="warning" icon={<PauseCircleIcon className="size-4" />}>
          {W.panel.paused}
        </Notice>
      ) : status === 'off' ? (
        <Notice tone="warning" icon={<PauseCircleIcon className="size-4" />}>
          {W.panel.stopped}
        </Notice>
      ) : null}

      <Numbers member={member} now={now} />
      <NoteForCounter member={member} />

      <Tabs defaultValue="history" className="gap-3">
        <TabsList className="w-full">
          <TabsTrigger value="history" className="h-10 flex-1 md:h-8">
            {W.panel.history}
          </TabsTrigger>
          <TabsTrigger value="orders" className="h-10 flex-1 md:h-8">
            {W.panel.orders}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="history">
          <History entries={member.history} now={now} />
        </TabsContent>
        <TabsContent value="orders">
          <OrdersList member={member} />
        </TabsContent>
      </Tabs>

      <AdjustDialog member={member} open={adjustOpen} onOpenChange={setAdjustOpen} />
    </div>
  );
}

/** The tile that just got its stamp gets the press-stamp motion, once. */
function useJustStamped(balance: number, goal: number): number | undefined {
  const last = React.useRef(balance);
  const [pressed, setPressed] = React.useState<number | undefined>(undefined);
  React.useEffect(() => {
    if (balance > last.current && balance <= goal) setPressed(balance - 1);
    else setPressed(undefined);
    last.current = balance;
  }, [balance, goal]);
  return pressed;
}

function PrizeToGive({
  claimId,
  title,
  createdAt,
  now,
  online,
}: {
  claimId: string;
  title: string;
  createdAt: string;
  now: Date;
  online: boolean;
}) {
  const give = useGiveClaim();
  const action = useAsyncAction();
  return (
    <section className="flex items-center gap-3 rounded-xl border border-warning/30 bg-warning-soft p-3 text-warning-text">
      <GiftIcon className="size-5 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{W.panel.prizeToGive}</p>
        <p className="truncate text-sm">
          {title} · {W.panel.waiting(daysSince(createdAt, now))}
        </p>
      </div>
      <AsyncButton
        status={action.status}
        busyLabel={W.adjust.saving}
        doneLabel={W.adjust.saved}
        disabled={!online}
        className="h-11 shrink-0 md:h-9"
        onClick={() => {
          action
            .run(() => give.mutateAsync({ claimId }))
            .then(() => notify({ title: W.toast.prizeGiven, tone: 'success' }))
            .catch((err: unknown) =>
              notify({ title: errorWords(errorCodeOf(err)), tone: 'error' }),
            );
        }}
      >
        {W.panel.givePrize}
      </AsyncButton>
    </section>
  );
}

function Numbers({ member, now }: { member: MemberDetail; now: Date }) {
  const tiles = [
    { value: String(member.visits), label: W.panel.visits(member.visits) },
    { value: formatPeso(member.spent), label: W.panel.spent },
    { value: lastInLabel(member.lastOrderAt, now), label: W.panel.lastIn },
  ];
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-2">
        {tiles.map((t) => (
          <div key={t.label} className="min-w-0 rounded-xl bg-muted/60 px-3 py-2.5">
            <p className="truncate text-base font-bold tabular-nums">{t.value}</p>
            <p className="text-xs text-muted-foreground">{t.label}</p>
          </div>
        ))}
      </div>
      <dl className="flex flex-col gap-1.5 text-sm">
        <div className="flex items-baseline justify-between gap-4">
          <dt className="shrink-0 text-muted-foreground">{W.panel.usuallyBuys}</dt>
          <dd className="truncate text-right font-semibold">
            {member.usuallyBuys ?? W.panel.nothingYet}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-4">
          <dt className="shrink-0 text-muted-foreground">{W.panel.average}</dt>
          <dd className="text-right font-semibold tabular-nums">
            {member.visits > 0 ? formatPeso(member.averageOrder) : W.panel.nothingYet}
          </dd>
        </div>
      </dl>
    </div>
  );
}

function NoteForCounter({ member }: { member: MemberDetail }) {
  const save = useSaveMemberNote();
  const action = useAsyncAction();
  const [text, setText] = React.useState(member.note ?? '');
  const [savedFor, setSavedFor] = React.useState(member.id);
  // A different member opens: start from their note.
  if (savedFor !== member.id) {
    setSavedFor(member.id);
    setText(member.note ?? '');
  }
  const dirty = text.trim() !== (member.note ?? '');
  return (
    <Field>
      <FieldLabel htmlFor="member-note" className="gap-1.5">
        <StickyNoteIcon className="size-4 text-muted-foreground" aria-hidden="true" />
        {W.panel.note}
      </FieldLabel>
      <Textarea
        id="member-note"
        value={text}
        maxLength={300}
        rows={2}
        placeholder={W.panel.notePlaceholder}
        onChange={(e) => setText(e.target.value)}
        className="text-base md:text-sm"
      />
      {dirty || action.status !== 'idle' ? (
        <AsyncButton
          status={action.status}
          busyLabel={W.adjust.saving}
          doneLabel={W.panel.noteSaved}
          variant="outline"
          className="h-11 self-end md:h-9"
          onClick={() => {
            action
              .run(() => save.mutateAsync({ customerId: member.id, note: text.trim() || null }))
              .catch((err: unknown) =>
                notify({ title: errorWords(errorCodeOf(err)), tone: 'error' }),
              );
          }}
        >
          {W.panel.noteSave}
        </AsyncButton>
      ) : null}
    </Field>
  );
}

// ---------------------------------------------------------------- history and orders

function historyLine(e: OwnerLedgerEntry): string {
  const H = W.history;
  const no = e.orderNo !== null ? orderNoLabel(e.orderNo) : null;
  const reason = e.reasonCategory ? ` · ${words.rewards.reason[e.reasonCategory]}` : '';
  switch (e.kind) {
    case 'welcome':
      return H.welcome;
    case 'pending':
      return H.pending(no ?? '');
    case 'earned':
      return H.earned(no);
    case 'used':
      return H.used(no);
    case 'claimed':
      return H.claimed;
    case 'returned':
      return H.returned(no);
    case 'reversed':
      return H.reversed(no);
    case 'given':
      return `${H.given}${reason}`;
    case 'removed':
      return `${H.removed}${reason}`;
    case 'undone':
      return `${H.undone}${reason}`;
  }
}

// Each kind gets its own icon and colour so the history reads at a glance (T62).
const KIND: Record<OwnerLedgerEntry['kind'], { icon: React.ReactNode; tone: string }> = {
  welcome: { icon: <SparklesIcon />, tone: 'bg-member-soft text-member-text' },
  pending: { icon: <ClockIcon />, tone: 'bg-warning-soft text-warning-text' },
  earned: { icon: <StampIcon />, tone: 'bg-success-soft text-success-text' },
  used: { icon: <GiftIcon />, tone: 'bg-member-soft text-member-text' },
  claimed: { icon: <HandHeartIcon />, tone: 'bg-member-soft text-member-text' },
  returned: { icon: <RotateCcwIcon />, tone: 'bg-success-soft text-success-text' },
  reversed: { icon: <MinusIcon />, tone: 'bg-destructive-soft text-destructive-text' },
  given: { icon: <PlusIcon />, tone: 'bg-success-soft text-success-text' },
  removed: { icon: <MinusIcon />, tone: 'bg-destructive-soft text-destructive-text' },
  undone: { icon: <Undo2Icon />, tone: 'bg-muted text-muted-foreground' },
};

/** "Today", "Yesterday", then the date: the heading over each day of history. */
function dayLabel(at: string, now: Date): string {
  const days = daysSince(at, now);
  if (days <= 0) return W.when.today;
  if (days === 1) return W.when.yesterday;
  return formatManila(at, 'date');
}

const HISTORY_PAGE = 15;

function History({ entries, now }: { entries: readonly OwnerLedgerEntry[]; now: Date }) {
  const [shown, setShown] = React.useState(HISTORY_PAGE);
  if (entries.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{W.panel.historyEmpty}</p>;
  }
  return (
    <div className="flex flex-col gap-3">
      <Timeline defaultValue={entries.length} className="gap-0">
        {entries.slice(0, shown).map((e, index, list) => {
          const day = dayLabel(e.at, now);
          const prev = list[index - 1];
          const newDay = !prev || dayLabel(prev.at, now) !== day;
          return (
            <TimelineItem
              key={e.id}
              step={index + 1}
              className="group-orientation-vertical/timeline:not-last:pb-4"
            >
              {newDay ? (
                <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  {day}
                </p>
              ) : null}
              <TimelineHeader className="flex items-center gap-2.5">
                <TimelineSeparator />
                <TimelineIndicator
                  className={cn(
                    'flex size-6 items-center justify-center border-none [&_svg]:size-3.5',
                    KIND[e.kind].tone,
                  )}
                >
                  {KIND[e.kind].icon}
                </TimelineIndicator>
                <TimelineDate className="mb-0 text-xs text-muted-foreground">
                  {formatManila(e.at, 'time')}
                  {e.byOwner ? ` · ${W.history.byYou}` : ''}
                </TimelineDate>
              </TimelineHeader>
              <TimelineContent className="flex flex-col gap-0.5 text-sm">
                <span className="flex items-baseline justify-between gap-3">
                  <span
                    className={cn(
                      'font-medium text-foreground',
                      e.undone && 'line-through opacity-60',
                    )}
                  >
                    {historyLine(e)}
                  </span>
                  <span
                    className={cn(
                      'shrink-0 font-semibold tabular-nums',
                      e.undone
                        ? 'text-muted-foreground line-through'
                        : e.delta < 0
                          ? 'text-destructive-text'
                          : 'text-success-text',
                    )}
                  >
                    {words.rewards.delta(e.delta)}
                  </span>
                </span>
                {e.note ? <span className="text-xs text-muted-foreground">“{e.note}”</span> : null}
              </TimelineContent>
            </TimelineItem>
          );
        })}
      </Timeline>
      {entries.length > shown ? (
        <Button
          variant="outline"
          className="h-11 self-center md:h-9"
          onClick={() => setShown((n) => n + HISTORY_PAGE)}
        >
          {W.showMore}
        </Button>
      ) : null}
    </div>
  );
}

function OrdersList({ member }: { member: MemberDetail }) {
  if (member.orders.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{W.panel.ordersEmpty}</p>;
  }
  return (
    <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
      {member.orders.map((o) => (
        <li key={o.id} className="flex items-start gap-3 px-3 py-2.5 text-sm">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2">
              <span className="font-semibold tabular-nums">{orderNoLabel(o.orderNo)}</span>
              <span className="text-xs text-muted-foreground">
                {formatManila(o.placedAt, 'date')}
              </span>
              {o.status === 'cancelled' || o.status === 'expired' ? (
                <Badge variant="destructive-light" radius="full">
                  {words.shop.orderStatus[o.status]}
                </Badge>
              ) : null}
            </p>
            <p className="truncate text-xs text-muted-foreground">{o.itemsSummary}</p>
          </div>
          <span className="shrink-0 font-semibold tabular-nums">{formatPeso(o.total)}</span>
        </li>
      ))}
    </ul>
  );
}
