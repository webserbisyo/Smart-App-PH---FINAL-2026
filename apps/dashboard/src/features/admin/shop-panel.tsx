import * as React from 'react';
import {
  BellIcon,
  CalendarPlusIcon,
  CheckIcon,
  ExternalLinkIcon,
  LifeBuoyIcon,
  RocketIcon,
  RotateCcwIcon,
  ShieldCheckIcon,
  StoreIcon,
  Trash2Icon,
  WalletIcon,
  XCircleIcon,
  XIcon,
} from 'lucide-react';
import {
  adminWords,
  billingWords,
  errorWords,
  formatManila,
  formatPeso,
  formatPhPhone,
  formatStorage,
  PLAN_REJECT_REASONS,
  signupWords,
  supportWords,
  type AdminShopDetail,
  type AdminShopRow,
  type PlanPayment,
  type PlanRejectReason,
  type ShopActivity,
} from '@smartapp/core';
import {
  errorCodeOf,
  useAdminShop,
  useApproveGoLive,
  useReopenShop,
  useReviewPlanPayment,
  useSendBillingNote,
  useSendPlanReminder,
} from '@smartapp/data';
import { Button } from '@smartapp/ui/components/button';
import { Field, FieldError, FieldLabel } from '@smartapp/ui/components/field';
import { Input } from '@smartapp/ui/components/input';
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@smartapp/ui/components/item';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@smartapp/ui/components/tabs';
import { AsyncButton, useAsyncAction } from '@smartapp/ui/compositions/async-button';
import { CopyButton } from '@smartapp/ui/compositions/copy-button';
import { InfoList, type InfoRow } from '@smartapp/ui/compositions/info-list';
import { notify } from '@smartapp/ui/compositions/notify';
import { ResponsiveSheet } from '@smartapp/ui/compositions/responsive-sheet';
import { cn } from 'cn';
import { BillingComposer, BillingThread, dayText } from '@/app/billing-thread';
import { env } from '@/app/env';
import { useNow } from '@/app/orders/use-now';
import { PesoInput } from '@/app/peso-input';
import { useOnlineStatus } from '@/app/use-online-status';
import {
  CloseShopDialog,
  DeleteShopDialog,
  ExtraDaysDialog,
  OpenAsOwnerDialog,
  RecordPaymentDialog,
} from './dialogs.js';
import { agoText, FlagBadge, ShopStateBadge, sourceText } from './look.js';
import { PANEL_TABS, type PanelTab } from './search.js';

const A = adminWords;
const P = A.panel;
const B = billingWords;

const failed = (err: unknown) => notify({ title: errorWords(errorCodeOf(err)), tone: 'error' });

/**
 * One shop (decision T88): a side sheet from 768 px, a bottom drawer on phones, `?shop=` in the address.
 * Overview with every action, the Billing chat where payments are checked, and the Activity log.
 */
