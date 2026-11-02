import * as React from 'react';
import {
  ArrowLeftIcon,
  CheckIcon,
  ExternalLinkIcon,
  MessageCircleIcon,
  MoreVerticalIcon,
  PhoneIcon,
  PrinterIcon,
  TruckIcon,
  XIcon,
} from 'lucide-react';
import type { OrderStatus, OwnerOrder, PaymentMethod, ShopKind } from '@smartapp/core';
import {
  formatClock,
  formatManila,
  formatPeso,
  isPayLater,
  nextActions,
  ordersWords,
  timelineSteps,
} from '@smartapp/core';
import {
  useCancelOrder,
  useMarkSeen,
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
import { Button } from '@smartapp/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@smartapp/ui/components/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@smartapp/ui/components/dropdown-menu';
import { Input } from '@smartapp/ui/components/input';
import { RadioGroup, RadioGroupItem } from '@smartapp/ui/components/radio-group';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@smartapp/ui/components/sheet';
import { Textarea } from '@smartapp/ui/components/textarea';
import {
  Timeline,
  TimelineDate,
  TimelineHeader,
  TimelineIndicator,
  TimelineItem,
  TimelineSeparator,
  TimelineTitle,
} from '@smartapp/ui/components/reui/timeline';
import { AsyncButton } from '@smartapp/ui/compositions/async-button';
import { CopyButton } from '@smartapp/ui/compositions/copy-button';
import { notify } from '@smartapp/ui/compositions/notify';
import { cn } from 'cn';
import { OrderTicket } from '@/app/orders/order-ticket';
import { useNow } from '@/app/orders/use-now';
import { useStepChange } from '@/app/orders/use-step-change';

export interface OrderDetailContentProps {
  order: OwnerOrder;
  slug: string;
  kind?: ShopKind;
  isFullPage?: boolean;
  onBack?: () => void;
  onClose?: () => void;
  className?: string;
}

export function OrderDetailContent({
  order,
  slug,
  kind = 'food',
  isFullPage = false,
  onBack,
  onClose,
  className,
}: OrderDetailContentProps) {
  const now = useNow(30_000);
  const markSeenMutation = useMarkSeen(slug);
  const reviewPaymentMutation = useReviewPayment(slug);
  const recordPaymentMutation = useRecordPayment(slug);
  const saveDeliveryMutation = useSaveDeliveryInfo(slug);
  const saveOwnerNoteMutation = useSaveOwnerNote(slug);
  const cancelOrderMutation = useCancelOrder(slug);

  const { advance } = useStepChange({ slug, kind });

  // Mark seen on initial render
  React.useEffect(() => {
    if (order.seenAt === null) {
      markSeenMutation.mutate({ orderId: order.id });
    }
  }, [order.id, order.seenAt, markSeenMutation]);

  // Proof photo zoom dialog
  const [zoomProofPath, setZoomProofPath] = React.useState<string | null>(null);

  // Delivery sheet state
  const [isDeliverySheetOpen, setIsDeliverySheetOpen] = React.useState(false);
  const [riderName, setRiderName] = React.useState(order.rider?.name ?? '');
  const [riderPhone, setRiderPhone] = React.useState(order.rider?.phone ?? '');
  const [provider, setProvider] = React.useState(order.rider?.provider ?? '');
  const [trackingUrl, setTrackingUrl] = React.useState(order.trackingUrl ?? '');

  // Owner note state
  const [ownerNote, setOwnerNote] = React.useState(order.ownerNote ?? '');

  // Cancel dialog state
  const [isCancelDialogOpen, setIsCancelDialogOpen] = React.useState(false);
  const [cancelReasonKey, setCancelReasonKey] = React.useState<'sold_out' | 'closing_early' | 'customer_asked' | 'other'>('sold_out');
  const [cancelOtherText, setCancelOtherText] = React.useState('');

  const nextAction = nextActions(order)[0];

  const handleNextStep = async () => {
    if (!nextAction) return;
    await advance(order, nextAction);
  };

  const handleSaveDelivery = async () => {
    try {
      await saveDeliveryMutation.mutateAsync({
        orderId: order.id,
        riderName: riderName.trim() || undefined,
        riderPhone: riderPhone.trim() || undefined,
        provider: provider.trim() || undefined,
        trackingUrl: trackingUrl.trim() || undefined,
      });
      setIsDeliverySheetOpen(false);
      notify({ title: ordersWords.detail.deliverySaved, tone: 'success' });
    } catch {
      notify({ title: 'Could not save delivery details', tone: 'error' });
    }
  };

  const handleSaveOwnerNote = async () => {
    try {
      await saveOwnerNoteMutation.mutateAsync({
        orderId: order.id,
        note: ownerNote.trim() || null,
      });
      notify({ title: ordersWords.detail.ownerNoteSaved, tone: 'success' });
    } catch {
      notify({ title: 'Could not save owner note', tone: 'error' });
    }
  };

  const handleConfirmCancel = async () => {
    const reasonText =
      cancelReasonKey === 'other'
        ? cancelOtherText.trim() || 'Other'
        : ordersWords.detail.cancelReasons[cancelReasonKey];

    try {
      await cancelOrderMutation.mutateAsync({
        orderId: order.id,
        reason: reasonText,
      });
      setIsCancelDialogOpen(false);
      notify({ title: ordersWords.detail.orderCancelled, tone: 'info' });
      onBack?.();
      onClose?.();
    } catch {
      notify({ title: 'Could not cancel order', tone: 'error' });
    }
  };

  const steps = timelineSteps(order.type);
  const currentStepIndex = steps.indexOf(order.status);

  const buttonLabel = nextAction
    ? order.status === 'placed'
      ? ordersWords.buttons.start(kind)
      : order.status === 'preparing'
        ? ordersWords.buttons.markReady
        : order.status === 'ready'
          ? order.type === 'delivery'
            ? ordersWords.buttons.sendOut
            : ordersWords.buttons.complete
          : ordersWords.buttons.complete
    : null;

  return (
    <div className={cn('flex flex-col bg-background text-foreground', className)}>
      {/* Top action header */}
      <div className="flex h-14 items-center justify-between border-b border-border/80 px-4 bg-muted/20">
        <div className="flex items-center gap-2">
          {onBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              aria-label={ordersWords.detail.backToOrders}
              className="size-9"
            >
              <ArrowLeftIcon className="size-4" />
            </Button>
          )}
          <span className="font-bold text-base tabular-nums">
            #{String(order.orderNo).padStart(3, '0')}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatManila(order.placedAt, 'datetime')}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon" className="size-8">
                  <MoreVerticalIcon className="size-4 text-muted-foreground" />
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="w-44 text-xs">
              <DropdownMenuItem
                onClick={() => setIsCancelDialogOpen(true)}
                className="font-semibold text-destructive focus:text-destructive"
              >
                {ordersWords.detail.cancelOrder}
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                <PrinterIcon className="size-3.5 mr-2 opacity-50" />
                <span>{ordersWords.detail.printTicket}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="Close detail panel"
              className="size-8"
            >
              <XIcon className="size-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* 1. Full Ticket (Size="full") */}
        <OrderTicket
          order={order}
          size="full"
          now={now}
          actionSlot={
            buttonLabel ? (
              <AsyncButton
                variant="default"
                size="default"
                onClick={handleNextStep}
                idleLabel={buttonLabel}
                pendingLabel={ordersWords.buttons.starting}
                doneLabel={ordersWords.buttons.started}
                className="w-full font-semibold shadow-xs"
              />
            ) : undefined
          }
        />

        {/* 2. Payment Section */}
        <div className="rounded-xl border border-border/80 bg-card p-4 space-y-3.5 shadow-2xs">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {ordersWords.detail.paymentSection}
          </h3>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground capitalize">{order.paymentMethod.replace('_', ' ')}</span>
            <span className="font-bold tabular-nums text-foreground">
              {formatPeso(order.totals.total)}
            </span>
          </div>

          {/* Proofs (if GCash/Maya transfer) */}
          {order.proofs.length > 0 && (
            <div className="space-y-3 pt-1 border-t border-border/40">
              {order.proofs.map((proof) => (
                <div key={proof.id} className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground font-mono">
                      Ref: {proof.referenceNo}
                    </span>
                    <CopyButton text={proof.referenceNo} className="h-7 text-xs" />
                  </div>

                  {/* Mandatory line from fix 8 */}
                  <p className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-warning-soft/70 px-2 py-1 rounded-md">
                    {ordersWords.detail.checkGcash}
                  </p>

                  {/* Proof Photo Thumbnail */}
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setZoomProofPath(proof.path)}
                      className="group relative size-16 overflow-hidden rounded-lg border border-border/80 hover:opacity-90 transition-opacity"
                    >
                      <img
                        src={proof.path}
                        alt="Payment Proof"
                        className="size-full object-cover"
                      />
                    </button>
                    <div className="text-xs text-muted-foreground">
                      <div>{proof.status === 'approved' ? 'Approved' : proof.status === 'rejected' ? 'Rejected' : 'Pending review'}</div>
                      <div className="text-[0.6875rem]">{formatClock(proof.uploadedAt)}</div>
                    </div>
                  </div>

                  {/* Approve / Reject buttons if proof pending */}
                  {proof.status === 'pending' && (
                    <div className="flex items-center gap-2 pt-1">
                      <AsyncButton
                        variant="default"
                        size="sm"
                        onClick={async () => {
                          await reviewPaymentMutation.mutateAsync({
                            orderId: order.id,
                            approve: true,
                          });
                          notify({ title: ordersWords.detail.approvedPayment, tone: 'success' });
                        }}
                        idleLabel={ordersWords.detail.approvePayment}
                        pendingLabel={ordersWords.detail.approvingPayment}
                        doneLabel={ordersWords.detail.approvedPayment}
                        className="flex-1 text-xs font-semibold"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          await reviewPaymentMutation.mutateAsync({
                            orderId: order.id,
                            approve: false,
                            rejectReason: 'Payment reference could not be verified',
                          });
                          notify({ title: ordersWords.detail.paymentRejected, tone: 'info' });
                        }}
                        className="text-xs font-semibold text-destructive hover:bg-destructive/10"
                      >
                        {ordersWords.detail.rejectPayment}
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Record Cash Button for cash & COD */}
          {isPayLater(order.paymentMethod) && order.paymentStatus !== 'paid' && (
            <div className="pt-2 border-t border-border/40">
              <AsyncButton
                variant="outline"
                size="sm"
                onClick={async () => {
                  await recordPaymentMutation.mutateAsync({
                    orderId: order.id,
                    method: order.paymentMethod as PaymentMethod,
                  });
                  notify({ title: ordersWords.detail.cashRecorded, tone: 'success' });
                }}
                idleLabel={ordersWords.detail.recordCash}
                pendingLabel={ordersWords.detail.recordingCash}
                doneLabel={ordersWords.detail.cashRecorded}
                className="w-full text-xs font-semibold"
              />
            </div>
          )}
        </div>

        {/* 3. Delivery Section (if delivery order) */}
        {order.type === 'delivery' && (
          <div className="rounded-xl border border-border/80 bg-card p-4 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {ordersWords.detail.deliverySection}
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDeliverySheetOpen(true)}
                className="h-7 text-xs font-semibold"
              >
                <TruckIcon className="size-3.5 mr-1" />
                {order.rider ? 'Edit details' : 'Add rider'}
              </Button>
            </div>

            {order.deliveryAddress && (
              <p className="text-xs text-muted-foreground break-words">
                {order.deliveryAddress}
              </p>
            )}

            {order.rider ? (
              <div className="rounded-lg bg-muted/40 p-2.5 text-xs space-y-1">
                <div className="font-semibold text-foreground">{order.rider.name}</div>
                {order.rider.provider && <div>Provider: {order.rider.provider}</div>}
                {order.rider.phone && (
                  <div>
                    <a href={`tel:${order.rider.phone}`} className="text-primary hover:underline">
                      {order.rider.phone}
                    </a>
                  </div>
                )}
                {order.trackingUrl && (
                  <div className="pt-1">
                    <a
                      href={order.trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                    >
                      <span>Track delivery</span>
                      <ExternalLinkIcon className="size-3" />
                    </a>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}

        {/* 4. Timeline Section */}
        <div className="rounded-xl border border-border/80 bg-card p-4 space-y-4 shadow-2xs">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {ordersWords.detail.timelineSection}
          </h3>

          <Timeline value={currentStepIndex + 1} orientation="vertical" className="space-y-4">
            {steps.map((st, index) => {
              const isPastOrCurrent = index <= currentStepIndex;
              const isCurrent = index === currentStepIndex;
              const eventMatch = order.events.find((e) => e.status === st);

              const stepLabel =
                st === 'placed'
                  ? 'Order placed'
                  : st === 'preparing'
                    ? ordersWords.columns.preparing(kind)
                    : st === 'ready'
                      ? ordersWords.columns.ready
                      : st === 'out_for_delivery'
                        ? ordersWords.columns.out
                        : ordersWords.columns.completed;

              return (
                <TimelineItem key={st} step={index + 1} className="min-h-10">
                  <TimelineHeader className="flex items-center gap-3">
                    <TimelineSeparator className="bg-border" />
                    <TimelineIndicator
                      className={cn(
                        'flex size-7 items-center justify-center rounded-full text-xs font-bold transition-colors',
                        isPastOrCurrent
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {isPastOrCurrent ? <CheckIcon className="size-3.5 stroke-3" /> : index + 1}
                    </TimelineIndicator>
                    <div className="flex flex-1 items-baseline justify-between gap-2">
                      <TimelineTitle
                        className={cn(
                          'text-xs font-semibold',
                          isCurrent ? 'text-primary font-bold' : 'text-foreground',
                        )}
                      >
                        {stepLabel}
                      </TimelineTitle>
                      {eventMatch && (
                        <TimelineDate className="text-[0.6875rem] text-muted-foreground tabular-nums">
                          {formatClock(eventMatch.at)}
                        </TimelineDate>
                      )}
                    </div>
                  </TimelineHeader>
                </TimelineItem>
              );
            })}
          </Timeline>
        </div>

        {/* 5. Order Thread Messages */}
        {order.messages.length > 0 && (
          <div className="rounded-xl border border-border/80 bg-card p-4 space-y-3 shadow-2xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {ordersWords.detail.threadSection}
            </h3>

            <div className="space-y-2">
              {order.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    'rounded-lg p-2.5 text-xs',
                    msg.kind === 'proof'
                      ? 'bg-primary/5 border border-primary/20 text-foreground'
                      : 'bg-muted/50 text-muted-foreground',
                  )}
                >
                  <div className="flex items-center justify-between font-semibold mb-0.5">
                    <span className="capitalize">{msg.kind}</span>
                    <span className="text-[0.6875rem] font-normal tabular-nums">
                      {formatClock(msg.at)}
                    </span>
                  </div>
                  {msg.text && <p className="text-foreground break-words">{msg.text}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 6. Customer Details */}
        <div className="rounded-xl border border-border/80 bg-card p-4 space-y-3 shadow-2xs">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {ordersWords.detail.customerSection}
          </h3>

          <div className="space-y-2 text-xs">
            <div className="font-semibold text-sm text-foreground">
              {order.customerName}
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              {order.customerPhone && (
                <Button
                  variant="outline"
                  size="sm"
                  render={<a href={`tel:${order.customerPhone}`} />}
                  className="h-8 gap-1.5 text-xs font-semibold"
                >
                  <PhoneIcon className="size-3.5" />
                  {ordersWords.detail.callCustomer}
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                render={
                  <a
                    href={`https://m.me/${slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                }
                className="h-8 gap-1.5 text-xs font-semibold"
              >
                <MessageCircleIcon className="size-3.5" />
                {ordersWords.detail.openMessenger}
              </Button>
            </div>
          </div>
        </div>

        {/* 7. Owner Note */}
        <div className="rounded-xl border border-border/80 bg-card p-4 space-y-2.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {ordersWords.detail.ownerNote}
            </h3>
            <span className="text-[0.6875rem] text-muted-foreground">
              {ordersWords.detail.ownerNotePlaceholder}
            </span>
          </div>

          <Textarea
            value={ownerNote}
            onChange={(e) => setOwnerNote(e.target.value)}
            placeholder={ordersWords.detail.ownerNotePlaceholder}
            rows={3}
            className="text-xs"
          />

          <AsyncButton
            variant="outline"
            size="sm"
            onClick={handleSaveOwnerNote}
            idleLabel={ordersWords.detail.saveOwnerNote}
            pendingLabel={ordersWords.detail.savingOwnerNote}
            doneLabel={ordersWords.detail.ownerNoteSaved}
            className="w-full text-xs font-semibold"
          />
        </div>
      </div>

      {/* Sticky Bottom Bar on phones (<768px) per Part C & UX.md */}
      {buttonLabel && (
        <div className="sticky bottom-0 z-20 flex h-14 items-center border-t border-border/80 bg-background/95 p-3 backdrop-blur-md md:hidden">
          <AsyncButton
            variant="default"
            size="default"
            onClick={handleNextStep}
            idleLabel={buttonLabel}
            pendingLabel={ordersWords.buttons.starting}
            doneLabel={ordersWords.buttons.started}
            className="w-full font-semibold shadow-xs"
          />
        </div>
      )}

      {/* Proof Photo Zoom Dialog */}
      <Dialog
        open={Boolean(zoomProofPath)}
        onOpenChange={(open) => {
          if (!open) setZoomProofPath(null);
        }}
      >
        <DialogContent className="max-w-md p-4">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">
              {ordersWords.detail.viewProof}
            </DialogTitle>
          </DialogHeader>
          {zoomProofPath && (
            <div className="mt-2 overflow-hidden rounded-xl border border-border">
              <img src={zoomProofPath} alt="Payment Proof Full" className="w-full object-contain" />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delivery Info Sheet */}
      <Sheet open={isDeliverySheetOpen} onOpenChange={setIsDeliverySheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-6 space-y-4">
          <SheetHeader>
            <SheetTitle>{ordersWords.detail.deliveryDetails}</SheetTitle>
            <SheetDescription>Assign a rider or update tracking details.</SheetDescription>
          </SheetHeader>

          <div className="space-y-3 pt-2">
            <div>
              <label className="text-xs font-medium text-foreground">{ordersWords.detail.riderName}</label>
              <Input
                value={riderName}
                onChange={(e) => setRiderName(e.target.value)}
                placeholder="Rider's full name"
                className="mt-1 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">{ordersWords.detail.riderPhone}</label>
              <Input
                value={riderPhone}
                onChange={(e) => setRiderPhone(e.target.value)}
                placeholder="0917-000-0000"
                className="mt-1 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">{ordersWords.detail.provider}</label>
              <Input
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                placeholder="e.g. Lalamove, GrabExpress, In-house"
                className="mt-1 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">{ordersWords.detail.trackingUrl}</label>
              <Input
                value={trackingUrl}
                onChange={(e) => setTrackingUrl(e.target.value)}
                placeholder="https://..."
                className="mt-1 text-sm"
              />
            </div>
          </div>

          <div className="pt-4">
            <AsyncButton
              variant="default"
              onClick={handleSaveDelivery}
              idleLabel={ordersWords.detail.saveDelivery}
              pendingLabel={ordersWords.detail.savingDelivery}
              doneLabel={ordersWords.detail.deliverySaved}
              className="w-full font-semibold"
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Cancel Order Alert Dialog */}
      <AlertDialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive font-bold">
              {ordersWords.detail.cancelDialogTitle}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {ordersWords.detail.cancelDialogDesc}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-3 py-2">
            <RadioGroup
              value={cancelReasonKey}
              onValueChange={(val) => setCancelReasonKey(val as typeof cancelReasonKey)}
              className="space-y-2"
            >
              {(['sold_out', 'closing_early', 'customer_asked', 'other'] as const).map((key) => (
                <div
                  key={key}
                  className="flex items-center gap-2 rounded-lg border border-border p-2.5 text-xs font-medium"
                >
                  <RadioGroupItem value={key} id={`cancel-reason-${key}`} />
                  <label htmlFor={`cancel-reason-${key}`} className="flex-1 cursor-pointer">
                    {ordersWords.detail.cancelReasons[key]}
                  </label>
                </div>
              ))}
            </RadioGroup>

            {cancelReasonKey === 'other' && (
              <Textarea
                value={cancelOtherText}
                onChange={(e) => setCancelOtherText(e.target.value)}
                placeholder={ordersWords.detail.cancelOtherPlaceholder}
                rows={2}
                className="text-xs mt-2"
              />
            )}
          </div>

          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel>Keep order</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={() => void handleConfirmCancel()}
              className="font-semibold"
            >
              {ordersWords.detail.cancelOrder}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
