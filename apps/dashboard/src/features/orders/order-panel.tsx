import * as React from 'react';
import {
  CalendarClockIcon,
  CheckIcon,
  ChevronDownIcon,
  CircleXIcon,
  ExternalLinkIcon,
  ImageOffIcon,
  LockIcon,
  MessageSquareTextIcon,
  MoreHorizontalIcon,
  PhoneIcon,
  PrinterIcon,
  ShieldCheckIcon,
  TruckIcon,
  XIcon,
} from 'lucide-react';
import type { BoardOrder, OrderStatus, OwnerOrder, ShopKind } from '@smartapp/core';
import {
  canCancel,
  canReschedule,
  errorWords,
  formatClock,
  formatManila,
  formatPeso,
  hasReference,
  isFinal,
  isPayLater,
  moveTargets,
  ordersWords,
  statusStage,
  timelineSteps,
  words,
} from '@smartapp/core';
import {
  errorCodeOf,
  useCancelOrder,
  useMarkSeen,
  useOrderDetail,
  useRecordPayment,
  useReviewPayment,
  useSaveDeliveryInfo,
  useSaveOwnerNote,
} from '@smartapp/data';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@smartapp/ui/components/alert-dialog';
import { Avatar, AvatarFallback } from '@smartapp/ui/components/avatar';
import { Badge } from '@smartapp/ui/components/reui/badge';
import { Bubble, BubbleContent } from '@smartapp/ui/components/bubble';
import { Button } from '@smartapp/ui/components/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@smartapp/ui/components/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@smartapp/ui/components/dropdown-menu';
import { Field, FieldLabel } from '@smartapp/ui/components/field';
import { Input } from '@smartapp/ui/components/input';
import {
  Message,
  MessageContent,
  MessageFooter,
  MessageGroup,
} from '@smartapp/ui/components/message';
import { RadioGroup, RadioGroupItem } from '@smartapp/ui/components/radio-group';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import {
  Stepper,
  StepperIndicator,
  StepperItem,
  StepperNav,
  StepperSeparator,
  StepperTitle,
} from '@smartapp/ui/components/reui/stepper';
import { Textarea } from '@smartapp/ui/components/textarea';
import {
  Timeline,
  TimelineContent,
  TimelineDate,
  TimelineHeader,
  TimelineIndicator,
  TimelineItem,
  TimelineSeparator,
} from '@smartapp/ui/components/reui/timeline';
import { AsyncButton, useAsyncAction } from '@smartapp/ui/compositions/async-button';
import { CopyButton } from '@smartapp/ui/compositions/copy-button';
import { notify } from '@smartapp/ui/compositions/notify';
import {
  ResponsiveDialog,
  ResponsiveDialogFooter,
} from '@smartapp/ui/compositions/responsive-dialog';
import { ResponsiveSheet } from '@smartapp/ui/compositions/responsive-sheet';
import { initials } from '@smartapp/ui/compositions/shop-image';
import {
  ThermalReceiptCard,
  type ThermalReceiptItem,
} from '@smartapp/ui/vendor/opensource-ui/thermal-receipt';
import { cn } from 'cn';
import { cardAction, ItemPhotos, PaymentChip } from '@/app/orders/order-card';
import { orderNoLabel } from '@/app/orders/order-ticket-label';
import { ORDER_TYPE_ICON } from '@/app/orders/order-type-icons';
import { usePrintTicket } from '@/app/orders/print-ticket';
import { STAGE_LOOK, stageLabel } from '@/app/orders/stage';
import { StageChip } from '@/app/orders/stage-chip';
import { StageIcon } from '@/app/orders/stage-icon';
import { stepLabels } from '@/app/orders/step-labels';
import { TimeChip } from '@/app/orders/time-chip';
import { useNow } from '@/app/orders/use-now';
import { useStepChange } from '@/app/orders/use-step-change';
import { useOnlineStatus } from '@/app/use-online-status';
import { ChangeTimeDialog } from './change-time-dialog.js';
import { MessengerOrderButton } from './messenger-inbox.js';

const CANCEL_REASON_KEYS = ['sold_out', 'closing_early', 'customer_asked', 'other'] as const;
const REJECT_REASON_KEYS = ['amount', 'unclear', 'account', 'missing'] as const;
type CancelReasonKey = (typeof CANCEL_REASON_KEYS)[number];

/** The board's card shape from the full order, for an order opened from a link (no card loaded yet). */
function boardShape(o: OwnerOrder): BoardOrder {
  return {
    id: o.id,
    token: o.token,
    orderNo: o.orderNo,
    type: o.type,
    status: o.status,
    paymentStatus: o.paymentStatus,
    paymentMethod: o.paymentMethod,
    scheduledAt: o.scheduledAt,
    placedAt: o.placedAt,
    customerName: o.customerName,
    isFirstOrder: o.isFirstOrder,
    isMember: o.isMember,
    hasReward: o.rewardTitle !== null,
    itemsSummary: o.lines.map((l) => `${l.qty} × ${l.name}`).join(', '),
    total: o.totals.total,
    dueAt: o.dueAt,
    startBy: o.startBy,
    pickupCode: o.pickupCode,
    seenAt: o.seenAt,
    lines: o.lines.slice(0, 8).map((l) => ({
      qty: l.qty,
      name: l.name,
      variantLabel: l.variantLabel,
      optionLabels: l.optionLabels,
      note: l.note || null,
      photo: null,
    })),
    moreLines: Math.max(0, o.lines.length - 8),
    note: o.note,
    ownerNote: o.ownerNote,
    deliveryArea: null,
    lastStepAt: o.lastStepAt,
    expiresAt: o.expiresAt,
    memberStamps: null,
  };
}

