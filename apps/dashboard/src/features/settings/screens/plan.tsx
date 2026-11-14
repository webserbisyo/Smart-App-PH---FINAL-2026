import * as React from 'react';
import { Link } from '@tanstack/react-router';
import {
  CheckIcon,
  CircleAlertIcon,
  CircleCheckIcon,
  CirclePauseIcon,
  ClockIcon,
  GiftIcon,
  HardDriveIcon,
  HourglassIcon,
  WalletIcon,
  XCircleIcon,
} from 'lucide-react';
import {
  PLAN_MONTH_CHOICES,
  PLAN_PAY_METHODS,
  billingWords,
  errorWords,
  formatManila,
  formatPeso,
  formatStorage,
  planAmount,
  planCoversUntil,
  settingsWords,
  supportWords,
  words,
  type Plan,
  type PlanMonths,
  type PlanPayMethod,
  type PlanPaymentStatus,
  type PlanStatus,
} from '@smartapp/core';
import {
  errorCodeOf,
  usePlan,
  useSendPlanNote,
  useStorage,
  useSubmitPlanPayment,
} from '@smartapp/data';
import { Badge } from '@smartapp/ui/components/badge';
import { Button } from '@smartapp/ui/components/button';
import { Field, FieldDescription, FieldError, FieldLabel } from '@smartapp/ui/components/field';
import { Input } from '@smartapp/ui/components/input';
import { Separator } from '@smartapp/ui/components/separator';
import { ToggleGroup, ToggleGroupItem } from '@smartapp/ui/components/toggle-group';
import { AsyncButton, useAsyncAction } from '@smartapp/ui/compositions/async-button';
import { CopyButton } from '@smartapp/ui/compositions/copy-button';
import { notify } from '@smartapp/ui/compositions/notify';
import {
  ResponsiveDialog,
  ResponsiveDialogFooter,
} from '@smartapp/ui/compositions/responsive-dialog';
import { cn } from 'cn';
import { BillingComposer, BillingThread } from '@/app/billing-thread';
import { ImageUploadRow, type UploadedImage } from '@/app/image-upload-row';
import { Notice, type NoticeTone } from '@/app/notice';
import { PageError } from '@/app/page-state';
import { useSupport } from '@/app/support';
import { useOnlineStatus } from '@/app/use-online-status';
import { SettingsCard, SettingsPage, SettingsSkeleton } from '../settings-ui.js';
import { dayLabel } from '../status.js';

const W = settingsWords.plan;
// A receipt screenshot is kept readable (T65).
const PROOF_SIDE = 1600;

const STATE_LOOK: Record<PlanStatus, { icon: React.ReactNode; className: string }> = {
  trial: { icon: <GiftIcon />, className: 'bg-info-soft text-info-text' },
  active: { icon: <CircleCheckIcon />, className: 'bg-success-soft text-success-text' },
  due: { icon: <ClockIcon />, className: 'bg-warning-soft text-warning-text' },
  overdue: { icon: <CircleAlertIcon />, className: 'bg-destructive/10 text-destructive-text' },
  paused: { icon: <CirclePauseIcon />, className: 'bg-destructive/10 text-destructive-text' },
};

const PAYMENT_LOOK: Record<PlanPaymentStatus, { icon: React.ReactNode; className: string }> = {
  pending: { icon: <HourglassIcon />, className: 'bg-warning-soft text-warning-text' },
  approved: { icon: <CircleCheckIcon />, className: 'bg-success-soft text-success-text' },
  rejected: { icon: <XCircleIcon />, className: 'bg-destructive/10 text-destructive-text' },
};

export function PlanSettingsScreen() {
  const plan = usePlan();
  if (plan.isPending) return <SettingsSkeleton />;
  if (plan.isError || !plan.data)
    return (
      <PageError
        title={W.errorTitle}
        message={errorWords(errorCodeOf(plan.error))}
        retryLabel={settingsWords.tryAgain}
        onRetry={() => void plan.refetch()}
      />
    );
  return <PlanView plan={plan.data} />;
}