export function ShopPanel({
  shopId,
  seed,
  tab,
  onTab,
  onClose,
}: {
  shopId: string | undefined;
  seed: AdminShopRow | undefined;
  tab: PanelTab;
  onTab: (tab: PanelTab) => void;
  onClose: () => void;
}) {
  const [lastId, setLastId] = React.useState(shopId);
  if (shopId && shopId !== lastId) setLastId(shopId);
  const id = shopId ?? lastId ?? null;
  const query = useAdminShop(id);
  const detail = query.data && query.data.id === id ? query.data : undefined;
  const head: AdminShopRow | undefined = detail ?? (seed && seed.id === id ? seed : undefined);
  const pending = detail?.pending ?? null;

  return (
    <ResponsiveSheet
      open={shopId !== undefined}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={head?.name ?? P.close}
      header={<PanelHeader row={head} onClose={onClose} />}
      footer={
        detail && tab === 'billing' && pending ? (
          <ReviewBar shop={detail} payment={pending} />
        ) : undefined
      }
    >
      {detail ? (
        <Tabs
          value={tab}
          onValueChange={(value) => {
            const next = PANEL_TABS.find((t) => t === value);
            if (next) onTab(next);
          }}
          className="gap-3 p-4"
        >
          <TabsList className="w-full">
            {PANEL_TABS.map((t) => (
              <TabsTrigger key={t} value={t} className="h-10 flex-1 md:h-8">
                {P.tabs[t]}
                {t === 'billing' && pending ? (
                  <span className="ml-1 size-2 rounded-full bg-warning" aria-hidden="true" />
                ) : null}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="overview">
            <Overview shop={detail} onClose={onClose} />
          </TabsContent>
          <TabsContent value="billing">
            <Billing shop={detail} />
          </TabsContent>
          <TabsContent value="activity">
            <Activity entries={detail.activity} />
          </TabsContent>
        </Tabs>
      ) : query.isError ? (
        <div className="flex flex-col items-center gap-3 p-8 text-center">
          <p className="text-sm text-muted-foreground">
            {errorCodeOf(query.error) === 'not_found' ? A.notFound : A.loadError}
          </p>
          <Button variant="outline" className="h-11 md:h-9" onClick={() => void query.refetch()}>
            {A.tryAgain}
          </Button>
        </div>
      ) : (
        <div className="space-y-3 p-4" aria-hidden="true">
          <Skeleton className="h-9 w-full rounded-lg" />
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      )}
    </ResponsiveSheet>
  );
}

function PanelHeader({ row, onClose }: { row: AdminShopRow | undefined; onClose: () => void }) {
  return (
    <div className="flex items-start gap-3 border-b px-4 pt-3 pb-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <StoreIcon className="size-5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        {row ? (
          <>
            <h2 className="truncate text-lg leading-tight font-bold">{row.name}</h2>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">
              {row.ownerName} · {row.city}
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <ShopStateBadge row={row} />
              {row.flags.map((f) => (
                <FlagBadge key={f} flag={f} />
              ))}
            </div>
          </>
        ) : (
          <Skeleton className="h-12 w-48" />
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="-mt-1 -mr-2 size-11"
        aria-label={P.close}
        onClick={onClose}
      >
        <XIcon />
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------- overview

type Ask = 'extra' | 'record' | 'close' | 'delete' | 'owner' | null;

function Overview({ shop, onClose }: { shop: AdminShopDetail; onClose: () => void }) {
  const now = useNow().getTime();
  const online = useOnlineStatus();
  const approve = useApproveGoLive();
  const approveAction = useAsyncAction();
  const remind = useSendPlanReminder();
  const remindAction = useAsyncAction();
  const reopen = useReopenShop();
  const [ask, setAsk] = React.useState<Ask>(null);
  const link = `${env.VITE_STOREFRONT_URL}/${shop.slug}`;
  const live = shop.stage === 'live';
  const notYet = shop.stage === 'setting_up' || shop.stage === 'asked';
  const closed = shop.stage === 'closed';

  const rows: InfoRow[] = [
    { id: 'owner', label: P.owner, value: shop.ownerName },
    {
      id: 'email',
      label: P.email,
      value: (
        <span className="flex items-center gap-1">
          <span className="truncate">{shop.ownerEmail}</span>
          <CopyButton value={shop.ownerEmail} iconOnly className="-my-1 size-8" />
        </span>
      ),
    },
    {
      id: 'mobile',
      label: P.mobile,
      value: (
        <span className="flex items-center gap-1 tabular-nums">
          {formatPhPhone(shop.ownerPhone)}
          <CopyButton
            value={formatPhPhone(shop.ownerPhone).replace(/\s/g, '')}
            iconOnly
            className="-my-1 size-8"
          />
        </span>
      ),
    },
    { id: 'kind', label: P.kind, value: signupWords.shop.kinds[shop.kind] },
    { id: 'city', label: P.city, value: shop.city },
    ...(shop.facebookPage ? [{ id: 'fb', label: P.facebook, value: shop.facebookPage }] : []),
    { id: 'source', label: P.source, value: sourceText(shop.source) },
    { id: 'signed', label: P.signedUp, value: formatManila(shop.createdAt, 'date') },
  ];
  const planRows: InfoRow[] = [
    { id: 'plan', label: P.plan, value: P.planValue(formatPeso(shop.priceMonthly)) },
    {
      id: 'until',
      label: shop.paidUntil ? P.paidUntil : P.trialUntil,
      value: shop.paidUntil
        ? dayText(shop.paidUntil)
        : shop.trialEndsAt
          ? formatManila(shop.trialEndsAt, 'date')
          : P.notLive,
    },
    {
      id: 'storage',
      label: P.storage,
      value: P.storageValue(
        formatStorage(shop.storageUsedBytes),
        formatStorage(shop.storageLimitBytes),
      ),
    },
    { id: 'orders', label: P.orders, value: String(shop.orders7d) },
    { id: 'members', label: P.members, value: String(shop.members) },
    { id: 'active', label: P.lastActive, value: agoText(shop.lastActiveAt, now) },
    ...(notYet ? [{ id: 'steps', label: P.steps, value: P.stepsValue(shop.setupDone) }] : []),
  ];

  return (
    <div className="flex flex-col gap-4">
      {notYet ? (
        <div className="flex flex-col gap-2 rounded-xl border border-primary/30 bg-primary/5 p-3">
          <p className="text-sm text-foreground">
            {shop.setupDone === 4 ? P.approveHint : P.approveEarlyHint}
          </p>
          <AsyncButton
            status={approveAction.status}
            busyLabel={P.approving}
            doneLabel={P.approve}
            disabled={!online}
            className="h-11 font-semibold md:h-9"
            onClick={() =>
              void approveAction
                .run(async () => {
                  await approve.mutateAsync({ shopId: shop.id });
                  notify({ title: P.approved(shop.name), tone: 'success' });
                })
                .catch(failed)
            }
          >
            <RocketIcon aria-hidden="true" />
            {shop.setupDone === 4 ? P.approve : P.approveEarly}
          </AsyncButton>
        </div>
      ) : null}
      {shop.closesOn ? (
        <p className="rounded-lg bg-warning-soft px-3 py-2 text-sm text-warning-text">
          {A.shops.line.closes(dayText(shop.closesOn))}
        </p>
      ) : null}

      <InfoList rows={rows} />
      <InfoList rows={planRows} />

      <section className="flex flex-col gap-2" aria-label={P.actions}>
        <h3 className="text-sm font-semibold text-foreground">{P.actions}</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            variant="outline"
            className="h-11 justify-start md:h-9"
            nativeButton={false}
            render={<a href={link} target="_blank" rel="noopener noreferrer" />}
          >
            <ExternalLinkIcon aria-hidden="true" />
            {P.openShop}
          </Button>
          {!closed ? (
            <Button
              variant="outline"
              className="h-11 justify-start md:h-9"
              onClick={() => setAsk('owner')}
            >
              <LifeBuoyIcon aria-hidden="true" />
              {P.openAsOwner}
            </Button>
          ) : null}
          {live ? (
            <>
              <Button
                variant="outline"
                className="h-11 justify-start md:h-9"
                onClick={() => setAsk('record')}
              >
                <WalletIcon aria-hidden="true" />
                {P.recordPayment}
              </Button>
              <Button
                variant="outline"
                className="h-11 justify-start md:h-9"
                onClick={() => setAsk('extra')}
              >
                <CalendarPlusIcon aria-hidden="true" />
                {P.extraDays}
              </Button>
              <AsyncButton
                variant="outline"
                status={remindAction.status}
                busyLabel={B.sending}
                doneLabel={B.sent}
                disabled={!online}
                className="h-11 justify-start md:h-9"
                onClick={() =>
                  void remindAction
                    .run(async () => {
                      await remind.mutateAsync({ shopId: shop.id });
                      notify({ title: P.reminded, tone: 'success' });
                    })
                    .catch(failed)
                }
              >
                <BellIcon aria-hidden="true" />
                {P.remind}
              </AsyncButton>
            </>
          ) : null}
          {closed ? (
            <Button
              variant="outline"
              className="h-11 justify-start md:h-9"
              disabled={!online || reopen.isPending}
              onClick={() =>
                void reopen
                  .mutateAsync({ shopId: shop.id })
                  .then(() => notify({ title: P.reopened, tone: 'success' }))
                  .catch(failed)
              }
            >
              <RotateCcwIcon aria-hidden="true" />
              {P.reopen}
            </Button>
          ) : (
            <Button
              variant="outline"
              className="h-11 justify-start text-destructive-text md:h-9"
              onClick={() => setAsk('close')}
            >
              <XCircleIcon aria-hidden="true" />
              {P.closeShop}
            </Button>
          )}
          {closed && !shop.hasDemoData ? (
            <Button
              variant="outline"
              className="h-11 justify-start text-destructive-text md:h-9"
              onClick={() => setAsk('delete')}
            >
              <Trash2Icon aria-hidden="true" />
              {P.deleteForever}
            </Button>
          ) : null}
        </div>
        {shop.remindedAt ? (
          <p className="text-xs text-muted-foreground">
            {P.remindedOn(formatManila(shop.remindedAt, 'datetime'))}
          </p>
        ) : null}
      </section>

      <ExtraDaysDialog
        shop={shop}
        open={ask === 'extra'}
        onOpenChange={(o) => setAsk(o ? 'extra' : null)}
      />
      <RecordPaymentDialog
        shop={shop}
        open={ask === 'record'}
        onOpenChange={(o) => setAsk(o ? 'record' : null)}
      />
      <CloseShopDialog
        shop={shop}
        open={ask === 'close'}
        onOpenChange={(o) => setAsk(o ? 'close' : null)}
      />
      <DeleteShopDialog
        shop={shop}
        open={ask === 'delete'}
        onOpenChange={(o) => setAsk(o ? 'delete' : null)}
        onDeleted={onClose}
      />
      <OpenAsOwnerDialog
        shop={shop}
        open={ask === 'owner'}
        onOpenChange={(o) => setAsk(o ? 'owner' : null)}
      />
    </div>
  );
}

// ---------------------------------------------------------------- billing

function Billing({ shop }: { shop: AdminShopDetail }) {
  const note = useSendBillingNote();
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">{B.adminHint}</p>
      <BillingThread
        thread={shop.thread}
        payments={shop.payments}
        viewer="admin"
        ownerName={shop.ownerName}
      />
      <BillingComposer
        onSend={async (text) => {
          await note.mutateAsync({ shopId: shop.id, text });
        }}
      />
    </div>
  );
}

/**
 * Checking a plan payment (T88), pinned under the Billing chat: the reminder to check the money in GCash or
 * Maya first, Approve the amount, or Not approved with a picked reason. A different amount needs a reason.
 */
function ReviewBar({ shop, payment }: { shop: AdminShopDetail; payment: PlanPayment }) {
  const online = useOnlineStatus();
  const review = useReviewPlanPayment();
  const approve = useAsyncAction();
  const [mode, setMode] = React.useState<'ask' | 'reject' | 'amount'>('ask');
  const [amount, setAmount] = React.useState<number>(payment.amount);
  const [why, setWhy] = React.useState('');
  const [tried, setTried] = React.useState(false);
  const shown = formatPeso(mode === 'amount' ? amount : payment.amount);

  const doApprove = () =>
    void approve
      .run(async () => {
        const different = mode === 'amount' && amount !== payment.amount;
        if (different && why.trim().length < 2) {
          setTried(true);
          throw new Error('reason');
        }
        await review.mutateAsync({
          shopId: shop.id,
          paymentId: payment.id,
          verdict: 'approve',
          amount: different ? amount : null,
          amountReason: different ? why.trim() : null,
        });
        notify({ title: B.approvedToast(shop.name), tone: 'success' });
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.message === 'reason') return;
        failed(err);
      });

  const doReject = (reason: PlanRejectReason) =>
    void review
      .mutateAsync({ shopId: shop.id, paymentId: payment.id, verdict: 'reject', reason })
      .then(() => {
        notify({ title: B.rejectedToast, tone: 'success' });
        setMode('ask');
      })
      .catch(failed);

  if (mode === 'reject') {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold">{B.pickReason}</p>
        <div className="grid grid-cols-2 gap-2">
          {PLAN_REJECT_REASONS.map((r) => (
            <Button
              key={r}
              variant="outline"
              className="h-auto min-h-11 text-wrap whitespace-normal md:min-h-9"
              disabled={!online || review.isPending}
              onClick={() => doReject(r)}
            >
              {B.reasonButtons[r]}
            </Button>
          ))}
        </div>
        <Button variant="ghost" className="h-11 md:h-9" onClick={() => setMode('ask')}>
          {B.back}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="flex items-start gap-1.5 rounded-lg bg-warning-soft px-2.5 py-2 text-xs text-warning-soft-foreground">
        <ShieldCheckIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        {B.checkApp}
      </p>
      {mode === 'amount' ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="review-amount">{B.amountLabel}</FieldLabel>
            <PesoInput id="review-amount" value={amount} onChange={setAmount} />
          </Field>
          <Field data-invalid={tried && why.trim().length < 2 ? true : undefined}>
            <FieldLabel htmlFor="review-why">{B.amountReason}</FieldLabel>
            <Input
              id="review-why"
              className="h-11 text-base md:h-9 md:text-sm"
              maxLength={120}
              value={why}
              onChange={(e) => setWhy(e.target.value)}
            />
            {tried && why.trim().length < 2 ? <FieldError>{B.amountReasonBad}</FieldError> : null}
          </Field>
        </div>
      ) : null}
      <div className="flex gap-2">
        <AsyncButton
          status={approve.status}
          busyLabel={B.approving}
          doneLabel={B.approve(shown)}
          disabled={!online || review.isPending}
          onClick={doApprove}
          className="h-12 flex-1 text-base font-semibold md:h-11"
        >
          <CheckIcon aria-hidden="true" />
          {B.approve(shown)}
        </AsyncButton>
        <Button
          variant="outline"
          className="h-12 md:h-11"
          disabled={!online || review.isPending}
          onClick={() => setMode('reject')}
        >
          {B.notApproved}
        </Button>
      </div>
      {mode === 'ask' ? (
        <Button
          variant="link"
          className="h-9 self-start px-0 text-xs"
          onClick={() => setMode('amount')}
        >
          {B.otherAmount}
        </Button>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------- activity

function activityLine(a: ShopActivity): string {
  const L = A.activity;
  const amount = a.amount !== null ? formatPeso(a.amount) : '';
  switch (a.kind) {
    case 'signed_up':
      return L.signed_up;
    case 'asked':
      return L.asked;
    case 'approved':
      return L.approved;
    case 'payment_sent':
      return L.payment_sent(amount);
    case 'payment_approved':
      return L.payment_approved(amount);
    case 'payment_rejected':
      return L.payment_rejected(
        a.reason && isRejectReason(a.reason) ? billingWords.reasons[a.reason] : '',
      );
    case 'payment_recorded':
      return L.payment_recorded(amount);
    case 'reminder':
      return L.reminder;
    case 'extra_days':
      return L.extra_days(a.days ?? 0, a.note ?? '');
    case 'support':
      return L.support(a.minutes ?? 0, supportReason(a.reason));
    case 'closed':
      return L.closed(closeReason(a.reason));
    case 'reopened':
      return L.reopened;
    case 'created_by_admin':
      return L.created_by_admin;
  }
}

function isRejectReason(value: string): value is PlanRejectReason {
  return PLAN_REJECT_REASONS.some((r) => r === value);
}

function supportReason(value: string | null): string {
  if (value === 'set_up' || value === 'fix_problem' || value === 'owner_asked')
    return supportWords.reasons[value];
  return '';
}

function closeReason(value: string | null): string {
  switch (value) {
    case 'not_paying':
    case 'owner_asked':
    case 'duplicate':
    case 'not_real':
    case 'other':
      return A.close.reasons[value];
    default:
      return '';
  }
}

function Activity({ entries }: { entries: readonly ShopActivity[] }) {
  if (entries.length === 0) return <p className="text-sm text-muted-foreground">{P.noActivity}</p>;
  return (
    <ol className="flex flex-col gap-2">
      {entries.map((a) => (
        <li key={a.id}>
          <Item variant="outline" size="sm" className="items-start">
            <ItemMedia
              className={cn(
                'mt-0.5 size-2.5 rounded-full',
                a.by === 'admin'
                  ? 'bg-primary'
                  : a.by === 'owner'
                    ? 'bg-success'
                    : 'bg-muted-foreground',
              )}
            />
            <ItemContent>
              <ItemTitle className="text-sm font-medium text-wrap">{activityLine(a)}</ItemTitle>
              <ItemDescription className="tabular-nums">
                {A.activity.by[a.by]} · {formatManila(a.at, 'datetime')}
                {a.events.length > 0
                  ? ` · ${A.activity.meta(a.events.map((e) => A.tracking.names[e]).join(', '))}`
                  : ''}
              </ItemDescription>
            </ItemContent>
          </Item>
        </li>
      ))}
    </ol>
  );
}
