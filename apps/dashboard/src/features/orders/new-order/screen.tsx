import * as React from 'react';
import { Link, useBlocker, useNavigate, useParams } from '@tanstack/react-router';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  LockIcon,
  PackageOpenIcon,
  WifiOffIcon,
} from 'lucide-react';
import {
  editBlock,
  errorWords,
  formatPeso,
  manilaDate,
  newOrderWords,
  normalisePhPhone,
  ordersWords,
  words,
  type BasketLine,
  type Item,
  type OwnerOrder,
  type PublicShop,
  type Quote,
} from '@smartapp/core';
import {
  errorCodeOf,
  useCreateOwnerOrder,
  useEditOrder,
  useOrderDetail,
  useOwnerQuote,
  useOwnerSchedule,
  useStorefront,
} from '@smartapp/data';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@smartapp/ui/components/alert-dialog';
import { Button } from '@smartapp/ui/components/button';
import {
  Stepper,
  StepperIndicator,
  StepperItem,
  StepperNav,
  StepperSeparator,
  StepperTitle,
} from '@smartapp/ui/components/reui/stepper';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { AsyncButton, useAsyncAction } from '@smartapp/ui/compositions/async-button';
import { notify } from '@smartapp/ui/compositions/notify';
import { copyText } from '@smartapp/ui/lib/copy-text';
import { cn } from 'cn';
import { Notice } from '@/app/notice';
import { orderNoLabel } from '@/app/orders/order-ticket-label';
import { receiptLink } from '@/app/orders/print-ticket';
import { useNow } from '@/app/orders/use-now';
import { PageEmpty, PageError } from '@/app/page-state';
import { useShop } from '@/app/shop';
import { useOnlineStatus } from '@/app/use-online-status';
import { ChoicesSheet } from './choices-sheet.js';
import { CustomerFields } from './customer-fields.js';
import { DetailsFields } from './details-fields.js';
import {
  addLine,
  draftFromOrder,
  emptyDraft,
  itemCount,
  partValid,
  payloadOf,
  payOf,
  qtyOfItem,
  STEPS,
  type Draft,
  type Step,
} from './draft.js';
import { ItemGrid } from './item-grid.js';
import { OrderLines } from './order-lines.js';
import { PayFields, Totals } from './pay-fields.js';

const W = newOrderWords;

function ComposerSkeleton() {
  return (
    <div
      className="mx-auto w-full max-w-7xl p-4 md:p-6 lg:grid lg:grid-cols-5 lg:gap-6"
      aria-busy="true"
    >
      <div className="flex flex-col gap-3 lg:col-span-3">
        <Skeleton className="h-11 w-full rounded-xl" />
        <Skeleton className="h-9 w-2/3 rounded-full" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="aspect-square w-full rounded-2xl" />
          ))}
        </div>
      </div>
      <Skeleton className="hidden h-96 w-full rounded-2xl lg:col-span-2 lg:block" />
    </div>
  );
}

/** New order (T111): the owner's simple POS for walk-ins and Messenger orders. */
export function NewOrderScreen() {
  const { slug } = useShop();
  const shop = useStorefront(slug);
  if (shop.isPending) return <ComposerSkeleton />;
  if (shop.isError || !shop.data) {
    return (
      <PageError
        title={W.items.errorTitle}
        message={W.items.errorBody}
        retryLabel={W.items.tryAgain}
        onRetry={() => void shop.refetch()}
        className="m-4 md:m-6"
      />
    );
  }
  return <ShopGate shop={shop.data} editing={null} />;
}

