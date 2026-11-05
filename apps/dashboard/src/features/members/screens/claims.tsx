import * as React from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { EllipsisIcon, GiftIcon, InboxIcon, PlusIcon, WifiOffIcon } from 'lucide-react';
import {
  CLAIM_CANCEL_REASONS,
  CLAIM_STATUSES,
  errorWords,
  formatManila,
  membersWords,
  words,
  type ClaimCancelReason,
  type ClaimStatus,
  type OwnerClaim,
  type StampCardSettings,
} from '@smartapp/core';
import {
  errorCodeOf,
  useCancelClaim,
  useGiveClaim,
  useRewardClaims,
  useSaveStampCard,
  useStampCard,
} from '@smartapp/data';
import { Button } from '@smartapp/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@smartapp/ui/components/dropdown-menu';
import { Field, FieldLabel } from '@smartapp/ui/components/field';
import { Progress } from '@smartapp/ui/components/progress';
import { RadioGroup, RadioGroupItem } from '@smartapp/ui/components/radio-group';
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
} from '@smartapp/ui/components/reui/number-field';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@smartapp/ui/components/toggle-group';
import { AsyncButton, useAsyncAction } from '@smartapp/ui/compositions/async-button';
import { notify } from '@smartapp/ui/compositions/notify';
import { PageHeader } from '@smartapp/ui/compositions/page-header';
import {
  ResponsiveDialog,
  ResponsiveDialogFooter,
} from '@smartapp/ui/compositions/responsive-dialog';
import { Notice } from '@/app/notice';
import { useNow } from '@/app/orders/use-now';
import { PageEmpty, PageError } from '@/app/page-state';
import { useOnlineStatus } from '@/app/use-online-status';
import { MemberAvatar } from '../member-rows.js';
import { useMembersTabs } from '../tabs.js';
import { daysSince } from '../when.js';

const W = membersWords.prizes;
const CHIP =
  'h-10 gap-1.5 rounded-full border border-border bg-card px-3 text-sm font-semibold text-muted-foreground aria-pressed:border-primary aria-pressed:bg-accent aria-pressed:text-foreground md:h-8';
const ADD_MAX = 999;

/**
 * Prizes (custom prize cards, D8): claims waiting at the counter first, longest wait on top; a claim holds
 * a piece until it is given, and cancelling gives the stamps and the piece back (M7).
 */