export interface OrderPanelProps {
  orderId: string | undefined;
  // The card the owner tapped (or the board's fresher copy): the panel opens with it at once.
  seed: BoardOrder | undefined;
  slug: string;
  kind: ShopKind;
  shopName: string;
  onClose: () => void;
}

/**
 * The order panel (D5): a right Sheet from 768 px, a bottom Drawer below. The header, steps and payment
 * state come from the card the owner tapped, so it opens instantly; the rest loads into its own sections.
 */
export function OrderPanel({ orderId, seed, slug, kind, shopName, onClose }: OrderPanelProps) {
  // Keep the last order while the panel slides away.
  const [lastId, setLastId] = React.useState(orderId);
  if (orderId && orderId !== lastId) setLastId(orderId);
  const id = orderId ?? lastId ?? '';
  const open = orderId !== undefined;
  const detailQuery = useOrderDetail(slug, id);
  const detail = detailQuery.data && detailQuery.data.id === id ? detailQuery.data : undefined;
  const fromDetail = React.useMemo(() => (detail ? boardShape(detail) : undefined), [detail]);
  const base = seed && seed.id === id ? seed : fromDetail;
  // The card copy is optimistic (moves show at once); the full order fills in what the card lacks.
  const order: BoardOrder | undefined =
    base && fromDetail && base !== fromDetail
      ? {
          ...fromDetail,
          ...base,
          lines: base.lines.some((l) => l.photo) ? base.lines : fromDetail.lines,
        }
      : base;

  const title = order
    ? ordersWords.panel.title(orderNoLabel(order.orderNo))
    : ordersWords.panel.close;

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={title}
      header={
        order ? (
          <PanelHeader order={order} kind={kind} onClose={onClose} />
        ) : (
          <HeaderSkeleton onClose={onClose} />
        )
      }
      footer={
        order && !detailQuery.isError ? (
          <PanelFooter order={order} detail={detail} slug={slug} kind={kind} onClose={onClose} />
        ) : undefined
      }
    >
      {order ? (
        <PanelBody
          order={order}
          detail={detail}
          slug={slug}
          kind={kind}
          shopName={shopName}
          loading={detailQuery.isLoading}
          failed={detailQuery.isError}
          onRetry={() => void detailQuery.refetch()}
        />
      ) : detailQuery.isError ? (
        <div className="flex flex-col items-center gap-3 p-8 text-center">
          <p className="text-sm text-muted-foreground">{ordersWords.panel.notFound}</p>
          <Button variant="outline" className="h-11 md:h-9" onClick={onClose}>
            {ordersWords.panel.close}
          </Button>
        </div>
      ) : (
        <div className="space-y-4 p-4">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      )}
    </ResponsiveSheet>
  );
}

// ---------------------------------------------------------------- header

function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={onClose}
      aria-label={ordersWords.panel.close}
      className="size-11 shrink-0 md:size-9"
    >
      <XIcon />
    </Button>
  );
}

function HeaderSkeleton({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex items-start gap-3 border-b px-4 pt-3 pb-4">
      <div className="flex-1 space-y-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-4 w-40" />
      </div>
      <CloseButton onClose={onClose} />
    </div>
  );
}