/** Edit order (T111): the same screen, started from an order that is New, Preparing or Ready. */
export function EditOrderScreen() {
  const { slug } = useShop();
  const { orderId } = useParams({ strict: false });
  const shop = useStorefront(slug);
  const detail = useOrderDetail(slug, orderId ?? '');
  if (shop.isPending || detail.isPending) return <ComposerSkeleton />;
  if (shop.isError || detail.isError || !shop.data) {
    return (
      <PageError
        title={W.items.errorTitle}
        message={W.items.errorBody}
        retryLabel={W.items.tryAgain}
        onRetry={() => {
          void shop.refetch();
          void detail.refetch();
        }}
        className="m-4 md:m-6"
      />
    );
  }
  const block = editBlock(detail.data);
  if (block) {
    return (
      <PageEmpty
        variant="box"
        icon={<LockIcon />}
        title={W.editTitle(orderNoLabel(detail.data.orderNo))}
        description={block === 'proof_waiting' ? W.edit.proofWaiting : W.edit.locked}
        action={
          <Button
            variant="outline"
            className="h-11 md:h-9"
            nativeButton={false}
            render={<Link to="/orders" search={{ order: detail.data.id }} />}
          >
            {W.back}
          </Button>
        }
        className="m-4 md:m-6"
      />
    );
  }
  return <ShopGate key={detail.data.id} shop={shop.data} editing={detail.data} />;
}

function ShopGate({ shop, editing }: { shop: PublicShop; editing: OwnerOrder | null }) {
  const { kind } = useShop();
  if (shop.catalog.items.length === 0) {
    const catalogName = words.screens.catalog.title(kind);
    return (
      <PageEmpty
        variant="box"
        icon={<PackageOpenIcon />}
        title={W.items.emptyTitle}
        description={W.items.emptyBody}
        action={
          <Button className="h-11 md:h-9" nativeButton={false} render={<Link to="/catalog" />}>
            {W.items.openMenu(catalogName)}
          </Button>
        }
        className="m-4 md:m-6"
      />
    );
  }
  return <Composer shop={shop} editing={editing} />;
}

function problemWords(quote: Quote | undefined): string[] {
  return (quote?.problems ?? []).map((p) => W.problems[p.code]);
}