export function PrizeClaimsScreen() {
  const tabs = useMembersTabs();
  const online = useOnlineStatus();
  const now = useNow(60_000);
  const cardQuery = useStampCard();
  const claimsQuery = useRewardClaims();
  const [filter, setFilter] = React.useState<ClaimStatus>('pending');
  const [cancelling, setCancelling] = React.useState<OwnerClaim | null>(null);
  const [adding, setAdding] = React.useState(false);

  const card = cardQuery.data;
  const claims = React.useMemo(() => claimsQuery.data ?? [], [claimsQuery.data]);
  const count = (status: ClaimStatus) => claims.filter((c) => c.status === status).length;
  const shown = claims.filter((c) => c.status === filter);

  let body: React.ReactNode;
  if (cardQuery.isPending || claimsQuery.isPending) {
    body = <ClaimsSkeleton />;
  } else if (cardQuery.isError || claimsQuery.isError || !card) {
    body = (
      <PageError
        title={W.errorTitle}
        message={errorWords(errorCodeOf(cardQuery.error ?? claimsQuery.error))}
        retryLabel={membersWords.states.tryAgain}
        onRetry={() => {
          void cardQuery.refetch();
          void claimsQuery.refetch();
        }}
      />
    );
  } else if (card.reward.kind !== 'custom' && claims.length === 0) {
    body = (
      <PageEmpty
        variant="box"
        icon={<GiftIcon className="size-8 text-muted-foreground" />}
        title={W.notCustomTitle}
        description={W.notCustomBody}
        action={
          <Button
            variant="outline"
            className="h-11 md:h-9"
            nativeButton={false}
            render={<Link to="/members/stamp-card" />}
          >
            {W.openCard}
          </Button>
        }
      />
    );
  } else {
    body = (
      <div className="flex flex-col gap-3">
        {card.reward.kind === 'custom' ? (
          <PiecesCard card={card} online={online} onAdd={() => setAdding(true)} />
        ) : null}
        <ToggleGroup
          value={[filter]}
          onValueChange={(next) => {
            const picked = CLAIM_STATUSES.find((s) => s === next[0]);
            if (picked) setFilter(picked);
          }}
          aria-label={W.filtersLabel}
          spacing={1.5}
          className="w-max"
        >
          {CLAIM_STATUSES.map((s) => (
            <ToggleGroupItem key={s} value={s} className={CHIP}>
              {W.filters[s]}
              <span className="tabular-nums opacity-80">{count(s)}</span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        {shown.length === 0 ? (
          <PageEmpty
            icon={<InboxIcon className="size-8 text-muted-foreground" />}
            title={W.empty[filter]}
            description={W.emptyBody(card.reward.title)}
          />
        ) : (
          <ul className="flex flex-col overflow-hidden rounded-xl border bg-card">
            {shown.map((claim) => (
              <ClaimRow
                key={claim.id}
                claim={claim}
                now={now}
                online={online}
                onCancel={() => setCancelling(claim)}
              />
            ))}
          </ul>
        )}
      </div>
    );
  }

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
      {card ? (
        <>
          <CancelClaimDialog
            claim={cancelling}
            stamps={card.rule.stampsNeeded}
            onClose={() => setCancelling(null)}
          />
          <AddPiecesDialog card={card} open={adding} onClose={() => setAdding(false)} />
        </>
      ) : null}
    </div>
  );
}

function PiecesCard({
  card,
  online,
  onAdd,
}: {
  card: StampCardSettings;
  online: boolean;
  onAdd: () => void;
}) {
  const { quantityTotal: total, quantityLeft: left, title, onePerCustomer } = card.reward;
  const limited = total !== null && left !== null;
  return (
    <section className="flex flex-col gap-2 rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="text-base font-bold">{title}</h2>
        <span className="text-sm font-semibold text-muted-foreground tabular-nums">
          {limited ? W.piecesLine(left, total) : W.unlimited}
        </span>
      </div>
      {limited ? (
        <Progress
          value={total > 0 ? (100 * left) / total : 0}
          aria-label={W.piecesLine(left, total)}
        />
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {limited && left === 0 ? W.allClaimed(total) : W.piecesHint(onePerCustomer)}
        </p>
        {limited ? (
          <Button
            variant="outline"
            className="h-11 gap-1.5 md:h-9"
            disabled={!online}
            onClick={onAdd}
          >
            <PlusIcon aria-hidden="true" />
            {W.addPieces}
          </Button>
        ) : null}
      </div>
    </section>
  );
}

function ClaimRow({
  claim,
  now,
  online,
  onCancel,
}: {
  claim: OwnerClaim;
  now: Date;
  online: boolean;
  onCancel: () => void;
}) {
  const navigate = useNavigate();
  const give = useGiveClaim();
  const action = useAsyncAction();
  const line =
    claim.status === 'pending'
      ? W.waiting(daysSince(claim.createdAt, now))
      : claim.status === 'given'
        ? W.givenOn(formatManila(claim.givenAt ?? claim.createdAt, 'date'))
        : W.cancelledLine(claim.cancelReason ? W.reasons[claim.cancelReason] : '');

  const onGive = async () => {
    try {
      await action.run(() => give.mutateAsync({ claimId: claim.id }));
      notify({ title: W.givenToast(claim.memberName), tone: 'success' });
    } catch (err) {
      notify({ title: errorWords(errorCodeOf(err)), tone: 'error' });
    }
  };

  return (
    <li className="flex items-center gap-3 border-b px-3 py-3 last:border-b-0 md:px-4">
      <button
        type="button"
        className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-lg text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        onClick={() => void navigate({ to: '/members', search: { member: claim.customerId } })}
        aria-label={membersWords.openMember(claim.memberName)}
      >
        <MemberAvatar name={claim.memberName} member />
        <span className="min-w-0">
          <span className="block truncate font-semibold">{claim.memberName}</span>
          <span className="flex flex-wrap items-center gap-x-1.5 text-sm text-muted-foreground">
            <span className="font-mono text-xs font-semibold tracking-wide text-foreground">
              {claim.code}
            </span>
            <span>{line}</span>
          </span>
        </span>
      </button>
      {claim.status === 'pending' ? (
        <div className="flex shrink-0 items-center gap-1">
          <AsyncButton
            status={action.status}
            busyLabel={W.give}
            doneLabel={W.give}
            disabled={!online}
            className="h-11 font-semibold md:h-9"
            onClick={() => void onGive()}
          >
            {W.give}
          </AsyncButton>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-11 md:size-9"
                  aria-label={W.more(claim.memberName)}
                  disabled={!online}
                />
              }
            >
              <EllipsisIcon aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                variant="destructive"
                className="min-h-11 md:min-h-8"
                onClick={onCancel}
              >
                {W.cancel}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : null}
    </li>
  );
}

function CancelClaimDialog({
  claim,
  stamps,
  onClose,
}: {
  claim: OwnerClaim | null;
  stamps: number;
  onClose: () => void;
}) {
  const [reason, setReason] = React.useState<ClaimCancelReason>('no_show');
  const cancel = useCancelClaim();
  const action = useAsyncAction();
  const close = () => {
    setReason('no_show');
    onClose();
  };
  const onConfirm = async () => {
    if (!claim) return;
    try {
      await action.run(() => cancel.mutateAsync({ claimId: claim.id, reason }));
      notify({ title: W.cancelledToast, tone: 'success' });
      close();
    } catch (err) {
      notify({ title: errorWords(errorCodeOf(err)), tone: 'error' });
    }
  };
  return (
    <ResponsiveDialog
      open={claim !== null}
      onOpenChange={(open) => {
        if (!open) close();
      }}
      title={W.cancelTitle}
      description={claim ? W.cancelBody(claim.memberName, stamps) : ''}
    >
      <div className="flex flex-col gap-4 pt-2">
        <Field>
          <FieldLabel>{W.cancelReason}</FieldLabel>
          <RadioGroup
            value={reason}
            onValueChange={(value) => {
              const next = CLAIM_CANCEL_REASONS.find((r) => r === value);
              if (next) setReason(next);
            }}
            className="grid gap-2 sm:grid-cols-3"
          >
            {CLAIM_CANCEL_REASONS.map((r) => (
              <label
                key={r}
                htmlFor={`cancel-${r}`}
                className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg border px-3 text-sm font-medium"
              >
                <RadioGroupItem value={r} id={`cancel-${r}`} />
                {W.reasons[r]}
              </label>
            ))}
          </RadioGroup>
        </Field>
        <ResponsiveDialogFooter>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
            <Button variant="outline" className="h-11 md:h-9" onClick={close}>
              {W.keep}
            </Button>
            <AsyncButton
              variant="destructive"
              status={action.status}
              busyLabel={W.cancelConfirm}
              doneLabel={W.cancelConfirm}
              className="h-11 font-semibold md:h-9"
              onClick={() => void onConfirm()}
            >
              {W.cancelConfirm}
            </AsyncButton>
          </div>
        </ResponsiveDialogFooter>
      </div>
    </ResponsiveDialog>
  );
}

function AddPiecesDialog({
  card,
  open,
  onClose,
}: {
  card: StampCardSettings;
  open: boolean;
  onClose: () => void;
}) {
  const [n, setN] = React.useState(10);
  const save = useSaveStampCard();
  const action = useAsyncAction();
  const close = () => {
    setN(10);
    onClose();
  };
  const onAdd = async () => {
    const { quantityTotal, quantityLeft } = card.reward;
    if (quantityTotal === null || quantityLeft === null) return;
    try {
      await action.run(() =>
        save.mutateAsync({
          ...card,
          reward: {
            ...card.reward,
            quantityTotal: quantityTotal + n,
            quantityLeft: quantityLeft + n,
          },
        }),
      );
      notify({ title: W.added(n), tone: 'success' });
      close();
    } catch (err) {
      notify({ title: errorWords(errorCodeOf(err)), tone: 'error' });
    }
  };
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
      }}
      title={W.addTitle}
      description={W.addBody(card.reward.title)}
    >
      <div className="flex flex-col gap-4 pt-2">
        <Field>
          <FieldLabel htmlFor="add-pieces">{W.addCount}</FieldLabel>
          <NumberField
            id="add-pieces"
            value={n}
            min={1}
            max={ADD_MAX}
            onValueChange={(value) => {
              if (value !== null && !Number.isNaN(value))
                setN(Math.min(ADD_MAX, Math.max(1, value)));
            }}
            className="w-44"
          >
            <NumberFieldGroup className="h-11 md:h-9">
              <NumberFieldDecrement className="h-full" />
              <NumberFieldInput className="text-base font-semibold tabular-nums" />
              <NumberFieldIncrement className="h-full" />
            </NumberFieldGroup>
          </NumberField>
        </Field>
        <ResponsiveDialogFooter>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
            <Button variant="outline" className="h-11 md:h-9" onClick={close}>
              {membersWords.adjust.cancel}
            </Button>
            <AsyncButton
              status={action.status}
              busyLabel={W.add}
              doneLabel={W.add}
              className="h-11 font-semibold md:h-9"
              onClick={() => void onAdd()}
            >
              {W.add}
            </AsyncButton>
          </div>
        </ResponsiveDialogFooter>
      </div>
    </ResponsiveDialog>
  );
}

function ClaimsSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden="true">
      <Skeleton className="h-28 w-full rounded-xl" />
      <Skeleton className="h-8 w-64 rounded-full" />
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} className="h-16 w-full rounded-xl" />
      ))}
    </div>
  );
}