/** The notice at the top: what the owner should know about paying, in one line. */
function planNotice(plan: Plan): { tone: NoticeTone; icon: React.ReactNode; text: string } | null {
  if (plan.pending)
    return {
      tone: 'info',
      icon: <HourglassIcon className="size-4" />,
      text: W.pendingLine(formatPeso(plan.pending.amount), plan.pending.reference),
    };
  switch (plan.status) {
    case 'trial':
      return plan.trialEndsAt
        ? {
            tone: 'brand',
            icon: <GiftIcon className="size-4" />,
            text: W.trialNotice(formatManila(plan.trialEndsAt, 'date')),
          }
        : null;
    case 'due':
      return plan.paidUntil
        ? {
            tone: 'warning',
            icon: <ClockIcon className="size-4" />,
            text: W.dueNotice(dayLabel(plan.paidUntil)),
          }
        : null;
    case 'overdue':
      return {
        tone: 'error',
        icon: <CircleAlertIcon className="size-4" />,
        text: W.overdueNotice(plan.graceUntil ? dayLabel(plan.graceUntil) : ''),
      };
    case 'paused':
      return { tone: 'error', icon: <CirclePauseIcon className="size-4" />, text: W.pausedNotice };
    case 'active':
      return null;
  }
}

/** The dates that matter for this state, as label and value pairs. */
function planDates(plan: Plan): { label: string; value: string }[] {
  const out: { label: string; value: string }[] = [];
  if (plan.status === 'trial' && plan.trialEndsAt)
    out.push({ label: W.trialUntil, value: formatManila(plan.trialEndsAt, 'date') });
  if (plan.status === 'active' && plan.paidUntil)
    out.push({ label: W.paidUntil, value: dayLabel(plan.paidUntil) });
  if (plan.status === 'due' && plan.paidUntil)
    out.push({ label: W.dueOn, value: dayLabel(plan.paidUntil) });
  if (plan.status === 'overdue' || plan.status === 'paused') {
    if (plan.paidUntil) out.push({ label: W.paidUntil, value: dayLabel(plan.paidUntil) });
    if (plan.status === 'overdue' && plan.graceUntil)
      out.push({ label: W.graceUntil, value: dayLabel(plan.graceUntil) });
  }
  return out;
}