function Composer({ shop, editing }: { shop: PublicShop; editing: OwnerOrder | null }) {
  const { slug } = useShop();
  const navigate = useNavigate();
  const online = useOnlineStatus();
  const now = useNow(60_000);
  const today = manilaDate(now);
  const { storefront, catalog } = shop;

  const initial = React.useMemo(
    () => (editing ? draftFromOrder(editing, null) : emptyDraft('walk_in', 'cash')),
    [editing],
  );
  const [draft, setDraft] = React.useState<Draft>(initial);
  const [step, setStep] = React.useState<Step>('items');
  const [picking, setPicking] = React.useState<{ item: Item; index: number | null } | null>(null);
  const [tried, setTried] = React.useState(false);
  const [phoneError, setPhoneError] = React.useState<string | null>(null);
  const [clientKey] = React.useState(() => crypto.randomUUID());
  const leaving = React.useRef(false);
  const action = useAsyncAction();
  const create = useCreateOwnerOrder(slug);
  const edit = useEditOrder(slug);
  const heading = React.useRef<HTMLHeadingElement>(null);

  const change = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));
  const payload = payloadOf(draft);
  const quoted = useOwnerQuote(slug, payload, editing?.id);
  const quote = payload ? quoted.data : undefined;
  const schedule = useOwnerSchedule(
    slug,
    draft.lines,
    draft.type !== 'walk_in' && draft.later,
    editing?.id,
  );
  const count = itemCount(draft.lines);
  const total = quote?.total ?? 0;
  const summary = quote ? W.basket.summary(count, formatPeso(total)) : W.basket.count(count);
  const startPayload = JSON.stringify(payloadOf(initial));
  const dirty = editing
    ? JSON.stringify(payload) !== startPayload
    : draft.lines.length > 0 ||
      draft.customer.kind === 'member' ||
      draft.customer.name.trim() !== '';

  const blocker = useBlocker({
    shouldBlockFn: () => dirty && !leaving.current,
    enableBeforeUnload: () => dirty && !leaving.current,
    withResolver: true,
  });

  // Step changes on a phone move focus to the step's heading, so a screen reader hears where it is.
  React.useEffect(() => {
    if (step !== 'items') heading.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }, [step]);

  const lineProblems = (quote?.lines ?? []).some((l) => l.problems.length > 0);
  const quoteProblems = problemWords(quote);
  const detailsProblem =
    draft.lines.length === 0
      ? W.problems.empty_basket
      : draft.type !== 'walk_in' && draft.later && !draft.scheduledAt
        ? W.when.pickTime
        : draft.type === 'delivery' && draft.addressLine.trim() === ''
          ? W.delivery.addressMissing
          : null;
  const payProblem = !partValid(draft, total) ? W.pay.partInvalid(formatPeso(total)) : null;
  const blocked =
    !online ||
    !payload ||
    !quote ||
    quoted.isFetching ||
    lineProblems ||
    quoteProblems.length > 0 ||
    detailsProblem !== null ||
    payProblem !== null ||
    (editing !== null && !dirty);

  const checkPhone = (): boolean => {
    if (draft.customer.kind !== 'guest' || draft.customer.phone.trim() === '') {
      setPhoneError(null);
      return true;
    }
    const ok = normalisePhPhone(draft.customer.phone).ok;
    setPhoneError(ok ? null : W.customer.phoneInvalid);
    return ok;
  };

  const pick = (item: Item) => {
    const simple = item.variants.length === 1 && item.optionGroupIds.length === 0;
    const variant = item.variants[0];
    if (simple && variant) {
      change({
        lines: addLine(draft.lines, {
          itemId: item.id,
          variantId: variant.id,
          optionIds: [],
          note: '',
          qty: 1,
        }),
      });
      return;
    }
    setPicking({ item, index: null });
  };

  const doneChoices = (line: BasketLine) => {
    if (picking?.index !== null && picking?.index !== undefined) {
      const index = picking.index;
      const rest = draft.lines.filter((_, i) => i !== index);
      change({ lines: addLine(rest, line) });
    } else {
      change({ lines: addLine(draft.lines, line) });
    }
    setPicking(null);
  };

  const goNext = () => {
    setTried(true);
    if (step === 'items' && draft.lines.length > 0) setStep('details');
    else if (step === 'details' && detailsProblem === null && checkPhone()) setStep('pay');
  };

  const submit = () => {
    setTried(true);
    if (!checkPhone()) {
      setStep('details');
      return;
    }
    if (blocked || !payload) return;
    const no = editing ? orderNoLabel(editing.orderNo) : '';
    if (editing) {
      action
        .run(() =>
          edit.mutateAsync({ orderId: editing.id, input: { version: editing.version, payload } }),
        )
        .then((order) => {
          leaving.current = true;
          notify({ title: W.edit.saved(no), tone: 'success' });
          void navigate({ to: '/orders', search: { order: order.id } });
        })
        .catch((err: unknown) => {
          const code = errorCodeOf(err);
          notify({
            title: errorWords(code),
            tone: 'error',
            action:
              code === 'order_changed'
                ? {
                    label: W.edit.loadNewest,
                    onClick: () => {
                      leaving.current = true;
                      window.location.reload();
                    },
                  }
                : undefined,
          });
        });
      return;
    }
    action
      .run(() =>
        create.mutateAsync({
          payload,
          pay: payOf(draft),
          handedOver: draft.type === 'walk_in' && draft.handedOver,
          clientKey,
        }),
      )
      .then((made) => {
        leaving.current = true;
        const label = orderNoLabel(made.orderNo);
        notify({
          title: made.status === 'completed' ? W.createdDone(label) : W.created(label),
          tone: 'success',
          durationMs: 10_000,
          action: {
            label: W.copyLink,
            onClick: () =>
              void copyText(receiptLink(slug, made.token)).then((ok) => {
                if (ok) notify({ title: W.linkCopied, tone: 'info' });
              }),
          },
        });
        void navigate({ to: '/orders', search: { order: made.orderId } });
      })
      .catch((err: unknown) => notify({ title: errorWords(errorCodeOf(err)), tone: 'error' }));
  };

  const submitLabel = editing
    ? quote && quote.total !== editing.totals.total
      ? W.edit.save(formatPeso(editing.totals.total), formatPeso(quote.total))
      : W.edit.saveSame
    : W.create(formatPeso(total));
  const stepIndex = STEPS.indexOf(step);
  const shown = (s: Step) => (step === s ? 'flex' : 'hidden lg:flex');
  const section = 'flex-col gap-4';
  const sectionTitle = 'text-base font-bold lg:text-sm lg:font-semibold';

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pt-4 pb-6 md:px-6 md:pt-6">
      <h1 className="sr-only">{editing ? W.editTitle(orderNoLabel(editing.orderNo)) : W.title}</h1>

      <Stepper value={stepIndex + 1} indicators={{}} className="mb-4 w-full lg:hidden">
        <StepperNav aria-label={W.stepsLabel}>
          {STEPS.map((s, i) => (
            <StepperItem
              key={s}
              step={i + 1}
              completed={stepIndex > i}
              className="relative items-start not-last:flex-1"
            >
              <div className="flex flex-col items-center gap-1">
                <StepperIndicator className="size-8">
                  <span
                    className={cn(
                      'flex size-8 items-center justify-center rounded-full text-sm font-semibold tabular-nums',
                      stepIndex > i
                        ? 'bg-primary text-primary-foreground'
                        : stepIndex === i
                          ? 'bg-card text-primary ring-2 ring-primary ring-inset'
                          : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {stepIndex > i ? <CheckIcon className="size-4" aria-hidden="true" /> : i + 1}
                  </span>
                </StepperIndicator>
                <StepperTitle
                  className={cn(
                    'text-xs whitespace-nowrap',
                    stepIndex === i ? 'font-bold text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {W.steps[s]}
                </StepperTitle>
              </div>
              {i < STEPS.length - 1 ? (
                <StepperSeparator
                  className={cn('mx-2 mt-4 flex-1', stepIndex > i && 'bg-primary')}
                />
              ) : null}
            </StepperItem>
          ))}
        </StepperNav>
      </Stepper>

      {!online ? (
        <Notice tone="warning" icon={<WifiOffIcon />} className="mb-4">
          {ordersWords.states.offlineDisabled}
        </Notice>
      ) : null}

      <div className="lg:grid lg:grid-cols-5 lg:items-start lg:gap-6">
        <div className={cn(shown('items'), 'min-w-0 flex-col lg:col-span-3')}>
          <ItemGrid
            catalog={catalog}
            now={now}
            countOf={(id) => qtyOfItem(draft.lines, id)}
            onPick={pick}
          />
        </div>

        <aside
          aria-label={W.basket.title}
          className="flex flex-col gap-6 lg:sticky lg:top-20 lg:col-span-2 lg:max-h-fill-24 lg:overflow-y-auto lg:rounded-2xl lg:border lg:bg-card lg:p-4 lg:elevation-sm"
        >
          <section className={cn(shown('details'), section)} aria-labelledby="new-order-lines">
            <div className="flex items-center justify-between gap-2">
              <h2
                id="new-order-lines"
                ref={step === 'details' ? heading : undefined}
                tabIndex={-1}
                className={cn(sectionTitle, 'outline-none')}
              >
                {W.basket.title}
              </h2>
              {draft.lines.length > 0 ? (
                <span className="text-sm text-muted-foreground tabular-nums">
                  {summary}
                </span>
              ) : null}
            </div>
            <OrderLines
              lines={draft.lines}
              catalog={catalog}
              quoted={quote?.lines}
              onQty={(index, qty) =>
                change({ lines: draft.lines.map((l, i) => (i === index ? { ...l, qty } : l)) })
              }
              onRemove={(index) => change({ lines: draft.lines.filter((_, i) => i !== index) })}
              onEdit={(index) => {
                const line = draft.lines[index];
                const item = catalog.items.find((it) => it.id === line?.itemId);
                if (item) setPicking({ item, index });
              }}
              className="-my-3"
            />
          </section>

          <section className={cn(shown('details'), section)} aria-labelledby="new-order-customer">
            <h2 id="new-order-customer" className={sectionTitle}>
              {W.customer.title}
            </h2>
            <CustomerFields
              value={draft.customer}
              onChange={(customer) => {
                setPhoneError(null);
                change({ customer, useReward: customer.kind === 'member' && draft.useReward });
              }}
              useReward={draft.useReward}
              onUseReward={(on) => change({ useReward: on })}
              card={storefront.stampCard}
              lockMember={editing !== null && editing.memberId !== null}
            />
            {phoneError ? <p className="text-sm text-destructive">{phoneError}</p> : null}
          </section>

          <section className={cn(shown('details'), section)} aria-labelledby="new-order-details">
            <h2 id="new-order-details" className={sectionTitle}>
              {W.steps.details}
            </h2>
            <DetailsFields
              draft={draft}
              onChange={change}
              storefront={storefront}
              schedule={schedule.data}
              scheduleLoading={schedule.isPending}
              today={today}
              problems={tried && detailsProblem && draft.lines.length > 0 ? [detailsProblem] : []}
            />
          </section>

          <section className={cn(shown('pay'), section)} aria-labelledby="new-order-pay">
            <h2
              id="new-order-pay"
              ref={step === 'pay' ? heading : undefined}
              tabIndex={-1}
              className={cn(sectionTitle, 'outline-none')}
            >
              {W.pay.title}
            </h2>
            <PayFields
              draft={draft}
              onChange={change}
              storefront={storefront}
              total={total}
              editing={editing !== null}
            />
            <Totals quote={quote} draft={draft} editing={editing !== null} className="pt-1" />
            {quoteProblems.length > 0 ? (
              <ul className="flex flex-col gap-1 text-sm text-destructive">
                {quoteProblems.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            ) : null}
            <AsyncButton
              type="button"
              status={action.status}
              busyLabel={editing ? W.edit.saving : W.creating}
              doneLabel={editing ? W.edit.saveSame : W.title}
              disabled={blocked}
              onClick={submit}
              className="hidden h-11 w-full text-base font-semibold lg:flex"
            >
              {submitLabel}
            </AsyncButton>
            {editing && !dirty ? (
              <p className="hidden text-center text-sm text-muted-foreground lg:block">
                {W.edit.noChanges}
              </p>
            ) : null}
          </section>
        </aside>
      </div>

      {/* Phone and tablet: the step's bar on the bottom edge (the dock steps aside on this page). */}
      <div className="pointer-events-none sticky bottom-4 z-30 mt-6 flex justify-center pb-safe lg:hidden">
        <div
          role="region"
          aria-label={W.stepsLabel}
          className="pointer-events-auto flex w-full items-center gap-2 rounded-full border border-border bg-card p-1.5 elevation-md"
        >
          {step !== 'items' ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={W.back}
              className="size-11 shrink-0 rounded-full"
              onClick={() => setStep(STEPS[stepIndex - 1] ?? 'items')}
            >
              <ArrowLeftIcon aria-hidden="true" />
            </Button>
          ) : null}
          <span className="min-w-0 flex-1 truncate pl-2 text-sm font-semibold tabular-nums">
            {draft.lines.length === 0 ? W.basket.empty : summary}
          </span>
          {step === 'pay' ? (
            <AsyncButton
              type="button"
              status={action.status}
              busyLabel={editing ? W.edit.saving : W.creating}
              doneLabel={editing ? W.edit.saveSame : W.title}
              disabled={blocked}
              onClick={submit}
              className="h-11 shrink-0 rounded-full px-5 font-semibold"
            >
              {editing ? W.edit.saveSame : W.create(formatPeso(total))}
            </AsyncButton>
          ) : (
            <Button
              type="button"
              className="h-11 shrink-0 gap-1.5 rounded-full px-5 font-semibold"
              disabled={draft.lines.length === 0}
              onClick={goNext}
            >
              {W.next}
              <ArrowRightIcon aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>

      <ChoicesSheet
        item={picking?.item ?? null}
        catalog={catalog}
        now={now}
        line={picking && picking.index !== null ? (draft.lines[picking.index] ?? null) : null}
        onClose={() => setPicking(null)}
        onDone={doneChoices}
      />

      <AlertDialog
        open={blocker.status === 'blocked'}
        onOpenChange={(open) => {
          if (!open && blocker.status === 'blocked') blocker.reset();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{W.leave.title}</AlertDialogTitle>
            <AlertDialogDescription>{W.leave.body}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => blocker.reset?.()}>{W.leave.stay}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => blocker.proceed?.()}
            >
              {W.leave.leave}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