function PanelHeader({
  order,
  kind,
  onClose,
}: {
  order: BoardOrder;
  kind: ShopKind;
  onClose: () => void;
}) {
  const now = useNow(30_000);
  const TypeIcon = ORDER_TYPE_ICON[order.type];
  const stage = statusStage(order.status);
  const no = orderNoLabel(order.orderNo);
  return (
    <div className="relative border-b px-4 pt-3 pb-4">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
          <TypeIcon className="size-4" aria-hidden="true" />
          {ordersWords.types[order.type]}
        </span>
        {stage ? (
          <StageChip stage={stage} kind={kind} />
        ) : (
          <Badge
            variant="destructive-light"
            size="lg"
            radius="full"
            className="gap-1 font-semibold"
          >
            <CircleXIcon aria-hidden="true" />
            {words.shop.orderStatus[order.status]}
          </Badge>
        )}
        <span className="ml-auto" />
        <CloseButton onClose={onClose} />
      </div>
      <div className="mt-1 flex items-end justify-between gap-3">
        <p className="text-3xl font-bold tracking-tight tabular-nums">{no}</p>
        <p className="text-2xl font-bold tabular-nums">{formatPeso(order.total)}</p>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
        <span className="tabular-nums">
          {ordersWords.panel.placed(formatClock(order.placedAt))}
        </span>
        <TimeChip order={order} now={now} />
        <span className="ml-auto inline-flex items-center gap-1.5">
          <span className="text-xs">{ordersWords.panel.pickupCode}</span>
          <span className="font-mono text-base font-bold tracking-widest text-foreground">
            {order.pickupCode}
          </span>
          <CopyButton value={order.pickupCode} iconOnly className="size-9" />
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- body

interface PanelBodyProps {
  order: BoardOrder;
  detail: OwnerOrder | undefined;
  slug: string;
  kind: ShopKind;
  shopName: string;
  loading: boolean;
  failed: boolean;
  onRetry: () => void;
}

function Section({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('space-y-3 border-b px-4 py-4 last:border-b-0', className)}>
      <div className="flex min-h-6 items-center justify-between gap-2">
        <h3 className="text-xs font-bold tracking-wide text-muted-foreground uppercase">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function PanelBody({
  order,
  detail,
  slug,
  kind,
  shopName,
  loading,
  failed,
  onRetry,
}: PanelBodyProps) {
  const markSeen = useMarkSeen(slug).mutate;
  const sentFor = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (order.seenAt === null && sentFor.current !== order.id) {
      sentFor.current = order.id;
      markSeen({ orderId: order.id });
    }
  }, [order.id, order.seenAt, markSeen]);

  return (
    <div>
      <StepsSection order={order} detail={detail} kind={kind} />
      {failed ? (
        <div className="m-4 flex flex-col items-start gap-2 rounded-xl border border-destructive/30 bg-destructive-soft p-3 text-sm text-destructive-soft-foreground">
          {ordersWords.states.errorDetail}
          <Button variant="outline" className="h-11 md:h-9" onClick={onRetry}>
            {ordersWords.states.tryAgain}
          </Button>
        </div>
      ) : null}
      <PaymentSection order={order} detail={detail} slug={slug} loading={loading} />
      <ItemsSection order={order} detail={detail} shopName={shopName} loading={loading} />
      <CustomerSection order={order} detail={detail} loading={loading} />
      {order.type === 'delivery' ? (
        <DeliverySection detail={detail} slug={slug} loading={loading} />
      ) : null}
      <NoteSection order={order} slug={slug} />
      <ActivitySection detail={detail} />
    </div>
  );
}

function StepsSection({
  order,
  detail,
  kind,
}: {
  order: BoardOrder;
  detail: OwnerOrder | undefined;
  kind: ShopKind;
}) {
  if (order.status === 'cancelled' || order.status === 'expired') {
    return (
      <div className="m-4 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive-soft p-3 text-sm text-destructive-soft-foreground">
        <CircleXIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <div>
          <p className="font-semibold">{words.shop.orderStatus[order.status]}</p>
          {detail?.cancelReason ? (
            <p>{ordersWords.panel.cancelReason(detail.cancelReason)}</p>
          ) : null}
        </div>
      </div>
    );
  }
  const steps = timelineSteps(order.type);
  const current = steps.indexOf(order.status);
  // When each step happened: from the full order's events, else the card's last step time.
  const at = (step: OrderStatus): string | null => {
    const event = [...(detail?.events ?? [])].reverse().find((e) => e.status === step);
    if (event) return event.at;
    if (step === order.status) return order.lastStepAt;
    if (step === 'placed') return order.placedAt;
    return null;
  };
  return (
    <section className="border-b px-4 py-4" aria-label={ordersWords.panel.steps}>
      <Stepper value={current + 1} indicators={{}} className="w-full">
        <StepperNav>
          {steps.map((step, index) => {
            const stage = statusStage(step) ?? 'new';
            const look = STAGE_LOOK[stage];
            const time = at(step);
            const prev = index > 0 ? at(steps[index - 1] ?? 'placed') : null;
            const gap =
              time && prev && index <= current
                ? Math.max(
                    0,
                    Math.round((new Date(time).getTime() - new Date(prev).getTime()) / 60_000),
                  )
                : null;
            const reached = index <= current;
            return (
              <StepperItem
                key={step}
                step={index + 1}
                completed={index < current}
                className="relative"
              >
                <div className="flex flex-col items-center gap-1.5">
                  <StepperIndicator className={cn('size-8', reached && cn('ring-2', look.ring))}>
                    <span
                      className={cn(
                        'flex size-8 items-center justify-center rounded-full',
                        reached ? cn(look.soft, look.text) : 'bg-muted text-muted-foreground',
                      )}
                    >
                      <StageIcon stage={stage} kind={kind} className="size-4" />
                    </span>
                  </StepperIndicator>
                  <StepperTitle
                    className={cn(
                      'text-xs whitespace-nowrap',
                      index === current ? cn('font-bold', look.text) : 'text-muted-foreground',
                    )}
                  >
                    {stageLabel(stage, kind)}
                  </StepperTitle>
                  <span className="h-4 text-xs text-muted-foreground tabular-nums">
                    {time && reached ? formatClock(time) : ''}
                  </span>
                </div>
                {index < steps.length - 1 ? (
                  <div className="relative mx-1 mb-10 flex flex-1 flex-col items-center">
                    <StepperSeparator className={cn('w-full', index < current && look.dot)} />
                    {(() => {
                      const nextTime = at(steps[index + 1] ?? 'completed');
                      const mins =
                        index < current && time && nextTime
                          ? Math.max(
                              0,
                              Math.round(
                                (new Date(nextTime).getTime() - new Date(time).getTime()) / 60_000,
                              ),
                            )
                          : null;
                      return mins !== null ? (
                        <span className="absolute top-1.5 text-xs text-muted-foreground tabular-nums">
                          {ordersWords.time.minutesBetween(mins)}
                        </span>
                      ) : null;
                    })()}
                  </div>
                ) : null}
                {gap === null ? null : (
                  <span className="sr-only">{ordersWords.time.minutesBetween(gap)}</span>
                )}
              </StepperItem>
            );
          })}
        </StepperNav>
      </Stepper>
    </section>
  );
}

function PaymentSection({
  order,
  detail,
  slug,
  loading,
}: {
  order: BoardOrder;
  detail: OwnerOrder | undefined;
  slug: string;
  loading: boolean;
}) {
  const now = useNow(1_000);
  const online = useOnlineStatus();
  const review = useReviewPayment(slug);
  const record = useRecordPayment(slug);
  const approve = useAsyncAction();
  const recordAction = useAsyncAction();
  const [rejectOpen, setRejectOpen] = React.useState(false);
  const [rejectReason, setRejectReason] = React.useState('');
  const [zoom, setZoom] = React.useState<string | null>(null);
  const [broken, setBroken] = React.useState<ReadonlySet<string>>(() => new Set());
  const proofs = detail?.proofs ?? [];
  const pending = proofs.find((p) => p.status === 'pending');

  const fail = (err: unknown) => notify({ title: errorWords(errorCodeOf(err)), tone: 'error' });

  return (
    <Section
      title={ordersWords.panel.paymentSection}
      action={<PaymentChip order={order} now={now} />}
    >
      {loading && !detail ? <Skeleton className="h-16 w-full rounded-xl" /> : null}
      {proofs.length > 0 ? (
        // The payment chat (T81): the customer's photos on the left, the shop's answers on the right,
        // the same lines the customer sees in their order chat.
        <MessageGroup className="gap-3">
          {proofs.map((proof) => (
            <React.Fragment key={proof.id}>
              <Message>
                <MessageContent>
                  <button
                    type="button"
                    onClick={() => setZoom(proof.path)}
                    className="size-28 shrink-0 overflow-hidden rounded-xl border bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    aria-label={ordersWords.detail.viewProof}
                  >
                    {broken.has(proof.id) ? (
                      <ImageOffIcon
                        className="m-auto size-6 text-muted-foreground"
                        aria-hidden="true"
                      />
                    ) : (
                      <img
                        src={proof.path}
                        alt={ordersWords.detail.proofAlt(orderNoLabel(order.orderNo))}
                        className="size-full object-cover"
                        onError={() => setBroken((prev) => new Set([...prev, proof.id]))}
                      />
                    )}
                  </button>
                  <Bubble variant="muted">
                    {hasReference(proof.referenceNo) ? (
                      <BubbleContent className="flex flex-col gap-0.5">
                        <span className="text-xs text-muted-foreground">
                          {ordersWords.detail.reference}
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="font-mono font-semibold">{proof.referenceNo}</span>
                          <CopyButton value={proof.referenceNo} iconOnly className="size-8" />
                        </span>
                      </BubbleContent>
                    ) : (
                      <BubbleContent className="text-muted-foreground">
                        {ordersWords.detail.noReference}
                      </BubbleContent>
                    )}
                  </Bubble>
                  <MessageFooter className="tabular-nums">
                    {formatClock(proof.uploadedAt)} ·{' '}
                    {proof.status === 'pending'
                      ? ordersWords.detail.proofPending
                      : proof.status === 'approved'
                        ? ordersWords.detail.proofApproved
                        : ordersWords.detail.proofRejected}
                  </MessageFooter>
                  {broken.has(proof.id) ? (
                    <p className="text-xs text-muted-foreground">
                      {ordersWords.detail.proofMissing}
                    </p>
                  ) : null}
                </MessageContent>
              </Message>
              {proof.status === 'pending' ? null : (
                <Message align="end">
                  <MessageContent>
                    <Bubble variant={proof.status === 'approved' ? 'default' : 'destructive'}>
                      <BubbleContent className="flex items-start gap-1.5">
                        {proof.status === 'approved' ? (
                          <CheckIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                        ) : (
                          <XIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                        )}
                        {proof.status === 'approved'
                          ? ordersWords.detail.youApproved
                          : ordersWords.detail.youRejected(
                              proof.rejectReason ?? ordersWords.detail.proofRejected,
                            )}
                      </BubbleContent>
                    </Bubble>
                  </MessageContent>
                </Message>
              )}
            </React.Fragment>
          ))}
        </MessageGroup>
      ) : null}

      {pending && order.paymentStatus === 'pending' ? (
        <div className="space-y-2">
          <p className="flex items-start gap-1.5 rounded-lg bg-warning-soft px-2.5 py-2 text-xs text-warning-soft-foreground">
            <ShieldCheckIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            {ordersWords.detail.checkGcash}
          </p>
          <div className="flex gap-2">
            <AsyncButton
              status={approve.status}
              busyLabel={ordersWords.detail.approvingPayment}
              doneLabel={ordersWords.detail.approvedPayment}
              disabled={!online}
              onClick={() =>
                approve
                  .run(async () => {
                    await review.mutateAsync({ orderId: order.id, approve: true });
                    notify({ title: ordersWords.detail.approvedPayment, tone: 'success' });
                  })
                  .catch(fail)
              }
              className="h-11 flex-1 font-semibold md:h-9"
            >
              {ordersWords.detail.approvePayment}
            </AsyncButton>
            <Button
              variant="outline"
              disabled={!online}
              onClick={() => setRejectOpen(true)}
              className="h-11 text-destructive-text md:h-9"
            >
              {ordersWords.detail.rejectPayment}
            </Button>
          </div>
        </div>
      ) : null}

      {isPayLater(order.paymentMethod) &&
      order.paymentStatus !== 'paid' &&
      !isFinal(order.status) ? (
        <AsyncButton
          variant="outline"
          status={recordAction.status}
          busyLabel={ordersWords.detail.recordingCash}
          doneLabel={ordersWords.detail.cashRecorded}
          disabled={!online}
          onClick={() =>
            recordAction
              .run(async () => {
                await record.mutateAsync({ orderId: order.id, method: order.paymentMethod });
                notify({ title: ordersWords.detail.cashRecorded, tone: 'success' });
              })
              .catch(fail)
          }
          className="h-11 w-full font-semibold md:h-9"
        >
          {ordersWords.detail.recordCash}
        </AsyncButton>
      ) : null}

      <AlertDialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{ordersWords.detail.rejectTitle}</AlertDialogTitle>
            <AlertDialogDescription>{ordersWords.detail.rejectReason}</AlertDialogDescription>
          </AlertDialogHeader>
          {/* Reason chips (T81): one tap writes a full sentence the owner can still change. */}
          <div className="flex flex-wrap gap-2">
            {REJECT_REASON_KEYS.map((key) => {
              const reason = ordersWords.detail.rejectReasons[key];
              const picked = rejectReason === reason.text;
              return (
                <Button
                  key={key}
                  type="button"
                  variant={picked ? 'secondary' : 'outline'}
                  aria-pressed={picked}
                  onClick={() => setRejectReason(reason.text)}
                  className="h-11 rounded-full px-3.5 aria-pressed:border-destructive/40 aria-pressed:bg-destructive-soft aria-pressed:text-destructive-soft-foreground md:h-9"
                >
                  {picked ? <CheckIcon aria-hidden="true" /> : null}
                  {reason.label}
                </Button>
              );
            })}
          </div>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
            maxLength={300}
            className="text-base md:text-sm"
            aria-label={ordersWords.detail.rejectReasonLabel}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>{ordersWords.detail.keepOrder}</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={rejectReason.trim() === '' || review.isPending}
              onClick={() => {
                review
                  .mutateAsync({
                    orderId: order.id,
                    approve: false,
                    rejectReason: rejectReason.trim(),
                  })
                  .then(() => {
                    setRejectOpen(false);
                    setRejectReason('');
                    notify({ title: ordersWords.detail.paymentRejected, tone: 'info' });
                  })
                  .catch(fail);
              }}
            >
              {review.isPending
                ? ordersWords.detail.rejectingPayment
                : ordersWords.detail.rejectPayment}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ResponsiveDialog
        open={zoom !== null}
        onOpenChange={(next) => {
          if (!next) setZoom(null);
        }}
        title={ordersWords.detail.viewProof}
      >
        {zoom ? (
          <img
            src={zoom}
            alt={ordersWords.detail.proofAlt(orderNoLabel(order.orderNo))}
            className="w-full rounded-xl border object-contain"
          />
        ) : null}
      </ResponsiveDialog>
    </Section>
  );
}

function ItemsSection({
  order,
  detail,
  shopName,
  loading,
}: {
  order: BoardOrder;
  detail: OwnerOrder | undefined;
  shopName: string;
  loading: boolean;
}) {
  const w = ordersWords.panel;
  const items: ThermalReceiptItem[] = detail
    ? [
        ...detail.lines.map((line, index) => ({
          key: `${index}`,
          name: `${line.qty}× ${[line.name, line.variantLabel, ...line.optionLabels].filter(Boolean).join(' · ')}`,
          price: formatPeso(line.lineTotal),
        })),
        ...(detail.totals.discount > 0
          ? [{ key: 'discount', name: w.discount, price: `−${formatPeso(detail.totals.discount)}` }]
          : []),
      ]
    : [];
  const notes = detail ? detail.lines.filter((l) => l.note.trim() !== '') : [];
  return (
    <Section title={w.itemsSection} action={<ItemPhotos order={order} />}>
      {order.note ? (
        <p className="flex items-start gap-1.5 rounded-lg bg-warning-soft px-2.5 py-2 text-sm text-warning-soft-foreground">
          <MessageSquareTextIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span className="break-words">{order.note}</span>
        </p>
      ) : null}
      {detail ? (
        <div className="px-1 pt-2 pb-3">
          <ThermalReceiptCard
            storeName={shopName}
            orderId={orderNoLabel(detail.orderNo)}
            date={formatManila(detail.placedAt, 'datetime')}
            items={items}
            subtotalLabel={w.subtotal}
            subtotal={formatPeso(detail.totals.subtotal)}
            {...(detail.totals.deliveryFee > 0
              ? { taxLabel: w.deliveryFee, tax: formatPeso(detail.totals.deliveryFee) }
              : {})}
            totalLabel={w.total}
            total={formatPeso(detail.totals.total)}
            code={
              <span className="text-center">
                <span className="block text-xs">{w.pickupCode}</span>
                <span className="block text-xl font-bold tracking-widest">{detail.pickupCode}</span>
              </span>
            }
          />
        </div>
      ) : loading ? (
        <Skeleton className="h-56 w-full rounded-xl" />
      ) : (
        <ul className="space-y-1 text-sm">
          {order.lines.map((line, index) => (
            <li key={index}>
              <span className="font-semibold tabular-nums">{line.qty}×</span> {line.name}
            </li>
          ))}
        </ul>
      )}
      {notes.map((line, index) => (
        <p key={index} className="flex items-start gap-1.5 text-xs text-warning-soft-foreground">
          <MessageSquareTextIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          <span>
            <strong>{line.name}:</strong> {line.note}
          </span>
        </p>
      ))}
    </Section>
  );
}

function CustomerSection({
  order,
  detail,
  loading,
}: {
  order: BoardOrder;
  detail: OwnerOrder | undefined;
  loading: boolean;
}) {
  return (
    <Section title={ordersWords.panel.customerSection}>
      <div className="flex items-center gap-3">
        <Avatar size="lg">
          <AvatarFallback className="bg-secondary font-semibold text-secondary-foreground">
            {initials(order.customerName)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{order.customerName}</p>
          {detail ? (
            <p className="text-sm text-muted-foreground tabular-nums">{detail.customerPhone}</p>
          ) : loading ? (
            <Skeleton className="mt-1 h-4 w-28" />
          ) : null}
        </div>
        {order.memberStamps ? (
          <Badge
            variant="outline"
            size="xl"
            radius="full"
            className="border-transparent bg-member-soft font-semibold text-member-soft-foreground tabular-nums"
            aria-label={ordersWords.ticket.memberAria(
              order.memberStamps.have,
              order.memberStamps.goal,
            )}
          >
            {ordersWords.ticket.member}{' '}
            {ordersWords.ticket.memberStamps(order.memberStamps.have, order.memberStamps.goal)}
          </Badge>
        ) : order.isFirstOrder ? (
          <Badge variant="info-light" size="xl" radius="full" className="font-semibold">
            {ordersWords.ticket.firstOrder}
          </Badge>
        ) : null}
      </div>
      {detail ? (
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant="outline"
            nativeButton={false}
            render={<a href={`tel:${detail.customerPhone}`} />}
            className="h-11 gap-1.5 font-semibold md:h-9"
          >
            <PhoneIcon aria-hidden="true" />
            {ordersWords.detail.callCustomer}
          </Button>
          <Button
            variant="outline"
            nativeButton={false}
            render={<a href={`sms:${detail.customerPhone}`} />}
            className="h-11 gap-1.5 font-semibold md:h-9"
          >
            <MessageSquareTextIcon aria-hidden="true" />
            {ordersWords.detail.openMessenger}
          </Button>
          <MessengerOrderButton order={order} />
        </div>
      ) : null}
    </Section>
  );
}

function DeliverySection({
  detail,
  slug,
  loading,
}: {
  detail: OwnerOrder | undefined;
  slug: string;
  loading: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const save = useSaveDeliveryInfo(slug);
  const action = useAsyncAction();
  const [form, setForm] = React.useState({ name: '', phone: '', provider: '', url: '' });
  const w = ordersWords.detail;

  const startEdit = () => {
    setForm({
      name: detail?.rider?.name ?? '',
      phone: detail?.rider?.phone ?? '',
      provider: detail?.rider?.provider ?? '',
      url: detail?.trackingUrl ?? '',
    });
    setOpen(true);
  };

  return (
    <Section
      title={ordersWords.panel.deliverySection}
      action={
        detail ? (
          <Button variant="ghost" onClick={startEdit} className="h-9 gap-1.5 text-primary">
            <TruckIcon aria-hidden="true" />
            {detail.rider ? w.editRider : w.addRider}
          </Button>
        ) : null
      }
    >
      {detail ? (
        <>
          {detail.deliveryAddress ? (
            <p className="text-sm break-words">{detail.deliveryAddress}</p>
          ) : null}
          {detail.rider ? (
            <div className="rounded-xl bg-muted/60 p-3 text-sm">
              <p className="font-semibold">{detail.rider.name}</p>
              <p className="text-muted-foreground">
                {[detail.rider.provider, detail.rider.phone].filter(Boolean).join(' · ')}
              </p>
              {detail.trackingUrl ? (
                <a
                  href={detail.trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                >
                  {w.trackDelivery}
                  <ExternalLinkIcon className="size-3.5" aria-hidden="true" />
                </a>
              ) : null}
            </div>
          ) : null}
        </>
      ) : loading ? (
        <Skeleton className="h-12 w-full rounded-xl" />
      ) : null}

      <ResponsiveDialog
        open={open}
        onOpenChange={setOpen}
        title={w.deliveryDetails}
        description={w.deliveryDesc}
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!detail) return;
            action
              .run(async () => {
                await save.mutateAsync({
                  orderId: detail.id,
                  ...(form.name.trim() ? { riderName: form.name.trim() } : {}),
                  ...(form.phone.trim() ? { riderPhone: form.phone.trim() } : {}),
                  ...(form.provider.trim() ? { provider: form.provider.trim() } : {}),
                  ...(form.url.trim() ? { trackingUrl: form.url.trim() } : {}),
                });
                notify({ title: w.deliverySaved, tone: 'success' });
                setOpen(false);
              })
              .catch((err: unknown) =>
                notify({ title: errorWords(errorCodeOf(err)), tone: 'error' }),
              );
          }}
        >
          {(
            [
              ['name', w.riderName, w.riderNamePlaceholder, 'text'],
              ['phone', w.riderPhone, w.riderPhonePlaceholder, 'tel'],
              ['provider', w.provider, w.providerPlaceholder, 'text'],
              ['url', w.trackingUrl, w.trackingUrlPlaceholder, 'url'],
            ] as const
          ).map(([key, label, placeholder, type]) => (
            <Field key={key}>
              <FieldLabel htmlFor={`rider-${key}`}>{label}</FieldLabel>
              <Input
                id={`rider-${key}`}
                type={type}
                value={form[key]}
                placeholder={placeholder}
                onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
                className="h-11 text-base md:h-9 md:text-sm"
              />
            </Field>
          ))}
          <ResponsiveDialogFooter>
            <AsyncButton
              type="submit"
              status={action.status}
              busyLabel={w.savingDelivery}
              doneLabel={w.deliverySaved}
              className="h-11 w-full font-semibold md:h-9"
            >
              {w.saveDelivery}
            </AsyncButton>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialog>
    </Section>
  );
}

function NoteSection({ order, slug }: { order: BoardOrder; slug: string }) {
  const save = useSaveOwnerNote(slug);
  const action = useAsyncAction();
  const [note, setNote] = React.useState(order.ownerNote ?? '');
  // Another order, or a note saved elsewhere: start from the saved note again.
  const source = `${order.id}|${order.ownerNote ?? ''}`;
  const [noteSource, setNoteSource] = React.useState(source);
  if (noteSource !== source) {
    setNoteSource(source);
    setNote(order.ownerNote ?? '');
  }
  const changed = note.trim() !== (order.ownerNote ?? '').trim();
  const w = ordersWords.detail;
  return (
    <Section title={ordersWords.panel.noteSection}>
      <Textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={w.ownerNotePlaceholder}
        aria-label={ordersWords.panel.noteSection}
        rows={2}
        className="text-base md:text-sm"
      />
      {changed || action.status !== 'idle' ? (
        <AsyncButton
          variant="outline"
          status={action.status}
          busyLabel={w.savingOwnerNote}
          doneLabel={w.ownerNoteSaved}
          onClick={() =>
            action
              .run(async () => {
                await save.mutateAsync({ orderId: order.id, note: note.trim() || null });
              })
              .catch((err: unknown) =>
                notify({ title: errorWords(errorCodeOf(err)), tone: 'error' }),
              )
          }
          className="h-11 w-full font-semibold md:h-9"
        >
          {w.saveOwnerNote}
        </AsyncButton>
      ) : null}
    </Section>
  );
}

function ActivitySection({ detail }: { detail: OwnerOrder | undefined }) {
  if (!detail || detail.messages.length === 0) return null;
  const messages = [...detail.messages].sort((a, b) => a.at.localeCompare(b.at));
  return (
    <Collapsible className="border-b px-4 py-2 last:border-b-0">
      <CollapsibleTrigger
        render={
          <Button
            variant="ghost"
            className="group/activity h-11 w-full justify-between px-0 text-xs font-bold tracking-wide text-muted-foreground uppercase hover:bg-transparent"
          >
            {ordersWords.panel.activitySection}
            <ChevronDownIcon className="transition-transform duration-base group-aria-expanded/activity:rotate-180" />
          </Button>
        }
      />
      <CollapsibleContent>
        <Timeline value={messages.length} className="pt-2 pb-4">
          {messages.map((message, index) => (
            <TimelineItem
              key={message.id}
              step={index + 1}
              className="group-orientation-vertical/timeline:ms-8"
            >
              <TimelineHeader>
                <TimelineSeparator className="group-orientation-vertical/timeline:-left-6 group-orientation-vertical/timeline:h-full-less-5 group-orientation-vertical/timeline:translate-y-5" />
                <TimelineDate className="tabular-nums">{formatClock(message.at)}</TimelineDate>
                <TimelineIndicator className="size-3 border-none bg-muted-foreground/40 group-data-completed/timeline-item:bg-primary group-orientation-vertical/timeline:-left-6" />
              </TimelineHeader>
              <TimelineContent className="text-sm text-foreground">
                {message.text ??
                  (message.status
                    ? words.shop.orderStatus[message.status]
                    : ordersWords.detail.viewProof)}
              </TimelineContent>
            </TimelineItem>
          ))}
        </Timeline>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ---------------------------------------------------------------- footer

function PanelFooter({
  order,
  detail,
  slug,
  kind,
  onClose,
}: {
  order: BoardOrder;
  detail: OwnerOrder | undefined;
  slug: string;
  kind: ShopKind;
  onClose: () => void;
}) {
  const online = useOnlineStatus();
  const { advance, payAndComplete } = useStepChange({ slug, kind });
  const step = useAsyncAction();
  const printer = usePrintTicket(slug);
  const cancel = useCancelOrder(slug);
  const [timeOpen, setTimeOpen] = React.useState(false);
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [reasonKey, setReasonKey] = React.useState<CancelReasonKey>('sold_out');
  const [otherText, setOtherText] = React.useState('');
  const action = cardAction(order);
  const targets = moveTargets(order);
  const w = ordersWords.detail;

  let main: React.ReactNode = null;
  if (action.kind === 'advance') {
    const to = action.to;
    const labels = stepLabels(to, order.type, kind);
    main = (
      <AsyncButton
        status={step.status}
        busyLabel={labels.busy}
        doneLabel={labels.done}
        disabled={!online}
        onClick={() => step.run(() => advance(order, to)).catch(() => undefined)}
        className="h-12 flex-1 gap-2 text-base font-semibold md:h-11"
      >
        <StageIcon stage={statusStage(to) ?? 'done'} kind={kind} />
        {labels.idle}
      </AsyncButton>
    );
  } else if (action.kind === 'pay_and_complete') {
    main = (
      <AsyncButton
        status={step.status}
        busyLabel={ordersWords.buttons.completing}
        doneLabel={ordersWords.buttons.completed}
        disabled={!online}
        onClick={() => step.run(() => payAndComplete(order)).catch(() => undefined)}
        className="h-12 flex-1 text-base font-semibold md:h-11"
      >
        {ordersWords.buttons.paidAndDone}
      </AsyncButton>
    );
  }
  if (action.kind === 'check_payment') {
    // The Approve button sits with the proof above; the footer says why nothing can start yet.
    main = (
      <p className="flex min-h-12 flex-1 items-center gap-2 text-sm font-medium text-muted-foreground md:min-h-11">
        <LockIcon className="size-4 shrink-0" aria-hidden="true" />
        {ordersWords.ticket.locked}
      </p>
    );
  }

  const confirmCancel = () => {
    const reason =
      reasonKey === 'other'
        ? otherText.trim() || w.cancelReasons.other
        : w.cancelReasons[reasonKey];
    cancel
      .mutateAsync({ orderId: order.id, reason })
      .then(() => {
        setCancelOpen(false);
        notify({ title: w.orderCancelled, tone: 'info' });
        onClose();
      })
      .catch((err: unknown) => notify({ title: errorWords(errorCodeOf(err)), tone: 'error' }));
  };

  return (
    <div className="flex items-center gap-2">
      {main ?? <span className="flex-1" />}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              size="icon"
              aria-label={ordersWords.panel.actions}
              className="size-12 shrink-0 md:size-11"
            >
              <MoreHorizontalIcon />
            </Button>
          }
        />
        <DropdownMenuContent align="end" side="top" className="w-56">
          {targets.length > 0 && !isFinal(order.status) ? (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger disabled={!online}>
                {ordersWords.panel.moveTo}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {targets.map((to) => {
                  const stage = statusStage(to) ?? 'done';
                  return (
                    <DropdownMenuItem
                      key={to}
                      onClick={() => {
                        advance(order, to).catch(() => undefined);
                      }}
                    >
                      <StageIcon stage={stage} kind={kind} className={STAGE_LOOK[stage].text} />
                      {stageLabel(stage, kind)}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          ) : null}
          {canReschedule(order) ? (
            <DropdownMenuItem onClick={() => setTimeOpen(true)}>
              <CalendarClockIcon />
              {w.changeTime}
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem onClick={() => printer.print(order.id)}>
            <PrinterIcon />
            {w.printTicket}
          </DropdownMenuItem>
          {canCancel(order.status) ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => setCancelOpen(true)}>
                <CircleXIcon />
                {w.cancelOrder}
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      {printer.node}
      {detail || canReschedule(order) ? (
        <ChangeTimeDialog
          open={timeOpen}
          onOpenChange={setTimeOpen}
          slug={slug}
          orderId={order.id}
        />
      ) : null}

      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{w.cancelDialogTitle}</AlertDialogTitle>
            <AlertDialogDescription>{w.cancelDialogDesc}</AlertDialogDescription>
          </AlertDialogHeader>
          <RadioGroup
            value={reasonKey}
            onValueChange={(value) => {
              const key = CANCEL_REASON_KEYS.find((k) => k === value);
              if (key) setReasonKey(key);
            }}
            className="gap-2"
          >
            {CANCEL_REASON_KEYS.map((key) => (
              <label
                key={key}
                htmlFor={`cancel-${key}`}
                className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg border px-3 text-sm font-medium"
              >
                <RadioGroupItem value={key} id={`cancel-${key}`} />
                {w.cancelReasons[key]}
              </label>
            ))}
          </RadioGroup>
          {reasonKey === 'other' ? (
            <Textarea
              value={otherText}
              onChange={(e) => setOtherText(e.target.value)}
              placeholder={w.cancelOtherPlaceholder}
              aria-label={w.cancelOther}
              rows={2}
              className="text-base md:text-sm"
            />
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel>{w.keepOrder}</AlertDialogCancel>
            <Button variant="destructive" disabled={cancel.isPending} onClick={confirmCancel}>
              {w.cancelOrder}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