function PlanView({ plan }: { plan: Plan }) {
  const storage = useStorage();
  const online = useOnlineStatus();
  const [payOpen, setPayOpen] = React.useState(false);
  const helping = useSupport() !== null;
  const sendNote = useSendPlanNote();
  const look = STATE_LOOK[plan.status];
  const notice = planNotice(plan);
  const urgent = plan.status !== 'active';

  return (
    <SettingsPage id="plan">
      {notice ? (
        <Notice tone={notice.tone} icon={notice.icon}>
          {notice.text}
        </Notice>
      ) : null}

      <SettingsCard
        title={W.yourPlan}
        action={
          <Badge className={cn('gap-1 [&_svg]:size-3.5', look.className)}>
            {look.icon}
            {W.state[plan.status]}
          </Badge>
        }
      >
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-2xl font-bold tracking-tight text-foreground">{W.pro}</span>
            <span className="text-sm text-muted-foreground tabular-nums">
              {W.perMonth(formatPeso(plan.priceMonthly))}
            </span>
          </div>
          {plan.pending ? null : (
            <Button
              className="h-11 font-semibold md:h-9"
              variant={urgent ? 'default' : 'outline'}
              disabled={!online || helping}
              onClick={() => setPayOpen(true)}
            >
              <WalletIcon />
              {urgent ? W.pay : W.payAhead}
            </Button>
          )}
        </div>
        {helping ? <p className="text-xs text-muted-foreground">{supportWords.locked}</p> : null}
        <dl className="grid gap-3 sm:grid-cols-2">
          {planDates(plan).map((row) => (
            <div key={row.label} className="flex flex-col gap-0.5 rounded-lg bg-muted/60 px-3 py-2">
              <dt className="text-xs text-muted-foreground">{row.label}</dt>
              <dd className="text-sm font-semibold text-foreground tabular-nums">{row.value}</dd>
            </div>
          ))}
          <div className="flex flex-col gap-0.5 rounded-lg bg-muted/60 px-3 py-2">
            <dt className="text-xs text-muted-foreground">{W.storage}</dt>
            <dd className="text-sm font-semibold text-foreground tabular-nums">
              <Link
                to="/settings/storage"
                className="inline-flex items-center gap-1.5 underline-offset-4 hover:underline"
              >
                <HardDriveIcon className="size-3.5 text-muted-foreground" aria-hidden />
                {W.storageValue(
                  storage.data ? formatStorage(storage.data.usedBytes) : '…',
                  formatStorage(plan.storageLimitBytes),
                )}
              </Link>
            </dd>
          </div>
        </dl>
      </SettingsCard>

      <SettingsCard title={billingWords.title}>
        <p className="text-sm text-muted-foreground">{billingWords.ownerHint}</p>
        <BillingThread
          thread={plan.thread}
          payments={plan.history}
          viewer="owner"
          ownerName={billingWords.you}
        />
        <BillingComposer
          onSend={async (text) => {
            await sendNote.mutateAsync({ text });
            notify({ title: billingWords.noteSent, tone: 'success' });
          }}
        />
      </SettingsCard>

      <SettingsCard title={W.includedCard}>
        <ul className="grid gap-2.5 sm:grid-cols-2">
          {W.included.map((line) => (
            <li key={line} className="flex items-start gap-2 text-sm text-foreground">
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-success-soft text-success-text">
                <CheckIcon className="size-3.5" aria-hidden />
              </span>
              {line}
            </li>
          ))}
        </ul>
      </SettingsCard>

      <SettingsCard title={W.historyCard}>
        {plan.history.length === 0 ? (
          <p className="text-sm text-muted-foreground">{W.noHistory}</p>
        ) : (
          <ul className="flex flex-col">
            {plan.history.map((p, index) => {
              const status = PAYMENT_LOOK[p.status];
              return (
                <li key={p.id} className="flex flex-col">
                  {index > 0 ? <Separator className="my-3" /> : null}
                  <div className="flex items-start gap-3">
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="text-sm font-medium text-foreground">
                        {W.historyRow(p.months)}
                      </span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {formatManila(p.submittedAt, 'date')} · {words.shop.paymentMethod[p.method]}{' '}
                        · {p.reference}
                      </span>
                      {p.status === 'approved' ? (
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {W.covers(dayLabel(p.coversUntil))}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="text-sm font-semibold text-foreground tabular-nums">
                        {formatPeso(p.amount)}
                      </span>
                      <Badge className={cn('gap-1 [&_svg]:size-3', status.className)}>
                        {status.icon}
                        {W.paymentStatus[p.status]}
                      </Badge>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </SettingsCard>

      <ResponsiveDialog
        open={payOpen}
        onOpenChange={setPayOpen}
        title={W.payTitle(formatPeso(plan.priceMonthly))}
        scroll
      >
        {payOpen ? <PayForm plan={plan} onClose={() => setPayOpen(false)} /> : null}
      </ResponsiveDialog>
    </SettingsPage>
  );
}

/** Pay for Pro: how many months, GCash or Maya, the number to send to, the reference and the screenshot. */
function PayForm({ plan, onClose }: { plan: Plan; onClose: () => void }) {
  const submit = useSubmitPlanPayment();
  const action = useAsyncAction();
  const online = useOnlineStatus();
  const [months, setMonths] = React.useState<PlanMonths>(1);
  const [method, setMethod] = React.useState<PlanPayMethod>('gcash');
  const [reference, setReference] = React.useState('');
  const [proof, setProof] = React.useState<UploadedImage | null>(null);
  const [tried, setTried] = React.useState(false);

  // Pay 6 months, get 1 free (T92), when the founder has it on.
  const priceOf = (n: number) => planAmount(n, plan.priceMonthly, plan.sixMonthBonus);
  const amount = formatPeso(priceOf(months));
  const methodName = words.shop.paymentMethod[method];
  const number = method === 'gcash' ? plan.payTo.gcash : plan.payTo.maya;
  const refProblem = reference.trim().length >= 6 ? undefined : W.referenceBad;
  const proofProblem = proof ? undefined : W.proofRequired;
  const covers = planCoversUntil(plan.paidUntil, months, new Date());

  const onSubmit = async () => {
    setTried(true);
    if (refProblem || proofProblem || !proof) return;
    try {
      await action.run(() =>
        submit.mutateAsync({ months, method, reference: reference.trim(), proofPath: proof.ref }),
      );
      notify({ title: W.submitted, tone: 'success' });
      onClose();
    } catch (err) {
      notify({ title: errorWords(errorCodeOf(err)), tone: 'error' });
    }
  };

  return (
    <form
      className="flex flex-col gap-5"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void onSubmit();
      }}
    >
      <Field>
        <FieldLabel id="pay-months-label">{W.months}</FieldLabel>
        <ToggleGroup
          aria-labelledby="pay-months-label"
          value={[String(months)]}
          onValueChange={(value) => {
            const next = PLAN_MONTH_CHOICES.find((n) => String(n) === value[0]);
            if (next) setMonths(next);
          }}
          className="grid w-full grid-cols-3"
        >
          {PLAN_MONTH_CHOICES.map((n) => (
            <ToggleGroupItem key={n} value={String(n)} className="h-auto flex-col gap-0 py-2">
              <span className="text-sm font-semibold">{W.monthsOption(n)}</span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {formatPeso(priceOf(n))}
              </span>
              {n === 6 && plan.sixMonthBonus ? (
                <span className="text-xs font-semibold text-success-text">
                  {billingWords.freeMonth}
                </span>
              ) : null}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </Field>

      <Field>
        <FieldLabel id="pay-method-label">{W.method}</FieldLabel>
        <ToggleGroup
          aria-labelledby="pay-method-label"
          value={[method]}
          onValueChange={(value) => {
            const next = PLAN_PAY_METHODS.find((m) => m === value[0]);
            if (next) setMethod(next);
          }}
          className="grid w-full grid-cols-2"
        >
          {PLAN_PAY_METHODS.map((m) => (
            <ToggleGroupItem key={m} value={m} className="h-11 md:h-9">
              {words.shop.paymentMethod[m]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </Field>

      <div className="flex flex-col gap-2 rounded-xl border border-primary/20 bg-primary/5 p-4">
        <span className="text-sm text-muted-foreground">{W.sendTo(amount, methodName)}</span>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-col">
            <span className="text-xl font-bold tracking-wide text-foreground tabular-nums">
              {number}
            </span>
            <span className="text-xs text-muted-foreground">{plan.payTo.accountName}</span>
          </div>
          <CopyButton
            value={number.replace(/\s/g, '')}
            label={W.copyNumber}
            className="h-11 md:h-9"
          />
        </div>
      </div>

      <Field data-invalid={tried && refProblem ? true : undefined}>
        <FieldLabel htmlFor="pay-reference">{W.reference}</FieldLabel>
        <Input
          id="pay-reference"
          className="h-11 md:h-9"
          autoComplete="off"
          maxLength={40}
          value={reference}
          aria-invalid={tried && refProblem ? true : undefined}
          onChange={(e) => setReference(e.target.value)}
        />
        {tried && refProblem ? (
          <FieldError>{refProblem}</FieldError>
        ) : (
          <FieldDescription>{W.referenceHelp}</FieldDescription>
        )}
      </Field>

      <div className="flex flex-col gap-1.5">
        <ImageUploadRow
          id="pay-proof"
          kind="plan_proof"
          maxSide={PROOF_SIDE}
          label={W.proof}
          src={proof?.preview ?? null}
          onUploaded={setProof}
          onRemove={() => setProof(null)}
        />
        {tried && proofProblem ? (
          <p role="alert" className="text-xs font-medium text-destructive-text">
            {proofProblem}
          </p>
        ) : null}
      </div>

      <p className="flex items-center gap-2 text-sm font-medium text-foreground">
        <CircleCheckIcon className="size-4 text-success-text" aria-hidden />
        {W.coversUntil(dayLabel(covers))}
      </p>

      <ResponsiveDialogFooter>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" className="h-11 md:h-9" onClick={onClose}>
            {W.cancel}
          </Button>
          <AsyncButton
            type="submit"
            status={action.status}
            busyLabel={W.submitting}
            doneLabel={W.submit}
            disabled={!online}
            className="h-11 font-semibold md:h-9"
          >
            {W.submit}
          </AsyncButton>
        </div>
      </ResponsiveDialogFooter>
    </form>
  );
}
